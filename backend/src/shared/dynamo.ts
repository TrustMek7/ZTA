import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, TransactWriteCommand, type TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';
import type { Donation, NewProject, Outcome, Page, Project, AuditEvent } from '../../../shared/domain';
import type { DonationRequest, Repository } from './repository';
import { auditEvent } from '../audit/event';
import { ApiError, conflict, notFound } from './errors';

type Key = Record<string, unknown>;
type Tx = NonNullable<TransactWriteCommandInput['TransactItems']>;
type Idempotency = { pk: string; payloadHash: string; donation: Donation; expiresAt: number };
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
const tables = () => ({ projects: process.env.PROJECTS_TABLE!, donations: process.env.DONATIONS_TABLE!, keys: process.env.IDEMPOTENCY_TABLE!, audit: process.env.AUDIT_TABLE! });

function decodeCursor(cursor?: string): Key | undefined {
  if (!cursor) return undefined;
  try {
    if (cursor.length > 2048) throw new Error();
    const decoded: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) throw new Error();
    return decoded as Key;
  } catch { throw new ApiError(400, 'INVALID_CURSOR', 'La página solicitada no es válida.'); }
}
const encodeCursor = (key?: Key) => key ? Buffer.from(JSON.stringify(key)).toString('base64url') : undefined;
async function get<T>(TableName: string, Key: Key): Promise<T | undefined> {
  return (await db.send(new GetCommand({ TableName, Key, ConsistentRead: true }))).Item as T | undefined;
}
function auditPut(action: string, sub: string, id: string, requestId: string): Tx[number] {
  return { Put: { TableName: tables().audit, Item: auditEvent(action, sub, id, requestId), ConditionExpression: 'attribute_not_exists(eventType)' } };
}
async function transaction(items: Tx): Promise<void> {
  try { await db.send(new TransactWriteCommand({ TransactItems: items })); }
  catch (e) {
    if (e instanceof Error && ['TransactionCanceledException', 'ConditionalCheckFailedException', 'TransactionConflictException'].includes(e.name)) throw conflict();
    throw e;
  }
}
export class DynamoRepository implements Repository {
  async projects(cursor?: string): Promise<Page<Project>> {
    const result = await db.send(new QueryCommand({ TableName: tables().projects, IndexName: 'status-createdAt', KeyConditionExpression: '#s = :s', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': 'PUBLICADO' }, Limit: 50, ScanIndexForward: false, ExclusiveStartKey: decodeCursor(cursor) }));
    return { items: (result.Items ?? []) as Project[], nextCursor: encodeCursor(result.LastEvaluatedKey) };
  }
  project(id: string) { return get<Project>(tables().projects, { projectId: id }); }
  async createProject(input: NewProject, actor: string, requestId: string) {
    const now = new Date().toISOString();
    const project: Project = { ...input, projectId: randomUUID(), currency: 'PEN', confirmedAmountCents: 0, status: 'BORRADOR', createdAt: now, updatedAt: now };
    await transaction([{ Put: { TableName: tables().projects, Item: project, ConditionExpression: 'attribute_not_exists(projectId)' } }, auditPut('PROJECT_CREATED', actor, project.projectId, requestId)]);
    return project;
  }
  async publishProject(id: string, actor: string, requestId: string) {
    const previous = await this.project(id); if (!previous) throw notFound();
    const now = new Date().toISOString();
    await transaction([{ Update: { TableName: tables().projects, Key: { projectId: id }, UpdateExpression: 'SET #s = :published, updatedAt = :now', ConditionExpression: '#s = :draft', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':published': 'PUBLICADO', ':draft': 'BORRADOR', ':now': now } } }, auditPut('PROJECT_PUBLISHED', actor, id, requestId)]);
    return { ...previous, status: 'PUBLICADO' as const, updatedAt: now };
  }
  async createDonation(request: DonationRequest): Promise<Donation> {
    const { input, donorSub, key, payloadHash, now, requestId } = request;
    const pk = `${donorSub}#createDonation#${key}`;
    const replay = async () => {
      const existing = await get<Idempotency>(tables().keys, { pk });
      if (!existing || existing.expiresAt <= Math.floor(Date.parse(now) / 1000)) return undefined;
      if (existing.payloadHash !== payloadHash) throw conflict();
      return existing.donation;
    };
    const existing = await replay(); if (existing) return existing;
    const project = await this.project(input.projectId); if (!project) throw notFound();
    if (project.status !== 'PUBLICADO') throw conflict();
    const donation: Donation = { ...input, donorSub, donationId: randomUUID(), currency: 'PEN', status: 'PENDIENTE_SIMULACION', createdAt: now, updatedAt: now };
    const expiresAt = Math.floor(Date.parse(now) / 1000) + 86400;
    try {
      await transaction([
        { ConditionCheck: { TableName: tables().projects, Key: { projectId: input.projectId }, ConditionExpression: '#s = :published', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':published': 'PUBLICADO' } } },
        { Put: { TableName: tables().keys, Item: { pk, payloadHash, donation, expiresAt }, ConditionExpression: 'attribute_not_exists(pk) OR expiresAt <= :now', ExpressionAttributeValues: { ':now': Math.floor(Date.parse(now) / 1000) } } },
        { Put: { TableName: tables().donations, Item: donation, ConditionExpression: 'attribute_not_exists(donationId)' } },
        auditPut('DONATION_CREATED', donorSub, donation.donationId, requestId),
      ]);
    } catch (e) { if (e instanceof ApiError && e.status === 409) { const winner = await replay(); if (winner) return winner; } throw e; }
    return donation;
  }
  donation(id: string) { return get<Donation>(tables().donations, { donationId: id }); }
  async donations(sub: string, cursor?: string): Promise<Page<Donation>> {
    const start = decodeCursor(cursor);
    // The cursor is navigation data, never an authorization source.
    if (start && start.donorSub !== sub) throw new ApiError(400, 'INVALID_CURSOR', 'La página solicitada no es válida.');
    const result = await db.send(new QueryCommand({ TableName: tables().donations, IndexName: 'donorSub-createdAt', KeyConditionExpression: 'donorSub = :sub', ExpressionAttributeValues: { ':sub': sub }, Limit: 50, ScanIndexForward: false, ExclusiveStartKey: start }));
    return { items: (result.Items ?? []) as Donation[], nextCursor: encodeCursor(result.LastEvaluatedKey) };
  }
  async simulate(id: string, sub: string, outcome: Outcome, requestId: string): Promise<Donation> {
    const donation = await this.donation(id);
    if (!donation || donation.donorSub !== sub) throw notFound();
    const now = new Date().toISOString();
    const items: Tx = [
      { Update: { TableName: tables().donations, Key: { donationId: id }, UpdateExpression: 'SET #s = :outcome, updatedAt = :now', ConditionExpression: '#s = :pending AND donorSub = :sub', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':outcome': outcome, ':pending': 'PENDIENTE_SIMULACION', ':sub': sub, ':now': now } } },
      auditPut(outcome === 'CONFIRMADA_SIMULADA' ? 'DONATION_CONFIRMED' : 'DONATION_REJECTED', sub, id, requestId),
    ];
    if (outcome === 'CONFIRMADA_SIMULADA') items.push({ Update: { TableName: tables().projects, Key: { projectId: donation.projectId }, UpdateExpression: 'SET updatedAt = :now ADD confirmedAmountCents :amount', ConditionExpression: 'attribute_exists(projectId)', ExpressionAttributeValues: { ':amount': donation.amountCents, ':now': now } } });
    await transaction(items);
    return { ...donation, status: outcome, updatedAt: now };
  }
  async audit(type: string, cursor?: string): Promise<Page<AuditEvent>> {
    const result = await db.send(new QueryCommand({ TableName: tables().audit, KeyConditionExpression: 'eventType = :type', ExpressionAttributeValues: { ':type': type }, Limit: 50, ScanIndexForward: false, ExclusiveStartKey: decodeCursor(cursor) }));
    return { items: (result.Items ?? []) as AuditEvent[], nextCursor: encodeCursor(result.LastEvaluatedKey) };
  }
}
