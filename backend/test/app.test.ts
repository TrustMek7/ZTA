import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { handlers } from '../src/app';
import type { Event } from '../src/shared/http';
import { MemoryRepository } from './memory';
import { API_AUDIENCE } from '../../shared/auth-config';

const publishedId = randomUUID(); const draftId = randomUUID();
const key = randomUUID();
function event(body?: unknown, role = 'DONANTE', sub = 'donor-a', path: Record<string, string> = {}, extraClaims = {}): Event {
  return { version: '2.0', rawPath: '/v1/donations', headers: { 'idempotency-key': key }, body: body === undefined ? undefined : JSON.stringify(body), pathParameters: path, requestContext: { requestId: 'test-request', http: { method: 'POST' }, authorizer: { jwt: { claims: { sub, token_use: 'access', client_id: 'test-client', exp: Math.floor(Date.now() / 1000) + 300, scope: 'api/projects.write api/donations.write api/donations.read api/audit.read', 'cognito:groups': `[${role}]`, ...extraClaims }, scopes: [] } } } } as unknown as Event;
}
let repo: MemoryRepository; let app: ReturnType<typeof handlers>;
const decode = (r: { body?: string }) => JSON.parse(r.body!);
beforeEach(() => {
  vi.stubEnv('COGNITO_CLIENT_ID', 'test-client'); vi.stubEnv('API_AUDIENCE', API_AUDIENCE); vi.stubEnv('STAGE', 'academic');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  repo = new MemoryRepository(); app = handlers(repo);
  const fields = { title: 'Proyecto ficticio', description: 'Una descripción de prueba con suficiente información.', goalAmountCents: 100000, confirmedAmountCents: 0, currency: 'PEN' as const, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z' };
  repo.projectRows.set(publishedId, { ...fields, projectId: publishedId, status: 'PUBLICADO' });
  repo.projectRows.set(draftId, { ...fields, projectId: draftId, status: 'BORRADOR' });
});
describe('Requisitos HU-01 a HU-09: reglas de servidor', () => {
  it('T01 / CA-01.2 oculta borradores y devuelve 404 en detalle', async () => {
    const list = decode(await app.publicProjects(event())); expect(list.items).toHaveLength(1); expect(list.items[0].projectId).toBe(publishedId);
    expect((await app.publicProjects(event(undefined, '', '', { projectId: draftId }))).statusCode).toBe(404);
  });
  it('T02 rechaza ausencia de identidad verificada', async () => { const e = event(); delete (e.requestContext as Partial<Event['requestContext']>).authorizer; expect((await app.createDonation(e)).statusCode).toBe(401); });
  it.each([{ token_use: 'id' }, { client_id: 'other' }, { aud: 'other-api' }, { exp: 1 }, { exp: 'bad' }])('T11 / CA-03.2 rechaza claims inválidos %j', async claims => { expect((await app.createDonation(event({}, 'DONANTE', 'a', {}, claims))).statusCode).toBe(401); });
  it('acepta access token Cognito sin aud y rechaza scopes ausentes', async () => {
    expect((await app.history(event())).statusCode).toBe(200);
    expect((await app.history(event(undefined, 'DONANTE', 'a', {}, { scope: '' }))).statusCode).toBe(403);
    expect((await app.history(event(undefined, 'DONANTE', 'a', {}, { aud: 'test-client' }))).statusCode).toBe(200);
  });
  it('T03 bloquea a donante creando proyecto', async () => { expect((await app.manageProjects(event({}))).statusCode).toBe(403); expect(repo.events).toHaveLength(0); });
  it.each([0, -100, 99, 100001, 100.5, '100'])('T04 rechaza monto inválido %s', async amountCents => { expect((await app.createDonation(event({ projectId: publishedId, amountCents }))).statusCode).toBe(400); expect(repo.donationRows.size).toBe(0); });
  it('CA-05.2 exige UUID de idempotencia y rechaza atributos extra', async () => {
    const e = event({ projectId: publishedId, amountCents: 100 }); e.headers = {}; expect((await app.createDonation(e)).statusCode).toBe(400);
    expect((await app.createDonation(event({ projectId: publishedId, amountCents: 100, donorSub: 'victim' }))).statusCode).toBe(400);
  });
  it('T05 crea pendiente sin incrementar total ni exponer identidad', async () => {
    const r = await app.createDonation(event({ projectId: publishedId, amountCents: 100 })); expect(r.statusCode).toBe(201); expect(decode(r).status).toBe('PENDIENTE_SIMULACION'); expect(decode(r).donorSub).toBeUndefined(); expect(repo.projectRows.get(publishedId)!.confirmedAmountCents).toBe(0);
  });
  it('CA-05.2 responde 409 para borrador y 404 para inexistente', async () => {
    expect((await app.createDonation(event({ projectId: draftId, amountCents: 100 }))).statusCode).toBe(409);
    expect((await app.createDonation(event({ projectId: randomUUID(), amountCents: 100 }))).statusCode).toBe(404);
  });
  it('T06/T07 reintenta misma intención y rechaza carga distinta', async () => {
    const e = event({ projectId: publishedId, amountCents: 100 }); const first = await app.createDonation(e); const second = await app.createDonation(e); expect(decode(first)).toEqual(decode(second)); expect(repo.donationRows.size).toBe(1);
    expect((await app.createDonation(event({ projectId: publishedId, amountCents: 200 }))).statusCode).toBe(409);
  });
  it('T08 lógica local: diez confirmaciones producen un incremento', async () => {
    const d = decode(await app.createDonation(event({ projectId: publishedId, amountCents: 100 })));
    const responses = await Promise.all(Array.from({ length: 10 }, () => app.simulate(event({ outcome: 'CONFIRMADA_SIMULADA' }, 'DONANTE', 'donor-a', { donationId: d.donationId }))));
    expect(responses.filter(r => r.statusCode === 200)).toHaveLength(1); expect(responses.filter(r => r.statusCode === 409)).toHaveLength(9); expect(repo.projectRows.get(publishedId)!.confirmedAmountCents).toBe(100);
  });
  it('CA-06.3 rechazo no cambia total y CA-06.1 no opera fuera de academic', async () => {
    const d = decode(await app.createDonation(event({ projectId: publishedId, amountCents: 100 })));
    await app.simulate(event({ outcome: 'RECHAZADA_SIMULADA' }, 'DONANTE', 'donor-a', { donationId: d.donationId })); expect(repo.projectRows.get(publishedId)!.confirmedAmountCents).toBe(0);
    vi.stubEnv('STAGE', 'production'); expect((await app.simulate(event())).statusCode).toBe(404);
  });
  it('T09/T12 propiedad y permisos protegen historial y simulación', async () => {
    const d = decode(await app.createDonation(event({ projectId: publishedId, amountCents: 100 })));
    expect((await app.history(event(undefined, 'DONANTE', 'donor-b', { donationId: d.donationId }))).statusCode).toBe(404);
    expect((await app.simulate(event({ outcome: 'CONFIRMADA_SIMULADA' }, 'DONANTE', 'donor-b', { donationId: d.donationId }))).statusCode).toBe(404);
    expect(decode(await app.history(event(undefined, 'DONANTE', 'donor-b'))).items).toEqual([]);
    expect((await app.history(event(undefined, 'GESTOR'))).statusCode).toBe(403);
  });
  it('HU-08 registra creación/publicación y evita doble publicación', async () => {
    const r = await app.manageProjects(event({ title: 'Proyecto de prueba', description: 'Este es un proyecto ficticio para probar la publicación.', goalAmountCents: 50000 }, 'GESTOR'));
    expect(r.statusCode).toBe(201); expect(decode(r).status).toBe('BORRADOR');
    const e = event(undefined, 'GESTOR', 'manager', { projectId: decode(r).projectId }); e.requestContext.http.method = 'PATCH';
    expect((await app.manageProjects(e)).statusCode).toBe(200); expect((await app.manageProjects(e)).statusCode).toBe(409);
    expect(repo.events.map(e => e.action)).toEqual(['PROJECT_CREATED', 'PROJECT_PUBLISHED']); expect(repo.events[0].actorRef).not.toBe('manager');
  });
});
