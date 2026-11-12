# Modelo de amenazas y controles

## Límites de confianza

Navegador → API Gateway (JWT verificado, issuer/client/scopes) → Lambda (rol y propietario) → DynamoDB (IAM y condiciones transaccionales). Cognito emite la identidad; el cuerpo enviado por el navegador nunca define el actor. La decodificación de grupos en React solo controla navegación.

| Riesgo | Control implementado | Verificación |
|---|---|---|
| Suplantación de identidad | Cognito Code + PKCE; access token de 10 min; resource binding para audiencia API; JWT authorizer y validación de token_use/client_id/aud en Lambda | Claims inválidos unitarios; completar prueba desplegada de audiencia y HTTP 401 para ID token |
| Elevación de privilegios | Rol verificado en cada operación; TOTP obligatorio para todos los usuarios del pool | T03/T12 locales; segundo factor real pendiente |
| Acceso horizontal | Historial por sub, detalle y simulación por propietario, 404 opaco | T09 local |
| Alteración de importes | Esquemas estrictos, céntimos enteros, límites servidor | T04, CA-05.2 |
| Repetición de solicitudes | Clave por actor, hash normalizado y creación atómica; transición condicionada | T06/T07 y lógica T08 locales; concurrencia DynamoDB pendiente |
| Exposición de información | Logs sanitizados, actor seudonimizado; no datos bancarios ni identidades en respuestas públicas | Formato logs y DTO; revisar CloudWatch al desplegar |
| XSS | React escapa texto; tokens en memoria; CSP, HSTS, nosniff y frame-ancestors | Plantilla; cabeceras desplegadas pendientes |
| Denegación de servicio | Paginación, límites de cuerpo, throttling API | Plantilla y validación; prueba cloud pendiente |
| Repudio | Evento de auditoría en la misma transacción que mutación, requestId en logs | Eventos locales y estructura transacciones; evidencia cloud pendiente |

## NIST SP 800-207

| Principio | Aplicación y límite |
|---|---|
| 1. Servicios y datos son recursos | Cada endpoint autoriza un recurso, tablas separadas |
| 2. Comunicación protegida | TLS en API y CloudFront; HTTP local solo para desarrollo en loopback |
| 3. Acceso por sesión y recurso | Tokens breves, rol y ownership en cada solicitud |
| 4. Políticas dinámicas | Estado del proyecto, estado de donación, actor, scopes y stage |
| 5. Postura de activos | Parcial: sin postura de dispositivo ni evaluación continua de riesgo |
| 6. Autenticación y autorización estrictas | API Gateway como PEP, módulo authz como PE; Cognito administra sesiones como PA |
| 7. Información para mejorar decisiones | AuditEvents y logs JSON; CloudTrail debe comprobarse en la cuenta |

## Límites conocidos

- Revocar refresh token no invalida inmediatamente el JWT de acceso verificado localmente por API Gateway. Puede seguir usándose hasta expirar (10 minutos en la plantilla).
- Los tokens en memoria desaparecen al recargar la página: se requiere iniciar sesión nuevamente. Solo el estado de la interacción OAuth y el verificador PKCE usan sessionStorage y son eliminados al completar el callback.
- Las consultas por GSI son eventualmente consistentes. El catálogo o historial pueden demorar brevemente en reflejar una escritura. Las lecturas por ID después de una escritura usan consistencia fuerte.
- La idempotencia conserva la respuesta de creación durante 24 horas. Después del TTL, reutilizar una clave puede iniciar otra intención; la UI genera un UUID nuevo por intención.
- Las pruebas en memoria no demuestran aislamiento de DynamoDB ni concurrencia distribuida. T08 en AWS necesita al menos diez solicitudes paralelas contra la misma donación.
- La extensión de auditoría incluye filtro por tipo y paginación, pero el filtro de fechas de HU-10 queda pendiente. No se implementa la extensión Cedar/Verified Permissions.
- La nueva experiencia de AWS puede incorporar políticas administradas que cambien los permisos efectivos. T10 debe verificar los permisos reales, no solo leer las políticas declaradas.
- SAM configura roles separados; sus políticas básicas de logs pueden incluir un wildcard requerido para streams de CloudWatch. Las políticas de datos están acotadas a tablas e índices concretos; S3 usa el wildcard de objetos bajo un único bucket.
