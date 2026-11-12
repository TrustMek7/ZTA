"""Populate the user's laboratory template without replacing its header or layout."""
from pathlib import Path
import shutil
import markdown
from lxml import html
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.image.image import Image

root = Path(__file__).resolve().parents[1]
out = root / 'docs/informe'
template = out / 'plantilla-laboratorio.docx'
if not template.exists():
    shutil.copyfile('D:/Downloads/PLANTILLA LAB.docx', template)
doc = Document(template)
names = ['Cusilayme García José Luis', 'Joel Antonio Chino Pari', 'Mamani Mamani Alexis Baltazar', 'Mamani Uscamayta Agustín David']
conclusions = [
    'La autorización debe comprobarse en cada solicitud del servidor, porque mostrar un menú según el rol no garantiza el acceso a los datos. La corrección de Cognito y la repetición de T11 demostraron la importancia de distinguir la identidad autenticada del tipo de token y los permisos efectivos.',
    'La combinación de claves de idempotencia y transacciones condicionadas en DynamoDB permite evitar duplicados y mantener el acumulado correcto. Las diez confirmaciones simultáneas de T08 produjeron un solo incremento, mientras que las intenciones rechazadas no modificaron el total.',
    'La infraestructura definida con SAM y los roles IAM por función permiten reproducir el despliegue y limitar su impacto. La verificación de la región autorizada y la simulación de permisos efectivos fueron necesarias para interpretar correctamente las denegaciones de AWS.',
    'Las pruebas negativas y la trazabilidad de evidencias complementan la demostración visual de la aplicación. El segundo factor, la ventana de revocación y las mediciones con condiciones documentadas permiten explicar los controles y sus límites sin atribuir al prototipo una seguridad absoluta.',
]

def set_cell(cell, text):
    cell.text = text
    for p in cell.paragraphs:
        p.paragraph_format.space_after = Pt(3)
        for run in p.runs:
            run.font.name = 'Calibri'; run.font.size = Pt(10)

basic = doc.tables[0]
set_cell(basic.cell(1, 1), 'Tópicos Avanzados en Ingeniería de Software')
set_cell(basic.cell(2, 1), 'Plataforma de Donaciones Segurida - AQP-SOLIDARIA')
set_cell(basic.cell(3, 1), 'Por asignar')
set_cell(basic.cell(4, 1), '12/11/2026')
set_cell(basic.cell(4, 3), 'Por definir')
set_cell(basic.cell(5, 0), 'INTEGRANTE (s):\n' + '\n'.join(names))
set_cell(basic.cell(6, 0), 'DOCENTE(s):\nMg. Robert Edison Arisaca Mamani')

normal = doc.styles['normal']
normal.font.name = 'Calibri'; normal.font.size = Pt(10)
normal.font.color.rgb = RGBColor(0, 0, 0)
source = (out / 'informe-final.md').read_text(encoding='utf-8')
tree = html.fragment_fromstring(markdown.markdown(source, extensions=['tables', 'fenced_code']), create_parent='div')
target = doc.tables[1].cell(1, 0)
set_cell(target, 'SOLUCIÓN DE EJERCICIOS/PROBLEMAS PROPUESTOS')
target.add_paragraph('Repositorio del proyecto [6]: https://github.com/TrustMek7/ZTA')
target.add_paragraph('Aplicación desplegada: https://d22p2zux1ennmn.cloudfront.net')
references = []
in_references = False
started = False

def paragraph(text='', bold=False, size=10):
    p = target.add_paragraph()
    p.paragraph_format.space_after = Pt(5)
    run = p.add_run(text); run.bold = bold; run.font.name = 'Calibri'; run.font.size = Pt(size)
    return p

for node in tree:
    text = node.text_content().strip()
    if node.tag == 'h2' and text.startswith('1. '): started = True
    if not started: continue
    if node.tag == 'h2': in_references = text.startswith('12. Referencias')
    if in_references:
        if node.tag != 'h2': references.append(text)
        continue
    if node.tag in ['h1', 'h2', 'h3', 'h4']:
        p = paragraph(text, bold=True, size=12 if node.tag == 'h2' else 11)
        p.paragraph_format.keep_with_next = True
    elif node.tag == 'table':
        rows = node.xpath('.//tr')
        count = max(len(row) for row in rows)
        table = target.add_table(rows=0, cols=count)
        table.autofit = False
        for column in table.columns: column.width = Inches(6.35 / count)
        borders = OxmlElement('w:tblBorders')
        for edge in ['top','left','bottom','right','insideH','insideV']:
            item = OxmlElement('w:'+edge); item.set(qn('w:val'),'single'); item.set(qn('w:sz'),'4'); item.set(qn('w:color'),'808080'); borders.append(item)
        table._tbl.tblPr.append(borders)
        for n, row in enumerate(rows):
            cells = table.add_row().cells
            for i, cell in enumerate(row):
                set_cell(cells[i], cell.text_content())
                for p in cells[i].paragraphs:
                    for run in p.runs: run.font.size = Pt(8); run.bold = n == 0
                if n == 0:
                    shade = OxmlElement('w:shd'); shade.set(qn('w:fill'),'EDEDED'); cells[i]._tc.get_or_add_tcPr().append(shade)
    elif node.tag in ['ul', 'ol']:
        for i, item in enumerate(node): paragraph(f'{i+1}. {item.text_content()}')
    elif node.tag == 'pre':
        p = paragraph(text, size=8)
        for run in p.runs: run.font.name = 'Consolas'
    else:
        if text: paragraph(text)
        for img in node.xpath('.//img'):
            source_image = out / img.get('src')
            image = Image.from_file(str(source_image))
            width = min(6.25, 7.5 * image.px_width / image.px_height)
            paragraph().add_run().add_picture(str(source_image), width=Inches(width))
            paragraph(img.get('alt',''), size=9)

questionnaire = doc.tables[1].cell(2, 0)
set_cell(questionnaire, 'CUESTIONARIO')
questions = [
 ('¿Por qué el frontend no constituye el control de autorización?', 'Porque puede alterarse o sustituirse por llamadas HTTP directas. Gateway y Lambda deben verificar credenciales, scope, rol y propiedad en cada operación.'),
 ('¿Cómo se evita contabilizar dos veces la misma donación?', 'La clave de idempotencia se registra atómicamente con la intención y la transición de estado se condiciona dentro de la misma transacción que incrementa el acumulado.'),
 ('¿Por qué no se utiliza un ID token como Bearer de la API?', 'El ID token comunica identidad al cliente OIDC. La API exige token_use=access, client_id válido y el scope de la operación; T11 verifica su rechazo con HTTP 401.'),
 ('¿Cerrar sesión invalida inmediatamente el access token en Gateway?', 'La revocación impide renovar la sesión, pero la verificación local del JWT puede seguir aceptándolo hasta su expiración. La vigencia configurada de diez minutos limita esa ventana y T13 la mide.'),
 ('¿Qué demuestra T14?', 'En un contexto nuevo, el gestor queda detenido en el desafío TOTP sin tokens emitidos. Solo después de completar el segundo factor se observa la emisión y se verifica el grupo GESTOR.'),
]
for i,(question, answer) in enumerate(questions,1):
    questionnaire.add_paragraph(f'{i}. {question}').runs[0].bold=True
    questionnaire.add_paragraph(answer)

conclusion_cell = doc.tables[1].cell(3, 0)
set_cell(conclusion_cell, 'CONCLUSIONES')
for name, conclusion in zip(names, conclusions):
    conclusion_cell.add_paragraph(name).runs[0].bold = True
    conclusion_cell.add_paragraph(conclusion)
# Preserve the teacher's blank feedback field.
set_cell(doc.tables[2].cell(1, 0), '')
bibliography = doc.tables[3].cell(1, 0)
set_cell(bibliography, '')
ieee = [
 '[1] Equipo AQP-SOLIDARIA, “Requerimientos — Plataforma de Donaciones Seguras,” ver. 2.0, 2 nov. 2026; “Diseño,” repositorio del proyecto, 2026.',
 '[2] S. Rose, O. Borchert, S. Mitchell y S. Connelly, “Zero Trust Architecture,” NIST Special Publication 800-207, ago. 2020, doi: 10.6028/NIST.SP.800-207.',
 '[3] Amazon Web Services, “Control access to HTTP APIs with JWT authorizers,” Amazon API Gateway Developer Guide. [En línea]. Disponible: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html. [Accedido: 12-nov-2026].',
 '[4] Amazon Web Services, “AWS SAM CLI configuration file,” AWS Serverless Application Model Developer Guide. [En línea]. Disponible: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-config.html. [Accedido: 12-nov-2026].',
 '[5] Amazon Web Services, “Ending user sessions with token revocation,” Amazon Cognito Developer Guide. [En línea]. Disponible: https://docs.aws.amazon.com/cognito/latest/developerguide/token-revocation.html. [Accedido: 12-nov-2026].',
 '[6] TrustMek7, “ZTA — AQP-SOLIDARIA,” repositorio de código, GitHub, 2026. [En línea]. Disponible: https://github.com/TrustMek7/ZTA. [Accedido: 12-nov-2026].',
]
for reference in ieee: bibliography.add_paragraph(reference)

# Keep the header logos and institutional table; add dynamic page numbering.
header = doc.sections[0].header
if header.tables:
    page_cell = header.tables[0].cell(2, 2)
    page_cell.text = 'Página: '
    for field_name in ['PAGE','NUMPAGES']:
        field = OxmlElement('w:fldSimple'); field.set(qn('w:instr'), field_name)
        page_cell.paragraphs[0]._p.append(field)
        if field_name == 'PAGE': page_cell.paragraphs[0].add_run(' de ')
doc.save(out / 'informe-final.docx')
print('Word adaptado a PLANTILLA LAB: integrantes, docente, cuatro conclusiones y referencias IEEE.')
