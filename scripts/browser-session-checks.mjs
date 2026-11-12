import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const app = 'https://d22p2zux1ennmn.cloudfront.net';
const domain = 'https://aqp-solidaria-jlc-2026.auth.us-east-2.amazoncognito.com';
const run = new Date().toISOString().replace(/[:.]/g, '-');
const state = { run, T14: {} };
const browser = await chromium.launch({ headless: false });
await mkdir('.artifacts/capturas', { recursive: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function login(role, onPage) {
  const context = await browser.newContext();
  const page = await context.newPage();
  let issued = 0;
  let complete;
  const ready = new Promise(resolve => { complete = resolve; });
  page.on('response', async response => {
    try {
      const url = new URL(response.url());
      if (url.origin !== domain || url.pathname !== '/oauth2/token' || response.status() !== 200) return;
      const data = await response.json();
      const claims = JSON.parse(Buffer.from(data.access_token.split('.')[1], 'base64url').toString());
      if (!claims['cognito:groups']?.includes(role)) { console.log(`Se requiere ${role} en esta ventana.`); return; }
      issued++;
      complete({ context, page, data, claims });
    } catch { /* Never log credentials. */ }
  });
  await page.goto(app);
  await page.evaluate(value => { document.title = value; }, `VERIFICACION ${role}`);
  console.log(`Ventana de verificacion: ${role}`);
  if (onPage) void onPage(page, () => issued);
  return ready;
}
const manager = login('GESTOR', async (page, issued) => {
  // Only capture the OTP challenge, never enrollment QR or password screens.
  for (let i = 0; i < 900; i++) {
    if (page.isClosed()) return;
    const url = new URL(page.url());
    const otp = page.locator('input[name="totpCode"], input[name="mfaCode"], input[autocomplete="one-time-code"]');
    if (url.origin === domain && await otp.count() && await otp.first().isVisible()) {
      state.T14.challengeObservedAt = new Date().toISOString();
      state.T14.tokensIssuedBeforeChallenge = issued();
      await page.screenshot({ path: '.artifacts/capturas/t14-desafio-controlado.png', mask: [page.locator('input')], animations: 'disabled' });
      console.log('T14: desafio MFA observado, sin emision previa de tokens. Ya puedes completar el codigo.');
      return;
    }
    await sleep(1000);
  }
});
try {
  const m = await manager;
  state.T14.tokenIssuedAfterMfaAt = new Date().toISOString();
  state.T14.roleVerified = m.claims['cognito:groups'].includes('GESTOR');
  state.T14.passed = Boolean(state.T14.challengeObservedAt) && state.T14.tokensIssuedBeforeChallenge === 0;
  console.log(`T14: ${state.T14.passed ? 'PASS' : 'EVIDENCIA INCOMPLETA'}`);
} catch (error) { state.error = error.message.split('\n')[0]; console.log('Verificacion interrumpida; se conserva evidencia parcial sin credenciales.'); }
finally {
  state.finishedAt = new Date().toISOString();
  await writeFile(`.artifacts/session-checks-${run}.json`, JSON.stringify(state, null, 2));
  console.log(`Reporte: .artifacts/session-checks-${run}.json`);
  await browser.close();
}
