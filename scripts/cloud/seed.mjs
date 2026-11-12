import { parseArgs } from 'node:util';
import { Client, endpoint, report, runId, token, sleep } from './common.mjs';

const { values } = parseArgs({ options: { target: { type: 'string', default: '50' } } });
const target = Number(values.target);
if (!Number.isInteger(target) || target < 1 || target > 50) throw new Error('--target debe estar entre 1 y 50.');
const api = new Client(endpoint()); const id = runId();
const state = { run: id, targetPublished: target, initialPublished: 0, created: [], completed: false };
const save = () => report(`seed-${id}`, state);
try {
  const existing = await api.all('/projects'); state.initialPublished = existing.length;
  if (existing.length > target) throw new Error(`Ya hay ${existing.length} proyectos publicados. No se borrará ninguno; usa un conjunto de prueba controlado para medir con exactamente ${target}.`);
  const missing = target - existing.length;
  console.log(`Se crearán y publicarán ${missing} proyectos ficticios mediante la API. No se modificarán los ${existing.length} existentes.`);
  if (missing) {
    const manager = await token('GESTOR', 'Access token del GESTOR');
    const subjects = ['Alimentación comunitaria', 'Biblioteca vecinal', 'Aprendizaje compartido', 'Bienestar comunitario', 'Huerto educativo'];
    for (let n = 1; n <= missing; n++) {
      const title = `[QA ${id.slice(0, 10)}] ${subjects[(n - 1) % subjects.length]} ${n}`;
      const project = await api.ok('/projects', { method: 'POST', token: manager, body: { title, description: `Proyecto académico ficticio de la carga ${id}. Permite evaluar catálogo, paginación y rendimiento. No representa beneficiarios reales ni recibe fondos. Ejemplo ${n}.`, goalAmountCents: (1000 + n * 100) * 100 } }, [201]);
      state.created.push({ projectId: project.projectId, status: 'BORRADOR' }); await save();
      await api.ok(`/projects/${project.projectId}/publish`, { method: 'PATCH', token: manager });
      state.created.at(-1).status = 'PUBLICADO'; await save();
      console.log(`Publicado ${n}/${missing}.`);
    }
  }
  let count;
  for (let n = 0; n < 10; n++) { count = (await api.all('/projects')).length; if (count === target) break; await sleep(1000); }
  state.finalPublished = count;
  if (count !== target) throw new Error(`La lectura pública muestra ${count}, se esperaban ${target}. Revisa consistencia del índice y actividad de otros gestores antes de repetir.`);
  state.completed = true; console.log(`Catálogo preparado: ${count} proyectos publicados. No se insertaron donaciones.`);
} catch (error) { state.error = error.message; process.exitCode = 1; console.error(error.message); }
finally { console.log(`Reporte sin credenciales: ${await save()}`); }
