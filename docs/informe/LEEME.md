# Informe de AQP-SOLIDARIA

- `informe-final.docx`: versión editable en Word.
- `SUBGRUPO_LD.3_GUIA_04_Chino_Cusilayme_MamaniM_MamaniU.pdf`: versión para lectura e impresión.
- `SUBGRUPO_LD.3_GUIA_04_Chino_Cusilayme_MamaniM_MamaniU.html`: versión navegable; conservar junto con `assets/`.
- `informe-final.md`: fuente del texto y tablas.
- `manifest-evidencias.json`: procedencia y SHA-256 de las capturas incluidas.
- `resultados/`: reportes de pruebas sin credenciales y notas de procedencia.

Las imágenes se seleccionaron del documento `Capt.docx` proporcionado por el titular y de capturas autorizadas. Se excluyó el QR de enrolamiento MFA y las vistas con datos de contacto o correos. El original se conserva sin modificaciones fuera de este paquete.

Word y PDF siguen `plantilla-laboratorio.docx`, copia de la plantilla proporcionada. Conservan los encabezados, logos y tablas institucionales, los cuatro integrantes, el docente, un cuestionario de análisis y una conclusión por integrante. La retroalimentación está vacía. HTML y Markdown conservan el contenido técnico navegable.

Para regenerar se requieren Python 3 con `python-docx`, `markdown` y `lxml`. El PDF se exporta desde el Word mediante LibreOffice local para mantener la plantilla; también puede exportarse directamente con Word:

```bash
python scripts/finalize-report.py
python scripts/build-report.py
python scripts/format-lab-report.py
node scripts/build-report-pdf.mjs
```

Las capturas revisadas ya incluidas permiten regenerar el documento aunque el original privado no esté presente. No se deben publicar las carpetas privadas de extracción de `.artifacts/`.

El número de práctica y la hora de presentación quedan por asignar/definir porque no se proporcionaron. Completar enlaces reales de PR/CI antes de presentar. T01–T14 cuentan con evidencias; el informe distingue esos casos de controles operativos adicionales y no afirma conformidad total con todos los requisitos.

Repositorio indicado por el equipo: https://github.com/TrustMek7/ZTA.

Aplicación desplegada: https://d22p2zux1ennmn.cloudfront.net.
