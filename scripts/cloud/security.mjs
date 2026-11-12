import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client, endpoint, claims, token, secret, report, requireStatus, runId, sleep } from './common.mjs';

const api = new Client(endpoint()); const id = runId();
const state = { run: id, startedAt: new Date().toISOString(), projectIds: [], donationIds: [], tests: [], executionCompleted: false, allRequirementsVerified: false };
async function test(name, run) {
  try { const details = await run(); state.tests.push({ name, status: 'PASS', ...details }); console.log(`PASS ${name}`); }
  catch (error) { state.tests.push({ name, status: 'FAIL', message: error.message }); console.log(`FAIL ${name}: ${error.message}`); process.exitCode = 1; }
}
function skip(name, reason) { state.tests.push({ name, status: 'PENDING', reason }); console.log(`PENDING ${name}: ${reason}`); }
try {
  console.log('Esta prueba crea un proyecto de control y dos donaciones simuladas; la confirmación suma S/ 1.00 solo a ese proyecto. No modifica campañas existentes.');
  const manager = await token('GESTOR', 'Access token del GESTOR');
  const donor = await token('DONANTE', 'Access token del DONANTE 1');
  const other = await token('DONANTE', 'Access token del DONANTE 2', true);
  if (claims(manager).sub === claims(donor).sub || (other && claims(other).sub === claims(donor).sub)) throw new Error('Usa cuentas distintas para gestor y donantes. No cambies los grupos de una cuenta para simular dos identidades.');
  const idToken = await secret('ID token del DONANTE 1 (opcional; Enter para dejar ese caso pendiente)');
  const input = { title: `[QA ${id}] Proyecto de seguridad`, description: 'Proyecto ficticio y aislado para comprobar autorización, integridad e idempotencia. No representa recaudación ni beneficiarios reales.', goalAmountCents: 100000 };
  const project = await api.ok('/projects', { method: 'POST', token: manager, body: input }, [201]);
  state.projectIds.push(project.projectId);
  const detail = `/projects/${project.projectId}`;
  await test('T01: borrador oculto y catálogo público', async () => {
    requireStatus(await api.request(detail), 404);
    const items = await api.all('/projects'); assert(items.every(p => p.status === 'PUBLICADO')); assert(!items.some(p => p.projectId === project.projectId));
  });
  await api.ok(`${detail}/publish`, { method: 'PATCH', token: manager });
  const published = await api.ok(detail); assert.equal(published.status, 'PUBLICADO');
  const body = { projectId: project.projectId, amountCents: 100 };
  await test('T02: sin token no se puede donar', async () => requireStatus(await api.request('/donations', { method: 'POST', body, key: randomUUID() }), 401));
  await test('T03: donante no crea proyectos', async () => requireStatus(await api.request('/projects', { method: 'POST', token: donor, body: input }), 403));
  await test('T04: montos inválidos y clave obligatoria', async () => {
    for (const amountCents of [0, -100, 100001, 100.5]) requireStatus(await api.request('/donations', { method: 'POST', token: donor, body: { ...body, amountCents }, key: randomUUID() }), 400);
    requireStatus(await api.request('/donations', { method: 'POST', token: donor, body }), 400);
  });
  const key = randomUUID();
  const created = await api.ok('/donations', { method: 'POST', token: donor, body, key }, [201]);
  state.donationIds.push(created.donationId);
  const donationPath = `/donations/${created.donationId}`;
  await test('T05: intención pendiente sin incremento', async () => { assert.equal(created.status, 'PENDIENTE_SIMULACION'); assert.equal(created.amountCents, 100); assert.equal(created.donorSub, undefined); assert.equal((await api.ok(`${detail}/stats`)).confirmedAmountCents, 0); });
  await test('T06: misma clave devuelve la misma intención', async () => {
    const replay = await api.request('/donations', { method: 'POST', token: donor, body, key }); requireStatus(replay, 201); assert.equal(replay.data.donationId, created.donationId);
  });
  await test('T07: misma clave y otro monto devuelve conflicto', async () => requireStatus(await api.request('/donations', { method: 'POST', token: donor, body: { ...body, amountCents: 200 }, key }), 409));
  if (other) await test('T09: donante 2 no consulta ni confirma una donación ajena', async () => {
    requireStatus(await api.request(donationPath, { token: other }), [403, 404]);
    requireStatus(await api.request(`${donationPath}/simulate`, { method: 'POST', token: other, body: { outcome: 'CONFIRMADA_SIMULADA' } }), [403, 404]);
  }); else skip('T09', 'Falta token de otro donante.');
  await test('T12: gestor no consulta historial de donantes', async () => {
    requireStatus(await api.request('/donations/me', { token: manager }), [403, 404]);
    requireStatus(await api.request(donationPath, { token: manager }), [403, 404]);
  });
  await test('T11-firma: token alterado rechazado', async () => {
    const parts = donor.split('.'); parts[2] = `${parts[2][0] === 'A' ? 'B' : 'A'}${parts[2].slice(1)}`;
    requireStatus(await api.request('/donations/me', { token: parts.join('.') }), 401);
  });
  if (idToken) await test('T11-ID-token: ID token rechazado como Bearer', async () => {
    assert.equal(claims(idToken).token_use, 'id'); requireStatus(await api.request('/donations/me', { token: idToken }), 401);
  }); else skip('T11-ID-token', 'No se introdujo ID token.');
  await test('T08: diez confirmaciones paralelas, un solo incremento', async () => {
    await sleep(2500); // Refill the academic stage burst budget before the actual concurrent requests.
    const responses = await Promise.all(Array.from({ length: 10 }, () => api.raw(`${donationPath}/simulate`, { method: 'POST', token: donor, body: { outcome: 'CONFIRMADA_SIMULADA' } })));
    const statuses = responses.map(r => r.status);
    assert.equal(statuses.filter(s => s === 200).length, 1, `Estados recibidos: ${statuses.join(',')}`);
    assert.equal(statuses.filter(s => s === 409).length, 9, `Estados recibidos: ${statuses.join(',')}; un 429 indica throttling y requiere repetir con otra intención.`);
    await sleep(1500); assert.equal((await api.ok(`${detail}/stats`)).confirmedAmountCents, 100);
    assert.equal((await api.ok(donationPath, { token: donor })).status, 'CONFIRMADA_SIMULADA');
    return { statuses, incrementCents: 100 };
  });
  await test('CA-06.3: rechazo sin incrementar acumulado', async () => {
    const rejected = await api.ok('/donations', { method: 'POST', token: donor, body: { ...body, amountCents: 200 }, key: randomUUID() }, [201]); state.donationIds.push(rejected.donationId);
    const before = (await api.ok(`${detail}/stats`)).confirmedAmountCents;
    const result = await api.ok(`/donations/${rejected.donationId}/simulate`, { method: 'POST', token: donor, body: { outcome: 'RECHAZADA_SIMULADA' } });
    assert.equal(result.status, 'RECHAZADA_SIMULADA'); assert.equal((await api.ok(`${detail}/stats`)).confirmedAmountCents, before);
  });
  await test('HU-07: historial incluye una sola intención para la clave repetida', async () => {
    let items = [];
    for (let n = 0; n < 10; n++) { items = await api.all('/donations/me', { token: donor }); if (state.donationIds.every(id => items.some(d => d.donationId === id))) break; await sleep(1000); }
    assert(state.donationIds.every(id => items.some(d => d.donationId === id))); assert.equal(items.filter(d => d.donationId === created.donationId).length, 1); assert(items.every(d => !Object.hasOwn(d, 'donorSub')));
  });
  skip('T10', 'Requiere comprobación de permisos efectivos del rol de listado en AWS.');
  skip('T13', 'Requiere revocar refresh token y comprobar acceso antes y después de expirar.');
  skip('T14', 'Requiere evidencia de que Cognito no entrega tokens al gestor sin completar TOTP.');
  state.executionCompleted = true;
  console.log(`Resultado: ${state.tests.filter(t => t.status === 'PASS').length} comprobaciones aprobadas, ${state.tests.filter(t => t.status === 'FAIL').length} fallidas y ${state.tests.filter(t => t.status === 'PENDING').length} pendientes. No acredita todos los requisitos.`);
} catch (error) { state.error = error.message; process.exitCode = 1; console.error(error.message); }
finally { state.finishedAt = new Date().toISOString(); console.log(`Reporte sin credenciales: ${await report(`security-${id}`, state)}`); }
