import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client, checkToken, endpoint, percentile, requireStatus } from './common.mjs';

test('solo permite una API académica HTTPS de API Gateway', () => {
  assert.equal(endpoint('https://example123.execute-api.us-east-2.amazonaws.com/academic'), 'https://example123.execute-api.us-east-2.amazonaws.com/academic');
  for (const url of ['http://example123.execute-api.us-east-2.amazonaws.com/academic', 'https://example.org/academic', 'https://example123.execute-api.us-east-2.amazonaws.com/production', 'https://example123.execute-api.us-east-2.amazonaws.com/academic?token=example', 'https://user:password@example123.execute-api.us-east-2.amazonaws.com/academic']) assert.throws(() => endpoint(url));
});
test('p95 usa el rango más cercano sin alterar las muestras', () => {
  const numbers = Array.from({ length: 100 }, (_, n) => 100 - n);
  assert.equal(percentile(numbers), 95); assert.equal(numbers[0], 100); assert.throws(() => percentile([]));
});
test('preflight distingue access token, rol y expiración sin autenticarlo', () => {
  const fake = data => `test-only.${Buffer.from(JSON.stringify(data)).toString('base64url')}.not-a-signature`;
  const valid = { sub: 'fictional-donor', token_use: 'access', exp: Math.floor(Date.now() / 1000) + 600, 'cognito:groups': ['DONANTE'] };
  assert.equal(checkToken(fake(valid), 'DONANTE').sub, 'fictional-donor');
  assert.throws(() => checkToken(fake({ ...valid, token_use: 'id' }), 'DONANTE'));
  assert.throws(() => checkToken(fake(valid), 'GESTOR'));
  assert.throws(() => checkToken(fake({ ...valid, exp: 1 }), 'DONANTE'));
});
test('envía identidad por cabecera, preserva céntimos y no reintenta una escritura', async () => {
  const calls = [];
  const client = new Client(endpoint(), async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify({ donationId: 'fictional' }), { status: 201 }); }, 0);
  const result = await client.request('/donations', { token: 'test-only-token', method: 'POST', key: 'test-key', body: { amountCents: 101 } });
  assert.equal(result.status, 201); assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-only-token');
  assert.equal(calls[0].options.headers['Idempotency-Key'], 'test-key');
  assert.equal(JSON.parse(calls[0].options.body).amountCents, 101);
  assert(!calls[0].url.includes('test-only-token'));
});
test('recorre páginas y detecta cursores repetidos', async () => {
  let calls = 0;
  const client = new Client(endpoint(), async () => new Response(JSON.stringify(++calls === 1 ? { items: [1], nextCursor: 'next' } : { items: [2] })), 0);
  assert.deepEqual(await client.all('/projects'), [1, 2]);
  const loop = new Client(endpoint(), async () => new Response(JSON.stringify({ items: [], nextCursor: 'loop' })), 0);
  await assert.rejects(() => loop.all('/projects'), /Paginación repetida/);
});
test('un fallo de red no revela el error de transporte ni repite POST', async () => {
  let calls = 0;
  const client = new Client(endpoint(), async () => { calls++; throw new Error('sensitive fixture'); }, 0);
  await assert.rejects(() => client.request('/projects', { method: 'POST' }), e => !e.message.includes('sensitive fixture'));
  assert.equal(calls, 1);
  assert.throws(() => requireStatus({ status: 200 }, [403, 404]));
});
