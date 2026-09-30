// Agenda Americanista — interfaz principal
import { crearAPI } from './data.js';
import * as L from './logic.js';

// ======================= Estado =======================
const HOY = () => L.hoyISO();
const S = {
  api: null, yo: null, errorLogin: '', listo: false,
  d: { usuarios: [], espacios: [], personal: [], eventos: [], avisos: [] },
  vista: 'inicio',
  cal: { mes: HOY().slice(0, 7), dia: HOY(), espacio: '' },
  agenda: { fecha: HOY(), area: '' },
  filtroMias: 'proximas', filtroArea: 'pendientes', buscarU: '', filtroRol: '',
  avisosAbiertos: false, menuMovil: false, unsub: null, modalEv: null,
};
const VISTAS_FORM = ['nueva', 'perfil'];

// ======================= Utilidades =======================
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ahora = () => new Date().toISOString();
const usuario = id => S.d.usuarios.find(u => u.id === id);
const activos = () => S.d.usuarios.filter(u => u.activo);
const espacio = id => S.d.espacios.find(e => e.id === id);

function fmtFecha(iso, largo = false) {
  if (!iso) return '';
  const o = largo ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' };
  return L.aFecha(iso).toLocaleDateString('es-CO', o);
}
function fmtHora(h) {
  if (!h) return '';
  const [a, b] = h.split(':').map(Number);
  return `${a % 12 || 12}:${String(b).padStart(2, '0')} ${a < 12 ? 'a. m.' : 'p. m.'}`;
}
const rango = ev => `${fmtHora(ev.horaInicio)} – ${fmtHora(ev.horaFin)}`;
const lugar = ev => ev.salones && ev.salones.length ? `Salón ${ev.salones.join(', ')}` : (ev.espacioNombre || '');
const fmtMomento = iso => { try { return new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };

function badge(estado) {
  return `<span class="badge b-${estado}">${esc(L.ESTADOS[estado] || estado)}</span>`;
}
function badgeArea(estado) {
  return `<span class="badge ba-${estado}">${esc(L.ESTADOS_AREA[estado] || estado)}</span>`;
}

const ICON = {
  inicio: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  nueva: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  mias: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  aprobar: '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>',
  area: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>',
  asignaciones: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  agenda: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/>',
  usuarios: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.6"/>',
  espacios: '<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/>',
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  campana: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  salir: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  cerrar: '<path d="M18 6 6 18M6 6l12 12"/>',
  izq: '<path d="m15 18-6-6 6-6"/>',
  der: '<path d="m9 18 6-6-6-6"/>',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] || ''}</svg>`;

function toast(msg, tipo = 'ok') {
  const t = document.createElement('div');
  t.className = `toast t-${tipo}`;
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('fuera'), 3200);
  setTimeout(() => t.remove(), 3700);
}

function abrirModal(html, ancho = '') {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-fondo" data-a="cerrar-modal"></div><div class="modal-caja ${ancho}" role="dialog" aria-modal="true">${html}</div>`;
  m.hidden = false;
  document.body.classList.add('con-modal');
  const f = ancho === 'ancha' ? null : m.querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select');
  if (f && !f.readOnly) setTimeout(() => f.focus(), 30);
}
function cerrarModal() {
  const m = $('#modal');
  m.hidden = true; m.innerHTML = ''; S.modalEv = null;
  document.body.classList.remove('con-modal');
}

function confirmar(msg, textoOk = 'Confirmar', peligro = false) {
  return new Promise(res => {
    abrirModal(`<div class="modal-cab"><h3>Confirmar</h3></div><div class="modal-cuerpo"><p>${esc(msg)}</p></div>
      <div class="modal-pie"><button class="btn" data-a="conf-no">Volver</button><button class="btn ${peligro ? 'btn-peligro' : 'btn-prim'}" data-a="conf-si">${esc(textoOk)}</button></div>`, 'chica');
    S._conf = v => { cerrarModal(); res(v); };
  });
}

async function ejecutar(fn, okMsg) {
  try {
    await fn();
    if (okMsg) toast(okMsg);
    return true;
  } catch (e) {
    console.error(e);
    toast(e.message || 'Ocurrió un error.', 'error');
    return false;
  }
}

// ======================= Destinatarios de avisos =======================
const aprobadoresDe = g => activos().filter(u => g && u.grupoAprueba === g).map(u => u.id);
const lideresDe = areas => activos().filter(u => u.rol === 'lider' && areas.includes(u.area)).map(u => u.id);
const responsablesDe = espId => activos().filter(u => u.rol === 'responsable' && (u.espacios || []).includes(espId)).map(u => u.id);
function avisos(para, texto, eventoId) {
  const ids = [...new Set(para)].filter(id => id && id !== S.yo.id);
  return ids.map(id => ({ para: id, texto, eventoId }));
}
const sufijoSerie = n => (n > 1 ? ` (serie de ${n} fechas)` : '');
const hist = accion => ({ fecha: ahora(), por: S.yo.nombre, accion });

// ======================= Consultas =======================
const eventosOrden = lista => [...lista].sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio));
const porAprobar = () => S.d.eventos.filter(e => L.puedeAprobar(S.yo, e) && e.fecha >= HOY());
const pendientesArea = () => S.d.eventos.filter(e => L.puedeGestionarArea(S.yo, e) && e.areas[S.yo.area].estado === 'pendiente');
const misAsignaciones = () => S.d.eventos.filter(e => S.yo.rol === 'personal' && L.estaAsignado(S.yo, e) && L.esGestionable(e) && e.fecha >= HOY());
const avisosNoLeidos = () => S.d.avisos.filter(a => !a.leido);

function agruparSerie(lista) {
  const vistos = new Set();
  const out = [];
  eventosOrden(lista).forEach(e => {
    if (e.serieId) {
      if (vistos.has(e.serieId)) return;
      vistos.add(e.serieId);
      out.push({ ev: e, n: lista.filter(x => x.serieId === e.serieId).length });
    } else out.push({ ev: e, n: 1 });
  });
  return out;
}

// ======================= Menú =======================
function menu() {
  const u = S.yo;
  const m = [['inicio', 'Inicio'], ['calendario', 'Calendario']];
  if (L.puedeCrear(u)) m.push(['nueva', 'Nueva solicitud'], ['mias', 'Mis solicitudes']);
  if (u.grupoAprueba || u.rol === 'admin') m.push(['aprobar', 'Por aprobar', porAprobar().length]);
  if (u.rol === 'lider') m.push(['area', 'Mi área', pendientesArea().length]);
  if (u.rol === 'personal') m.push(['asignaciones', 'Mis asignaciones', misAsignaciones().length]);
  if (L.puedeVerAgenda(u)) m.push(['agenda', 'Agenda diaria']);
  if (u.rol === 'admin') m.push(['usuarios', 'Usuarios'], ['espacios', 'Espacios y personal']);
  m.push(['perfil', 'Mi perfil']);
  return m;
}
const TITULOS = {
  inicio: 'Inicio', calendario: 'Calendario de espacios', nueva: 'Nueva solicitud', mias: 'Mis solicitudes',
  aprobar: 'Solicitudes por aprobar', area: 'Mi área', asignaciones: 'Mis asignaciones', agenda: 'Agenda diaria',
  usuarios: 'Usuarios', espacios: 'Espacios y personal', perfil: 'Mi perfil',
};

// ======================= Render principal =======================
function render() {
  const app = $('#app');
  if (!S.listo) { app.innerHTML = '<div class="cargando"><div class="spinner"></div></div>'; return; }
  if (!S.yo) { app.innerHTML = vistaLogin(); return; }
  if (S.yo.debeCambiarClave && S.api.modo !== 'demo') { app.innerHTML = vistaCambioObligatorio(); return; }
  if (!menu().some(([k]) => k === S.vista)) S.vista = 'inicio';
  app.innerHTML = `
  <div class="shell ${S.menuMovil ? 'menu-abierto' : ''}">
    <aside class="sidebar" id="sidebar"></aside>
    <div class="velo" data-a="menu-movil"></div>
    <div class="principal">
      <header class="topbar" id="topbar"></header>
      <main class="contenido" id="contenido"></main>
    </div>
  </div>`;
  renderMarco();
  renderContenido();
}

function renderMarco() {
  const sb = $('#sidebar'), tb = $('#topbar');
  if (!sb || !tb) return;
  const u = S.yo;
  sb.innerHTML = `
    <div class="marca"><img src="assets/logo.png" alt="Colegio Americano de Barranquilla"><div><strong>Agenda</strong><span>Americanista</span></div></div>
    <nav>${menu().map(([k, t, n]) => `<button class="nav-item ${S.vista === k ? 'activo' : ''}" data-a="ir" data-v="${k}">${icon(k)}<span>${t}</span>${n ? `<b class="contador">${n}</b>` : ''}</button>`).join('')}</nav>
    <div class="sb-pie">
      <div class="sb-user"><div class="avatar">${esc(iniciales(u.nombre))}</div><div><strong>${esc(u.nombre)}</strong><span>${esc(u.cargo || L.ROLES[u.rol])}</span></div></div>
      <button class="nav-item" data-a="salir">${icon('salir')}<span>Cerrar sesión</span></button>
    </div>`;
  const n = avisosNoLeidos().length;
  tb.innerHTML = `
    <button class="btn-icono solo-movil" data-a="menu-movil" aria-label="Menú">${icon('menu')}</button>
    <h1>${esc(S.vista === 'nueva' && S.editando ? 'Editar solicitud' : TITULOS[S.vista] || '')}</h1>
    ${S.api.modo === 'demo' ? '<span class="chip-demo" title="Los datos se guardan solo en este navegador">Modo demostración</span>' : ''}
    <div class="tb-der">
      <div class="avisos-wrap">
        <button class="btn-icono" data-a="avisos" aria-label="Avisos">${icon('campana')}${n ? `<b class="punto">${n > 9 ? '9+' : n}</b>` : ''}</button>
        ${S.avisosAbiertos ? panelAvisos() : ''}
      </div>
    </div>`;
}

function iniciales(n) { return String(n || '?').split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase(); }

function panelAvisos() {
  const lista = [...S.d.avisos].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, 30);
  return `<div class="panel-avisos">
    <div class="pa-cab"><strong>Avisos</strong>${avisosNoLeidos().length ? '<button class="link" data-a="avisos-leidos">Marcar todos como leídos</button>' : ''}</div>
    <div class="pa-lista">${lista.length ? lista.map(a => `
      <button class="aviso ${a.leido ? '' : 'nuevo'}" data-a="abrir-aviso" data-id="${a.id}" data-ev="${esc(a.eventoId || '')}">
        <span>${esc(a.texto)}</span><small>${esc(fmtMomento(a.fecha))}</small></button>`).join('') : '<p class="vacio">No tienes avisos.</p>'}</div>
  </div>`;
}

function renderContenido() {
  const c = $('#contenido');
  if (!c) return;
  const v = {
    inicio: vistaInicio, calendario: vistaCalendario, nueva: vistaNueva, mias: vistaMias, aprobar: vistaAprobar,
    area: vistaArea, asignaciones: vistaAsignaciones, agenda: vistaAgenda, usuarios: vistaUsuarios,
    espacios: vistaEspacios, perfil: vistaPerfil,
  }[S.vista] || vistaInicio;
  c.innerHTML = v();
  if (S.vista === 'nueva') { if (S.editando) rellenarEdicion(); else actualizarDisponibilidad(); }
}

// ======================= Login =======================
function vistaLogin() {
  const demo = S.api.modo === 'demo';
  const grupos = Object.entries(L.ROLES).map(([rol, nombre]) => {
    const us = S.d.usuarios.filter(u => u.rol === rol && u.activo);
    return us.length ? `<optgroup label="${esc(nombre)}">${us.map(u => `<option value="${u.id}">${esc(u.nombre)} — ${esc(u.cargo)}</option>`).join('')}</optgroup>` : '';
  }).join('');
  return `
  <div class="login">
    <div class="login-lado">
      <img src="assets/logo.png" alt="Escudo Colegio Americano de Barranquilla">
      <h2>Agenda Americanista</h2>
      <p>Solicitud de espacios y eventos del Colegio Americano de Barranquilla.</p>
      <ul><li>Reserva un espacio y pide lo que necesitas en un solo formulario.</li><li>Sigue la aprobación y la confirmación de cada área.</li><li>Consulta la ocupación de todos los espacios.</li></ul>
    </div>
    <div class="login-form">
      <form id="form-login" class="tarjeta" data-submit="login" autocomplete="on">
        <h1>Iniciar sesión</h1>
        <label>Correo<input type="email" name="correo" required autocomplete="username" placeholder="nombre@colegio.edu.co"></label>
        <label>Contraseña<input type="password" name="clave" ${demo ? '' : 'required'} autocomplete="current-password"></label>
        ${S.errorLogin ? `<p class="error">${esc(S.errorLogin)}</p>` : ''}
        <button class="btn btn-prim btn-bloque" type="submit">Entrar</button>
        <button class="link" type="button" data-a="olvide">¿Olvidaste tu contraseña?</button>
      </form>
      ${demo ? `
      <div class="tarjeta demo-box">
        <h3>Modo demostración</h3>
        <p>Prueba la plataforma con cualquier persona del directorio. Los datos se guardan solo en este navegador.</p>
        <label>Entrar como<select id="demo-usuario">${grupos}</select></label>
        <button class="btn btn-acento btn-bloque" data-a="demo-entrar">Entrar como esta persona</button>
        <button class="link" data-a="demo-reiniciar">Restablecer datos de ejemplo</button>
      </div>` : ''}
    </div>
  </div>`;
}

function vistaCambioObligatorio() {
  return `<div class="login"><div class="login-form"><form class="tarjeta" data-submit="clave-obligatoria">
    <img src="assets/logo.png" class="logo-chico" alt="">
    <h1>Crea tu contraseña</h1>
    <p class="suave">Hola ${esc(S.yo.nombre)}. Por seguridad, cambia la contraseña temporal por una propia.</p>
    <label>Nueva contraseña<input type="password" name="clave" minlength="6" required autocomplete="new-password"></label>
    <label>Confirmar contraseña<input type="password" name="clave2" minlength="6" required autocomplete="new-password"></label>
    <button class="btn btn-prim btn-bloque" type="submit">Guardar y continuar</button>
    <button class="link" type="button" data-a="salir">Cerrar sesión</button>
  </form></div></div>`;
}

// ======================= Inicio =======================
function vistaInicio() {
  const u = S.yo, hoy = HOY();
  const act = S.d.eventos.filter(L.esActivo);
  const deHoy = eventosOrden(act.filter(e => e.fecha === hoy));
  const semana = eventosOrden(act.filter(e => e.fecha > hoy && e.fecha <= L.sumarDias(hoy, 7)));
  const tarjetas = [];
  if (u.grupoAprueba || u.rol === 'admin') tarjetas.push(['aprobar', 'Por aprobar', porAprobar().length]);
  if (u.rol === 'lider') tarjetas.push(['area', `Pendientes de ${L.nombreArea(u.area)}`, pendientesArea().length]);
  if (u.rol === 'personal') tarjetas.push(['asignaciones', 'Mis asignaciones', misAsignaciones().length]);
  if (L.puedeCrear(u)) tarjetas.push(['mias', 'Mis solicitudes activas', S.d.eventos.filter(e => e.solicitanteId === u.id && L.esActivo(e) && e.fecha >= hoy).length]);
  tarjetas.push(['calendario', 'Eventos hoy', deHoy.length], ['calendario', 'Próximos 7 días', semana.length]);
  return `
  <section class="bienvenida">
    <div><h2>Hola, ${esc(u.nombre.split(' ')[0])}</h2><p>${esc(fmtFecha(hoy, true))}</p></div>
    ${L.puedeCrear(u) ? `<button class="btn btn-acento" data-a="ir" data-v="nueva">${icon('nueva')} Nueva solicitud</button>` : ''}
  </section>
  <section class="kpis">${tarjetas.map(([v, t, n]) => `<button class="kpi" data-a="ir" data-v="${v}"><strong>${n}</strong><span>${esc(t)}</span></button>`).join('')}</section>
  <section class="dos-col">
    <div class="tarjeta"><h3>Hoy</h3>${listaEventos(deHoy, 'No hay eventos programados para hoy.')}</div>
    <div class="tarjeta"><h3>Próximos 7 días</h3>${listaEventos(semana, 'No hay eventos en los próximos días.', true)}</div>
  </section>`;
}

function listaEventos(lista, vacio, conFecha = false) {
  if (!lista.length) return `<p class="vacio">${esc(vacio)}</p>`;
  return `<div class="lista-ev">${lista.map(e => `
    <button class="fila-ev" data-a="ver" data-id="${e.id}">
      <span class="fe-hora">${conFecha ? `<b>${esc(fmtFecha(e.fecha))}</b>` : ''}${esc(rango(e))}</span>
      <span class="fe-info"><strong>${esc(e.titulo)}</strong><small>${esc(lugar(e))} · ${esc(e.solicitanteNombre)}</small></span>
      ${badge(L.estadoVisible(e))}
    </button>`).join('')}</div>`;
}

// ======================= Calendario =======================
function vistaCalendario() {
  const [y, m] = S.cal.mes.split('-').map(Number);
  const primero = new Date(y, m - 1, 1);
  const inicio = L.sumarDias(L.hoyISO(primero), -((primero.getDay() + 6) % 7));
  const hoy = HOY();
  const filtro = e => L.esActivo(e) && (!S.cal.espacio || e.espacioId === S.cal.espacio);
  const evs = S.d.eventos.filter(filtro);
  const celdas = [];
  for (let i = 0; i < 42; i++) {
    const f = L.sumarDias(inicio, i);
    const del = eventosOrden(evs.filter(e => e.fecha === f));
    const otroMes = f.slice(0, 7) !== S.cal.mes;
    celdas.push(`<button class="dia ${otroMes ? 'otro' : ''} ${f === hoy ? 'hoy' : ''} ${f === S.cal.dia ? 'sel' : ''}" data-a="cal-dia" data-f="${f}">
      <span class="num">${Number(f.slice(8))}</span>
      ${del.slice(0, 3).map(e => `<span class="chip-ev c-${L.estadoVisible(e)}" title="${esc(e.titulo)}">${esc(e.horaInicio)} ${esc(e.titulo)}</span>`).join('')}
      ${del.length > 3 ? `<span class="mas">+${del.length - 3} más</span>` : ''}
    </button>`);
    if (i === 34 && L.sumarDias(inicio, 35).slice(0, 7) !== S.cal.mes) break;
  }
  const nombreMes = primero.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const delDia = eventosOrden(evs.filter(e => e.fecha === S.cal.dia));
  const espOpts = S.d.espacios.filter(e => e.activo).map(e => `<option value="${e.id}" ${S.cal.espacio === e.id ? 'selected' : ''}>${esc(e.nombre)}</option>`).join('');
  return `
  <div class="cal-barra">
    <div class="cal-nav">
      <button class="btn-icono" data-a="cal-mes" data-d="-1" aria-label="Mes anterior">${icon('izq')}</button>
      <h2>${esc(nombreMes)}</h2>
      <button class="btn-icono" data-a="cal-mes" data-d="1" aria-label="Mes siguiente">${icon('der')}</button>
      <button class="btn btn-chico" data-a="cal-hoy">Hoy</button>
    </div>
    <select data-change="cal-espacio"><option value="">Todos los espacios</option>${espOpts}</select>
  </div>
  <div class="cal-layout">
    <div class="tarjeta cal">
      <div class="cal-sem">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `<span>${d}</span>`).join('')}</div>
      <div class="cal-grid">${celdas.join('')}</div>
      <div class="leyenda">${['pendiente', 'gestion', 'novedad', 'confirmado', 'realizado'].map(s => `<span><i class="c-${s}"></i>${esc(L.ESTADOS[s])}</span>`).join('')}</div>
    </div>
    <div class="tarjeta cal-dia">
      <h3>${esc(fmtFecha(S.cal.dia, true))}</h3>
      ${ocupacionDia(delDia)}
      ${L.puedeCrear(S.yo) && S.cal.dia > hoy ? `<button class="btn btn-acento btn-bloque" data-a="nueva-en" data-f="${S.cal.dia}">${icon('nueva')} Solicitar en esta fecha</button>` : ''}
    </div>
  </div>`;
}

function ocupacionDia(lista) {
  if (!lista.length) return '<p class="vacio">Todos los espacios están libres este día.</p>';
  const porEsp = {};
  lista.forEach(e => { const k = lugar(e); (porEsp[k] = porEsp[k] || []).push(e); });
  return Object.entries(porEsp).map(([esp, evs]) => `
    <div class="ocup"><h4>${esc(esp)}</h4>${evs.map(e => `
      <button class="ocup-ev c-borde-${L.estadoVisible(e)}" data-a="ver" data-id="${e.id}">
        <span>${esc(rango(e))}</span><strong>${esc(e.titulo)}</strong><small>${esc(e.solicitanteNombre)} · ${esc(L.ESTADOS[L.estadoVisible(e)])}</small>
      </button>`).join('')}</div>`).join('');
}

// ======================= Nueva solicitud =======================
function vistaNueva() {
  const u = S.yo;
  const man = L.sumarDias(HOY(), 1);
  const f0 = S.nuevaFecha && S.nuevaFecha >= man ? S.nuevaFecha : '';
  S.nuevaFecha = '';
  const esps = S.d.espacios.filter(e => e.activo);
  let ruta;
  if (L.requiereAprobacion(u)) {
    ruta = u.grupo
      ? `Tu solicitud irá primero a aprobación de <b>${esc(L.GRUPOS[u.grupo])}</b> y luego a las áreas de apoyo.`
      : '<b>No tienes grupo de aprobación asignado.</b> Comunícate con el administrador antes de solicitar.';
  } else ruta = 'Tu solicitud pasará directo a las áreas de apoyo que marques.';
  const ed = S.editando ? S.d.eventos.find(e => e.id === S.editando) : null;
  if (ed) {
    ruta = ed.grupoAprobacion && !['directivo', 'admin'].includes(u.rol)
      ? 'Si cambias fecha, hora o lugar, la solicitud vuelve a aprobación. Si solo cambias requerimientos, las áreas afectadas deberán confirmar de nuevo.'
      : 'Las áreas afectadas por los cambios deberán confirmar de nuevo.';
    if (ed.serieId) ruta += ' Los cambios aplican solo a esta fecha de la serie.';
  }
  const secDef = u.grupo === 'bachillerato' ? 'Bachillerato' : u.grupo === 'primaria' ? 'Preescolar y Primaria' : 'General';
  return `
  <form id="form-solicitud" class="form-sol" data-submit="solicitud" novalidate>
    <div class="aviso-ruta">${ruta} ${ed ? '' : 'La solicitud debe hacerse con mínimo 1 día de anticipación.'}</div>
    <div class="tarjeta">
      <h3>Datos del evento</h3>
      <div class="grid-form">
        <label class="c2">Tema / actividad<input name="titulo" required maxlength="140" placeholder="Ej. Entrega de informes y reunión con padres de 11°"></label>
        <label>Fecha<input type="date" name="fecha" min="${man}" value="${f0}" required data-input="disp"></label>
        <label>Hora inicio<input type="time" name="horaInicio" required data-input="disp" step="300"></label>
        <label>Hora fin<input type="time" name="horaFin" required data-input="disp" step="300"></label>
        <label>Lugar<select name="espacioId" required data-change="espacio-sol"><option value="">Selecciona…</option>${esps.map(e => `<option value="${e.id}" data-tipo="${e.tipo}">${esc(e.nombre)}</option>`).join('')}</select></label>
        <label id="campo-salones" hidden>Salón o salones<input name="salones" placeholder="Ej. 4A, 4B" data-input="disp"></label>
        <label>Sección<select name="seccion">${L.SECCIONES.map(s => `<option ${s === secDef ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <label>Dirigido a<input name="dirigidoA" maxlength="80" placeholder="Ej. 11°, docentes, padres"></label>
        <label>Responsable<input name="responsable" maxlength="80" value="${esc(u.nombre)}"></label>
        <label>Número de personas<input type="number" name="personas" min="0" max="5000" placeholder="0"></label>
      </div>
      ${ed ? '' : '<label class="check"><input type="checkbox" name="repetir" data-change="repetir"> Se repite cada semana</label>'}
      <div id="bloque-repetir" class="repetir" hidden>
        <div class="dias">${[1, 2, 3, 4, 5, 6].map(d => `<label class="dia-chk"><input type="checkbox" name="dias" value="${d}" data-change="disp"><span>${L.DIAS[d]}</span></label>`).join('')}</div>
        <label>Hasta<input type="date" name="hasta" min="${man}" data-input="disp"></label>
      </div>
      <div id="disponibilidad" class="disp"></div>
    </div>
    <div class="tarjeta">
      <h3>Requerimientos por área</h3>
      <p class="suave">Escribe lo que necesitas de cada área. Deja vacío lo que no aplique.</p>
      <div class="grid-req">${L.AREAS.map(a => `
        <label>${esc(a.nombre)}<textarea name="req-${a.id}" rows="3" maxlength="600" placeholder="${esc(a.ayuda)}"></textarea></label>`).join('')}
      </div>
    </div>
    <div class="acciones-form">
      <button type="button" class="btn" data-a="ir" data-v="mias">Cancelar</button>
      <button type="submit" class="btn btn-prim" ${!ed && L.requiereAprobacion(u) && !u.grupo ? 'disabled' : ''}>${ed ? 'Guardar cambios' : 'Enviar solicitud'}</button>
    </div>
  </form>`;
}

function leerSolicitud(form) {
  const fd = new FormData(form);
  const espId = fd.get('espacioId');
  const esp = espacio(espId);
  const esSalon = !!esp && esp.tipo === 'salon';
  const requerimientos = {};
  L.AREAS.forEach(a => { requerimientos[a.id] = String(fd.get('req-' + a.id) || '').trim(); });
  return {
    id: S.editando || undefined,
    titulo: String(fd.get('titulo') || '').trim(),
    fecha: fd.get('fecha') || '',
    horaInicio: fd.get('horaInicio') || '',
    horaFin: fd.get('horaFin') || '',
    espacioId: espId || '',
    espacioNombre: esp ? esp.nombre : '',
    esSalon,
    salones: esSalon ? L.parseSalones(fd.get('salones')) : [],
    seccion: fd.get('seccion') || '',
    dirigidoA: String(fd.get('dirigidoA') || '').trim(),
    responsable: String(fd.get('responsable') || '').trim() || S.yo.nombre,
    personas: Number(fd.get('personas') || 0),
    repetir: !!fd.get('repetir'),
    dias: fd.getAll('dias').map(Number),
    hasta: fd.get('hasta') || '',
    requerimientos,
  };
}

function conflictosDe(d) {
  if (!d.fecha || !d.horaInicio || !d.horaFin || !d.espacioId) return null;
  if (L.minutos(d.horaFin) <= L.minutos(d.horaInicio)) return null;
  if (d.esSalon && !d.salones.length) return null;
  if (d.repetir && (!d.dias.length || !d.hasta)) return null;
  const fechas = L.ocurrencias(d);
  const choques = [];
  fechas.forEach(f => L.conflictos({ ...d, fecha: f }, S.d.eventos).forEach(c => choques.push(c)));
  return { fechas, choques };
}

function actualizarDisponibilidad() {
  const form = $('#form-solicitud'), box = $('#disponibilidad');
  if (!form || !box) return;
  const r = conflictosDe(leerSolicitud(form));
  if (!r) { box.className = 'disp'; box.innerHTML = ''; return; }
  if (!r.fechas.length) { box.className = 'disp d-mal'; box.innerHTML = 'Ninguna fecha coincide con los días elegidos.'; return; }
  if (!r.choques.length) {
    box.className = 'disp d-ok';
    box.innerHTML = `Espacio disponible${r.fechas.length > 1 ? ` en las ${r.fechas.length} fechas` : ''}.`;
    return;
  }
  box.className = 'disp d-mal';
  box.innerHTML = `<strong>El espacio ya está solicitado:</strong><ul>${eventosOrden(r.choques).slice(0, 8).map(c => `<li>${esc(fmtFecha(c.fecha))}, ${esc(rango(c))} · ${esc(lugar(c))} — ${esc(c.titulo)} (${esc(c.solicitanteNombre)}, ${esc(L.ESTADOS[c.estado])})</li>`).join('')}</ul>`;
}

async function enviarSolicitud(form) {
  const d = leerSolicitud(form);
  const errores = L.validarSolicitud(d, HOY());
  const r = errores.length ? null : conflictosDe(d);
  if (r && !r.fechas.length) errores.push('Ninguna fecha coincide con los días elegidos.');
  if (r && r.choques.length) errores.push('El espacio ya está solicitado en ese horario. Revisa la disponibilidad.');
  if (errores.length) { mostrarErrores(errores); return; }
  if (S.editando) { await guardarEdicion(form, d); return; }

  const u = S.yo;
  const pide = L.requiereAprobacion(u);
  const areas = L.areasIniciales(d.requerimientos);
  const estado = pide ? 'pendiente' : (Object.keys(areas).length ? 'gestion' : 'confirmado');
  const serieId = r.fechas.length > 1 ? 's' + Date.now().toString(36) : '';
  const base = {
    titulo: d.titulo, dirigidoA: d.dirigidoA, seccion: d.seccion, espacioId: d.espacioId, espacioNombre: d.espacioNombre,
    salones: d.salones, horaInicio: d.horaInicio, horaFin: d.horaFin, responsable: d.responsable, personas: d.personas,
    requerimientos: d.requerimientos, solicitanteId: u.id, solicitanteNombre: u.nombre,
    grupoAprobacion: pide ? u.grupo : '', estado, areas: pide ? {} : areas, aprobadoPor: '', motivoRechazo: '', serieId,
    historial: [hist(pide ? 'Solicitud creada' : 'Solicitud creada (sin aprobación previa)')],
  };
  const lista = r.fechas.map(f => ({ ...base, fecha: f }));
  const btn = form.querySelector('[type=submit]');
  btn.disabled = true;
  const ok = await ejecutar(async () => {
    const ids = await S.api.crearEventos(lista);
    const ev = { ...lista[0], id: ids[0] };
    const txt = `${ev.titulo} — ${fmtFecha(ev.fecha)}${sufijoSerie(lista.length)}`;
    const av = pide
      ? avisos(aprobadoresDe(u.grupo), `Nueva solicitud por aprobar: ${txt}`, ev.id)
      : avisosGestion(ev, txt);
    await S.api.crearAvisos(av);
  }, pide ? 'Solicitud enviada a aprobación.' : 'Solicitud enviada a las áreas de apoyo.');
  if (ok) { S.vista = 'mias'; S.filtroMias = 'proximas'; render(); } else btn.disabled = false;
}

function rellenarEdicion() {
  const f = $('#form-solicitud');
  const e = S.d.eventos.find(x => x.id === S.editando);
  if (!f || !e) return;
  ['titulo', 'fecha', 'horaInicio', 'horaFin', 'espacioId', 'seccion', 'dirigidoA', 'responsable'].forEach(k => { if (f[k]) f[k].value = e[k] || ''; });
  f.personas.value = e.personas || '';
  f.salones.value = (e.salones || []).join(', ');
  $('#campo-salones').hidden = !(espacio(e.espacioId) && espacio(e.espacioId).tipo === 'salon');
  L.AREAS.forEach(a => { f['req-' + a.id].value = (e.requerimientos || {})[a.id] || ''; });
  actualizarDisponibilidad();
}

async function guardarEdicion(form, d) {
  const e = S.d.eventos.find(x => x.id === S.editando);
  if (!e || !L.puedeEditar(S.yo, e)) { toast('Este evento ya no se puede editar.', 'error'); return; }
  const campos = {
    titulo: d.titulo, dirigidoA: d.dirigidoA, seccion: d.seccion, espacioId: d.espacioId, espacioNombre: d.espacioNombre,
    salones: d.salones, fecha: d.fecha, horaInicio: d.horaInicio, horaFin: d.horaFin, responsable: d.responsable,
    personas: d.personas, requerimientos: d.requerimientos,
  };
  const etiquetas = { titulo: 'tema', fecha: 'fecha', horaInicio: 'hora', horaFin: 'hora', espacioId: 'lugar', salones: 'salón', seccion: 'sección', dirigidoA: 'dirigido a', responsable: 'responsable', personas: 'personas', requerimientos: 'requerimientos' };
  const distinto = k => (k === 'requerimientos'
    ? L.AREAS.some(a => String((campos.requerimientos || {})[a.id] || '') !== String((e.requerimientos || {})[a.id] || ''))
    : JSON.stringify(campos[k] ?? '') !== JSON.stringify(e[k] ?? ''));
  const cambiados = [...new Set(Object.keys(etiquetas).filter(distinto).map(k => etiquetas[k]))];
  if (!cambiados.length) { toast('No hiciste cambios.', 'error'); return; }
  const r = L.recalcularEdicion(e, campos, S.yo);
  const btn = form.querySelector('[type=submit]');
  btn.disabled = true;
  const ok = await ejecutar(async () => {
    await S.api.actualizarEventos([{ id: e.id, cambios: {
      ...campos, estado: r.estado, areas: r.areas, aprobadoPor: r.aprobadoPor, motivoRechazo: r.motivoRechazo,
      historial: [...(e.historial || []), hist(`Solicitud modificada (${cambiados.join(', ')})${r.reaprobar ? ' — vuelve a aprobación' : ''}`)],
    } }]);
    const nuevo = { ...e, ...campos, areas: r.areas };
    const txt = `${nuevo.titulo} — ${fmtFecha(nuevo.fecha)} (${cambiados.join(', ')})`;
    const av = [];
    if (r.reaprobar) av.push(...avisos(aprobadoresDe(e.grupoAprobacion), `Solicitud modificada por aprobar: ${txt}`, e.id));
    av.push(...avisos(lideresDe(r.avisarAreas), `Evento modificado: ${txt}`, e.id));
    if (!r.reaprobar && r.logistico) av.push(...avisos([...responsablesDe(e.espacioId), ...responsablesDe(nuevo.espacioId)], `Evento modificado: ${txt}`, e.id));
    if (S.yo.id !== e.solicitanteId) av.push(...avisos([e.solicitanteId], `Tu evento fue modificado por ${S.yo.nombre}: ${txt}`, e.id));
    await S.api.crearAvisos(av);
  }, r.reaprobar ? 'Cambios guardados. La solicitud vuelve a aprobación.' : 'Cambios guardados.');
  if (ok) { S.editando = null; S.vista = 'mias'; render(); } else btn.disabled = false;
}

function avisosGestion(ev, txt) {
  const areas = Object.keys(ev.areas || {});
  return [
    ...avisos(lideresDe(areas), `Evento por atender: ${txt}`, ev.id),
    ...avisos(responsablesDe(ev.espacioId), `Evento programado en ${ev.espacioNombre}: ${txt}`, ev.id),
  ];
}

function mostrarErrores(errores) {
  abrirModal(`<div class="modal-cab"><h3>Revisa la solicitud</h3></div>
    <div class="modal-cuerpo"><ul class="errores">${errores.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>
    <div class="modal-pie"><button class="btn btn-prim" data-a="cerrar-modal">Entendido</button></div>`, 'chica');
}

// ======================= Mis solicitudes =======================
function tablaEventos(lista, vacio, extra) {
  if (!lista.length) return `<p class="vacio">${esc(vacio)}</p>`;
  return `<div class="tabla-wrap"><table class="tabla">
    <thead><tr><th>Fecha</th><th>Hora</th><th>Evento</th><th>Lugar</th>${extra ? `<th>${extra.titulo}</th>` : ''}<th>Estado</th></tr></thead>
    <tbody>${lista.map(e => `<tr data-a="ver" data-id="${e.id}" tabindex="0">
      <td data-l="Fecha">${esc(fmtFecha(e.fecha))}${e.serieId ? ' <span class="tag">serie</span>' : ''}</td>
      <td data-l="Hora">${esc(rango(e))}</td>
      <td data-l="Evento"><strong>${esc(e.titulo)}</strong>${e.solicitanteId !== S.yo.id ? `<small class="bloque">${esc(e.solicitanteNombre)}</small>` : ''}</td>
      <td data-l="Lugar">${esc(lugar(e))}</td>
      ${extra ? `<td data-l="${extra.titulo}">${extra.celda(e)}</td>` : ''}
      <td data-l="Estado">${badge(L.estadoVisible(e))}${areasMini(e)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

function areasMini(e) {
  const a = Object.entries(e.areas || {});
  if (!a.length || !L.esGestionable(e)) return '';
  return `<span class="mini">${a.map(([id, x]) => `<i class="ma-${x.estado}" title="${esc(L.nombreArea(id))}: ${esc(L.ESTADOS_AREA[x.estado])}"></i>`).join('')}</span>`;
}

function vistaMias() {
  const hoy = HOY();
  const mias = S.d.eventos.filter(e => e.solicitanteId === S.yo.id);
  const f = S.filtroMias;
  const lista = f === 'proximas' ? mias.filter(e => e.fecha >= hoy) : f === 'pasadas' ? mias.filter(e => e.fecha < hoy) : mias;
  const orden = f === 'pasadas' ? eventosOrden(lista).reverse() : eventosOrden(lista);
  return `
  <div class="barra">
    <div class="tabs">${[['proximas', 'Próximas'], ['pasadas', 'Pasadas'], ['todas', 'Todas']].map(([k, t]) => `<button class="tab ${f === k ? 'activo' : ''}" data-a="filtro-mias" data-f="${k}">${t}</button>`).join('')}</div>
    <button class="btn btn-acento" data-a="ir" data-v="nueva">${icon('nueva')} Nueva solicitud</button>
  </div>
  <div class="tarjeta">${tablaEventos(orden, 'No tienes solicitudes en esta vista.')}</div>`;
}

// ======================= Por aprobar =======================
function vistaAprobar() {
  const grupos = agruparSerie(porAprobar());
  if (!grupos.length) return '<div class="tarjeta"><p class="vacio">No tienes solicitudes pendientes de aprobación.</p></div>';
  return `<div class="tarjetas-ev">${grupos.map(({ ev: e, n }) => `
    <article class="tarjeta tar-ev">
      <header><div><h3>${esc(e.titulo)}</h3><p>${esc(e.solicitanteNombre)} · ${esc(L.GRUPOS[e.grupoAprobacion] || '')}</p></div>${n > 1 ? `<span class="tag">Serie: ${n} fechas</span>` : ''}</header>
      <dl class="datos">
        <div><dt>Fecha</dt><dd>${esc(fmtFecha(e.fecha, true))}${n > 1 ? ' (primera)' : ''}</dd></div>
        <div><dt>Hora</dt><dd>${esc(rango(e))}</dd></div>
        <div><dt>Lugar</dt><dd>${esc(lugar(e))}</dd></div>
        <div><dt>Personas</dt><dd>${esc(e.personas || '—')}</dd></div>
      </dl>
      ${resumenReq(e)}
      <footer>
        <button class="btn" data-a="ver" data-id="${e.id}">Ver detalle</button>
        <button class="btn btn-peligro-sua" data-a="rechazar" data-id="${e.id}">Rechazar</button>
        <button class="btn btn-prim" data-a="aprobar" data-id="${e.id}">Aprobar</button>
      </footer>
    </article>`).join('')}</div>`;
}

function resumenReq(e) {
  const req = L.areasRequeridas(e.requerimientos);
  if (!req.length) return '<p class="suave">Sin requerimientos para las áreas de apoyo.</p>';
  return `<ul class="req-lista">${req.map(id => `<li><b>${esc(L.nombreArea(id))}:</b> ${esc(e.requerimientos[id])}</li>`).join('')}</ul>`;
}

const serieDe = (e, cond) => (e.serieId ? S.d.eventos.filter(x => x.serieId === e.serieId && cond(x)) : [e]);

async function aprobar(id) {
  const e = S.d.eventos.find(x => x.id === id);
  if (!e || !L.puedeAprobar(S.yo, e)) return;
  const serie = serieDe(e, x => x.estado === 'pendiente');
  const cambios = serie.map(x => {
    const areas = L.areasIniciales(x.requerimientos);
    return { id: x.id, cambios: { estado: Object.keys(areas).length ? 'gestion' : 'confirmado', areas, aprobadoPor: S.yo.nombre, historial: [...(x.historial || []), hist('Aprobado')] } };
  });
  const ok = await ejecutar(async () => {
    await S.api.actualizarEventos(cambios);
    const txt = `${e.titulo} — ${fmtFecha(e.fecha)}${sufijoSerie(serie.length)}`;
    await S.api.crearAvisos([
      ...avisos([e.solicitanteId], `Tu solicitud fue aprobada: ${txt}`, e.id),
      ...avisosGestion({ ...e, areas: L.areasIniciales(e.requerimientos) }, txt),
    ]);
  }, serie.length > 1 ? `Serie aprobada (${serie.length} fechas).` : 'Solicitud aprobada.');
  if (ok) cerrarModal();
}

function pedirRechazo(id) {
  const e = S.d.eventos.find(x => x.id === id);
  if (!e) return;
  abrirModal(`<form data-submit="rechazo" data-id="${id}">
    <div class="modal-cab"><h3>Rechazar solicitud</h3></div>
    <div class="modal-cuerpo"><p><b>${esc(e.titulo)}</b> — ${esc(fmtFecha(e.fecha))}${e.serieId ? ' (toda la serie pendiente)' : ''}</p>
      <label>Motivo del rechazo<textarea name="motivo" rows="3" required maxlength="400" placeholder="Explica al solicitante por qué y qué puede ajustar"></textarea></label></div>
    <div class="modal-pie"><button type="button" class="btn" data-a="cerrar-modal">Volver</button><button class="btn btn-peligro" type="submit">Rechazar</button></div>
  </form>`, 'chica');
}

async function rechazar(id, motivo) {
  const e = S.d.eventos.find(x => x.id === id);
  if (!e || !L.puedeAprobar(S.yo, e)) return;
  const serie = serieDe(e, x => x.estado === 'pendiente');
  const ok = await ejecutar(async () => {
    await S.api.actualizarEventos(serie.map(x => ({ id: x.id, cambios: { estado: 'rechazado', motivoRechazo: motivo, aprobadoPor: S.yo.nombre, historial: [...(x.historial || []), hist(`Rechazado: ${motivo}`)] } })));
    await S.api.crearAvisos(avisos([e.solicitanteId], `Tu solicitud fue rechazada: ${e.titulo} — ${motivo}`, e.id));
  }, 'Solicitud rechazada.');
  if (ok) cerrarModal();
}

// ======================= Mi área =======================
function vistaArea() {
  const u = S.yo, hoy = HOY(), f = S.filtroArea;
  const mias = S.d.eventos.filter(e => e.areas && e.areas[u.area] && L.esGestionable(e));
  const lista = f === 'pendientes' ? mias.filter(e => e.fecha >= hoy && e.areas[u.area].estado === 'pendiente')
    : f === 'novedades' ? mias.filter(e => e.fecha >= hoy && e.areas[u.area].estado === 'no_disponible')
      : f === 'proximos' ? mias.filter(e => e.fecha >= hoy) : mias.filter(e => e.fecha < hoy);
  const orden = f === 'pasados' ? eventosOrden(lista).reverse() : eventosOrden(lista);
  const extra = {
    titulo: L.nombreArea(u.area),
    celda: e => { const a = e.areas[u.area]; return `<span class="req-txt">${esc(e.requerimientos[u.area])}</span>${badgeArea(a.estado)}${(a.asignados || []).length ? `<small class="bloque">${esc(a.asignados.map(x => x.nombre).join(', '))}</small>` : ''}`; },
  };
  return `
  <div class="barra"><div class="tabs">${[['pendientes', 'Pendientes'], ['proximos', 'Próximos'], ['novedades', 'Con novedad'], ['pasados', 'Pasados']].map(([k, t]) => `<button class="tab ${f === k ? 'activo' : ''}" data-a="filtro-area" data-f="${k}">${t}</button>`).join('')}</div></div>
  <div class="tarjeta">${tablaEventos(orden, 'No hay eventos en esta vista.', extra)}</div>`;
}

function vistaAsignaciones() {
  const u = S.yo;
  const extra = { titulo: 'Qué hay que hacer', celda: e => `<span class="req-txt">${esc(e.requerimientos[u.area])}</span>${badgeArea(e.areas[u.area].estado)}` };
  return `<div class="tarjeta">${tablaEventos(eventosOrden(misAsignaciones()), 'No tienes eventos asignados.', extra)}</div>`;
}

// ======================= Detalle del evento =======================
function verEvento(id) {
  const e = S.d.eventos.find(x => x.id === id);
  if (!e) { toast('El evento ya no está disponible.', 'error'); return; }
  S.modalEv = id;
  const u = S.yo, est = L.estadoVisible(e);
  const n = e.serieId ? S.d.eventos.filter(x => x.serieId === e.serieId).length : 1;
  const areasHtml = L.areasRequeridas(e.requerimientos).map(id2 => {
    const a = (e.areas || {})[id2];
    return `<div class="area-det">
      <div class="ad-cab"><strong>${esc(L.nombreArea(id2))}</strong>${a ? badgeArea(a.estado) : '<span class="badge ba-espera">Espera aprobación</span>'}</div>
      <p>${esc(e.requerimientos[id2])}</p>
      ${a && a.comentario ? `<p class="comentario">“${esc(a.comentario)}”</p>` : ''}
      ${a && (a.asignados || []).length ? `<p class="suave">Asignado a: ${esc(a.asignados.map(x => x.nombre).join(', '))}</p>` : ''}
      ${a && a.por ? `<p class="suave">Respondió ${esc(a.por)}${a.fecha ? ' · ' + esc(fmtMomento(a.fecha)) : ''}</p>` : ''}
    </div>`;
  }).join('');

  const acciones = [];
  if (L.puedeAprobar(u, e)) acciones.push(`<button class="btn btn-peligro-sua" data-a="rechazar" data-id="${e.id}">Rechazar</button><button class="btn btn-prim" data-a="aprobar" data-id="${e.id}">Aprobar${n > 1 ? ' serie' : ''}</button>`);
  if (L.puedeMarcarListo(u, e)) acciones.push(`<button class="btn btn-prim" data-a="listo" data-id="${e.id}">Marcar como listo</button>`);
  if (L.puedeEditar(u, e)) acciones.push(`<button class="btn" data-a="editar" data-id="${e.id}">${e.estado === 'rechazado' ? 'Editar y reenviar' : 'Editar'}</button>`);
  if (L.puedeCancelar(u, e)) acciones.push(`<button class="btn btn-peligro-sua" data-a="cancelar" data-id="${e.id}">Cancelar evento</button>`);

  abrirModal(`
    <div class="modal-cab">
      <div><h3>${esc(e.titulo)}</h3><div class="cab-tags">${badge(est)}${n > 1 ? `<span class="tag">Serie semanal · ${n} fechas</span>` : ''}</div></div>
      <button class="btn-icono" data-a="cerrar-modal" aria-label="Cerrar">${icon('cerrar')}</button>
    </div>
    <div class="modal-cuerpo">
      <dl class="datos">
        <div><dt>Fecha</dt><dd>${esc(fmtFecha(e.fecha, true))}</dd></div>
        <div><dt>Hora</dt><dd>${esc(rango(e))}</dd></div>
        <div><dt>Lugar</dt><dd>${esc(lugar(e))}</dd></div>
        <div><dt>Sección</dt><dd>${esc(e.seccion)}${e.dirigidoA ? ` · ${esc(e.dirigidoA)}` : ''}</dd></div>
        <div><dt>Responsable</dt><dd>${esc(e.responsable)}</dd></div>
        <div><dt>Personas</dt><dd>${esc(e.personas || '—')}</dd></div>
        <div><dt>Solicitado por</dt><dd>${esc(e.solicitanteNombre)}</dd></div>
        ${e.grupoAprobacion ? `<div><dt>Aprobación</dt><dd>${esc(L.GRUPOS[e.grupoAprobacion])}${e.aprobadoPor ? ` · ${esc(e.aprobadoPor)}` : ''}</dd></div>` : ''}
      </dl>
      ${e.estado === 'rechazado' && e.motivoRechazo ? `<div class="alerta">Motivo del rechazo: ${esc(e.motivoRechazo)}</div>` : ''}
      <h4>Requerimientos</h4>
      ${areasHtml || '<p class="suave">Sin requerimientos para las áreas de apoyo.</p>'}
      ${L.puedeGestionarArea(u, e) ? formArea(e) : ''}
      <details class="historial"><summary>Historial</summary><ul>${(e.historial || []).map(h => `<li><small>${esc(fmtMomento(h.fecha))}</small> ${esc(h.por)}: ${esc(h.accion)}</li>`).join('')}</ul></details>
    </div>
    ${acciones.length ? `<div class="modal-pie">${acciones.join('')}</div>` : ''}`, 'ancha');
}

function formArea(e) {
  const u = S.yo, a = e.areas[u.area];
  const asig = (a.asignados || []).map(x => x.id);
  const conUsuario = activos().filter(x => x.rol === 'personal' && x.area === u.area).map(x => ({ id: x.id, nombre: x.nombre, tipo: 'usuario' }));
  const sinUsuario = S.d.personal.filter(p => p.area === u.area).map(p => ({ id: p.id, nombre: p.nombre, tipo: 'sin_usuario' }));
  const personas = [...conUsuario, ...sinUsuario];
  const futuras = e.serieId ? S.d.eventos.filter(x => x.serieId === e.serieId && x.fecha > e.fecha && L.puedeGestionarArea(u, x)).length : 0;
  return `
  <form class="form-area" data-submit="area" data-id="${e.id}">
    <h4>Respuesta de ${esc(L.nombreArea(u.area))}</h4>
    <div class="opciones">${['confirmado', 'listo', 'no_disponible'].map(s => `
      <label class="opcion o-${s}"><input type="radio" name="estado" value="${s}" ${a.estado === s || (a.estado === 'pendiente' && s === 'confirmado') ? 'checked' : ''}><span>${L.ESTADOS_AREA[s]}</span></label>`).join('')}</div>
    <label>Comentario <small>(obligatorio si no está disponible)</small><textarea name="comentario" rows="2" maxlength="400">${esc(a.comentario || '')}</textarea></label>
    ${personas.length ? `<fieldset><legend>Asignar personal (opcional)</legend><div class="asignar">${personas.map(p => `
      <label class="check"><input type="checkbox" name="asignado" value="${esc(p.id)}" data-nombre="${esc(p.nombre)}" data-tipo="${p.tipo}" ${asig.includes(p.id) ? 'checked' : ''}> ${esc(p.nombre)}${p.tipo === 'sin_usuario' ? ' <small>(sin usuario)</small>' : ''}</label>`).join('')}</div></fieldset>` : ''}
    ${futuras ? `<label class="check"><input type="checkbox" name="serie"> Aplicar también a las ${futuras} fechas siguientes de la serie</label>` : ''}
    <button class="btn btn-prim" type="submit">Guardar respuesta</button>
  </form>`;
}

async function responderArea(form) {
  const e = S.d.eventos.find(x => x.id === form.dataset.id);
  const u = S.yo;
  if (!e || !L.puedeGestionarArea(u, e)) return;
  const fd = new FormData(form);
  const estado = fd.get('estado');
  const comentario = String(fd.get('comentario') || '').trim();
  if (estado === 'no_disponible' && !comentario) { toast('Escribe un comentario explicando la novedad.', 'error'); return; }
  const asignados = $$('input[name=asignado]:checked', form).map(i => ({ id: i.value, nombre: i.dataset.nombre, tipo: i.dataset.tipo }));
  const objetivos = fd.get('serie') ? [e, ...S.d.eventos.filter(x => x.serieId === e.serieId && x.fecha > e.fecha && L.puedeGestionarArea(u, x))] : [e];
  const lista = [], av = [];
  objetivos.forEach(x => {
    const antes = x.areas[u.area];
    const areas = { ...x.areas, [u.area]: { estado, comentario, asignados, por: u.nombre, fecha: ahora() } };
    const nuevo = L.estadoPorAreas(areas);
    lista.push({ id: x.id, cambios: { areas, estado: nuevo, historial: [...(x.historial || []), hist(`${L.nombreArea(u.area)}: ${L.ESTADOS_AREA[estado]}${comentario ? ' — ' + comentario : ''}`)] } });
    if (x === e) {
      const txt = `${x.titulo} — ${fmtFecha(x.fecha)}${objetivos.length > 1 ? ` y ${objetivos.length - 1} fechas más` : ''}`;
      if (estado === 'no_disponible' && antes.estado !== 'no_disponible') av.push(...avisos([x.solicitanteId, ...aprobadoresDe(x.grupoAprobacion)], `Novedad en ${txt}: ${L.nombreArea(u.area)} no disponible — ${comentario}`, x.id));
      if (nuevo === 'confirmado' && x.estado !== 'confirmado') av.push(...avisos([x.solicitanteId], `Tu evento está confirmado: ${txt}`, x.id));
      const antesIds = (antes.asignados || []).map(z => z.id);
      av.push(...avisos(asignados.filter(z => z.tipo === 'usuario' && !antesIds.includes(z.id)).map(z => z.id), `Te asignaron: ${txt} (${lugar(x)}, ${rango(x)})`, x.id));
    }
  });
  const ok = await ejecutar(async () => { await S.api.actualizarEventos(lista); await S.api.crearAvisos(av); }, 'Respuesta guardada.');
  if (ok) cerrarModal();
}

async function marcarListo(id) {
  const e = S.d.eventos.find(x => x.id === id);
  const u = S.yo;
  if (!e || !L.puedeMarcarListo(u, e)) return;
  const areas = { ...e.areas, [u.area]: { ...e.areas[u.area], estado: 'listo', por: u.nombre, fecha: ahora() } };
  const nuevo = L.estadoPorAreas(areas);
  const ok = await ejecutar(async () => {
    await S.api.actualizarEventos([{ id, cambios: { areas, estado: nuevo, historial: [...(e.historial || []), hist(`${L.nombreArea(u.area)}: Listo`)] } }]);
    const av = avisos(lideresDe([u.area]), `${u.nombre} marcó listo: ${e.titulo} — ${fmtFecha(e.fecha)}`, id);
    if (nuevo === 'confirmado' && e.estado !== 'confirmado') av.push(...avisos([e.solicitanteId], `Tu evento está confirmado: ${e.titulo} — ${fmtFecha(e.fecha)}`, id));
    await S.api.crearAvisos(av);
  }, 'Marcado como listo.');
  if (ok) cerrarModal();
}

function pedirCancelacion(id) {
  const e = S.d.eventos.find(x => x.id === id);
  if (!e) return;
  const siguientes = e.serieId ? S.d.eventos.filter(x => x.serieId === e.serieId && x.fecha >= e.fecha && L.puedeCancelar(S.yo, x)).length : 1;
  const todas = e.serieId ? S.d.eventos.filter(x => x.serieId === e.serieId && L.puedeCancelar(S.yo, x)).length : 1;
  abrirModal(`<form data-submit="cancelar" data-id="${id}">
    <div class="modal-cab"><h3>Cancelar evento</h3></div>
    <div class="modal-cuerpo">
      <p><b>${esc(e.titulo)}</b> — ${esc(fmtFecha(e.fecha))}. El espacio quedará libre y se avisará a las áreas.</p>
      ${e.serieId ? `<div class="opciones col">
        <label class="opcion"><input type="radio" name="alcance" value="uno" checked><span>Solo este evento</span></label>
        <label class="opcion"><input type="radio" name="alcance" value="siguientes"><span>Este y los siguientes (${siguientes})</span></label>
        <label class="opcion"><input type="radio" name="alcance" value="serie"><span>Toda la serie pendiente (${todas})</span></label></div>` : ''}
    </div>
    <div class="modal-pie"><button type="button" class="btn" data-a="cerrar-modal">Volver</button><button class="btn btn-peligro" type="submit">Cancelar evento</button></div>
  </form>`, 'chica');
}

async function cancelar(id, alcance) {
  const e = S.d.eventos.find(x => x.id === id);
  if (!e) return;
  const u = S.yo;
  const obj = !e.serieId || alcance === 'uno' ? [e]
    : S.d.eventos.filter(x => x.serieId === e.serieId && L.puedeCancelar(u, x) && (alcance === 'serie' || x.fecha >= e.fecha));
  const ok = await ejecutar(async () => {
    await S.api.actualizarEventos(obj.map(x => ({ id: x.id, cambios: { estado: 'cancelado', canceladoPor: u.nombre, historial: [...(x.historial || []), hist('Evento cancelado')] } })));
    const txt = `Evento cancelado: ${e.titulo} — ${fmtFecha(e.fecha)}${sufijoSerie(obj.length)}`;
    await S.api.crearAvisos([
      ...avisos([e.solicitanteId], txt, e.id),
      ...(L.esGestionable(e) ? avisosGestion(e, txt).map(a => ({ ...a, texto: txt })) : avisos(aprobadoresDe(e.grupoAprobacion), txt, e.id)),
    ]);
  }, obj.length > 1 ? `${obj.length} eventos cancelados.` : 'Evento cancelado.');
  if (ok) cerrarModal();
}

// ======================= Agenda diaria =======================
function agendaDatos() {
  const u = S.yo;
  let area = S.agenda.area;
  if (u.rol === 'lider' || u.rol === 'personal') area = u.area;
  let lista = S.d.eventos.filter(e => e.fecha === S.agenda.fecha && L.esGestionable(e));
  let titulo = 'Todas las áreas';
  if (u.rol === 'responsable') { lista = lista.filter(e => (u.espacios || []).includes(e.espacioId)); titulo = (u.espacios || []).map(id => (espacio(id) || {}).nombre).filter(Boolean).join(' y '); area = ''; }
  else if (area) { lista = lista.filter(e => e.areas && e.areas[area]); titulo = L.nombreArea(area); }
  return { lista: eventosOrden(lista), area, titulo };
}

function vistaAgenda() {
  const u = S.yo;
  const { lista, area, titulo } = agendaDatos();
  const elegirArea = ['directivo', 'admin'].includes(u.rol);
  return `
  <div class="barra no-print">
    <div class="filtros">
      <label>Fecha<input type="date" value="${S.agenda.fecha}" data-change="agenda-fecha"></label>
      ${elegirArea ? `<label>Área<select data-change="agenda-area"><option value="">Todas</option>${L.AREAS.map(a => `<option value="${a.id}" ${S.agenda.area === a.id ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select></label>` : ''}
    </div>
    <div class="botones"><button class="btn" data-a="imprimir">Imprimir</button><button class="btn btn-wa" data-a="whatsapp">Compartir por WhatsApp</button></div>
  </div>
  <div class="tarjeta hoja" id="hoja-agenda">
    <div class="hoja-cab"><img src="assets/logo.png" alt=""><div><h2>Agenda del día — ${esc(titulo)}</h2><p>${esc(fmtFecha(S.agenda.fecha, true))}</p></div></div>
    ${lista.length ? `<table class="tabla agenda"><thead><tr><th>Hora</th><th>Lugar</th><th>Evento</th><th>Requerimientos</th><th>Asignado</th></tr></thead><tbody>
      ${lista.map(e => {
        const areas = area ? [area] : Object.keys(e.areas || {});
        return `<tr data-a="ver" data-id="${e.id}">
          <td data-l="Hora">${esc(rango(e))}</td><td data-l="Lugar">${esc(lugar(e))}</td>
          <td data-l="Evento"><strong>${esc(e.titulo)}</strong><small class="bloque">${esc(e.responsable)}${e.personas ? ` · ${e.personas} personas` : ''}</small></td>
          <td data-l="Requerimientos">${areas.length ? areas.map(a => `<div>${area ? '' : `<b>${esc(L.nombreArea(a))}:</b> `}${esc(e.requerimientos[a])}</div>`).join('') : '—'}</td>
          <td data-l="Asignado">${areas.map(a => esc(((e.areas[a] || {}).asignados || []).map(x => x.nombre).join(', '))).filter(Boolean).join('<br>') || '—'}</td>
        </tr>`;
      }).join('')}</tbody></table>` : '<p class="vacio">No hay eventos para este día.</p>'}
  </div>`;
}

function textoWhatsapp() {
  const { lista, area, titulo } = agendaDatos();
  let t = `*Agenda del día — ${titulo}*\n${fmtFecha(S.agenda.fecha, true)}\n`;
  if (!lista.length) return t + '\nNo hay eventos programados.';
  lista.forEach(e => {
    const areas = area ? [area] : Object.keys(e.areas || {});
    t += `\n• *${rango(e)}* · ${lugar(e)}\n  ${e.titulo}`;
    areas.forEach(a => {
      const asg = ((e.areas[a] || {}).asignados || []).map(x => x.nombre).join(', ');
      t += `\n  ${area ? 'Requiere' : L.nombreArea(a)}: ${e.requerimientos[a]}${asg ? ` (${asg})` : ''}`;
    });
    t += '\n';
  });
  return t + '\n_Agenda Americanista_';
}

// ======================= Usuarios (admin) =======================
function detalleRol(u) {
  if (u.rol === 'docente') return u.grupo ? `Aprueba: ${L.GRUPOS[u.grupo]}` : 'Sin grupo';
  if (u.rol === 'lider' || u.rol === 'personal') return L.nombreArea(u.area);
  if (u.rol === 'responsable') return (u.espacios || []).map(id => (espacio(id) || {}).nombre).filter(Boolean).join(', ');
  return u.grupoAprueba ? `Aprueba ${L.GRUPOS[u.grupoAprueba]}` : '';
}

function vistaUsuarios() {
  const q = S.buscarU.toLowerCase();
  const lista = S.d.usuarios
    .filter(u => (!S.filtroRol || u.rol === S.filtroRol) && (!q || `${u.nombre} ${u.correo} ${u.cargo}`.toLowerCase().includes(q)))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  return `
  <div class="barra">
    <div class="filtros">
      <input type="search" placeholder="Buscar por nombre, correo o cargo" value="${esc(S.buscarU)}" data-input="buscar-u">
      <select data-change="filtro-rol"><option value="">Todos los roles</option>${Object.entries(L.ROLES).map(([k, v]) => `<option value="${k}" ${S.filtroRol === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    </div>
    <button class="btn btn-acento" data-a="usuario-nuevo">${icon('nueva')} Nuevo usuario</button>
  </div>
  <div class="tarjeta"><div class="tabla-wrap"><table class="tabla">
    <thead><tr><th>Nombre</th><th>Rol</th><th>Detalle</th><th>Estado</th><th></th></tr></thead>
    <tbody>${lista.map(u => `<tr class="${u.activo ? '' : 'inactivo'}">
      <td data-l="Nombre"><strong>${esc(u.nombre)}</strong><small class="bloque">${esc(u.cargo)}</small><small class="bloque">${esc(u.correo)}</small></td>
      <td data-l="Rol">${esc(L.ROLES[u.rol])}</td>
      <td data-l="Detalle">${esc(detalleRol(u))}</td>
      <td data-l="Estado"><span class="badge ${u.activo ? 'b-confirmado' : 'b-cancelado'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td class="acc">
        <button class="btn btn-chico" data-a="usuario-editar" data-id="${u.id}">Editar</button>
        ${u.id !== S.yo.id ? `<button class="btn btn-chico" data-a="usuario-activo" data-id="${u.id}">${u.activo ? 'Inactivar' : 'Activar'}</button>` : ''}
        <button class="btn btn-chico" data-a="usuario-clave" data-id="${u.id}" title="Enviar enlace para restablecer la contraseña">Restablecer</button>
        ${u.id !== S.yo.id ? `<button class="btn btn-chico btn-peligro-sua" data-a="usuario-eliminar" data-id="${u.id}">Eliminar</button>` : ''}
      </td></tr>`).join('')}</tbody></table></div>
    <p class="suave">${lista.length} usuario(s).</p></div>`;
}

function formUsuario(u) {
  const x = u || { nombre: '', correo: '', cargo: '', rol: 'docente', grupo: '', grupoAprueba: '', area: '', espacios: [] };
  const opt = (obj, sel, vacio) => `${vacio !== undefined ? `<option value="">${vacio}</option>` : ''}${Object.entries(obj).map(([k, v]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}`;
  const areas = Object.fromEntries(L.AREAS.map(a => [a.id, a.nombre]));
  abrirModal(`<form data-submit="usuario" data-id="${u ? u.id : ''}" id="form-usuario">
    <div class="modal-cab"><h3>${u ? 'Editar usuario' : 'Nuevo usuario'}</h3><button type="button" class="btn-icono" data-a="cerrar-modal" aria-label="Cerrar">${icon('cerrar')}</button></div>
    <div class="modal-cuerpo grid-form">
      <label class="c2">Nombre completo<input name="nombre" required maxlength="80" value="${esc(x.nombre)}"></label>
      <label>Correo institucional<input type="email" name="correo" required value="${esc(x.correo)}" ${u ? 'readonly' : ''}></label>
      <label>Cargo<input name="cargo" maxlength="80" value="${esc(x.cargo)}"></label>
      <label>Rol<select name="rol" data-change="rol-usuario">${opt(L.ROLES, x.rol)}</select></label>
      <label data-para="docente">Grupo de aprobación<select name="grupo">${opt(L.GRUPOS, x.grupo, 'Selecciona…')}</select></label>
      <label data-para="lider personal">Área<select name="area">${opt(areas, x.area, 'Selecciona…')}</select></label>
      <label data-para="coordinacion dependencia directivo admin">Aprueba solicitudes de<select name="grupoAprueba">${opt(L.GRUPOS, x.grupoAprueba, 'Ninguno')}</select></label>
      <fieldset class="c2" data-para="responsable"><legend>Espacios a cargo</legend><div class="asignar">${S.d.espacios.filter(e => e.tipo !== 'salon').map(e => `<label class="check"><input type="checkbox" name="espacios" value="${e.id}" ${(x.espacios || []).includes(e.id) ? 'checked' : ''}> ${esc(e.nombre)}</label>`).join('')}</div></fieldset>
      ${u ? '' : `<p class="c2 suave">La contraseña temporal será <b>${L.claveGenerica()}</b>; la persona la cambia en su primer ingreso.</p>`}
    </div>
    <div class="modal-pie"><button type="button" class="btn" data-a="cerrar-modal">Cancelar</button><button class="btn btn-prim" type="submit">${u ? 'Guardar cambios' : 'Crear usuario'}</button></div>
  </form>`);
  camposRol();
}

function camposRol() {
  const f = $('#form-usuario');
  if (!f) return;
  const rol = f.rol.value;
  $$('[data-para]', f).forEach(el => { el.hidden = !el.dataset.para.split(' ').includes(rol); });
}

async function guardarUsuario(form) {
  const fd = new FormData(form);
  const rol = fd.get('rol');
  const d = {
    nombre: String(fd.get('nombre')).trim(), cargo: String(fd.get('cargo') || '').trim(), rol,
    grupo: rol === 'docente' ? fd.get('grupo') : '',
    area: ['lider', 'personal'].includes(rol) ? fd.get('area') : '',
    grupoAprueba: ['coordinacion', 'dependencia', 'directivo', 'admin'].includes(rol) ? fd.get('grupoAprueba') : '',
    espacios: rol === 'responsable' ? fd.getAll('espacios') : [],
  };
  if (rol === 'docente' && !d.grupo) { toast('Elige el grupo de aprobación del docente.', 'error'); return; }
  if (['lider', 'personal'].includes(rol) && !d.area) { toast('Elige el área.', 'error'); return; }
  const id = form.dataset.id;
  const btn = form.querySelector('[type=submit]');
  btn.disabled = true;
  if (id) {
    if (await ejecutar(() => S.api.actualizarUsuario(id, d), 'Usuario actualizado.')) cerrarModal(); else btn.disabled = false;
    return;
  }
  let res;
  const ok = await ejecutar(async () => { res = await S.api.crearUsuario({ ...d, correo: String(fd.get('correo')).trim() }); });
  if (!ok) { btn.disabled = false; return; }
  abrirModal(`<div class="modal-cab"><h3>Usuario creado</h3></div>
    <div class="modal-cuerpo"><p>Entrega estos datos a <b>${esc(d.nombre)}</b>:</p>
      <div class="credencial"><div><span>Correo</span><strong>${esc(String(fd.get('correo')).trim().toLowerCase())}</strong></div><div><span>Contraseña temporal</span><strong>${esc(res.clave)}</strong></div></div>
      <p class="suave">Al entrar por primera vez, la plataforma le pedirá crear su propia contraseña.</p></div>
    <div class="modal-pie"><button class="btn" data-a="copiar-credencial" data-texto="${esc(`Agenda Americanista\n${location.origin}${location.pathname}\nCorreo: ${String(fd.get('correo')).trim().toLowerCase()}\nContraseña temporal: ${res.clave}`)}">Copiar</button><button class="btn btn-prim" data-a="cerrar-modal">Listo</button></div>`, 'chica');
}

// ======================= Espacios y personal (admin) =======================
function vistaEspacios() {
  const esps = [...S.d.espacios].sort((a, b) => a.nombre.localeCompare(b.nombre));
  return `
  <section class="dos-col">
    <div class="tarjeta">
      <h3>Espacios</h3>
      ${esps.length ? `<table class="tabla"><thead><tr><th>Espacio</th><th>Tipo</th><th>Estado</th><th></th></tr></thead><tbody>
        ${esps.map(e => `<tr class="${e.activo ? '' : 'inactivo'}"><td data-l="Espacio"><strong>${esc(e.nombre)}</strong></td><td data-l="Tipo">${e.tipo === 'salon' ? 'Salón (se escribe)' : 'Espacio común'}</td>
          <td data-l="Estado"><span class="badge ${e.activo ? 'b-confirmado' : 'b-cancelado'}">${e.activo ? 'Activo' : 'Inactivo'}</span></td>
          <td class="acc"><button class="btn btn-chico" data-a="espacio-editar" data-id="${e.id}">Renombrar</button><button class="btn btn-chico" data-a="espacio-activo" data-id="${e.id}">${e.activo ? 'Desactivar' : 'Activar'}</button></td></tr>`).join('')}
      </tbody></table>` : `<p class="vacio">Aún no hay espacios registrados.</p><button class="btn btn-prim" data-a="espacios-iniciales">Cargar los 7 espacios del colegio y Salón</button>`}
      <form class="form-linea" data-submit="espacio"><input name="nombre" required maxlength="60" placeholder="Nuevo espacio, ej. Cancha"><button class="btn btn-acento" type="submit">Agregar</button></form>
    </div>
    <div class="tarjeta">
      <h3>Personal sin usuario</h3>
      <p class="suave">Personas de las áreas de apoyo que no usan la plataforma. Los líderes pueden asignarlas y marcan el avance por ellas.</p>
      ${L.AREAS.map(a => { const ps = S.d.personal.filter(p => p.area === a.id); return `<div class="grupo-personal"><h4>${esc(a.nombre)}</h4>${ps.length ? `<ul>${ps.map(p => `<li>${esc(p.nombre)}<button class="link peligro" data-a="personal-eliminar" data-id="${p.id}">Quitar</button></li>`).join('')}</ul>` : '<p class="suave">Sin personal registrado.</p>'}</div>`; }).join('')}
      <form class="form-linea" data-submit="personal"><input name="nombre" required maxlength="60" placeholder="Nombre"><select name="area">${L.AREAS.map(a => `<option value="${a.id}">${esc(a.nombre)}</option>`).join('')}</select><button class="btn btn-acento" type="submit">Agregar</button></form>
    </div>
  </section>`;
}

// ======================= Perfil =======================
function vistaPerfil() {
  const u = S.yo;
  return `<section class="dos-col">
    <div class="tarjeta"><h3>Mis datos</h3><dl class="datos una">
      <div><dt>Nombre</dt><dd>${esc(u.nombre)}</dd></div><div><dt>Correo</dt><dd>${esc(u.correo)}</dd></div>
      <div><dt>Cargo</dt><dd>${esc(u.cargo || '—')}</dd></div><div><dt>Rol</dt><dd>${esc(L.ROLES[u.rol])}</dd></div>
      ${detalleRol(u) ? `<div><dt>Detalle</dt><dd>${esc(detalleRol(u))}</dd></div>` : ''}</dl>
      <p class="suave">Si algún dato no es correcto, comunícate con el administrador.</p></div>
    <form class="tarjeta" data-submit="clave">
      <h3>Cambiar contraseña</h3>
      ${S.api.modo === 'demo' ? '<p class="suave">En modo demostración no se usan contraseñas reales.</p>' : ''}
      <label>Nueva contraseña<input type="password" name="clave" minlength="6" required autocomplete="new-password"></label>
      <label>Confirmar contraseña<input type="password" name="clave2" minlength="6" required autocomplete="new-password"></label>
      <button class="btn btn-prim" type="submit">Actualizar contraseña</button>
    </form></section>`;
}

async function cambiarClave(form, obligatoria) {
  const fd = new FormData(form);
  const c1 = String(fd.get('clave')), c2 = String(fd.get('clave2'));
  if (c1.length < 6) { toast('La contraseña debe tener al menos 6 caracteres.', 'error'); return; }
  if (c1 !== c2) { toast('Las contraseñas no coinciden.', 'error'); return; }
  if (c1 === L.claveGenerica()) { toast('Elige una contraseña distinta a la temporal.', 'error'); return; }
  if (await ejecutar(() => S.api.cambiarClave(c1), 'Contraseña actualizada.')) {
    form.reset();
    if (obligatoria) { S.yo = { ...S.yo, debeCambiarClave: false }; render(); }
  }
}

// ======================= Eventos del DOM =======================
document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('[data-a]');
  if (S.avisosAbiertos && !ev.target.closest('.avisos-wrap')) { S.avisosAbiertos = false; renderMarco(); }
  if (!t) return;
  const a = t.dataset.a, id = t.dataset.id;
  switch (a) {
    case 'editar': cerrarModal(); S.editando = id; S.vista = 'nueva'; render(); window.scrollTo(0, 0); break;
    case 'ir': S.vista = t.dataset.v; S.editando = null; S.menuMovil = false; render(); window.scrollTo(0, 0); break;
    case 'menu-movil': S.menuMovil = !S.menuMovil; $('.shell').classList.toggle('menu-abierto', S.menuMovil); break;
    case 'salir': cerrarModal(); await ejecutar(() => S.api.logout()); break;
    case 'avisos': S.avisosAbiertos = !S.avisosAbiertos; renderMarco(); break;
    case 'avisos-leidos': await ejecutar(() => S.api.marcarAvisos(avisosNoLeidos().map(x => x.id))); break;
    case 'abrir-aviso': {
      S.avisosAbiertos = false;
      const av = S.d.avisos.find(x => x.id === id);
      if (av && !av.leido) ejecutar(() => S.api.marcarAvisos([id]));
      renderMarco();
      if (t.dataset.ev) verEvento(t.dataset.ev);
      break;
    }
    case 'cerrar-modal': cerrarModal(); break;
    case 'conf-si': S._conf && S._conf(true); break;
    case 'conf-no': S._conf && S._conf(false); break;
    case 'ver': verEvento(id); break;
    case 'aprobar': aprobar(id); break;
    case 'rechazar': pedirRechazo(id); break;
    case 'listo': marcarListo(id); break;
    case 'cancelar': pedirCancelacion(id); break;
    case 'cal-mes': {
      const [y, m] = S.cal.mes.split('-').map(Number);
      const d = new Date(y, m - 1 + Number(t.dataset.d), 1);
      S.cal.mes = L.hoyISO(d).slice(0, 7); renderContenido(); break;
    }
    case 'cal-hoy': S.cal.mes = HOY().slice(0, 7); S.cal.dia = HOY(); renderContenido(); break;
    case 'cal-dia': S.cal.dia = t.dataset.f; if (t.dataset.f.slice(0, 7) !== S.cal.mes) S.cal.mes = t.dataset.f.slice(0, 7); renderContenido(); break;
    case 'nueva-en': S.nuevaFecha = t.dataset.f; S.editando = null; S.vista = 'nueva'; render(); break;
    case 'filtro-mias': S.filtroMias = t.dataset.f; renderContenido(); break;
    case 'filtro-area': S.filtroArea = t.dataset.f; renderContenido(); break;
    case 'imprimir': window.print(); break;
    case 'copiar-credencial': {
      const txt = t.dataset.texto;
      try { await navigator.clipboard.writeText(txt); toast('Datos copiados. Pégalos en WhatsApp o en un correo.'); } catch { toast('No se pudo copiar; selecciona el texto manualmente.', 'error'); }
      break;
    }
    case 'whatsapp': window.open('https://wa.me/?text=' + encodeURIComponent(textoWhatsapp()), '_blank', 'noopener'); break;
    case 'usuario-nuevo': formUsuario(null); break;
    case 'usuario-editar': formUsuario(usuario(id)); break;
    case 'usuario-activo': {
      const u = usuario(id);
      if (await confirmar(`¿${u.activo ? 'Inactivar' : 'Activar'} a ${u.nombre}?${u.activo ? ' No podrá entrar a la plataforma; sus eventos se conservan.' : ''}`, u.activo ? 'Inactivar' : 'Activar', u.activo)) {
        await ejecutar(() => S.api.actualizarUsuario(id, { activo: !u.activo }), u.activo ? 'Usuario inactivado.' : 'Usuario activado.');
      }
      break;
    }
    case 'usuario-clave': {
      const u = usuario(id);
      if (await confirmar(`Se enviará a ${u.correo} un enlace para crear una nueva contraseña.`, 'Enviar enlace')) {
        await ejecutar(() => S.api.restablecerClave(u.correo), S.api.modo === 'demo' ? 'En modo demostración no se envían correos.' : 'Enlace enviado. Pídele revisar también la carpeta de spam.');
      }
      break;
    }
    case 'usuario-eliminar': {
      const u = usuario(id);
      if (await confirmar(`¿Eliminar a ${u.nombre}? ${S.api.modo === 'demo' ? '' : 'Después borra también su cuenta en Firebase → Authentication. '}Si solo quieres impedir el acceso, usa Inactivar.`, 'Eliminar', true)) {
        await ejecutar(() => S.api.eliminarUsuario(id), 'Usuario eliminado.');
      }
      break;
    }
    case 'espacio-activo': { const e = espacio(id); await ejecutar(() => S.api.guardarEspacio({ ...e, activo: !e.activo })); break; }
    case 'espacio-editar': {
      const e = espacio(id);
      abrirModal(`<form data-submit="espacio-renombrar" data-id="${id}"><div class="modal-cab"><h3>Renombrar espacio</h3></div>
        <div class="modal-cuerpo"><label>Nombre<input name="nombre" required maxlength="60" value="${esc(e.nombre)}"></label></div>
        <div class="modal-pie"><button type="button" class="btn" data-a="cerrar-modal">Cancelar</button><button class="btn btn-prim" type="submit">Guardar</button></div></form>`, 'chica');
      break;
    }
    case 'espacios-iniciales': await ejecutar(async () => { for (const e of L.ESPACIOS_INICIALES) await S.api.guardarEspacio(e); }, 'Espacios cargados.'); break;
    case 'personal-eliminar': await ejecutar(() => S.api.eliminarPersonal(id)); break;
    case 'olvide': {
      const correo = $('#form-login').correo.value.trim();
      if (!correo) { S.errorLogin = 'Escribe tu correo y vuelve a presionar “¿Olvidaste tu contraseña?”.'; render(); break; }
      await ejecutar(() => S.api.restablecerClave(correo), S.api.modo === 'demo' ? 'En modo demostración no se envían correos.' : 'Si el correo está registrado, recibirás un enlace para restablecer la contraseña.');
      break;
    }
    case 'demo-entrar': S.errorLogin = ''; await ejecutar(() => S.api.loginDemo($('#demo-usuario').value)); break;
    case 'demo-reiniciar': if (await confirmar('¿Restablecer los datos de ejemplo? Se perderán los cambios hechos en la demostración.', 'Restablecer', true)) await ejecutar(() => S.api.reiniciarDemo(), 'Datos de ejemplo restablecidos.'); break;
    default: break;
  }
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && !$('#modal').hidden) cerrarModal();
  if (ev.key === 'Enter' && ev.target.matches('tr[data-a="ver"]')) verEvento(ev.target.dataset.id);
});

document.addEventListener('change', (ev) => {
  const t = ev.target.closest('[data-change]');
  if (!t) return;
  switch (t.dataset.change) {
    case 'cal-espacio': S.cal.espacio = t.value; renderContenido(); break;
    case 'espacio-sol': {
      const esp = espacio(t.value);
      const campo = $('#campo-salones');
      campo.hidden = !(esp && esp.tipo === 'salon');
      actualizarDisponibilidad(); break;
    }
    case 'repetir': $('#bloque-repetir').hidden = !t.checked; actualizarDisponibilidad(); break;
    case 'disp': actualizarDisponibilidad(); break;
    case 'agenda-fecha': S.agenda.fecha = t.value || HOY(); renderContenido(); break;
    case 'agenda-area': S.agenda.area = t.value; renderContenido(); break;
    case 'filtro-rol': S.filtroRol = t.value; renderContenido(); break;
    case 'rol-usuario': camposRol(); break;
    default: break;
  }
});

document.addEventListener('input', (ev) => {
  const t = ev.target.closest('[data-input]');
  if (!t) return;
  if (t.dataset.input === 'disp') actualizarDisponibilidad();
  if (t.dataset.input === 'buscar-u') {
    S.buscarU = t.value; renderContenido();
    const i = $('[data-input="buscar-u"]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length);
  }
});

document.addEventListener('submit', async (ev) => {
  const f = ev.target.closest('[data-submit]');
  if (!f) return;
  ev.preventDefault();
  switch (f.dataset.submit) {
    case 'login': {
      const fd = new FormData(f);
      S.errorLogin = '';
      try { await S.api.login(String(fd.get('correo')), String(fd.get('clave'))); } catch (e) { S.errorLogin = e.message; render(); }
      break;
    }
    case 'clave-obligatoria': await cambiarClave(f, true); break;
    case 'clave': await cambiarClave(f, false); break;
    case 'solicitud': await enviarSolicitud(f); break;
    case 'rechazo': await rechazar(f.dataset.id, String(new FormData(f).get('motivo')).trim()); break;
    case 'area': await responderArea(f); break;
    case 'cancelar': await cancelar(f.dataset.id, new FormData(f).get('alcance') || 'uno'); break;
    case 'usuario': await guardarUsuario(f); break;
    case 'espacio': {
      const nombre = String(new FormData(f).get('nombre')).trim();
      if (nombre) await ejecutar(() => S.api.guardarEspacio({ nombre, tipo: 'comun', activo: true }), 'Espacio agregado.');
      break;
    }
    case 'espacio-renombrar': {
      const nombre = String(new FormData(f).get('nombre')).trim();
      if (nombre && await ejecutar(() => S.api.guardarEspacio({ ...espacio(f.dataset.id), nombre }), 'Espacio renombrado.')) cerrarModal();
      break;
    }
    case 'personal': {
      const fd = new FormData(f);
      const nombre = String(fd.get('nombre')).trim();
      if (nombre) await ejecutar(() => S.api.guardarPersonal({ nombre, area: fd.get('area') }), 'Persona agregada.');
      break;
    }
    default: break;
  }
});

// ======================= Arranque =======================
async function iniciar() {
  render();
  try {
    S.api = await crearAPI();
  } catch (e) {
    console.error(e);
    $('#app').innerHTML = `<div class="cargando"><div class="tarjeta"><h3>No se pudo iniciar la plataforma</h3><p>${esc(e.message)}</p><p class="suave">Revisa la configuración en js/config.js y tu conexión a internet.</p></div></div>`;
    return;
  }
  if (S.api.modo === 'demo') {
    // En demostración el directorio se muestra en la pantalla de ingreso
    S.api.onDatos(d => { S.d = d; if (!S.yo) { S.listo = true; if (!$('#form-login')) render(); } else alDatos(); });
  }
  S.api.onAuth((perfil, error) => {
    const antes = S.yo && S.yo.id;
    S.yo = perfil;
    S.errorLogin = error || '';
    S.listo = true;
    if (!perfil) {
      if (S.unsub && S.api.modo !== 'demo') { S.unsub(); S.unsub = null; }
      S.d = S.api.modo === 'demo' ? S.d : { usuarios: [], espacios: [], personal: [], eventos: [], avisos: [] };
      S.vista = 'inicio'; S.avisosAbiertos = false;
      render();
      return;
    }
    if (antes !== perfil.id) { S.vista = 'inicio'; S.cal = { mes: HOY().slice(0, 7), dia: HOY(), espacio: '' }; S.agenda = { fecha: HOY(), area: '' }; }
    if (S.api.modo !== 'demo' && !S.unsub) S.unsub = S.api.onDatos(d => { S.d = d; alDatos(); });
    render();
  });
}

function alDatos() {
  if (!S.yo) return;
  const yo = S.d.usuarios.find(u => u.id === S.yo.id);
  if (yo) S.yo = { ...S.yo, ...yo };
  if (!$('.shell')) { render(); return; }
  renderMarco();
  if (!VISTAS_FORM.includes(S.vista)) renderContenido();
  else if (S.vista === 'nueva') actualizarDisponibilidad();
  if (S.modalEv && $('#modal .modal-caja.ancha') && !$('#modal form.form-area')) verEvento(S.modalEv);
}

iniciar();
