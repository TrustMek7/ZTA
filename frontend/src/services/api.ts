import type { AuditEvent, NewProject, Outcome, Page, Project, PublicDonation } from '../../../shared/domain';
import { accessToken } from '../auth/session';

export const configured = Boolean(import.meta.env.VITE_API_URL);
const date = '2026-11-01T12:00:00.000Z';
export const examples: Project[] = [
  { projectId: '0d037858-fab3-4c10-a59f-323093dcdb51', title: 'Una mesa para todos', description: 'Un espacio donde compartir también significa cuidar. Esta campaña ficticia acompaña a comedores comunitarios de Arequipa con alimentos variados y utensilios para preparar comidas nutritivas.\n\nLa meta de este ejercicio representa la compra de insumos y la organización de jornadas comunitarias. Todos los montos y avances son datos de ejemplo, sin recaudación real.', goalAmountCents: 1800000, confirmedAmountCents: 1170000, status: 'PUBLICADO', currency: 'PEN', createdAt: date, updatedAt: date },
  { projectId: '6a5ccf6a-14ae-441c-9a5a-9360878a9302', title: 'Más oportunidades para aprender', description: 'Aprender abre caminos. Esta campaña ficticia propone un espacio de lectura y acompañamiento escolar para estudiantes de comunidades de Arequipa.\n\nEl objetivo académico contempla materiales educativos, libros y sesiones de apoyo. Es un proyecto de muestra: no representa una intervención ni beneficiarios reales.', goalAmountCents: 2500000, confirmedAmountCents: 1050000, status: 'PUBLICADO', currency: 'PEN', createdAt: date, updatedAt: date },
  { projectId: 'b742e890-9d8d-45c1-90e8-a33f7eb64075', title: 'Cuidarnos está en nuestras manos', description: 'La prevención empieza cerca de casa. Esta campaña ficticia plantea jornadas de orientación sobre hábitos saludables y bienestar comunitario.\n\nSu meta ilustra la coordinación de materiales y actividades educativas. Los avances mostrados pertenecen al prototipo académico y no corresponden a servicios de salud reales.', goalAmountCents: 1200000, confirmedAmountCents: 900000, status: 'PUBLICADO', currency: 'PEN', createdAt: date, updatedAt: date },
];
export class ApiFailure extends Error { constructor(message: string, public status: number, public requestId?: string) { super(message); } }
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!configured) throw new ApiFailure('Esta acción estará disponible al conectar el entorno académico.', 503);
  const token = await accessToken();
  const response = await fetch(`${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/v1${path}`, { ...init, headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers } });
  const data = await response.json();
  if (!response.ok) throw new ApiFailure(data.message ?? 'No pudimos completar la solicitud.', response.status, data.requestId);
  return data as T;
}
const query = (cursor?: string) => cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
export const api = {
  projects: (cursor?: string): Promise<Page<Project>> => configured ? request<Page<Project>>(`/projects${query(cursor)}`) : Promise.resolve({ items: examples }),
  project: (id: string) => configured ? request<Project>(`/projects/${encodeURIComponent(id)}`) : examples.find(p => p.projectId === id) ? Promise.resolve(examples.find(p => p.projectId === id)!) : Promise.reject(new ApiFailure('Este proyecto no existe o no está disponible.', 404)),
  donate: (projectId: string, amountCents: number, key: string) => request<PublicDonation>('/donations', { method: 'POST', body: JSON.stringify({ projectId, amountCents }), headers: { 'Idempotency-Key': key } }),
  simulate: (id: string, outcome: Outcome) => request<PublicDonation>(`/donations/${id}/simulate`, { method: 'POST', body: JSON.stringify({ outcome }) }),
  history: (cursor?: string) => request<Page<PublicDonation>>(`/donations/me${query(cursor)}`),
  createProject: (input: NewProject) => request<Project>('/projects', { method: 'POST', body: JSON.stringify(input) }),
  publish: (id: string) => request<Project>(`/projects/${id}/publish`, { method: 'PATCH' }),
  audit: (type: string, cursor?: string) => request<Page<AuditEvent>>(`/audit?type=${encodeURIComponent(type)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`),
};
