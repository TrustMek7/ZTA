import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@aws-sdk/lib-dynamodb', async importOriginal => {
  const original = await importOriginal<typeof import('@aws-sdk/lib-dynamodb')>();
  return { ...original, DynamoDBDocumentClient: { from: () => ({ send }) } };
});
import { DynamoRepository } from '../src/shared/dynamo';
const projectId = randomUUID(); const donationId = randomUUID();
const pending = { projectId, donationId, donorSub: 'owner', amountCents: 2500, status: 'PENDIENTE_SIMULACION', currency: 'PEN' };
beforeEach(() => {
  send.mockReset();
  vi.stubEnv('PROJECTS_TABLE', 'projects'); vi.stubEnv('DONATIONS_TABLE', 'donations'); vi.stubEnv('IDEMPOTENCY_TABLE', 'keys'); vi.stubEnv('AUDIT_TABLE', 'audit');
});
describe('CA-NF04.2 comandos DynamoDB (sin red)', () => {
  it('crea reserva, intención y auditoría en una transacción con comprobación del proyecto', async () => {
    send.mockImplementation(async command => command instanceof GetCommand ? { Item: command.input.TableName === 'projects' ? { projectId, status: 'PUBLICADO' } : undefined } : {});
    await new DynamoRepository().createDonation({ input: { projectId, amountCents: 2500 }, donorSub: 'owner', key: randomUUID(), payloadHash: 'normalized-hash', now: new Date().toISOString(), requestId: 'request' });
    const tx = send.mock.calls.map(([command]) => command).find(command => command instanceof TransactWriteCommand) as TransactWriteCommand;
    expect(tx.input.TransactItems).toHaveLength(4);
    expect(tx.input.TransactItems![0].ConditionCheck?.ConditionExpression).toBe('#s = :published');
    expect(tx.input.TransactItems![1].Put?.TableName).toBe('keys'); expect(tx.input.TransactItems![1].Put?.ConditionExpression).toContain('attribute_not_exists(pk)');
    expect(tx.input.TransactItems![2].Put?.Item?.donorSub).toBe('owner'); expect(tx.input.TransactItems![3].Put?.TableName).toBe('audit');
  });
  it('confirma con condición de estado y propietario junto al incremento y evento', async () => {
    send.mockImplementation(async command => command instanceof GetCommand ? { Item: pending } : {});
    await new DynamoRepository().simulate(donationId, 'owner', 'CONFIRMADA_SIMULADA', 'request');
    const tx = send.mock.calls.map(([command]) => command).find(command => command instanceof TransactWriteCommand) as TransactWriteCommand;
    expect(tx.input.TransactItems).toHaveLength(3);
    expect(tx.input.TransactItems![0].Update?.ConditionExpression).toBe('#s = :pending AND donorSub = :sub');
    expect(tx.input.TransactItems![2].Update?.UpdateExpression).toContain('ADD confirmedAmountCents :amount');
    expect(tx.input.TransactItems![2].Update?.ExpressionAttributeValues?.[':amount']).toBe(2500);
  });
  it('rechazo no incluye incremento del proyecto', async () => {
    send.mockImplementation(async command => command instanceof GetCommand ? { Item: pending } : {});
    await new DynamoRepository().simulate(donationId, 'owner', 'RECHAZADA_SIMULADA', 'request');
    const tx = send.mock.calls.map(([command]) => command).find(command => command instanceof TransactWriteCommand) as TransactWriteCommand;
    expect(tx.input.TransactItems).toHaveLength(2); expect(tx.input.TransactItems!.some(item => item.Update?.TableName === 'projects')).toBe(false);
  });
  it('lee al ganador de una colisión de creación para devolver la respuesta original', async () => {
    let keyReads = 0;
    send.mockImplementation(async command => {
      if (command instanceof GetCommand) return { Item: command.input.TableName === 'projects' ? { projectId, status: 'PUBLICADO' } : ++keyReads === 1 ? undefined : { payloadHash: 'hash', donation: pending, expiresAt: Math.floor(Date.now() / 1000) + 1000 } };
      throw Object.assign(new Error('condition'), { name: 'TransactionCanceledException' });
    });
    const result = await new DynamoRepository().createDonation({ input: { projectId, amountCents: 2500 }, donorSub: 'owner', key: randomUUID(), payloadHash: 'hash', now: new Date().toISOString(), requestId: 'request' });
    expect(result.donationId).toBe(donationId); expect(keyReads).toBe(2);
  });
});
