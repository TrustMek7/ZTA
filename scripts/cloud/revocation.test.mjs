import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

for (const earlyDenial of [false, true]) test(`T13 offline: ${earlyDenial ? 'no aprueba si rechaza antes de expirar' : '200, cierre, espera y 401 sin guardar token'}`, async t => {
  const prefix = join(tmpdir(), 'aqp-revocation-test-');
  const directory = await mkdtemp(prefix);
  t.after(async () => { assert(directory.startsWith(prefix)); await rm(directory, { recursive: true, force: true }); });
  const scriptUrl = new URL('./revocation.mjs', import.meta.url).href;
  const source = `
    import readline from 'node:readline/promises';
    import { syncBuiltinESMExports } from 'node:module';
    let clock = Date.now(); Date.now = () => clock;
    const realTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (fn, ms) => realTimeout(() => { clock += ms; fn(); }, 0);
    const exp = Math.floor(clock / 1000) + 240;
    const access = 'test-only.' + Buffer.from(JSON.stringify({ sub: 'fictional', token_use: 'access', exp, 'cognito:groups': ['DONANTE'] })).toString('base64url') + '.not-a-real-signature';
    const answers = [access, 'CERRADA'];
    Object.defineProperty(process.stdin, 'isTTY', { value: true });
    readline.createInterface = () => ({ question: async () => answers.shift(), close() {} });
    syncBuiltinESMExports();
    let calls = 0;
    globalThis.fetch = async () => new Response(JSON.stringify({ items: [] }), { status: (++calls === 2 && ${earlyDenial}) || clock >= exp * 1000 ? 401 : 200 });
    await import(${JSON.stringify(scriptUrl)});
  `;
  let result;
  try { result = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', source], { cwd: directory }); }
  catch (error) { if (!earlyDenial) throw error; result = error; assert.equal(error.code, 1); }
  assert(!result.stdout.includes('not-a-real-signature'));
  const files = await readdir(join(directory, '.artifacts'));
  const text = await readFile(join(directory, '.artifacts', files[0]), 'utf8');
  const evidence = JSON.parse(text);
  assert(!text.includes('not-a-real-signature'));
  assert.equal(evidence.status, earlyDenial ? 'NOT_VERIFIED' : 'PASS_ACCESS_TOKEN_WINDOW');
  assert.deepEqual(evidence.checks.map(check => check.httpStatus), earlyDenial ? [200, 401] : [200, 200, 401]);
});
