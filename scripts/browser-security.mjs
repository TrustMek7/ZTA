import { chromium } from '@playwright/test';
import { runSecurity } from './cloud/security.mjs';

const browser = await chromium.launch({ headless: false });
const credentials = {};
const tasks = ['manager', 'donor', 'other'].map(async (role) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const ready = new Promise(resolve => {
    page.on('response', async response => {
      try {
        const url = new URL(response.url());
        if (url.hostname !== 'aqp-solidaria-jlc-2026.auth.us-east-2.amazoncognito.com' || url.pathname !== '/oauth2/token' || response.status() !== 200) return;
        const data = await response.json();
        const claims = JSON.parse(Buffer.from(data.access_token.split('.')[1], 'base64url').toString());
        if (!claims['cognito:groups']?.includes(role === 'manager' ? 'GESTOR' : 'DONANTE')) {
          console.log(`Cuenta incorrecta en ventana ${role}; usa el rol indicado.`); return;
        }
        credentials[role] = data.access_token;
        if (role === 'donor') credentials.id = data.id_token;
        console.log(`Sesion preparada: ${role}. No se guardan tokens.`);
        resolve();
      } catch { /* Never expose authentication data. */ }
    });
  });
  await page.goto('https://d22p2zux1ennmn.cloudfront.net');
  await page.evaluate(label => { document.title = label; }, `PRUEBA ${role}: iniciar sesion`);
  console.log(`Ventana abierta: ${role}`);
  await ready;
});
try {
  await Promise.all(tasks);
  console.log('Tres sesiones listas. Ejecutando suite contra AWS.');
  await runSecurity(credentials);
} finally { await browser.close(); }
