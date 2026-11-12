import { chromium } from '@playwright/test';
import { createInterface } from 'node:readline';
import { mkdir } from 'node:fs/promises';

// Ephemeral context: no existing Chrome profile, cookies, HAR, tracing or token files.
const app = 'https://d22p2zux1ennmn.cloudfront.net';
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await mkdir('.artifacts/capturas', { recursive: true });
await page.goto(app, { waitUntil: 'networkidle' });
console.log('Navegador de pruebas abierto. El usuario inicia sesión manualmente; no se registran credenciales.');
console.log('Comandos: status | shot nombre | nav /gestion | nav /mis-donaciones | nav /transparencia | nav / | quit');
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
        await page.screenshot({ path: `.artifacts/capturas/${name}.png`, mask: [page.locator('input, textarea')], animations: 'disabled' });
        console.log(`Captura guardada: .artifacts/capturas/${name}.png`);
      } else if (command.startsWith('nav ')) {
        if (current.origin !== app) throw new Error('Completa primero el inicio de sesión manual.');
        const route = command.slice(4);
        if (!['/', '/gestion', '/mis-donaciones', '/transparencia'].includes(route)) throw new Error('Ruta no permitida por esta herramienta de captura.');
        await page.locator(`a[href="${route}"]`).first().click();
        await page.waitForLoadState('networkidle');
        console.log(`Navegación completada: ${route}`);
      } else console.log('Comando no reconocido.');
    } catch (error) { console.log(`No se completó la operación: ${error.message.split('\n')[0]}`); }
  }
} finally { rl.close(); await browser.close(); }
