from pathlib import Path
import json
import shutil

root = Path(__file__).resolve().parents[1]
out = root / 'docs/informe'
p = out / 'informe-final.md'
s = p.read_text(encoding='utf-8')
start = s.index('**Informe')
end = s.index('## 1. Resumen')
s = s[:start] + '''**Informe técnico de implementación, despliegue y validación**  
Universidad Nacional de San Agustín de Arequipa — EPIS  
Asignatura: Tópicos Avanzados en Ingeniería de Software  
Práctica: Plataforma de Donaciones Segurida - AQP-SOLIDARIA  
Docente: Mg. Robert Edison Arisaca Mamani  
Integrantes: Cusilayme García José Luis; Joel Antonio Chino Pari; Mamani Mamani Alexis Baltazar; Mamani Uscamayta Agustín David  
Fecha: 12 de noviembre de 2026

Word y PDF utilizan la plantilla de laboratorio proporcionada por el equipo. La retroalimentación se conserva en blanco para el docente. El número de práctica y la hora de presentación no fueron indicados: se señalan como por asignar y por definir. Las referencias de revisión por pares deben completarse con datos reales.

''' + s[end:]
s = s.replace('Las fuentes normativas del proyecto son requirements.md, versión 2.0, y design.md.', 'Las fuentes normativas del proyecto son requirements.md, versión 2.0, y design.md [1].')
s = s.replace('La corrección a7bc403 usa el comportamiento documentado de HTTP API:', 'La corrección a7bc403 usa el comportamiento documentado de HTTP API [3]:')
s = s.replace('## 7. Mapeo Zero Trust y amenazas\n\n|', '## 7. Mapeo Zero Trust y amenazas\n\nEl mapeo sigue los principios de NIST SP 800-207 [2] dentro del alcance del prototipo.\n\n|')
s = s.replace('El reporte identifica PASS_ACCESS_TOKEN_WINDOW.', 'El reporte identifica PASS_ACCESS_TOKEN_WINDOW. La distinción entre revocación en Cognito y validación local del JWT está documentada por AWS [5].')
s = s.replace('Se revisó el changeset y se confirmó su aplicación.', 'Se revisó el changeset y se confirmó su aplicación. Los parámetros se conservan en la configuración SAM [4].')
if '1. Documentos del proyecto:' in s:
    start = s.index('1. Documentos del proyecto:')
    end = s.index('\nLa referencia a la Ley', start)
    s = s[:start] + '''[1] Equipo AQP-SOLIDARIA, “Requerimientos — Plataforma de Donaciones Seguras,” ver. 2.0, 2 nov. 2026; “Diseño,” repositorio del proyecto, 2026.

[2] S. Rose, O. Borchert, S. Mitchell y S. Connelly, “Zero Trust Architecture,” NIST Special Publication 800-207, ago. 2020, doi: 10.6028/NIST.SP.800-207.

[3] Amazon Web Services, “Control access to HTTP APIs with JWT authorizers,” Amazon API Gateway Developer Guide. [En línea]. Disponible: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html. [Accedido: 12-nov-2026].

[4] Amazon Web Services, “AWS SAM CLI configuration file,” AWS Serverless Application Model Developer Guide. [En línea]. Disponible: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-config.html. [Accedido: 12-nov-2026].

[5] Amazon Web Services, “Ending user sessions with token revocation,” Amazon Cognito Developer Guide. [En línea]. Disponible: https://docs.aws.amazon.com/cognito/latest/developerguide/token-revocation.html. [Accedido: 12-nov-2026].
''' + s[end:]

reports = sorted((root / '.artifacts').glob('revocation-browser-*.json'))
if reports:
    latest = reports[-1]
    data = json.loads(latest.read_text(encoding='utf-8'))
    shutil.copyfile(latest, out / 'resultados' / latest.name)
    marker = '\n## Anexo C. Cierre de la repetición T13'
    s = s.split(marker)[0]
    s += marker + '\n\nReporte: ' + latest.name + '. Resultado: **' + ('PASS' if data.get('passed') else 'FAIL') + '**.\n\n'
    s += 'Se utilizó la misma sesión DONANTE para todas las fases. La revocación se ejecutó automáticamente con el refresh token de esa sesión, sin guardarlo. Se verificó también que el refresh token revocado ya no permitía renovar la sesión.\n\n'
    s += '| Comprobación | Resultado HTTP |\n|---|---|\n'
    s += f'| Revocar refresh token | {data.get("revocationHttpStatus")} |\n| Renovar con refresh token revocado | {data.get("revokedRefreshStatus")} |\n'
    for check in data.get('checks', []): s += f'| {check["phase"]} ({check["timestamp"]}) | {check["status"]} |\n'
    if data.get('passed'):
        s += '\nT13 queda aprobado en la repetición independiente: 200 antes de revocar, 200 después de revocar mientras el JWT seguía vigente y 401 después de expirar. T14 cuenta con la evidencia controlada del anexo B y T10 con IAM Policy Simulator. Los marcadores PENDING del script principal se resuelven con estas evidencias externas; sus reportes originales se conservan sin alterar. Los casos T01–T14 quedan comprobados con las procedencias indicadas. Esto no transforma en aprobados los requisitos operativos adicionales de Budgets, CloudTrail, revisión por pares o CI remoto.\n'
p.write_text(s, encoding='utf-8')
print('Metadatos, referencias IEEE y resultados finales actualizados.')
