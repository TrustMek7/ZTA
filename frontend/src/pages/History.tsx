import { Link } from 'react-router-dom';
import { useState } from 'react';
import { pen, type PublicDonation } from '../../../shared/domain';
import { api } from '../services/api';
import { Empty, ErrorBox, Loading, Status, useResource } from '../components/common';
import { Simulate } from './ProjectDetail';
export function History() {
  const resource = useResource(() => api.history());
  const [extra, setExtra] = useState<PublicDonation[]>([]); const [cursor, setCursor] = useState<string>();
  const [overrides, setOverrides] = useState<Record<string, PublicDonation>>({});
  const [busy, setBusy] = useState(false); const [error, setError] = useState<Error>();
  const items = [...(resource.data?.items ?? []), ...extra].map(d => overrides[d.donationId] ?? d);
  const next = cursor ?? resource.data?.nextCursor;
  async function more() { setBusy(true); setError(undefined); try { const page = await api.history(next); setExtra(v => [...v, ...page.items]); setCursor(page.nextCursor ?? ''); } catch (e) { setError(e as Error); } finally { setBusy(false); } }
  return <div className="container page"><span className="eyebrow">CADA PASO, A LA VISTA</span><h1 className="page-title">Mis donaciones<span>.</span></h1><p className="page-lead">Aquí puedes seguir tus aportes de prueba y completar las simulaciones pendientes.</p><p className="simulation-note">Simulación académica: no se ha realizado ningún cobro</p>{resource.loading ? <Loading /> : resource.error ? <ErrorBox error={resource.error} retry={resource.reload} /> : !items.length ? <Empty><h2>Tu primera causa te espera.</h2><p>Todavía no has registrado aportes simulados.</p><Link className="button" to="/">Explorar proyectos</Link></Empty> : <div className="history-list">{items.map(d => <article className="history-row" key={d.donationId}><div><time dateTime={d.createdAt}>{new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'America/Lima' }).format(new Date(d.createdAt))}</time><h2><Link to={`/proyectos/${d.projectId}`}>Ver proyecto <span className="sr-only">{d.projectId}</span></Link></h2><small>Referencia: {d.donationId}</small></div><strong>{pen(d.amountCents)}</strong><div><Status status={d.status} />{d.status === 'PENDIENTE_SIMULACION' && <details><summary>Completar simulación</summary><Simulate donation={d} onChange={updated => setOverrides(v => ({ ...v, [d.donationId]: updated }))} /></details>}</div></article>)}</div>}{error && <ErrorBox error={error} />}{next && <button className="button secondary load-more" disabled={busy} onClick={() => void more()}>{busy ? 'Cargando…' : 'Ver más aportes'}</button>}</div>;
}
