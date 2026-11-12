import { chromium } from '@playwright/test';
import { createInterface } from 'node:readline';
import { mkdir } from 'node:fs/promises';

// Ephemeral context: no existing Chrome profile, cookies, HAR, tracing or token files.
const app = 'https://d22p2zux1ennmn.cloudfront.net';
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
let loginTokens;
page.on('response', async response => {
  try {
    const url = new URL(response.url());
    if (url.origin !== 'https://aqp-solidaria-jlc-2026.auth.us-east-2.amazoncognito.com' || url.pathname !== '/oauth2/token' || response.status() !== 200) return;
    const data = await response.json();
    // Retain only access/ID tokens in process memory for the authorized negative test.
    // Never print the response, retain refresh tokens, or export browser storage.
    loginTokens = { access: data.access_token, id: data.id_token };
  } catch { /* No authentication data is logged. */ }
});
await mkdir('.artifacts/capturas', { recursive: true });
await page.goto(app, { waitUntil: 'networkidle' });
console.log('Navegador de pruebas abierto. El usuario inicia sesión manualmente; no se registran credenciales.');
console.log('Comandos: status | shot nombre | nav ruta | project texto | amount numero | donate | confirm | reject | id-test | viewport ancho alto | quit');
const rl = createInterface({ input: process.stdin, terminal: false });
try {
  for await (const line of rl) {
    try {
      const command = line.trim();
      if (command === 'quit') break;
      const current = new URL(page.url());
      if (command === 'status') {
        console.log(JSON.stringify({ origin: current.origin, path: current.pathname, navigation: current.origin === app ? await page.locator('header nav').innerText() : 'Inicio de sesión en curso; contenido no inspeccionado.' }));
      } else if (command.startsWith('shot ')) {
        if (current.origin !== app || current.pathname.startsWith('/auth/')) throw new Error('Solo se capturan vistas de la aplicación, fuera del callback. No se capturan credenciales ni registro MFA.');
        const name = command.slice(5);
        if (!/^[a-z0-9-]{1,70}$/.test(name)) throw new Error('Nombre de captura inválido.');
        await page.screenshot({ path: `.artifacts/capturas/${name}.png`, mask: [page.locator('input[type="password"], input[type="email"], input[type="tel"], input[autocomplete="one-time-code"]')], maskColor: '#64748b', animations: 'disabled' });
        console.log(`Captura guardada: .artifacts/capturas/${name}.png`);
      } else if (command.startsWith('nav ')) {
        if (current.origin !== app) throw new Error('Completa primero el inicio de sesión manual.');
        const route = command.slice(4);
        if (!['/', '/gestion', '/mis-donaciones', '/transparencia'].includes(route)) throw new Error('Ruta no permitida por esta herramienta de captura.');
        const link = page.locator(`a[href="${route}"]`).first();
        if (await link.count()) await link.click();
        else await page.evaluate(path => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }, route);
        await page.waitForLoadState('networkidle');
        console.log(`Navegación completada: ${route}`);
      } else if (command.startsWith('project ')) {
        if (current.origin !== app) throw new Error('Completa primero el inicio de sesión manual.');
        await page.locator('.project-card').filter({ hasText: command.slice(8) }).first().locator('h3 a').click();
        await page.waitForLoadState('networkidle');
        console.log('Detalle de proyecto abierto.');
      } else if (command.startsWith('amount ')) {
        if (current.origin !== app || !/^\d{1,4}(\.\d{1,2})?$/.test(command.slice(7))) throw new Error('Monto o página inválidos.');
        await page.locator('#amount').fill(command.slice(7));
        console.log('Monto de prueba establecido.');
      } else if (['donate', 'confirm', 'reject'].includes(command)) {
        if (current.origin !== app) throw new Error('Acción permitida solo en la app académica.');
        const label = { donate: 'Registrar aporte simulado', confirm: 'Simular confirmación', reject: 'Simular rechazo' }[command];
        await page.getByRole('button', { name: label, exact: true }).click();
        await page.waitForLoadState('networkidle');
        console.log(`Acción académica ejecutada: ${command}`);
      } else if (command === 'id-test') {
        if (!loginTokens?.access || !loginTokens?.id) throw new Error('Falta un inicio de sesión nuevo en este navegador.');
        const idClaims = JSON.parse(Buffer.from(loginTokens.id.split('.')[1], 'base64url').toString());
        if (idClaims.token_use !== 'id') throw new Error('La respuesta no incluye un ID token reconocible.');
        const api = 'https://wqn3zzrxf5.execute-api.us-east-2.amazonaws.com/academic/v1/donations/me';
        const access = await context.request.get(api, { headers: { Authorization: `Bearer ${loginTokens.access}` } });
        const identity = await context.request.get(api, { headers: { Authorization: `Bearer ${loginTokens.id}` } });
        const evidence = { test: 'T11-ID-token', timestamp: new Date().toISOString(), accessTokenStatus: access.status(), idTokenStatus: identity.status(), idTokenUseVerified: true, passed: access.status() === 200 && identity.status() === 401 };
        const { writeFile } = await import('node:fs/promises');
        await writeFile('.artifacts/capturas/t11-id-token.json', JSON.stringify(evidence, null, 2) + '\n');
        console.log(JSON.stringify(evidence));
      } else if (command.startsWith('viewport ')) {
        const [width, height] = command.slice(9).split(' ').map(Number);
        if (![375, 1440].includes(width) || ![812, 1000].includes(height)) throw new Error('Viewport fuera de los tamaños de prueba.');
        await page.setViewportSize({ width, height });
        console.log(`Viewport: ${width} x ${height}`);
      } else console.log('Comando no reconocido.');
    } catch (error) { console.log(`No se completó la operación: ${error.message.split('\n')[0]}`); }
  }
} finally { rl.close(); await browser.close(); }
