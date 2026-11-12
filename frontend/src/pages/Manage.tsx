import { useState } from 'react';
import { parsePEN, pen, projectInput, type Project } from '../../../shared/domain';
import { api } from '../services/api';
import { Empty, ErrorBox } from '../components/common';
export function Manage() {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [goal, setGoal] = useState('');
  const [projects, setProjects] = useState<Project[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState<Error>();
  async function create(e: React.FormEvent) {
    e.preventDefault(); setError(undefined);
    const result = projectInput.safeParse({ title, description, goalAmountCents: parsePEN(goal) });
    if (!result.success) { setError(new Error('Revisa el título (5–100 caracteres), la descripción (30–4000) y la meta (S/ 1.00–1,000,000.00).')); return; }
    setBusy(true); try { const p = await api.createProject(result.data); setProjects(v => [p, ...v]); setTitle(''); setDescription(''); setGoal(''); } catch (e) { setError(e as Error); } finally { setBusy(false); }
  }
  async function publish(id: string) { setBusy(true); setError(undefined); try { const p = await api.publish(id); setProjects(v => v.map(old => old.projectId === id ? p : old)); } catch (e) { setError(e as Error); } finally { setBusy(false); } }
  return <div className="container page"><span className="eyebrow">ESPACIO DEL GESTOR</span><h1 className="page-title">Una nueva oportunidad.</h1><p className="page-lead">Crea un proyecto como borrador. Revísalo antes de publicarlo para que pueda recibir aportes simulados.</p><div className="manage-grid"><form className="form-panel" onSubmit={e => void create(e)}><h2>Crear proyecto</h2><label htmlFor="title">Nombre del proyecto</label><input id="title" value={title} onChange={e => setTitle(e.target.value)} required minLength={5} maxLength={100} disabled={busy} /><label htmlFor="description">Descripción y finalidad</label><textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required minLength={30} maxLength={4000} rows={6} disabled={busy} /><label htmlFor="goal">Meta en soles (PEN)</label><input id="goal" inputMode="decimal" value={goal} onChange={e => setGoal(e.target.value)} required disabled={busy} /><p className="field-help">Usa solo proyectos ficticios y datos de prueba.</p>{error && <ErrorBox error={error} />}<button className="button" disabled={busy}>{busy ? 'Guardando…' : 'Crear borrador'}</button></form><section><h2>Proyectos creados en esta sesión</h2><p>Esta lista se conserva mientras permanezcas en esta vista. Guarda el identificador para publicar después.</p>{!projects.length && <Empty>Aún no has creado proyectos en esta vista.</Empty>}{projects.map(p => <article className="draft-card" key={p.projectId}><span className="eyebrow">{p.status}</span><h3>{p.title}</h3><p>{p.description}</p><strong>Meta: {pen(p.goalAmountCents)}</strong><code>{p.projectId}</code>{p.status === 'BORRADOR' && <button className="button secondary" disabled={busy} onClick={() => void publish(p.projectId)}>Publicar proyecto</button>}</article>)}<PublishById busy={busy} publish={publish} /></section></div></div>;
}
function PublishById({ busy, publish }: { busy: boolean; publish: (id: string) => Promise<void> }) {
  const [id, setId] = useState('');
  return <form className="form-panel" onSubmit={e => { e.preventDefault(); void publish(id.trim()); }}><h3>Publicar un borrador por identificador</h3><label htmlFor="draft-id">ID del proyecto guardado</label><input id="draft-id" value={id} onChange={e => setId(e.target.value)} required disabled={busy} /><button className="button secondary" disabled={busy}>Publicar borrador</button></form>;
}
