# Uso de asistentes

Esta declaración cumple el requisito académico de transparencia; no modifica la identidad ni agrega coautoría a los commits.

| Campo | Declaración |
|---|---|
| Herramientas | OpenAI Codex; consulta a Claude Code 2.1.322 |
| Participación | Trabajo solicitado por el titular del repositorio; revisión por el equipo pendiente |
| Tareas asistidas | Estructura React/TypeScript, propuesta visual, API, autorización, transacciones DynamoDB, plantilla SAM, pruebas y documentación |
| Consulta de diseño | Claude Code propuso la dirección Sillar. Reportó que Claude Design no estaba disponible para generar pantallas. No se conectó DesignSync |
| Artefactos | frontend/, backend/, shared/, infra/, docs/, .agents/, pruebas y CI; commits locales progresivos |
| Validación automática | Comandos y alcance en evidence/README.md; las pruebas locales no sustituyen evidencias AWS |
| Validación humana | Pendiente de revisión de otro integrante, PR y defensa de decisiones; no se afirma una revisión inexistente |
| Ejecución cloud | El titular desplegó y actualizó la pila desde CloudShell. Con autorización se ejecutaron llamadas HTTP y sesiones de navegador contra el stage académico; los tokens se mantuvieron en memoria y los reportes no contienen credenciales |
| Correcciones | La configuración de audiencia de recurso provocó una regresión de autenticación; a7bc403 la corrigió. La repetición autenticada obtuvo 14 comprobaciones aprobadas y cero fallidas |
| Limitaciones | No se atribuyen revisiones por pares ni ejecuciones remotas de CI inexistentes; controles operativos y extensiones se declaran en docs/informe/informe-final.md |

El equipo debe completar participantes, referencias de PR, correcciones y evidencias de revisión antes de la entrega. No registrar secretos ni datos personales de usuarios reales.
