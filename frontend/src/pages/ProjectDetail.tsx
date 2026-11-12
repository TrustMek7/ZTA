import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { parsePEN, pen, type PublicDonation, type Outcome } from '../../../shared/domain';
import { api, configured } from '../services/api';
import { authConfigured, login } from '../auth/session';
import { useAuth } from '../auth/Auth';
import { ErrorBox, Loading, Progress, Status, useResource } from '../components/common';

export function Simulate({ donation, onChange }: { donation: PublicDonation; onChange: (d: PublicDonation) => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState<Error>();
  async function simulate(outcome: Outcome) { setBusy(true); setError(undefined); try { onChange(await api.simulate(donation.donationId, outcome)); } catch (e) { setError(e as Error); } finally { setBusy(false); } }
  return <div className="simulation-actions"><p>Elige el resultado de esta prueba académica.</p>{error && <ErrorBox error={error} />}<button className="button" disabled={busy} onClick={() => void simulate('CONFIRMADA_SIMULADA')}>{busy ? 'Procesando…' : 'Simular confirmación'}</button><button className="button secondary" disabled={busy} onClick={() => void simulate('RECHAZADA_SIMULADA')}>Simular rechazo</button></div>;
}
export function ProjectDetail() {
  const { id = '' } = useParams(); const resource = useResource(() => api.project(id), [id]);
  const { user, groups } = useAuth(); const [amount, setAmount] = useState('50');
  const [attempt, setAttempt] = useState<{ cents: number; key: string }>();
  const [donation, setDonation] = useState<PublicDonation>(); const [busy, setBusy] = useState(false); const [error, setError] = useState<Error>();
  const [fieldError, setFieldError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(undefined); setFieldError('');
    const cents = parsePEN(amount);
    if (cents === null || cents < 100 || cents > 100000) { setFieldError('Ingresa entre S/ 1.00 y S/ 1,000.00, con hasta dos decimales.'); return; }
    const current = attempt ?? { cents, key: crypto.randomUUID() }; setAttempt(current); setBusy(true);
    try { setDonation(await api.donate(id, current.cents, current.key)); } catch (e) { setError(e as Error); } finally { setBusy(false); }
  }
  if (resource.loading) return <div className="container page"><Loading /></div>;
  if (resource.error) return <div className="container page"><h1>Proyecto no disponible</h1><ErrorBox error={resource.error} retry={resource.reload} /><Link to="/">Volver al catálogo</Link></div>;
  const project = resource.data!;
  return <div className="container page"><Link className="back-link" to="/#proyectos"><ArrowLeft size={16} /> Todos los proyectos</Link><div className="detail-grid"><article><span className="eyebrow">AREQUIPA · PROYECTO PUBLICADO</span><h1 className="page-title">{project.title}</h1><div className="detail-statement"><HeartPhrase /></div><h2>Una causa para estar cerca.</h2>{project.description.split('\n').filter(Boolean).map((p, i) => <p className="prose" key={i}>{p}</p>)}<div className="project-meta"><span>Identificador del proyecto</span><code>{project.projectId}</code><span>Meta del proyecto: {pen(project.goalAmountCents)}</span></div></article><aside className="donation-panel"><span className="eyebrow">TU APORTE SUMA</span><h2>Acércate a esta causa.</h2><Progress project={project} /><p className="simulation-note">Simulación académica: no se ha realizado ningún cobro</p>{donation ? <div aria-live="polite"><CheckCircle2 size={32} /><h3>Intención registrada</h3><p>{pen(donation.amountCents)} para {project.title}</p><Status status={donation.status} />{donation.status === 'PENDIENTE_SIMULACION' ? <Simulate donation={donation} onChange={d => { setDonation(d); resource.reload(); }} /> : <><p>El resultado quedó registrado. No se realizó ningún cargo.</p><Link className="button" to="/mis-donaciones">Ver mis donaciones <ArrowUpRight size={17} /></Link></>}</div> : !configured || !authConfigured ? <div className="setup-note"><ShieldCheck size={24} /><h3>Un vistazo al prototipo</h3><p>El catálogo está disponible como ejemplo. Para registrar aportes se necesita conectar la API y el inicio de sesión del entorno académico.</p></div> : !user ? <><p>Inicia sesión de forma segura para registrar tu intención de donación.</p><button className="button" onClick={() => { void login()?.catch(e => setError(e)); }}>Inicia sesión para donar <ArrowUpRight size={17} /></button>{error && <ErrorBox error={error} />}</> : !groups.includes('DONANTE') ? <p>Solo las cuentas con rol donante pueden registrar aportes. Tu sesión tiene otros permisos.</p> : <form onSubmit={e => void submit(e)}><label htmlFor="amount">¿Con cuánto quieres participar?</label><div className="amount-input"><span>S/</span><input id="amount" inputMode="decimal" value={amount} disabled={busy || Boolean(attempt)} onChange={e => setAmount(e.target.value)} aria-invalid={Boolean(fieldError)} aria-describedby="amount-help amount-error" /></div><div className="quick-amounts">{['10', '20', '50', '100'].map(value => <button type="button" key={value} disabled={busy || Boolean(attempt)} className={amount === value ? 'selected' : ''} onClick={() => setAmount(value)}>S/ {value}</button>)}</div><p id="amount-help" className="field-help">Entre S/ 1.00 y S/ 1,000.00. Hasta dos decimales.</p><p id="amount-error" className="field-error" role="alert">{fieldError}</p>{error && <ErrorBox error={error} />}<button className="button" disabled={busy}>{busy ? 'Registrando…' : attempt ? 'Reintentar el mismo aporte' : 'Registrar aporte simulado'}<ArrowUpRight size={17} /></button>{attempt && error && <p className="field-help">Conservamos el mismo importe y referencia para que el reintento no duplique tu aporte. Comprueba también tu historial antes de iniciar otro.</p>}</form>}<div className="secure-note"><ShieldCheck size={17} /> Nunca te pediremos datos bancarios.</div></aside></div></div>;
}
function HeartPhrase() { return <><span>Lo que nos une</span><strong>es lo que<br /><em>compartimos.</em></strong><span>COMUNIDAD / AQP-SOLIDARIA</span></>; }
