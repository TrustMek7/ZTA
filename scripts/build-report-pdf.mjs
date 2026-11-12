import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, copyFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const run = promisify(execFile);
const candidates = [process.env.SOFFICE_PATH, '.tools/libreoffice/program/soffice.com', 'C:/Program Files/LibreOffice/program/soffice.com'].filter(Boolean);
let binary;
for (const candidate of candidates) {
  try { await access(candidate); binary = path.resolve(candidate); break; } catch { /* Try the next local renderer. */ }
}
binary ??= 'soffice';
const output = path.resolve('.artifacts/lab-render');
await mkdir(output, { recursive: true });
try {
  await run(binary, [
    `-env:UserInstallation=${pathToFileURL(path.resolve('.artifacts/lo-report-profile')).href}`,
    '--headless', '--convert-to', 'pdf', '--outdir', output,
    path.resolve('docs/informe/informe-final.docx'),
  ], { timeout: 120000, windowsHide: true });
  await copyFile(path.join(output, 'informe-final.pdf'), 'docs/informe/SUBGRUPO_LD.3_GUIA_04_Chino_Cusilayme_MamaniM_MamaniU.pdf');
  console.log('PDF generado desde el Word de la plantilla: docs/informe/SUBGRUPO_LD.3_GUIA_04_Chino_Cusilayme_MamaniM_MamaniU.pdf');
} catch {
  throw new Error('Se requiere LibreOffice local (soffice o SOFFICE_PATH) para exportar el Word conservando la plantilla. También se puede exportar desde Word.');
}
