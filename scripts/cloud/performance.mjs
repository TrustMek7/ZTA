import { parseArgs } from 'node:util';
import { Client, endpoint, percentile, report, runId } from './common.mjs';
const { values } = parseArgs({ options: { samples: { type: 'string', default: '100' } } });
const samples = Number(values.samples);
if (!Number.isInteger(samples) || samples < 20 || samples > 200) throw new Error('--samples debe estar entre 20 y 200.');
const api = new Client(endpoint(), fetch, 250); const id = runId();
const result = { run: id, projectCount: 0, samplesPerEndpoint: samples, warmupPerEndpoint: 5, concurrency: 1, clientRegion: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'no registrada', coldStartExclusionVerified: false, endpoints: [] };
try {
  const projects = await api.all('/projects'); result.projectCount = projects.length;
  if (projects.length !== 50) throw new Error(`La prueba requiere exactamente 50 publicados; hay ${projects.length}. Ejecuta primero seed.mjs --target 50 y evita otras publicaciones durante la medición.`);
  for (const path of ['/projects', `/projects/${projects[0].projectId}`, `/projects/${projects[0].projectId}/stats`]) {
    for (let n = 0; n < 5; n++) await api.ok(path);
    const measurements = [];
    for (let n = 0; n < samples; n++) { const r = await api.request(path); if (r.status !== 200) throw new Error(`HTTP ${r.status} al medir ${path}.`); measurements.push(r.ms); }
    const p95Ms = percentile(measurements);
    result.endpoints.push({ kind: path === '/projects' ? 'catalog' : path.endsWith('/stats') ? 'stats' : 'detail', p95Ms: Math.round(p95Ms * 100) / 100, thresholdMet: p95Ms <= 1500, measurementsMs: measurements.map(n => Math.round(n * 100) / 100) });
    console.log(`${path}: p95 ${p95Ms.toFixed(2)} ms; umbral 1500 ms ${p95Ms <= 1500 ? 'cumplido' : 'NO cumplido'}.`);
    if (p95Ms > 1500) process.exitCode = 1;
  }
  result.finalProjectCount = (await api.all('/projects')).length;
  if (result.finalProjectCount !== 50) throw new Error('El número de proyectos cambió durante la medición.');
  console.log('Las 5 llamadas de calentamiento se excluyen por endpoint. Aún debes contrastar CloudWatch para acreditar exclusión de cold starts y registrar dónde ejecutaste el cliente.');
} catch (error) { result.error = error.message; process.exitCode = 1; console.error(error.message); }
finally { console.log(`Reporte sin credenciales: ${await report(`performance-${id}`, result)}`); }
