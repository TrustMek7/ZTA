"""Build the academic report from Markdown and reviewed, original screenshots."""
from pathlib import Path
import hashlib
import json
import shutil
import markdown
from lxml import html
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.image.image import Image
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

root = Path(__file__).resolve().parents[1]
out = root / 'docs/informe'
assets = out / 'assets'
assets.mkdir(parents=True, exist_ok=True)
selected = {
 'image42.png': '01-cloudshell-versiones.png',
 'image2.png': '02-node24.png',
 'image18.png': '03-carga-archivos.png',
 'image26.png': '04-build-sam.png',
 'image16.png': '05-despliegue-guiado.png',
 'image15.png': '06-primer-despliegue.png',
 'image33.png': '07-cambio-contrasena.png',
 'image37.png': '08-crear-proyecto.png',
 'image28.png': '09-publicacion.png',
 'image44.png': '10-aporte-formulario.png',
 'image43.png': '11-aporte-confirmado.png',
 'image25.png': '12-aporte-rechazado.png',
 'image7.png': '13-historial.png',
 'image19.png': '14-suite-inicial.png',
 'image34.png': '15-catalogo-rendimiento.png',
 'image3.png': '16-cloudwatch.png',
 'image23.png': '17-desafio-mfa.png',
 'image5.png': '18-revocacion.png',
}
manifest = []
def copy_image(source, name, provenance):
    if not source.exists():
        source = assets / name
    if source.resolve() != (assets / name).resolve():
        shutil.copyfile(source, assets / name)
    manifest.append({'archivo': name, 'origen': provenance, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'transformaciones': 'ninguna'})
for source, target in selected.items():
    copy_image(root / '.artifacts/capt-docx-source' / source, target, 'Capt.docx / word/media/' + source)
for source in ['auditor-resultado-despues-correccion.png', 'auditor-gestion-restringida.png', 'auditor-historial-restringido.png', 'donante-1-historial-mobile.png', 't14-desafio-controlado.png']:
    copy_image(root / '.artifacts/capturas' / source, source, 'Captura de aplicacion autorizada, navegador efimero')
for source, name in [('codex-clipboard-dMyzy8.png', '19-cloudwatch-sin-init.png'), ('codex-clipboard-ek5nH4.png', '20-retencion-logs.png')]:
    path = Path('C:/Users/usuario/AppData/Local/Temp') / source
    if path.exists() or (assets / name).exists(): copy_image(path, name, 'Captura proporcionada en la conversacion: ' + source)
(out / 'manifest-evidencias.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
source = (out / 'informe-final.md').read_text(encoding='utf-8')
body = markdown.markdown(source, extensions=['tables', 'fenced_code'])
visual = html.fragment_fromstring(body, create_parent='div')
for img in visual.xpath('.//img'):
    parent = img.getparent()
    parent.tag = 'figure'
    caption = html.Element('figcaption')
    caption.text = img.get('alt', '')
    parent.append(caption)
visual_body = ''.join(html.tostring(child, encoding='unicode') for child in visual)
css = '''@page {size:A4; margin:19mm 17mm;} body{font:11pt Arial,sans-serif;color:#213d34;line-height:1.45}h1{font-size:26pt}h2{font-size:18pt;border-bottom:1px solid #b5bca7;padding-bottom:5pt}h3{font-size:13pt}img{max-width:100%;max-height:205mm;object-fit:contain}table{border-collapse:collapse;width:100%;font-size:9pt;margin:12pt 0}td,th{border:1px solid #bec6b8;padding:5pt;text-align:left;vertical-align:top}th{background:#e8eddc}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f1f2ed;padding:9pt;font-size:9pt;color:#202b26}code{overflow-wrap:anywhere}p{orphans:3;widows:3}h2,h3{break-after:avoid}figure, tr{break-inside:avoid}a{color:#28584c}'''
(out / 'SUBGRUPO_LD.3_GUIA_04_Chino_Cusilayme_MamaniM_MamaniU.html').write_text('<!doctype html><html lang="es"><meta charset="utf-8"><title>Informe AQP-SOLIDARIA</title><style>'+css+'figure{margin:14pt 0}figcaption{font-size:9pt;color:#536258;margin-top:4pt}</style><body>'+visual_body+'</body></html>', encoding='utf-8')
doc = Document()
section = doc.sections[0]
section.top_margin = Inches(.7); section.bottom_margin = Inches(.7)
style = doc.styles['Normal']; style.font.name = 'Calibri'; style.font.size = Pt(10.5)
style.font.color.rgb = RGBColor.from_string('213D34')
tree = html.fragment_fromstring(body, create_parent='div')
def add_image(node):
    src = node.get('src')
    if src and (out / src).exists():
        paragraph = doc.add_paragraph()
        image = Image.from_file(str(out / src))
        width = min(6.05, 8.2 * image.px_width / image.px_height)
        paragraph.add_run().add_picture(str(out / src), width=Inches(width))
        doc.add_paragraph(node.get('alt', ''), style='Caption')
for node in tree:
    tag = node.tag
    text = node.text_content()
    if tag in ['h1', 'h2', 'h3', 'h4']:
        doc.add_heading(text, level=int(tag[1]))
    elif tag == 'table':
        rows = node.xpath('.//tr')
        table = doc.add_table(rows=0, cols=max(len(row) for row in rows)); table.style = 'Light Shading Accent 1'
        for row in rows:
            cells = table.add_row().cells
            for i, cell in enumerate(row): cells[i].text = cell.text_content()
    elif tag in ['ul', 'ol']:
        for item in node: doc.add_paragraph(item.text_content(), style='List Bullet' if tag == 'ul' else 'List Number')
    elif tag == 'pre':
        paragraph = doc.add_paragraph(); run = paragraph.add_run(text); run.font.name = 'Consolas'; run.font.size = Pt(8)
    else:
        if text.strip(): doc.add_paragraph(text)
        for img in node.xpath('.//img'): add_image(img)
section.footer.paragraphs[0].text = 'AQP-SOLIDARIA | Informe academico | 12 de noviembre de 2026'
field = OxmlElement('w:fldSimple'); field.set(qn('w:instr'), 'PAGE')
section.footer.paragraphs[0].add_run(' | ')
section.footer.paragraphs[0]._p.append(field)
doc.save(out / 'informe-final.docx')
print(f'Informe DOCX/HTML generado; {len(manifest)} capturas originales.')
