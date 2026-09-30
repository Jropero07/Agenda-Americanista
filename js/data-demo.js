// Capa de datos de DEMOSTRACIÓN: todo vive en memoria y en el navegador.
import { hoyISO, sumarDias, diaSemana, areasIniciales, ESPACIOS_INICIALES, claveGenerica } from './logic.js';

const CLAVE = 'agenda-americanista-demo-v2';
const SESION = 'agenda-americanista-demo-sesion';
const uid = () => Math.random().toString(36).slice(2, 11);
const ahora = () => new Date().toISOString();

const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };
const lsDel = k => { try { localStorage.removeItem(k); } catch { /* sin almacenamiento */ } };

const correo = n => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.') + '@demo.local';

function u(id, nombre, cargo, rol, extra = {}) {
  return { id, nombre, correo: correo(nombre), cargo, rol, grupo: '', grupoAprueba: '', area: '', espacios: [], activo: true, debeCambiarClave: false, ...extra };
}

function semilla() {
  const usuarios = [
    u('admin', 'Jesús Administrador', 'Administrador del sistema', 'admin'),
    u('belkys', 'Belkys Teherán', 'Rectora', 'directivo'),
    u('maria', 'María Portillo', 'Directora Administrativa y Financiera', 'directivo'),
    u('claudia', 'Claudia Polo', 'Secretaria General y Admisiones', 'directivo'),
    u('harry', 'Harry Donado', 'Coordinador de Bachillerato', 'coordinacion', { grupoAprueba: 'bachillerato' }),
    u('luz', 'Luz Díaz', 'Secretaria de Coordinación de Bachillerato', 'coordinacion', { grupoAprueba: 'bachillerato' }),
    u('erika', 'Erika Held', 'Coordinadora de Preescolar y Primaria', 'coordinacion', { grupoAprueba: 'primaria' }),
    u('gladys', 'Gladys Caro', 'Secretaria de Coordinación de Preescolar y Primaria', 'coordinacion', { grupoAprueba: 'primaria' }),
    u('catalina', 'Catalina Bernal', 'Capellana', 'dependencia', { grupoAprueba: 'capellania' }),
    u('marta', 'Marta Alemán', 'Asistente de Capellanía', 'dependencia', { grupoAprueba: 'capellania' }),
    u('youlanis', 'Youlanis Vanegas', 'Docente de educación religiosa', 'docente', { grupo: 'capellania' }),
    u('paula', 'Paula Zapata', 'Docente de educación religiosa', 'docente', { grupo: 'capellania' }),
    u('beissi', 'Beissi García', 'Asesora Escolar (9°-11°)', 'docente', { grupo: 'bachillerato' }),
    u('gisell', 'Gisell Gutiérrez', 'Asesora Escolar (6°-8°)', 'docente', { grupo: 'bachillerato' }),
    u('karen', 'Karen Alcocer', 'Asesora Escolar Preescolar y Primaria', 'docente', { grupo: 'primaria' }),
    u('diana', 'Diana Socarras', 'Asesora Escolar Preescolar y Primaria', 'docente', { grupo: 'primaria' }),
    u('alfonso', 'Alfonso Monserrat', 'Líder de Mantenimiento y Logística', 'lider', { area: 'mantenimiento' }),
    u('alejandro', 'Alejandro López', 'Líder TIC', 'lider', { area: 'tic' }),
    u('slay', 'Slay Reyes', 'Líder de Compras', 'lider', { area: 'compras' }),
    u('estefani', 'Estefani Osorio', 'Líder de Comunicaciones', 'lider', { area: 'comunicaciones' }),
    u('astrid', 'Astrid Mejía', 'Líder Talento Humano', 'dependencia'),
    u('ines', 'Inés Gómez', 'Asistente de Talento Humano', 'dependencia'),
    u('angelica-da', 'Angélica De Ávila', 'Líder Calidad', 'dependencia'),
    u('yudi', 'Yudi Pérez', 'Internacionalización', 'dependencia'),
    u('ayde', 'Ayde Mackenzie', 'Responsable de bibliotecas', 'responsable', { espacios: ['biblioteca-bach', 'biblioteca-prim'] }),
    u('ropero', 'Jesús Ropero', 'Auxiliar de redes', 'personal', { area: 'tic' }),
    u('deivis', 'Deivis Cantillo', 'Soporte TIC', 'personal', { area: 'tic' }),
    u('carlos', 'Carlos Ramos', 'Asistente TIC', 'personal', { area: 'tic' }),
    u('sojo', 'Jesús Sojo', 'Electricista', 'personal', { area: 'mantenimiento' }),
    u('leonardo', 'Leonardo Hernández', 'Refrigeración', 'personal', { area: 'mantenimiento' }),
    u('samith', 'Samith Buelvas', 'Apoyo de Mantenimiento', 'personal', { area: 'mantenimiento' }),
    u('angelica-b', 'Angélica Bermúdez', 'Comunicaciones', 'personal', { area: 'comunicaciones' }),
    u('zayleth', 'Zayleth Altahona', 'Practicante de Comunicaciones', 'personal', { area: 'comunicaciones' }),
    u('meza', 'Jesús Meza', 'Admisiones', 'consulta'),
    u('erasmo', 'Erasmo Mejía', 'Recepción', 'consulta'),
    u('valentina', 'Valentina Cantillo', 'Enfermería', 'consulta'),
  ];

  const espacios = ESPACIOS_INICIALES.map(e => ({ ...e }));

  const nombreEsp = id => espacios.find(e => e.id === id).nombre;
  const U = id => usuarios.find(x => x.id === id);
  const hoy = hoyISO();
  const ev = (o) => {
    const s = U(o.por);
    const base = {
      id: uid(), titulo: '', dirigidoA: '', seccion: 'General', espacioId: '', salones: [],
      fecha: sumarDias(hoy, 1), horaInicio: '08:00', horaFin: '09:00', responsable: s.nombre, personas: 0,
      requerimientos: { mantenimiento: '', compras: '', tic: '', comunicaciones: '' },
      solicitanteId: s.id, solicitanteNombre: s.nombre, grupoAprobacion: '', estado: 'gestion',
      aprobadoPor: '', motivoRechazo: '', serieId: '', creado: ahora(),
      historial: [{ fecha: ahora(), por: s.nombre, accion: 'Solicitud creada' }],
    };
    const e = { ...base, ...o };
    delete e.por;
    e.espacioNombre = nombreEsp(e.espacioId);
    e.requerimientos = { ...base.requerimientos, ...(o.requerimientos || {}) };
    e.areas = e.estado === 'pendiente' ? {} : { ...areasIniciales(e.requerimientos), ...(o.areas || {}) };
    return e;
  };

  const eventos = [
    ev({ por: 'harry', titulo: 'Entrega de informes y reunión con padres de 11°', seccion: 'Bachillerato', dirigidoA: '11°',
      espacioId: 'paraninfo', fecha: sumarDias(hoy, 1), horaInicio: '14:30', horaFin: '15:30', personas: 80, responsable: 'Coordinación de Bachillerato',
      requerimientos: { mantenimiento: 'Sillas para 80 personas, mesa principal, sonido y 2 micrófonos', tic: 'Portátil y videobeam' },
      areas: { tic: { estado: 'confirmado', comentario: '', asignados: [{ id: 'deivis', nombre: 'Deivis Cantillo', tipo: 'usuario' }], por: 'Alejandro López', fecha: ahora() } } }),
    ev({ por: 'erika', titulo: 'Izada de bandera', seccion: 'Preescolar y Primaria', dirigidoA: 'Primaria', espacioId: 'patio-central',
      fecha: sumarDias(hoy, 2), horaInicio: '07:00', horaFin: '08:00', personas: 300, estado: 'confirmado',
      requerimientos: { mantenimiento: 'Tarima, sonido y micrófonos', comunicaciones: 'Fotografía y publicación en redes' },
      areas: {
        mantenimiento: { estado: 'confirmado', comentario: '', asignados: [{ id: 'sojo', nombre: 'Jesús Sojo', tipo: 'usuario' }], por: 'Alfonso Monserrat', fecha: ahora() },
        comunicaciones: { estado: 'confirmado', comentario: '', asignados: [{ id: 'zayleth', nombre: 'Zayleth Altahona', tipo: 'usuario' }], por: 'Estefani Osorio', fecha: ahora() },
      } }),
    ev({ por: 'paula', titulo: 'Eucaristía de grado 6°', seccion: 'Bachillerato', dirigidoA: '6°', espacioId: 'capilla',
      fecha: sumarDias(hoy, 3), horaInicio: '10:00', horaFin: '11:00', personas: 90, estado: 'pendiente', grupoAprobacion: 'capellania',
      requerimientos: { mantenimiento: 'Sonido', comunicaciones: 'Fotografía' }, areas: {} }),
    ev({ por: 'beissi', titulo: 'Taller de lectura crítica', seccion: 'Bachillerato', dirigidoA: '10°A', espacioId: 'biblioteca-bach',
      fecha: sumarDias(hoy, 2), horaInicio: '09:00', horaFin: '10:30', personas: 30, estado: 'pendiente', grupoAprobacion: 'bachillerato',
      requerimientos: { tic: 'Videobeam y portátil' }, areas: {} }),
    ev({ por: 'astrid', titulo: 'Jornada de pausas activas', seccion: 'General', dirigidoA: 'Personal administrativo', espacioId: 'patio-norte',
      fecha: sumarDias(hoy, 4), horaInicio: '15:00', horaFin: '16:00', personas: 60, estado: 'novedad',
      requerimientos: { mantenimiento: 'Sonido', compras: '60 refrigerios sencillos' },
      areas: { compras: { estado: 'no_disponible', comentario: 'No hay presupuesto aprobado para esa fecha; se propone dos días después.', asignados: [], por: 'Slay Reyes', fecha: ahora() } } }),
  ];

  // Serie semanal: clase de inglés de Internacionalización los viernes en el salón 3C
  const serieId = uid();
  let f = sumarDias(hoy, 1);
  while (diaSemana(f) !== 5) f = sumarDias(f, 1);
  for (let i = 0; i < 6; i++) {
    eventos.push(ev({ por: 'yudi', titulo: 'Clase de inglés — Internacionalización', seccion: 'General', dirigidoA: 'Grupo de intercambio',
      espacioId: 'salon', salones: ['3C'], fecha: sumarDias(f, 7 * i), horaInicio: '14:30', horaFin: '16:30', personas: 25,
      estado: 'confirmado', serieId, areas: {} }));
  }

  const avisos = [
    { id: uid(), para: 'harry', texto: 'Nueva solicitud por aprobar: Taller de lectura crítica', eventoId: eventos[3].id, leido: false, fecha: ahora() },
    { id: uid(), para: 'catalina', texto: 'Nueva solicitud por aprobar: Eucaristía de grado 6°', eventoId: eventos[2].id, leido: false, fecha: ahora() },
    { id: uid(), para: 'alfonso', texto: 'Evento por atender: Entrega de informes y reunión con padres de 11°', eventoId: eventos[0].id, leido: false, fecha: ahora() },
    { id: uid(), para: 'astrid', texto: 'Novedad en Jornada de pausas activas: Compras marcó No disponible', eventoId: eventos[4].id, leido: false, fecha: ahora() },
  ];

  return { usuarios, espacios, personal: [], eventos, avisos };
}

export function crearAPI() {
  let db;
  try { db = JSON.parse(lsGet(CLAVE)); } catch { db = null; }
  if (!db || !db.usuarios) db = semilla();

  let yoId = lsGet(SESION);
  const authCbs = [];
  const datosCbs = [];
  const clone = o => JSON.parse(JSON.stringify(o));

  const guardar = () => { lsSet(CLAVE, JSON.stringify(db)); emitir(); };
  const yo = () => db.usuarios.find(x => x.id === yoId && x.activo) || null;
  const emitir = () => {
    const snap = {
      usuarios: clone(db.usuarios), espacios: clone(db.espacios), personal: clone(db.personal), eventos: clone(db.eventos),
      avisos: clone(db.avisos.filter(a => a.para === yoId)),
    };
    datosCbs.forEach(cb => cb(snap));
  };
  const notificarAuth = () => { const y = yo(); authCbs.forEach(cb => cb(y ? clone(y) : null)); };

  const entrarComo = (id) => {
    const x = db.usuarios.find(v => v.id === id);
    if (!x) throw new Error('Usuario no encontrado.');
    if (!x.activo) throw new Error('Tu usuario está inactivo. Comunícate con el administrador.');
    yoId = x.id; lsSet(SESION, yoId); notificarAuth();
  };

  return {
    modo: 'demo',
    onAuth(cb) { authCbs.push(cb); setTimeout(() => cb(yo() ? clone(yo()) : null), 0); },
    async login(email) {
      const x = db.usuarios.find(v => v.correo === String(email).trim().toLowerCase());
      if (!x) throw new Error('Correo o contraseña incorrectos.');
      entrarComo(x.id);
    },
    async loginDemo(id) { entrarComo(id); },
    async logout() { yoId = null; lsDel(SESION); notificarAuth(); },
    async cambiarClave() { const y = yo(); if (y) { y.debeCambiarClave = false; guardar(); notificarAuth(); } },
    async restablecerClave() { /* en demostración no se envían correos */ },
    onDatos(cb) { datosCbs.push(cb); setTimeout(emitir, 0); return () => { const i = datosCbs.indexOf(cb); if (i >= 0) datosCbs.splice(i, 1); }; },

    async crearUsuario(d) {
      const correoN = d.correo.trim().toLowerCase();
      if (db.usuarios.some(x => x.correo === correoN)) throw new Error('Ya existe un usuario con ese correo.');
      const n = { ...d, id: uid(), correo: correoN, activo: true, debeCambiarClave: true };
      db.usuarios.push(n); guardar();
      return { id: n.id, clave: claveGenerica() };
    },
    async actualizarUsuario(id, c) { Object.assign(db.usuarios.find(x => x.id === id), c); guardar(); if (id === yoId) notificarAuth(); },
    async eliminarUsuario(id) { db.usuarios = db.usuarios.filter(x => x.id !== id); guardar(); },

    async guardarEspacio(e) {
      if (e.id && db.espacios.some(x => x.id === e.id)) Object.assign(db.espacios.find(x => x.id === e.id), e);
      else db.espacios.push({ ...e, id: uid() });
      guardar();
    },
    async guardarPersonal(p) { db.personal.push({ ...p, id: uid() }); guardar(); },
    async eliminarPersonal(id) { db.personal = db.personal.filter(x => x.id !== id); guardar(); },

    async crearEventos(lista) {
      const ids = lista.map(e => { const n = { ...clone(e), id: uid(), creado: ahora() }; db.eventos.push(n); return n.id; });
      guardar();
      return ids;
    },
    async actualizarEventos(lista) {
      lista.forEach(({ id, cambios }) => Object.assign(db.eventos.find(x => x.id === id), clone(cambios), { actualizado: ahora() }));
      guardar();
    },
    async crearAvisos(lista) { lista.forEach(a => db.avisos.push({ ...a, id: uid(), leido: false, fecha: ahora() })); guardar(); },
    async marcarAvisos(ids) { db.avisos.forEach(a => { if (ids.includes(a.id)) a.leido = true; }); guardar(); },

    async reiniciarDemo() { db = semilla(); guardar(); },
  };
}
