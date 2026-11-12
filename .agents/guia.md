# Guía de trabajo: AQP-SOLIDARIA

## Fuentes y alcance

- Leer `requirements.md` y `design.md` antes de implementar.
- Respetar el alcance académico: donaciones simuladas en PEN, sin cobros ni datos bancarios.
- Consultar a Claude Code sobre el diseño y la disponibilidad de Claude Design; no afirmar que existe una conexión sin comprobarla.
- Pedir al usuario los logos, fotografías u otros assets necesarios antes de incorporarlos.
- Mantener instrucciones, decisiones y avances verificables en este directorio.

## Regla permanente de commits

Todos los commits deben usar únicamente la identidad Git configurada por el usuario. No añadir coautoría ni atribuciones de IA en título, descripción, trailers o metadatos agregados por el agente. No añadir `Co-authored-by` ni firmas promocionales. Esta regla se aplica también a los archivos que generen mensajes de commit. Verificar autor, committer y mensaje después de cada commit. No modificar el historial existente sin autorización.

## Plan inicial de commits

1. `docs: establecer guía de trabajo y reglas de commits` — instrucciones persistentes y plan inicial.
2. `docs: definir diseño y criterios de implementación` — revisión de requisitos, consulta a Claude Code y decisiones concretas.
3. `chore: inicializar aplicación y herramientas` — estructura, configuración y ejecución local.
4. `feat: implementar catálogo y detalle de proyectos` — diseño adaptable y estados de interfaz.
5. `feat: implementar identidad y permisos` — autenticación y autorización conforme al diseño.
6. `feat: implementar donaciones simuladas e historial` — validación, propiedad e idempotencia.
7. `feat: implementar gestión de proyectos` — flujos y restricciones del gestor.
8. `feat: agregar infraestructura y auditoría` — recursos AWS y controles definidos por el alcance.
9. `test: verificar flujos y documentar operación` — comprobaciones relevantes, instrucciones y limitaciones.

Cada commit debe corresponder a un avance revisable. Ajustar este plan después de leer la documentación y registrar las razones. No incluir secretos ni afirmar que una integración está operativa sin verificarla.

## Avance de implementación

- La interfaz de catálogo, identidad, donaciones, historial y gestión se agrupó en un commit porque comparte navegación y tipos; la API se separó en otro commit con pruebas de permisos e integridad.
- Se mantiene AWS tras la preparación de la cuenta por el usuario. Región reportada: us-east-1; acceso nuevo por Builder ID, MFA TOTP registrado según captura del usuario. Esto no verifica todavía IAM ni MFA de Cognito.
- No se copian capturas de la cuenta al repositorio. Las capturas de evidence/ corresponden solo a la aplicación con datos ficticios.
- Se preparan infraestructura/CI y documentación/evidencias como avances separados. No se hace push ni se invoca la cuenta AWS desde herramientas.
- Corrección al preparar el despliegue: `us-east-1` fue un valor mostrado en la configuración del asistente y no una verificación de la región asignada del proyecto. Ante la denegación SCP al crear el bucket administrado por SAM, comprobar AWS Settings → Proyectos → Información adicional. La documentación de AWS asigna Perú a us-east-2. No cambiar plan ni políticas para resolver un posible error de región.
- El usuario confirmó us-east-2, desplegó la pila y publicó la SPA siguiendo los pasos supervisados. Reportó creación/publicación de una campaña y confirmación/rechazo de aportes. Estos resultados se basan en sus salidas y capturas; no sustituyen pruebas negativas ni una verificación independiente.
- Para continuar las validaciones, se preparan scripts bajo scripts/cloud/ y docs/cloud-tests.md. Ejecutarlos corresponde al titular en CloudShell: crean datos de QA por API y miden rendimiento. No pedir ni guardar contraseñas, tokens o QR; no afirmar que T01–T14 pasan hasta obtener evidencias. Mantener gestor y dos donantes distintos.
