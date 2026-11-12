import { createHash } from 'node:crypto';
import { z } from 'zod';
import { donationInput, idempotencyKey, projectInput, simulationInput, type Donation } from '../../shared/domain';
import { authorize } from './authz/authorize';
import { endpoint, body, type Event } from './shared/http';
import { ApiError, notFound } from './shared/errors';
import type { Repository } from './shared/repository';

const publicDonation = ({ donorSub: _private, ...donation }: Donation) => { void _private; return donation; };
const uuidParam = (event: Event, key: string) => { const id = event.pathParameters?.[key]; if (!z.string().uuid().safeParse(id).success) throw notFound(); return id!; };
export function handlers(repo: Repository) {
  return {
    publicProjects: endpoint('PROJECT_READ', async event => {
      const id = event.pathParameters?.projectId;
      if (!id) return { data: await repo.projects(event.queryStringParameters?.cursor) };
      uuidParam(event, 'projectId');
      const project = await repo.project(id);
      if (!project || project.status !== 'PUBLICADO') throw notFound();
      if (event.rawPath.endsWith('/stats')) return { data: { projectId: id, confirmedAmountCents: project.confirmedAmountCents, goalAmountCents: project.goalAmountCents, currency: 'PEN' } };
      return { data: project };
    }),
    manageProjects: endpoint('PROJECT_MANAGE', async event => {
      const identity = authorize(event, 'GESTOR', 'api/projects.write');
      if (event.requestContext.http.method === 'POST') return { status: 201, data: await repo.createProject(body(event, projectInput), identity.sub, event.requestContext.requestId) };
      return { data: await repo.publishProject(uuidParam(event, 'projectId'), identity.sub, event.requestContext.requestId) };
    }),
    createDonation: endpoint('DONATION_CREATE', async event => {
      const identity = authorize(event, 'DONANTE', 'api/donations.write');
      const input = body(event, donationInput);
      const key = idempotencyKey.parse(event.headers['idempotency-key']);
      const payloadHash = createHash('sha256').update(JSON.stringify({ projectId: input.projectId, amountCents: input.amountCents })).digest('hex');
      return { status: 201, data: publicDonation(await repo.createDonation({ input, donorSub: identity.sub, key, payloadHash, now: new Date().toISOString(), requestId: event.requestContext.requestId })) };
    }),
    history: endpoint('DONATION_READ', async event => {
      const identity = authorize(event, 'DONANTE', 'api/donations.read');
      if (event.pathParameters?.donationId) {
        const donation = await repo.donation(uuidParam(event, 'donationId'));
        if (!donation || donation.donorSub !== identity.sub) throw notFound();
        return { data: publicDonation(donation) };
      }
      const page = await repo.donations(identity.sub, event.queryStringParameters?.cursor);
      return { data: { ...page, items: page.items.map(publicDonation) } };
    }),
    simulate: endpoint('DONATION_SIMULATE', async event => {
      if (process.env.STAGE !== 'academic') throw notFound();
      const identity = authorize(event, 'DONANTE', 'api/donations.write');
      const { outcome } = body(event, simulationInput);
      return { data: publicDonation(await repo.simulate(uuidParam(event, 'donationId'), identity.sub, outcome, event.requestContext.requestId)) };
    }),
    audit: endpoint('AUDIT_READ', async event => {
      authorize(event, 'AUDITOR', 'api/audit.read');
      const type = event.queryStringParameters?.type ?? 'PROJECT_CREATED';
      if (!['PROJECT_CREATED', 'PROJECT_PUBLISHED', 'DONATION_CREATED', 'DONATION_CONFIRMED', 'DONATION_REJECTED'].includes(type)) throw new ApiError(400, 'INVALID_TYPE', 'El tipo de evento no es válido.');
      return { data: await repo.audit(type, event.queryStringParameters?.cursor) };
    }),
  };
}
