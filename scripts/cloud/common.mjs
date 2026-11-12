import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { mkdir, writeFile } from 'node:fs/promises';

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export const runId = () => new Date().toISOString().replace(/[:.]/g, '-');
export function endpoint(value = process.env.AQP_API_URL ?? 'https://wqn3zzrxf5.execute-api.us-east-2.amazonaws.com/academic') {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !/^[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com$/.test(url.hostname) || url.pathname !== '/academic' || url.search || url.hash || url.username || url.password) throw new Error('Usa la URL HTTPS del stage academic, sin /v1 final.');
  return url.href.replace(/\/$/, '');
}
export async function secret(prompt) {
  if (!process.stdin.isTTY) throw new Error('Ejecuta en una terminal interactiva para introducir las credenciales sin mostrarlas.');
  const output = new Writable({ write(_chunk, _encoding, done) { done(); } });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  process.stdout.write(`${prompt}: `);
  try { return (await rl.question('')).trim(); } finally { rl.close(); process.stdout.write('\n'); }
}
export function claims(token) {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')); }
  catch { throw new Error('No se pudo leer el token. Copia únicamente el valor del access_token.'); }
}
// These checks are operator hints only; only the deployed API authenticates JWTs.
export function checkToken(token, role, minSeconds = 180) {
  const data = claims(token);
  if (data.token_use !== 'access' || !Array.isArray(data['cognito:groups']) || !data['cognito:groups'].includes(role) || !data.sub) throw new Error(`Se necesita un access_token de ${role}. No uses id_token ni refresh_token.`);
  if (!Number.isFinite(data.exp) || data.exp < Date.now() / 1000 + minSeconds) throw new Error('El token está vencido o próximo a vencer. Vuelve a iniciar sesión y obtén uno nuevo.');
  return data;
}
export async function token(role, label, optional = false) {
  const value = await secret(`${label}${optional ? ' (Enter para omitir)' : ''}`);
  if (!value && optional) return undefined;
  checkToken(value, role); return value;
}
export class Client {
  constructor(base = endpoint(), transport = fetch, interval = 350) { this.base = base; this.transport = transport; this.interval = interval; this.queue = Promise.resolve(); }
  async raw(path, { token, method = 'GET', body, key } = {}) {
    const start = performance.now();
    let response;
    try { response = await this.transport(`${this.base}/v1${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'Idempotency-Key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) }); }
    catch { throw new Error('Fallo de conexión. No se reintentan escrituras automáticamente; consulta el reporte antes de repetir la carga.'); }
    const text = await response.text(); let data; try { data = JSON.parse(text); } catch { data = {}; }
    return { status: response.status, data, ms: performance.now() - start };
  }
  request(path, options) {
    const pending = this.queue.then(async () => { const result = await this.raw(path, options); await sleep(this.interval); return result; });
    this.queue = pending.catch(() => {}); return pending;
  }
  async ok(path, options, statuses = [200]) {
    const result = await this.request(path, options);
    if (!statuses.includes(result.status)) throw new Error(`Respuesta HTTP ${result.status} inesperada en ${options?.method ?? 'GET'} ${path.split('?')[0]}. Referencia: ${result.data.requestId ?? 'no disponible'}.`);
    return result.data;
  }
  async all(path, options) {
    const items = []; let cursor; const seen = new Set();
    do {
      const page = await this.ok(`${path}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, options);
      if (!Array.isArray(page.items)) throw new Error('El API no devolvió una página válida.');
      items.push(...page.items); cursor = page.nextCursor;
      if (cursor && seen.has(cursor)) throw new Error('Paginación repetida.');
      seen.add(cursor);
      if (seen.size > 100) throw new Error('Se excedió el límite de páginas de esta herramienta.');
    } while (cursor);
    return items;
  }
}
export const requireStatus = (response, expected) => {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(response.status)) throw new Error(`HTTP esperado ${allowed.join('/')}; recibido ${response.status}.`);
};
export function percentile(values, p = 0.95) {
  if (!values.length) throw new Error('No hay muestras.');
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * p) - 1];
}
// Only caller-selected, sanitized fields are passed here; never save HTTP bodies or tokens.
export async function report(name, data) {
  await mkdir('.artifacts', { recursive: true });
  const file = `.artifacts/${name}.json`;
  await writeFile(file, JSON.stringify(data, null, 2) + '\n'); return file;
}
