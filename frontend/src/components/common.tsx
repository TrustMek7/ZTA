import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, Check, Clock3, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Project, PublicDonation } from '../../../shared/domain';
import { pen } from '../../../shared/domain';
import { ApiFailure } from '../services/api';

export function useResource<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const ref = useRef(loader); ref.current = loader;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean }>({ loading: true });
  useEffect(() => {
    let active = true; setState({ loading: true });
    ref.current().then(data => { if (active) setState({ data, loading: false }); }, error => { if (active) setState({ error, loading: false }); });
    return () => { active = false; };
    // Callers provide stable scalar dependencies describing the requested resource.
  }, [...deps, revision]);
  return { ...state, reload: () => setRevision(v => v + 1) };
}
export function ErrorBox({ error, retry }: { error: Error; retry?: () => void }) {
  return <div className="error-box" role="alert"><strong>No pudimos completar la operación</strong><p>{error.message}</p>{error instanceof ApiFailure && error.requestId && <small>Referencia: {error.requestId}</small>}{retry && <button className="button secondary" onClick={retry}>Volver a intentar</button>}</div>;
}
export function Progress({ project }: { project: Project }) {
  const percent = Math.round(project.confirmedAmountCents / project.goalAmountCents * 100);
  return <div className="progress-block"><div className="progress-numbers"><strong>{pen(project.confirmedAmountCents)}</strong><span>{percent}%</span></div><progress max={project.goalAmountCents} value={Math.min(project.confirmedAmountCents, project.goalAmountCents)} aria-label={`Avance de ${project.title}: ${percent}%`} /><p>confirmados (simulado) <span>de {pen(project.goalAmountCents)}</span></p></div>;
}
export function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  return <article className={`project-card tone-${index % 3}`}><div className="project-cover"><span className="cover-label">AREQUIPA · PROYECTO SOCIAL</span><span className="cover-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div className="cover-word" aria-hidden="true">{index % 3 === 0 ? 'Compartir.' : index % 3 === 1 ? 'Aprender.' : 'Cuidar.'}</div><span className="cover-bottom">Pequeños aportes. Nuevas posibilidades.</span></div><div className="project-body"><span className="eyebrow">PROYECTO PUBLICADO</span><h3><Link to={`/proyectos/${project.projectId}`}>{project.title}</Link></h3><p className="card-description">{project.description.split('\n')[0]}</p><Progress project={project} /><Link className="card-link" to={`/proyectos/${project.projectId}`}>Conoce el proyecto <ArrowUpRight size={19} /></Link></div></article>;
}
export function Loading() { return <div className="loading-grid" aria-label="Cargando proyectos" role="status">{[1, 2, 3].map(n => <div className="skeleton" key={n} />)}<span className="sr-only">Cargando…</span></div>; }
export function Empty({ children }: { children: ReactNode }) { return <div className="empty">{children}</div>; }
export function Status({ status }: { status: PublicDonation['status'] }) {
  const pending = status === 'PENDIENTE_SIMULACION'; const confirmed = status === 'CONFIRMADA_SIMULADA';
  const Icon = pending ? Clock3 : confirmed ? Check : X;
  return <span className={`status ${pending ? 'pending' : confirmed ? 'confirmed' : 'rejected'}`}><Icon size={14} />{pending ? 'Pendiente de simulación' : confirmed ? 'Confirmada simulada' : 'Rechazada simulada'}</span>;
}
