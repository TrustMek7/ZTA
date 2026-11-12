import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, HeartHandshake, ShieldCheck } from 'lucide-react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Auth, useAuth } from './auth/Auth';
import { authConfigured, finishLogin, login, logout } from './auth/session';
import { configured } from './services/api';
import { ErrorBox } from './components/common';
import { Catalog } from './pages/Catalog';
import { ProjectDetail } from './pages/ProjectDetail';
import { History } from './pages/History';
import { Manage } from './pages/Manage';
import { Audit } from './pages/Audit';

export default function App() { return <BrowserRouter><Auth><Layout /></Auth></BrowserRouter>; }
function Layout() {
  const { user, groups } = useAuth(); const [error, setError] = useState<Error>();
  const location = useLocation();
  const previousLocation = useRef(location.pathname + location.hash);
  useEffect(() => {
    if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
    else window.scrollTo(0, 0);
    const key = location.pathname + location.hash;
    if (previousLocation.current !== key) document.getElementById('main-content')?.focus({ preventScroll: true });
    previousLocation.current = key;
  }, [location.pathname, location.hash]);
  return <><a className="skip-link" href="#main-content">Saltar al contenido</a><div className="academic-banner"><ShieldCheck size={14} /><span>Simulación académica: no se ha realizado ningún cobro</span></div><header className="site-header"><div className="container header-inner"><Link to="/" className="brand" aria-label="AQP-SOLIDARIA, inicio"><strong>AQP<span>—</span>SOLIDARIA<span className="brand-dot">.</span></strong><span>COMPARTIR NOS HACE COMUNIDAD</span></Link><nav aria-label="Navegación principal"><NavLink to="/" end>Proyectos</NavLink><Link to="/#como-funciona">Cómo funciona</Link><NavLink to="/transparencia">Transparencia</NavLink>{groups.includes('DONANTE') && <NavLink to="/mis-donaciones">Mis donaciones</NavLink>}{groups.includes('GESTOR') && <NavLink to="/gestion">Gestión</NavLink>}{groups.includes('AUDITOR') && <NavLink to="/auditoria">Auditoría</NavLink>}</nav><button className="button header-login" onClick={() => { if (user) void logout().catch(setError); else if (authConfigured && configured) void login()?.catch(setError); else setError(new Error('El inicio de sesión estará disponible cuando se configure Amazon Cognito y la API del entorno académico.')); }}>{user ? 'Cerrar sesión' : 'Iniciar sesión'}<ArrowUpRight size={16} /></button></div></header>{error && <div className="container"><ErrorBox error={error} /><button className="text-link" onClick={() => setError(undefined)}>Cerrar aviso</button></div>}<main id="main-content" tabIndex={-1}><Routes><Route path="/" element={<Catalog />} /><Route path="/proyectos/:id" element={<ProjectDetail />} /><Route path="/mis-donaciones" element={<Guard role="DONANTE"><History /></Guard>} /><Route path="/gestion" element={<Guard role="GESTOR"><Manage /></Guard>} /><Route path="/auditoria" element={<Guard role="AUDITOR"><Audit /></Guard>} /><Route path="/auth/callback" element={<Callback />} /><Route path="/transparencia" element={<Transparency />} /><Route path="*" element={<div className="container page"><h1>Página no encontrada.</h1><Link className="button" to="/">Volver al inicio</Link></div>} /></Routes></main><footer><div className="container footer-top"><div><Link to="/" className="brand"><strong>AQP<span>—</span>SOLIDARIA.</strong></Link><p>Una ciudad más solidaria<br />empieza con nosotros.</p></div><HeartHandshake size={60} strokeWidth={1} /><div><strong>Hecho para aprender.<br />Pensado para compartir.</strong><p>Prototipo académico · EPIS, UNSA<br />Arequipa, Perú</p></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} AQP-SOLIDARIA · Fundación ficticia</span><Link to="/transparencia">Acerca de esta simulación <ArrowUpRight size={13} /></Link></div></footer></>;
}
function Guard({ role, children }: { role: string; children: ReactNode }) {
  const { user, groups } = useAuth();
  if (!user || !groups.includes(role)) return <div className="container page"><h1>{user ? 'Acceso restringido' : 'Inicia sesión para continuar'}</h1><p>{user ? 'Tu cuenta no tiene permisos para esta sección.' : 'Esta sección requiere una sesión y el rol correspondiente.'}</p><Link className="button" to="/">Explorar proyectos</Link></div>;
  return children;
}
function Callback() {
  const navigate = useNavigate(); const [error, setError] = useState<Error>();
  useEffect(() => { if (!authConfigured) { setError(new Error('El inicio de sesión no está configurado.')); return; } let active = true; void finishLogin().then(() => { if (active) navigate('/', { replace: true }); }, () => { if (active) { window.history.replaceState(null, '', '/auth/callback'); setError(new Error('No pudimos completar el inicio de sesión. Regresa al inicio e inténtalo nuevamente.')); } }); return () => { active = false; }; }, [navigate]);
  return <div className="container page"><h1>Conectando tu sesión.</h1>{error ? <ErrorBox error={error} /> : <p role="status">Verificando el acceso seguro…</p>}<Link to="/">Volver al inicio</Link></div>;
}
function Transparency() {
  return <div className="container page transparency"><span className="eyebrow">INFORMACIÓN CLARA</span><h1 className="page-title">La confianza empieza<br />por la transparencia.</h1><p className="page-lead">AQP-SOLIDARIA es una fundación ficticia creada para un prototipo académico de la EPIS, UNSA.</p><section><h2>Sin cobros, sin datos bancarios.</h2><p>Solo se registran intenciones y resultados simulados, expresados en soles (PEN). No solicitamos tarjetas, CVV, cuentas bancarias ni DNI. Los proyectos de ejemplo y sus montos son ficticios.</p></section><section><h2>Tu sesión y tus aportes.</h2><p>En el entorno conectado, Amazon Cognito gestiona el acceso y el segundo factor TOTP. Cada operación protegida se valida en el servidor. El historial pertenece únicamente a su donante.</p></section><section><h2>Qué significa el avance.</h2><p>Únicamente las donaciones confirmadas simuladas incrementan el total de un proyecto. Las pendientes y rechazadas no lo modifican. La vista pública no muestra identidades de donantes.</p></section><section><h2>Un ejercicio con límites claros.</h2><p>La implementación local no constituye una certificación de seguridad. Los controles de AWS requieren despliegue y comprobación del equipo. Un servicio real exigiría evaluar privacidad, retención y obligaciones legales peruanas, incluida la Ley N.º 29733.</p></section><Link className="button" to="/">Conocer los proyectos <ArrowUpRight size={18} /></Link></div>;
}
