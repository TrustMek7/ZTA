# Validaciones en el entorno académico

Ejecutar desde CloudShell con Node 24, en la cuenta y proyecto de prueba del titular. Los scripts hacen solicitudes reales al API desplegado; no son una prueba sin efectos. El código de los scripts no se sirve al público ni se instala en Lambda. No necesitan reinstalar paquetes ni desplegar otra pila.

## Cuentas y orden

Mantener tres identidades distintas: GESTOR, DONANTE 1 y DONANTE 2. No cambiar el grupo de una misma identidad para simular acceso ajeno. El segundo donante debe haber completado su primer acceso, contraseña nueva y MFA. Un auditor adicional permite demostrar la extensión de auditoría.

Orden recomendado:

1. Ejecutar seguridad. Crea un proyecto exclusivo de QA y dos donaciones; una confirma S/ 1.00 y la otra rechaza S/ 2.00. No usa ni modifica campañas existentes.
2. Corregir fallos antes de añadir datos de rendimiento. Cada ejecución de seguridad crea otro proyecto de control.
3. Ejecutar la carga: completa el catálogo hasta 50 publicados contando los existentes; no añade 50 a ciegas.
4. Medir rendimiento sin publicar nuevos proyectos ni ejecutar otros scripts en paralelo.
5. Completar comprobaciones manuales de IAM, revocación, MFA, cabeceras y observabilidad.

Si el catálogo ya tiene más de 50 proyectos, la carga se detiene sin borrar nada. Debe acordarse un conjunto de datos antes de medir. No eliminar registros a ciegas: pueden tener donaciones vinculadas. Los IDs de QA quedan en reportes para revisar la limpieza supervisada al final de la evaluación.

## Obtener tokens sin compartirlos

Usar la sesión de Cognito de cada cuenta. Los scripts solicitan los tokens en una terminal interactiva y ocultan lo pegado. No escribir tokens en comandos, archivos, capturas, chats ni informes. No copiar contraseñas, QR ni refresh tokens.

1. En el navegador abre la aplicación. Abre DevTools (F12) → Red/Network. Desactiva Preserve log al terminar la captura de evidencia para no conservar secretos innecesarios.
2. Para cada cuenta, inicia sesión. Con Network abierto, entra en Transparencia y vuelve a Proyectos. En esta implementación, el cliente adjunta el access token también a la lectura del catálogo cuando hay sesión: no necesitas crear un borrador para obtenerlo. En las cuentas donantes también puedes abrir Mis donaciones para ver una solicitud protegida.
3. Selecciona la solicitud al dominio `execute-api.us-east-2.amazonaws.com` (no la solicitud OPTIONS), abre Headers/Cabeceras y busca `Authorization: Bearer ...`.
4. Copia localmente solo el texto del token, sin la palabra Bearer. No uses Copy as cURL, porque coloca credenciales en comandos y registros.
5. Pégalo únicamente cuando el script lo pida. Se mantiene en memoria y no se incluye en reportes. El token vive 10 minutos: prepara las sesiones y usa tokens recientes. El script exige al menos 3 minutos restantes al introducir cada token.

Es más cómodo usar perfiles o contextos separados para gestor y los dos donantes. Cerrar sesión y volver a entrar invalida el refresh token; el access token anterior puede seguir siendo aceptado hasta expirar, según la limitación documentada. Los scripts no cambian esa regla.

Para probar ID token (subcaso T11), se puede copiar localmente el campo `id_token` de la respuesta de `/oauth2/token` en Network durante el inicio de sesión. No copiar la respuesta completa: también contiene otras credenciales. Si no está disponible, pulsa Enter y el reporte lo marcará PENDING. Un ID token se acepta solo para esta prueba negativa, nunca como credencial de carga.

## Seguridad T01–T12 y reglas de donación

```bash
node scripts/cloud/security.mjs
```

Introduce los tokens cuando se soliciten: gestor, donante 1, donante 2 y opcionalmente ID token de donante 1. No se mostrará el texto que pegues; pulsa Enter después de cada uno.

El script comprueba: borrador oculto, solicitud sin token, donante creando proyecto, montos inválidos, clave obligatoria, intención pendiente, repetición de clave, conflicto de carga distinta, propiedad contra otro donante, gestor accediendo a historial, firma alterada, ID token si se proporciona, diez confirmaciones simultáneas y un solo incremento, rechazo sin incremento e historial sin duplicados.

Las llamadas normales se espacian; las diez confirmaciones se envían realmente en paralelo tras dejar recuperar el burst del API. Si alguna devuelve 429, no se presenta la prueba como aprobada: hay que revisar throttling y repetir con otra intención. No ejecutar pruebas concurrentes desde varias terminales a la vez.

Un error de red en una escritura no se reintenta automáticamente. Consultar el reporte y los recursos creados antes de repetir. Las respuestas inesperadas hacen fallar la prueba y no se convierten en éxitos por ocultarlas.

Los reportes se guardan en `.artifacts/security-FECHA.json`, ignorados por Git. Contienen estados, IDs de proyectos/donaciones y resultados; no JWT, correos ni identidades de usuarios. Revisarlos antes de incorporarlos al informe académico.

## Preparar exactamente 50 proyectos

Después de la seguridad, inicia una sesión reciente de gestor y ejecuta:

```bash
node scripts/cloud/seed.mjs --target 50
```

El script pide el access token del gestor. Crea y publica solo los proyectos faltantes a través de la API, incluyendo las validaciones y auditoría. Los nuevos títulos empiezan con `[QA ...]`; su acumulado inicial es cero. No agrega donaciones, imágenes ni usuarios. Registra cada creación en `.artifacts/seed-FECHA.json` antes de publicarla para conservar el ID si ocurre un fallo parcial. No volver a ejecutar a ciegas si hubo un error de conexión durante POST.

## Medición con 50 proyectos

```bash
node scripts/cloud/performance.mjs --samples 100
```

No requiere tokens. Mide catálogo, detalle y stats por separado con 100 muestras por endpoint, una petición a la vez y 5 solicitudes previas de calentamiento excluidas por endpoint. Registra p95, muestras, umbral de 1500 ms y cantidad de proyectos antes/después. El tiempo incluye red, lectura del cuerpo y backend, pero excluye la espera voluntaria entre llamadas.

El calentamiento no demuestra por sí solo que no hubo cold starts. El reporte conserva `coldStartExclusionVerified: false`. Para cerrar CA-NF05.1/2, contrastar los horarios con CloudWatch (Initialization/Init Duration), registrar región real del cliente, método, fecha y condiciones, y repetir si hubo inicializaciones en las muestras medidas.

## Pruebas y evidencias que siguen siendo necesarias

### Prueba guiada T13

```bash
node scripts/cloud/revocation.mjs
```

El script pide un access token de DONANTE reciente, comprueba una lectura 200 y solicita cerrar sesión desde la app en ese mismo contexto de navegador. En Network con Preserve log activado para esta comprobación, verificar que `/oauth2/revoke` terminó correctamente antes de la navegación a logout; no copiar ni capturar el request body, porque contiene el refresh token. La captura de evidencia debe limitarse a URL sin parámetros sensibles y código de respuesta.

Cuando el cierre haya terminado sin errores, escribir CERRADA en la terminal. El script comprueba que el JWT todavía se acepta antes de expirar y espera hasta 10 segundos después de su `exp` para comprobar HTTP 401. Informa el tiempo restante cada 30 segundos y guarda solamente horas/estados. No cerrar CloudShell mientras espera. No modifica donaciones ni guarda tokens. El resultado solo acredita la ventana observada del access token; adjuntar la evidencia sanitizada de la revocación real desde el navegador para cerrar T13.

### Pendientes de evidencia manual

| Criterio | Cómo completarlo |
|---|---|
| T10 | Comprobar con IAM Policy Simulator o prueba controlada que el rol PublicProjects no puede escribir en Projects. Las políticas administradas de la nueva cuenta pueden afectar permisos efectivos. No asignar permisos mayores para que la prueba pase. |
| T13 | Conservar localmente un access token, cerrar sesión para revocar el refresh token, comprobar que el access token puede seguir aceptándose antes de expirar y que devuelve 401 después de expirar. No guardar el token en la evidencia. |
| T14 | Registrar un inicio de sesión de gestor que no completa TOTP y demostrar que no recibe tokens; luego completar el segundo factor. Nunca capturar QR, secretos TOTP o códigos válidos. |
| MFA de los integrantes | Es independiente del MFA de Cognito: cada integrante debe proteger su acceso AWS/Builder ID y revisar equivalencia con la rúbrica. |
| Logs y CloudTrail | Guardar eventos sanitizados de éxito y 401/403, retención de logs, y cambios de infraestructura. Los 401 del authorizer se observan en logs de acceso de API Gateway, no en Lambda. |
| Presupuesto | Configurar alerta de consumo y documentar el plan gratuito. |
| Navegador y TLS | Inspeccionar cabeceras CloudFront, HTTPS, foco, teclado y las cuatro vistas principales a 375 px. |
| GitHub y entrega | Push autorizado, CI ejecutado, PR revisados, informe y AI_USAGE completados por el equipo. |

Ningún reporte del script debe interpretarse como cumplimiento de todo el proyecto si contiene PENDING o no se han reunido estas evidencias.

## Capturas asistidas del navegador

`node scripts/capture-browser.mjs` abre Chromium visible con un contexto temporal, sin usar perfiles existentes de Chrome ni persistir cookies, tokens, trazas o HAR. El usuario completa manualmente el inicio de sesión. La herramienta permite navegar por enlaces de la SPA conservando su sesión en memoria y guardar capturas de vistas de la aplicación en `.artifacts/capturas/`. Oculta los campos de formulario y bloquea capturas en Cognito y en el callback OAuth para no registrar contraseñas, QR ni códigos de autenticación. No reemplaza la captura manual sanitizada del desafío MFA ni las comprobaciones de API. En terminales que cierran stdin al lanzar el proceso, usar una sesión interactiva para mantener el navegador abierto.
