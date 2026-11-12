import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
const domain = 'https://aqp-solidaria-jlc-2026.auth.us-east-2.amazoncognito.com';
const state = { test: 'T13', checks: [] };
const run = new Date().toISOString().replace(/[:.]/g, '-');
let resolve;
const authenticated = new Promise(done => { resolve = done; });
page.on('response', async response => {
  try {
    if (response.url() !== `${domain}/oauth2/token` || response.status() !== 200) return;
    const data = await response.json();
    const claims = JSON.parse(Buffer.from(data.access_token.split('.')[1], 'base64url').toString());
    if (!claims['cognito:groups']?.includes('DONANTE')) { console.log('Utiliza una cuenta DONANTE.'); return; }
    resolve({ data, claims });
  } catch { /* No credentials are logged or saved. */ }
});
await page.goto('https://d22p2zux1ennmn.cloudfront.net');
await page.evaluate(() => { document.title = 'T13 AUTOMATICA - DONANTE'; });
console.log('Inicia sesion DONANTE en T13 AUTOMATICA. No cierres sesion; la prueba revoca automaticamente.');
try {
  const { data, claims } = await authenticated;
  const check = async phase => {
    const response = await context.request.get('https://wqn3zzrxf5.execute-api.us-east-2.amazonaws.com/academic/v1/donations/me', { headers: { Authorization: `Bearer ${data.access_token}` } });
    state.checks.push({ phase, status: response.status(), timestamp: new Date().toISOString() });
    console.log(`${phase}: ${response.status()}`);
    return response.status();
  };
  const before = await check('Antes de revocar');
  const revoked = await context.request.post(`${domain}/oauth2/revoke`, { form: { client_id: claims.client_id, token: data.refresh_token } });
  state.revocationHttpStatus = revoked.status();
  const refresh = await context.request.post(`${domain}/oauth2/token`, { form: { grant_type: 'refresh_token', client_id: claims.client_id, refresh_token: data.refresh_token } });
  state.revokedRefreshStatus = refresh.status();
  state.revokedRefreshError = (await refresh.json()).error;
  const after = await check('Despues de revocar y antes de expirar');
  console.log(`Revocacion HTTP ${revoked.status()}; refresh revocado HTTP ${refresh.status()}. Esperando expiracion.`);
  while (Date.now() < claims.exp * 1000 + 10000) {
    const left = claims.exp * 1000 + 10000 - Date.now();
    console.log(`T13: ${Math.ceil(left / 1000)} segundos restantes.`);
    await new Promise(done => setTimeout(done, Math.min(30000, left)));
  }
  const expired = await check('Despues de expirar');
  state.passed = before === 200 && revoked.status() === 200 && refresh.status() === 400 && after === 200 && expired === 401;
  console.log(`T13: ${state.passed ? 'PASS' : 'FAIL'}`);
} catch { state.passed = false; state.error = 'No se completo la verificacion.'; }
finally {
  state.finishedAt = new Date().toISOString();
  await writeFile(`.artifacts/revocation-browser-${run}.json`, JSON.stringify(state, null, 2));
  console.log(`Reporte: .artifacts/revocation-browser-${run}.json`);
  await browser.close();
}
