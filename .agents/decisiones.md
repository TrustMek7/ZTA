# Decisiones de implementación

## Consulta de diseño

Se consultó Claude Code 2.1.322 en modo de solo lectura. Reportó que no tiene una herramienta para generar pantallas en Claude Design: únicamente DesignSync, destinada a sincronizar componentes con un proyecto existente mediante un flujo no disponible. No se modificaron conexiones ni se invocaron servicios externos de diseño. Esta es una limitación reportada por la herramienta, no una integración realizada.

Se adopta su propuesta «Sillar»: fondo cálido, superficies claras, verde profundo para acciones, ámbar para la simulación, tipografía del sistema y marca escrita. Sin fotografías ni logos externos hasta recibir assets del usuario. La jerarquía visual dará prioridad a proyectos, progreso y una donación claramente simulada. Sin categorías ficticias añadidas al modelo.

## Arquitectura y verificación

- React, Vite y Tailwind; TypeScript compartido y montos en céntimos enteros.
- Cognito Authorization Code con PKCE. Tokens exclusivamente en memoria; estado temporal de PKCE en sessionStorage para sobrevivir la redirección. Sin login simulado.
- Sin configuración cloud, el catálogo usa datos académicos explícitamente rotulados; no permite donaciones ni ofrece una identidad de prueba.
- Repositorio DynamoDB con transacciones condicionadas. Repositorio en memoria únicamente para pruebas de negocio; no sustituye pruebas de concurrencia real en AWS.
- Las funciones públicas, de gestión, donaciones y simulación tienen permisos separados. La simulación no se despliega fuera de academic.
- No desplegar ni invocar la cuenta AWS en esta sesión. Documentar comprobaciones de MFA, IAM, JWT y rendimiento como pendientes hasta contar con evidencia real.
- La configuración cloud exige TOTP a todos los usuarios: es más restrictiva que el mínimo requerido y evita asignar privilegios sin segundo factor.
- Las versiones publicadas se verifican en npm y se fijan en el lockfile. Se prioriza compatibilidad con Node local 22.14; las referencias de versiones en design.md no se asumen instalables.
- El usuario autorizó commits locales progresivos en este repositorio; no se harán push ni despliegues. La revisión humana y los PR requeridos para la entrega académica quedan pendientes.

## Compatibilidad de SAM al preparar el despliegue

El usuario ejecutó SAM 1.166.2: el empaquetado pasó, pero el lint informó W1028 por las condiciones idénticas anidadas que SAM genera para un evento HTTP de una función condicional. Se reemplazó únicamente ese evento implícito por una ruta OpenAPI con un solo `Fn::If IsAcademic` y un permiso Lambda explícito, también condicionado y acotado a la ruta. Se conservan el authorizer Cognito, el scope y el bloqueo del handler fuera de academic. No se desactivan reglas de lint ni se habilita simulación en otros stages. Se agregaron comprobaciones offline sobre la plantilla transformada y CI con el traductor 1.113.0 usado por SAM 1.166.2.

Referencias de infraestructura:

- https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-integration.html
- https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html

Referencias generales:

- https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-httpapi-oauth2authorizer.html
- https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-controlling-access-to-apis.html
- https://authts.github.io/oidc-client-ts/interfaces/OidcClientSettings.html
- https://authts.github.io/oidc-client-ts/classes/InMemoryWebStorage.html

## T11: rechazo de ID token con HTTP 401

En la comprobación autenticada del navegador de pruebas, el access token de DONANTE obtuvo 200 en /donations/me y el ID token real obtuvo 403. El dato queda registrado como fallo de contrato HTTP, no como acceso indebido ni como prueba aprobada. Con una audiencia igual al app client, el ID token supera firma/audiencia y se rechaza después por falta de scopes: el authorizer nativo responde 403.

Se prepara resource binding (RFC 8707): la SPA solicita `resource=https://aqp-solidaria.example/api`, Cognito incluye esa URL en aud del access token y conserva el client ID en aud del ID token. El JWT authorizer acepta únicamente la audiencia de la API; Lambda además exige el client_id esperado, token_use=access y aud correcto. Se mantienen scopes, PKCE y controles de rol/propietario. El dominio .example es un identificador, no un endpoint ni un servicio que deba contratarse. Los refresh tokens mantienen la audiencia original según Cognito.

Esto corrige la premisa del diseño inicial de que los access tokens nunca incluyen aud: no lo incluyen por defecto, pero sí al solicitar resource binding. La validación de client_id sigue siendo obligatoria en Lambda porque API Gateway evalúa aud prioritariamente si está presente. Los requisitos originales no se reescriben para dar por bueno un 403; el cambio debe desplegarse y T11 repetirse antes de cerrarlo. Las sesiones antiguas necesitan un nuevo inicio de sesión para obtener tokens vinculados a la API.

- https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html
- https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html
- https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
