# Avance cloud reportado por el titular

Estos resultados provienen de las salidas y capturas compartidas durante la ejecución supervisada, no de acceso del agente a la cuenta. Los reportes originales permanecen en `.artifacts/` de CloudShell; adjuntarlos sanitizados antes de cerrar la entrega.

## Seguridad

La ejecución `security-2026-11-12T15-37-30-241Z.json` reportó 13 comprobaciones aprobadas: T01–T09 ejecutadas por el script (incluidas diez confirmaciones simultáneas con un incremento), T12, firma alterada de T11, rechazo sin incremento e historial sin duplicados. T11 con ID token no se ejecutó correctamente por entrada no interpretable y permanece sin verificar. No clasificar ese fallo de entrada como una vulnerabilidad demostrada ni como una prueba aprobada.

Posteriormente, el titular compartió IAM Policy Simulator para el rol PublicProjects contra Projects con `aws:RequestedRegion=us-east-2`: GetItem `allowed`, PutItem `implicitDeny`, sin contexto faltante y AllowedByOrganizations=true. Esto aporta la evidencia de simulación admitida por T10. La primera simulación sin región denegaba ambas acciones y no se usa como prueba de aislamiento.

T14: se dieron instrucciones para comprobar el desafío TOTP del gestor en un contexto limpio; falta conservar y revisar la evidencia sanitizada de no emisión de tokens antes del segundo factor. T13: preparado el script guiado revocation.mjs; ejecución real pendiente. El script comprueba la ventana del access token y requiere evidencia separada del éxito de `/oauth2/revoke` en el navegador.

## Datos y rendimiento

El titular completó 48 creaciones/publicaciones por API hasta alcanzar 50 proyectos públicos. Reporte: `seed-2026-11-12T15-45-49-150Z.json`. No se insertaron donaciones mediante la carga.

El reporte `performance-2026-11-12T15-47-13-079Z.json` informó 100 muestras por endpoint, cinco llamadas de calentamiento excluidas por endpoint y un cliente secuencial:

| Endpoint | p95 reportado |
|---|---|
| Catálogo | 87.98 ms |
| Detalle | 34.19 ms |
| Estadísticas | 37.91 ms |

Los tres valores son inferiores a 1500 ms. El API está en us-east-2. La región física del cliente CloudShell debe comprobarse en el campo clientRegion del reporte: no se deduce del parámetro --region usado al desplegar.

Las capturas mostraron registros de éxito en PublicProjects durante la medición y una búsqueda de Init Duration en todos sus flujos entre 2026-11-12 15:47:00 y 15:49:00 UTC sin coincidencias. Conservar esas capturas junto al reporte original y comprobar que su intervalo cubre todas las muestras antes de concluir exclusión de cold starts. El JSON original conserva coldStartExclusionVerified=false; no modificarlo para aparentar una comprobación automática inexistente.

## Pendiente de entrega

Completar T11-ID-token, T13 y evidencia T14; confirmar región/condiciones del cliente; reunir reportes, logs 401/403, CloudTrail, presupuesto, accesibilidad y cabeceras; completar informe, revisión humana y CI remoto. La edición de proyectos y las extensiones declaradas pendientes en la auditoría de requisitos no quedan resueltas por estas pruebas. No se hace push ni se eliminan recursos desde el agente.
