# Estado de evidencias

No incluir credenciales, códigos de MFA, QR de registro, correos reales, JWT ni identificadores de cuenta en capturas o reportes.

## Verificación local

Resultado del avance: 39 pruebas unitarias/de componentes y 4 pruebas de navegador aprobadas; lint, TypeScript, compilación de frontend/backend, auditoría npm sin vulnerabilidades, `sam validate --lint` y `sam build` aprobados. Se inspeccionó también la transformación SAM sin llamadas a AWS: la ruta de simulación está bajo `Fn::If IsAcademic`.

Capturas del catálogo y detalle a 1440 y 375 px en este directorio. No contienen datos de cuentas ni donantes reales. No constituyen evidencia de despliegue.

Corrección posterior: se agregaron 3 pruebas offline de la plantilla transformada para evitar condiciones redundantes en la ruta de simulación (W1028 con SAM 1.166.2), mantener el scope Cognito y comprobar que ruta, función, rol, permiso de invocación y logs dependen de `IsAcademic`. Ejecutables con `python -m unittest discover -s infra -p 'test_*.py'` en un entorno Python con aws-sam-translator instalado.

- `npm run check`: lint, TypeScript, pruebas de backend y UI, build del frontend.
- `npm audit --audit-level=moderate`: revisión del árbol de dependencias.
- `sam validate --lint -t infra/template.yaml`: verificación estática de plantilla.
- `sam build -t infra/template.yaml`: empaquetado de funciones, sin despliegue.

## Pendiente de despliegue y revisión humana

Actualización del avance supervisado: el usuario confirmó el despliegue en us-east-2, la publicación de la SPA y los flujos de creación/publicación, confirmación/rechazo e historial. No se almacenan sus capturas de Cognito ni identificadores personales. La tabla siguiente conserva las verificaciones de aceptación que deben acreditarse formalmente; los resultados funcionales reportados no equivalen a completar cada T01–T14.

Los scripts de `scripts/cloud/` permiten ejecutar seguridad, carga hasta 50 publicados y medición. Véase `docs/cloud-tests.md`. La herramienta se probó localmente con transporte simulado; no se ha ejecutado contra la cuenta AWS desde el agente. Los reportes cloud deben generarlos el titular/equipo y revisarse antes de incorporarlos a la entrega.

| Prueba | Estado y evidencia necesaria |
|---|---|
| T01 | Lógica local aprobada; guardar respuesta HTTPS sin borradores |
| T02 | Falta de claims rechazada localmente; probar API sin Bearer |
| T03 | RBAC local aprobado; probar API con donante |
| T04 | Validaciones locales aprobadas; repetir en API |
| T05 | Intención local aprobada; mostrar persistencia real |
| T06/T07 | Lógica local aprobada; comprobar transacciones DynamoDB |
| T08 | Diez llamadas locales aprobadas con test double; repetir contra AWS para probar concurrencia distribuida |
| T09 | Ownership local aprobado; repetir con dos donantes reales de prueba |
| T10 | IAM Policy Simulator o prueba controlada con rol de listado: escritura denegada |
| T11 | Claims inválidos locales aprobados; firma alterada e ID token deben probarse contra el authorizer real |
| T12 | Gestor bloqueado localmente; repetir contra API |
| T13 | Demostrar aceptación antes de expirar y rechazo después de expirar tras revocar sesión |
| T14 | Evidenciar que Cognito no entrega tokens al gestor sin completar TOTP |

También pendientes: medición p95 con 50 proyectos sin cold start, revisión manual completa de accesibilidad, cabeceras HTTPS, logs 401/403 sin secretos, CloudTrail, consumo del plan y eliminación final. El recorrido automatizado de teclado y las vistas a 375 px sí se comprobaron localmente. No marcar los controles cloud como aprobados sin evidencia real.
