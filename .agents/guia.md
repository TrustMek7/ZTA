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
