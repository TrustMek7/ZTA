import { Client, claims, endpoint, report, runId, secret, sleep, token } from './common.mjs';

const api = new Client(endpoint()); const id = runId();
const evidence = { run: id, startedAt: new Date().toISOString(), test: 'T13', status: 'INCOMPLETE', checks: [] };
try {
  console.log('Prueba de solo lectura. Mantén CloudShell abierto; puede durar hasta 10 minutos. No se guarda el token.');
  const access = await token('DONANTE', 'Access token reciente del DONANTE');
  const expiresAt = claims(access).exp * 1000;
  evidence.tokenExpiresAt = new Date(expiresAt).toISOString();
  const check = async phase => {
    const result = await api.request('/donations/me', { token: access });
    evidence.checks.push({ phase, timestamp: new Date().toISOString(), httpStatus: result.status });
    console.log(`${phase}: HTTP ${result.status}`);
    return result.status;
  };
  if (await check('Antes de cerrar sesión') !== 200) throw new Error('La credencial inicial no fue aceptada. Obtén un access token reciente de DONANTE.');
  console.log('Ahora pulsa Cerrar sesión en la app usando la misma sesión de donde copiaste el token.');
  console.log('No basta con cerrar la pestaña. Si la app informa que no pudo revocar la sesión remota, esta prueba no acredita la revocación.');
  const confirmation = await secret('Después de cerrar sesión sin errores, escribe CERRADA y pulsa Enter');
  if (confirmation !== 'CERRADA') throw new Error('No se confirmó el cierre de sesión. La prueba queda incompleta.');
  if (Date.now() >= expiresAt) throw new Error('El token ya expiró antes de probar la ventana posterior al cierre. Repite con un token nuevo.');
  evidence.logoutReportedByOperatorAt = new Date().toISOString();
  const afterLogout = await check('Después del cierre, antes de expirar');
  if (afterLogout !== 200) throw new Error(`Se recibió HTTP ${afterLogout} antes de expirar. No se observó la ventana documentada; investigar antes de dar T13 por aprobada.`);
  while (Date.now() < expiresAt + 10000) {
    const remaining = Math.ceil((expiresAt + 10000 - Date.now()) / 1000);
    console.log(`Esperando expiración: aproximadamente ${remaining} segundos restantes.`);
    await sleep(Math.min(30000, Math.max(1, expiresAt + 10000 - Date.now())));
  }
  const afterExpiry = await check('Después de expirar');
  if (afterExpiry !== 401) throw new Error(`Se esperaba HTTP 401 tras expirar y se obtuvo ${afterExpiry}. No modificar permisos: revisar reloj, exp y authorizer.`);
  evidence.status = 'PASS_ACCESS_TOKEN_WINDOW';
  console.log('Se observó 200 antes y después del cierre, y 401 tras expirar: coincide con la limitación del JWT authorizer.');
  console.log('Adjunta también evidencia sanitizada del cierre de sesión y de que /oauth2/revoke respondió correctamente; el script no puede verificar el refresh token del navegador.');
} catch (error) { evidence.status = 'NOT_VERIFIED'; evidence.message = error.message; console.error(error.message); process.exitCode = 1; }
finally { evidence.finishedAt = new Date().toISOString(); console.log(`Reporte sin credenciales: ${await report(`revocation-${id}`, evidence)}`); }
