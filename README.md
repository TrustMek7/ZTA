# AQP-SOLIDARIA

Plataforma académica de donaciones simuladas para una fundación ficticia de Arequipa. React, TypeScript y Tailwind en el frontend; Lambda, API Gateway HTTP API, Cognito y DynamoDB en AWS. No procesa pagos ni solicita datos bancarios.

## Ejecutar en local

Requiere Node **24** (se admite 22.14 o superior compatible con las herramientas) y npm.

```bash
npm ci
npm run dev
```

Abre http://127.0.0.1:5173. Sin configuración cloud se muestra un catálogo de tres proyectos ficticios. No hay login simulado ni donaciones persistentes en este modo. La sesión, historial, gestión y simulación requieren Cognito y la API desplegados.

## Estado implementado

- Catálogo público, detalle, búsqueda entre proyectos cargados, orden por avance, formato PEN y paginación.
- Interfaz adaptable, estados de carga/error/vacío, enlace de salto y foco de navegación.
- Cognito Authorization Code + PKCE, tokens en memoria, revocación de refresh token y cierre de sesión.
- Resource binding: audiencia de API distinta del app client para rechazar ID tokens antes de evaluar scopes; validación adicional de client_id en Lambda.
- Backend con roles, scopes, propietario, validaciones estrictas y errores sin detalles internos.
- Intenciones idempotentes durante 24 horas y confirmación/rechazo condicionados con transacciones DynamoDB.
- Historial privado, creación de borradores, publicación y eventos de auditoría atómicos.
- Plantilla SAM con tablas, TTL, índices, roles por función, TOTP obligatorio para todos los usuarios, tokens de 10 minutos, S3 privado, CloudFront, CSP y logs de 14 días.
- Auditoría con filtro por tipo y paginación. El filtro por fechas y la extensión Cedar están pendientes.

**No desplegado desde esta sesión.** La compilación, pruebas y validación de plantilla no acreditan por sí solas controles reales de IAM, JWT, MFA, rendimiento o concurrencia en AWS. Ver [estado de evidencias](evidence/README.md).

## Comprobaciones

```bash
npm run check
npm audit --audit-level=moderate
npx playwright install chromium
npm run test:e2e
sam validate --lint --template-file infra/template.yaml --region us-east-1
sam build --template-file infra/template.yaml
```

`npm run check` ejecuta lint, TypeScript, pruebas y compilación. El build genera `dist/` para la SPA y `dist-backend/` con la Lambda empaquetada. SAM usa únicamente ese paquete de backend, sin copiar frontend, herramientas locales ni credenciales.

Las pruebas del navegador cubren catálogo, búsqueda, detalle, transparencia, rutas privadas, enlace de salto y ausencia de desbordamiento a 375 y 1440 px. Las pruebas de API usan una implementación en memoria exclusivamente como doble de pruebas. No demuestran consistencia distribuida de DynamoDB.

## Preparación de AWS

Lee [cuenta, MFA y modalidades de acceso](docs/aws-setup.md) antes de crear recursos. Confirma el plan gratuito, región, servicios disponibles y permisos efectivos. La nueva experiencia de AWS usa Builder ID y proyectos en lugar de un usuario raíz clásico; puede imponer políticas administradas que requieren revisar la prueba T10 con el docente.

**Región:** los comandos de este README muestran `us-east-1` como ejemplo del diseño original. Antes de ejecutarlos en una cuenta con Builder ID, sustitúyela en todos los comandos por la región asignada que figure en AWS Settings → Proyectos → Información adicional. Para registros desde Perú, AWS documenta Ohio (`us-east-2`). La región que muestra CloudShell o el asistente no confirma por sí sola la región autorizada del proyecto.

No subir `.env`, claves de acceso, JWT, QR ni códigos MFA. Los miembros del equipo deben revisar los controles de seguridad y los PR antes de la entrega académica. Los commits de este avance son locales, sin push.

### Despliegue supervisado del backend e infraestructura

Estos comandos crean recursos reales. Ejecutarlos únicamente en la cuenta y región del proyecto, con sesión temporal del titular y previa revisión de la plantilla:

```bash
npm ci
npm run check
sam validate --lint --template-file infra/template.yaml --region us-east-1
sam build --template-file infra/template.yaml
sam deploy --guided --stack-name aqp-solidaria-academic --region us-east-1
```

En el asistente: `Stage=academic`, un `CognitoDomainPrefix` único en minúsculas y confirmación del changeset activada. Revisa los recursos y cambios IAM antes de confirmar. No publiques las respuestas que contienen identificadores de tu cuenta. Una cuenta con restricciones de modalidad podría rechazar el despliegue; no cambies al plan de pago para resolverlo automáticamente.

La ruta `/simulate` y su función solo están declaradas para `academic`; el handler también rechaza otros stages. La plantilla no habilita pagos en ningún stage.

### Conectar la SPA

Copia `frontend/.env.example` a `frontend/.env.local` y completa con los outputs de la pila:

| Variable | Output SAM |
|---|---|
| `VITE_API_URL` | `ApiUrl`, sin `/v1` final |
| `VITE_COGNITO_AUTHORITY` | `CognitoAuthority` |
| `VITE_COGNITO_CLIENT_ID` | `CognitoClientId` |
| `VITE_COGNITO_DOMAIN` | `CognitoDomain` |

`VITE_API_AUDIENCE` es opcional si se conserva el valor `https://aqp-solidaria.example/api`, igual al parámetro SAM `ApiAudience`. Si se cambia uno, cambiar también el otro. Es un identificador de audiencia, no un dominio que deba registrarse. Después de desplegar esta configuración, cerrar las sesiones anteriores e iniciar sesión nuevamente: los tokens emitidos antes de solicitar resource binding no tienen la nueva audiencia. No relajar el authorizer aceptando también el client ID, porque los ID tokens volverían a superar la comprobación de audiencia.

Estas variables son configuración pública de la aplicación, no claves secretas. Nunca introduzcas un client secret ni credenciales AWS. Reinicia Vite después de cambiarlas.

En Cognito, crea usuarios de prueba mediante la consola y asigna **un** grupo según su función: `DONANTE`, `GESTOR` o `AUDITOR`. El pool no permite autorregistro y exige TOTP a todos. Cada usuario debe completar cambio de contraseña temporal y registro del autenticador. Verifica realmente que un gestor no recibe tokens sin el segundo factor.

Los tokens se mantienen en memoria y desaparecen al recargar. Solo el estado temporal OAuth/PKCE usa sessionStorage para sobrevivir la redirección. Los callbacks y logout locales están registrados tanto para localhost como para 127.0.0.1 en el puerto 5173. El catálogo público no incluye borradores. Para publicar un borrador después de salir de la vista de gestión, conserva su ID y usa el formulario de publicación por identificador.

### Publicar frontend

Configura las variables anteriores antes de compilar. Sustituye `BUCKET_DE_LA_PILA` y `DISTRIBUTION_ID` por los outputs `WebsiteBucket` y `DistributionId`:

```bash
npm run build
aws s3 sync dist/ s3://BUCKET_DE_LA_PILA/ --region us-east-1
aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths '/*'
```

Abre el output `FrontendUrl`. El bucket es privado y CloudFront accede mediante OAC. Las rutas de la SPA se resuelven a index.html; los accesos del API no pasan por ese fallback. Verifica cabeceras y login después del despliegue. La caché puede demorar en reflejar cambios sin invalidación.

## Limitaciones y entrega académica

Para las validaciones reales con gestor y dos donantes, consulta [scripts y procedimiento de pruebas cloud](docs/cloud-tests.md). Incluye carga de proyectos por API hasta 50 publicados, pruebas de seguridad y medición p95, con reportes sin credenciales. Su ejecución cloud corresponde al titular de la cuenta; no se presenta como ya realizada.

- La revocación del refresh token no invalida inmediatamente el access token frente al JWT authorizer: puede aceptarse hasta expirar (10 minutos).
- Catálogo e historial consultan índices eventualmente consistentes; puede existir una breve demora tras una escritura.
- No hay postura de dispositivo ni evaluación continua de riesgo; no se declara una certificación Zero Trust.
- Se debe completar T01–T14 en AWS, p95 con 50 proyectos, CloudTrail, IAM efectivo, revisión humana y evidencias sanitizadas.
- Logos y fotografías quedan pendientes de assets proporcionados por el usuario. La interfaz usa texto, CSS e iconos Lucide; no descarga imágenes externas.

## Limpieza supervisada

Primero vacía **solo** el bucket `WebsiteBucket` de esta pila; revisa el nombre antes de ejecutar. Después elimina la pila y verifica que no queden recursos ni buckets auxiliares de empaquetado:

```bash
aws s3 rm s3://BUCKET_DE_LA_PILA/ --recursive --region us-east-1
sam delete --stack-name aqp-solidaria-academic --region us-east-1
```

Comprueba también el bucket administrado por SAM, CloudFront, Cognito, logs, tablas, alertas y la facturación. No elimines buckets compartidos de otras aplicaciones. La limpieza borra datos ficticios y usuarios del prototipo.

## Documentación

- [Requisitos originales](requirements.md) y [diseño del curso](design.md).
- [Guía de trabajo](.agents/guia.md) y [decisiones](.agents/decisiones.md).
- [OpenAPI 3.1](docs/api.yaml), [amenazas y mapeo NIST](docs/threat-model.md).
- [Preparación de AWS](docs/aws-setup.md), [evidencias](evidence/README.md) y [uso de asistentes](AI_USAGE.md).

Las versiones exactas están en package-lock.json. Se usó Vite 6.4.6 por compatibilidad con Node local 22.14, React 19.3.1, Tailwind 4 y Vitest 5. La documentación de referencia no se interpreta como garantía de disponibilidad de cada versión o de cada servicio en una modalidad de cuenta.
