import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client, endpoint, report, runId } from './common.mjs';
const api = new Client(endpoint());
const result = { run: runId(), client: 'Equipo local del operador; no se asume región física', checks: [] };
async function check(name, work) {
  try { const detail = await work(); result.checks.push({ name, status: 'PASS', ...detail }); console.log(`PASS ${name}`); }
  catch (error) { result.checks.push({ name, status: 'FAIL', message: error.message }); process.exitCode = 1; console.log(`FAIL ${name}: ${error.message}`); }
}
let projects;
await check('T01 / HU-01: catálogo público con 50 publicados y sin identidad de donantes', async () => {
  projects = await api.all('/projects');
  assert.equal(projects.length, 50);
  assert(projects.every(p => p.status === 'PUBLICADO' && p.currency === 'PEN' && !Object.hasOwn(p, 'donorSub')));
  return { publishedCount: projects.length };
});
await check('HU-02: detalle público y 404 opaco para UUID inexistente', async () => {
  assert(projects?.length);
  const detail = await api.ok(`/projects/${projects[0].projectId}`);
  assert.equal(detail.projectId, projects[0].projectId);
  assert.equal(detail.status, 'PUBLICADO');
  const missing = await api.request(`/projects/${randomUUID()}`);
  assert.equal(missing.status, 404);
  assert.equal(missing.data.description, undefined);
});
await check('HU-09: agregados en céntimos sin registros individuales', async () => {
  assert(projects?.length);
  const stats = await api.ok(`/projects/${projects[0].projectId}/stats`);
  assert(Number.isSafeInteger(stats.confirmedAmountCents) && stats.confirmedAmountCents >= 0);
  assert(Number.isSafeInteger(stats.goalAmountCents) && stats.goalAmountCents > 0);
  assert.equal(stats.currency, 'PEN'); assert.equal(stats.donorSub, undefined); assert.equal(stats.donations, undefined);
});
await check('T02: donación sin token devuelve 401', async () => {
  assert(projects?.length);
  const response = await api.request('/donations', { method: 'POST', body: { projectId: projects[0].projectId, amountCents: 100 }, key: randomUUID() });
  assert.equal(response.status, 401);
});
for (const path of ['/donations/me', '/audit']) await check(`Sin sesión: ${path} devuelve 401`, async () => assert.equal((await api.request(path)).status, 401));
await check('Credencial JWT malformada devuelve 401', async () => assert.equal((await api.request('/donations/me', { token: 'invalid.jwt.signature' })).status, 401));
await check('CA-NF11.2: cabeceras de seguridad de CloudFront', async () => {
  const response = await fetch('https://d22p2zux1ennmn.cloudfront.net/', { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200);
  const values = Object.fromEntries(['strict-transport-security', 'content-security-policy', 'x-content-type-options', 'referrer-policy', 'x-frame-options'].map(key => [key, response.headers.get(key)]));
  assert.match(values['strict-transport-security'] ?? '', /max-age=31536000/);
  assert.equal(values['x-content-type-options'], 'nosniff');
  assert.equal(values['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.equal(values['x-frame-options'], 'DENY');
  assert.match(values['content-security-policy'] ?? '', /object-src 'none'/);
  assert.match(values['content-security-policy'] ?? '', /frame-ancestors 'none'/);
  return { headers: values };
});
console.log(`Reporte: ${await report(`public-checks-${result.run}`, result)}`);
