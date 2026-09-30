// Reglas de negocio de Agenda Americanista (sin dependencias, reutilizable y testeable)

export const AREAS = [
  { id: 'mantenimiento', nombre: 'Mantenimiento y Logística', ayuda: 'Montaje, sillas, mesas, tarima, sonido, extensiones, aseo' },
  { id: 'tic', nombre: 'TIC', ayuda: 'Portátil, videobeam y demás recursos tecnológicos' },
  { id: 'compras', nombre: 'Compras', ayuda: 'Refrigerios: tipo y cantidad' },
  { id: 'comunicaciones', nombre: 'Comunicaciones', ayuda: 'Fotografía, video, publicación, piezas gráficas' },
];
export const nombreArea = id => (AREAS.find(a => a.id === id) || {}).nombre || id;

export const ROLES = {
  admin: 'Administrador del sistema',
  directivo: 'Directivo',
  coordinacion: 'Coordinación de sección',
  dependencia: 'Dependencia',
  docente: 'Docente',
  lider: 'Líder de apoyo',
  personal: 'Personal de apoyo',
  responsable: 'Responsable de espacio',
  consulta: 'Consulta',
};

export const GRUPOS = { bachillerato: 'Bachillerato', primaria: 'Preescolar y Primaria', capellania: 'Capellanía' };
export const SECCIONES = ['Preescolar y Primaria', 'Bachillerato', 'General'];

export const ESPACIOS_INICIALES = [
  ['patio-norte', 'Patio Norte'], ['patio-sur', 'Patio Sur'], ['patio-central', 'Patio Central'],
  ['paraninfo', 'Paraninfo'], ['capilla', 'Capilla'], ['biblioteca-bach', 'Biblioteca Bachillerato'],
  ['biblioteca-prim', 'Biblioteca Primaria'],
].map(([id, nombre]) => ({ id, nombre, tipo: 'comun', activo: true }))
  .concat([{ id: 'salon', nombre: 'Salón', tipo: 'salon', activo: true }]);

export const ESTADOS = {
  pendiente: 'Pendiente de aprobación',
  rechazado: 'Rechazado',
  gestion: 'En gestión de áreas',
  novedad: 'Con novedad',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
  realizado: 'Realizado',
};
export const ESTADOS_AREA = { pendiente: 'Pendiente', confirmado: 'Confirmado', listo: 'Listo', no_disponible: 'No disponible' };

export const CREADORES = ['docente', 'coordinacion', 'dependencia', 'directivo', 'lider', 'admin'];
export const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Contraseña temporal común para las cuentas nuevas (se cambia en el primer ingreso)
export const claveGenerica = (d = new Date()) => `Americano${d.getFullYear()}`;

// ---------- Fechas y horas ----------
const pad = n => String(n).padStart(2, '0');
export const hoyISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const aFecha = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
export const sumarDias = (iso, n) => { const d = aFecha(iso); d.setDate(d.getDate() + n); return hoyISO(d); };
export const minutos = h => { const [a, b] = String(h).split(':').map(Number); return a * 60 + b; };
export const diaSemana = iso => aFecha(iso).getDay();

// ---------- Espacios y salones ----------
export const normSalon = s => String(s).toUpperCase().replace(/[\s°º-]+/g, '');
export function parseSalones(txt) {
  const out = [];
  String(txt || '').split(/[,;/]|\sy\s/i).map(normSalon).forEach(s => { if (s && !out.includes(s)) out.push(s); });
  return out;
}

// ---------- Estados ----------
export const esActivo = ev => !['rechazado', 'cancelado'].includes(ev.estado);

export function estadoVisible(ev, hoy = hoyISO()) {
  if (ev.fecha < hoy && ['confirmado', 'gestion', 'novedad'].includes(ev.estado)) return 'realizado';
  return ev.estado;
}

export function areasRequeridas(req = {}) {
  return AREAS.map(a => a.id).filter(id => String(req[id] || '').trim() !== '');
}

export function areasIniciales(req = {}) {
  const o = {};
  areasRequeridas(req).forEach(id => { o[id] = { estado: 'pendiente', comentario: '', asignados: [] }; });
  return o;
}

export function estadoPorAreas(areas = {}) {
  const vals = Object.values(areas);
  if (!vals.length) return 'confirmado';
  if (vals.some(a => a.estado === 'no_disponible')) return 'novedad';
  if (vals.every(a => a.estado === 'confirmado' || a.estado === 'listo')) return 'confirmado';
  return 'gestion';
}

// Estado con el que nace una solicitud según quién la crea
export const requiereAprobacion = u => u.rol === 'docente';

// ---------- Choques de horario ----------
export function seCruzan(a, b) {
  if (a.fecha !== b.fecha || a.espacioId !== b.espacioId) return false;
  if (!(minutos(a.horaInicio) < minutos(b.horaFin) && minutos(b.horaInicio) < minutos(a.horaFin))) return false;
  if (a.salones && a.salones.length && b.salones && b.salones.length) {
    return a.salones.some(s => b.salones.includes(s));
  }
  return true;
}

export function conflictos(nuevo, eventos) {
  return eventos.filter(e => e.id !== nuevo.id && esActivo(e) && seCruzan(nuevo, e));
}

// ---------- Recurrencia ----------
export const MAX_OCURRENCIAS = 60;
export function ocurrencias({ fecha, repetir, dias = [], hasta }) {
  if (!repetir) return [fecha];
  const out = [];
  let f = fecha;
  while (f <= hasta && out.length < MAX_OCURRENCIAS) {
    if (dias.includes(diaSemana(f))) out.push(f);
    f = sumarDias(f, 1);
  }
  return out;
}

// ---------- Validación del formulario ----------
export function validarSolicitud(d, hoy = hoyISO()) {
  const e = [];
  if (!d.titulo) e.push('Escribe el tema o actividad.');
  if (!d.fecha) e.push('Elige la fecha.');
  else if (d.fecha <= hoy) e.push('La solicitud debe hacerse con mínimo 1 día de anticipación.');
  if (!d.horaInicio || !d.horaFin) e.push('Indica hora de inicio y hora de fin.');
  else if (minutos(d.horaFin) <= minutos(d.horaInicio)) e.push('La hora de fin debe ser posterior a la de inicio.');
  if (!d.espacioId) e.push('Elige el lugar.');
  if (d.esSalon && !(d.salones || []).length) e.push('Escribe el salón o salones a usar.');
  if (!d.seccion) e.push('Elige la sección.');
  if (d.repetir) {
    if (!d.dias || !d.dias.length) e.push('Elige al menos un día de la semana para repetir.');
    if (!d.hasta) e.push('Indica hasta qué fecha se repite.');
    else if (d.fecha && d.hasta < d.fecha) e.push('La fecha final de la repetición debe ser posterior a la inicial.');
  }
  return e;
}

// ---------- Permisos ----------
export const puedeCrear = u => !!u && CREADORES.includes(u.rol);
export const esGestionable = ev => ['gestion', 'novedad', 'confirmado'].includes(ev.estado);

export function puedeAprobar(u, ev) {
  if (!u || ev.estado !== 'pendiente') return false;
  if (u.rol === 'admin') return true;
  return !!u.grupoAprueba && u.grupoAprueba === ev.grupoAprobacion && ev.solicitanteId !== u.id;
}

export function puedeGestionarArea(u, ev, hoy = hoyISO()) {
  return !!u && u.rol === 'lider' && !!(ev.areas && ev.areas[u.area]) && esGestionable(ev) && ev.fecha >= hoy;
}

export function estaAsignado(u, ev) {
  const a = ev.areas && ev.areas[u.area];
  return !!a && (a.asignados || []).some(x => x.id === u.id);
}

export function puedeMarcarListo(u, ev, hoy = hoyISO()) {
  if (!u || u.rol !== 'personal' || !esGestionable(ev) || ev.fecha < hoy) return false;
  const a = ev.areas && ev.areas[u.area];
  return estaAsignado(u, ev) && a.estado !== 'listo' && a.estado !== 'no_disponible';
}

export function puedeCancelar(u, ev, hoy = hoyISO()) {
  if (!u || !esActivo(ev) || ev.fecha < hoy) return false;
  return ev.solicitanteId === u.id || ['directivo', 'admin'].includes(u.rol);
}

export const puedeVerAgenda = u => !!u && ['lider', 'personal', 'responsable', 'directivo', 'admin'].includes(u.rol);

// ---------- Edición de solicitudes ----------
export function puedeEditar(u, ev, hoy = hoyISO()) {
  if (!u || !['pendiente', 'rechazado', 'gestion', 'novedad', 'confirmado'].includes(ev.estado) || ev.fecha <= hoy) return false;
  return ev.solicitanteId === u.id || ['directivo', 'admin'].includes(u.rol);
}

export function cambioLogistico(a, b) {
  return a.fecha !== b.fecha || a.horaInicio !== b.horaInicio || a.horaFin !== b.horaFin || a.espacioId !== b.espacioId
    || (a.salones || []).join(',') !== (b.salones || []).join(',');
}

// Calcula estado y áreas tras editar. Devuelve también qué áreas deben enterarse.
export function recalcularEdicion(ev, nuevo, editor) {
  const logistico = cambioLogistico(ev, nuevo);
  const directo = ['directivo', 'admin'].includes(editor.rol) && editor.id !== ev.solicitanteId;
  const reaprobar = !!ev.grupoAprobacion && !directo && (['pendiente', 'rechazado'].includes(ev.estado) || logistico);
  const antes = ev.areas || {};
  if (reaprobar) {
    return { estado: 'pendiente', areas: {}, aprobadoPor: '', motivoRechazo: '', reaprobar: true, logistico, avisarAreas: Object.keys(antes) };
  }
  const areas = {};
  const avisar = [];
  areasRequeridas(nuevo.requerimientos).forEach(id => {
    const cambioTexto = String((ev.requerimientos || {})[id] || '').trim() !== String(nuevo.requerimientos[id]).trim();
    if (antes[id] && !logistico && !cambioTexto) { areas[id] = antes[id]; return; }
    areas[id] = { estado: 'pendiente', comentario: '', asignados: antes[id] ? (antes[id].asignados || []) : [] };
    avisar.push(id);
  });
  Object.keys(antes).forEach(id => { if (!areas[id]) avisar.push(id); });
  return { estado: estadoPorAreas(areas), areas, aprobadoPor: ev.aprobadoPor || '', motivoRechazo: '', reaprobar: false, logistico, avisarAreas: avisar };
}
