// Capa de datos con Firebase (Authentication + Cloud Firestore), plan gratuito Spark
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword,
  sendPasswordResetEmail, createUserWithEmailAndPassword,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  onSnapshot, query, where, writeBatch, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig, ADMIN_EMAILS } from './config.js';
import { hoyISO, sumarDias } from './logic.js';

const ahora = () => new Date().toISOString();

const MENSAJES = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/requires-recent-login': 'Por seguridad, cierra sesión, vuelve a entrar e intenta de nuevo.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
  'permission-denied': 'No tienes permiso para esta acción.',
};
const traducir = err => new Error(MENSAJES[err && err.code] || (err && err.message) || 'Ocurrió un error.');
const envolver = fn => async (...a) => { try { return await fn(...a); } catch (e) { throw traducir(e); } };

function claveTemporal() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  const r = new Uint32Array(8);
  crypto.getRandomValues(r);
  r.forEach(n => { s += c[n % c.length]; });
  return 'Ca-' + s;
}

export function crearAPI() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  let perfil = null;
  const authCbs = [];

  onAuthStateChanged(auth, async (user) => {
    perfil = null;
    let error = '';
    if (user) {
      try {
        const ref = doc(db, 'usuarios', user.uid);
        let snap = await getDoc(ref);
        const email = (user.email || '').toLowerCase();
        if (!snap.exists() && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email)) {
          await setDoc(ref, {
            nombre: 'Administrador', correo: email, cargo: 'Administrador del sistema', rol: 'admin',
            grupo: '', grupoAprueba: '', area: '', espacios: [], activo: true, debeCambiarClave: false, creado: ahora(),
          });
          snap = await getDoc(ref);
        }
        if (!snap.exists()) error = 'Tu usuario no está registrado en la plataforma. Comunícate con el administrador.';
        else if (!snap.data().activo) error = 'Tu usuario está inactivo. Comunícate con el administrador.';
        else perfil = { id: user.uid, ...snap.data() };
      } catch (e) {
        error = traducir(e).message;
      }
      if (!perfil) await signOut(auth);
    }
    authCbs.forEach(cb => cb(perfil, error));
  });

  return {
    modo: 'firebase',
    onAuth(cb) { authCbs.push(cb); },
    login: envolver(async (correo, clave) => { await signInWithEmailAndPassword(auth, correo.trim(), clave); }),
    logout: envolver(async () => { await signOut(auth); }),
    cambiarClave: envolver(async (nueva) => {
      await updatePassword(auth.currentUser, nueva);
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), { debeCambiarClave: false });
    }),
    restablecerClave: envolver(async (correo) => { await sendPasswordResetEmail(auth, correo.trim()); }),

    onDatos(cb) {
      const estado = { usuarios: [], espacios: [], personal: [], eventos: [], avisos: [] };
      const lista = s => s.docs.map(d => ({ id: d.id, ...d.data() }));
      const emitir = () => cb({ ...estado });
      const desde = sumarDias(hoyISO(), -120);
      const subs = [
        onSnapshot(collection(db, 'usuarios'), s => { estado.usuarios = lista(s); emitir(); }),
        onSnapshot(collection(db, 'espacios'), s => { estado.espacios = lista(s); emitir(); }),
        onSnapshot(collection(db, 'personal'), s => { estado.personal = lista(s); emitir(); }),
        onSnapshot(query(collection(db, 'eventos'), where('fecha', '>=', desde)), s => { estado.eventos = lista(s); emitir(); }),
        onSnapshot(query(collection(db, 'avisos'), where('para', '==', auth.currentUser.uid)), s => { estado.avisos = lista(s); emitir(); }),
      ];
      return () => subs.forEach(u => u());
    },

    crearUsuario: envolver(async (d) => {
      const clave = claveTemporal();
      const sec = initializeApp(firebaseConfig, 'alta-' + Date.now());
      try {
        const secAuth = getAuth(sec);
        const cred = await createUserWithEmailAndPassword(secAuth, d.correo.trim().toLowerCase(), clave);
        await signOut(secAuth);
        await setDoc(doc(db, 'usuarios', cred.user.uid), {
          ...d, correo: d.correo.trim().toLowerCase(), activo: true, debeCambiarClave: true, creado: ahora(),
        });
        return { id: cred.user.uid, clave };
      } finally {
        await deleteApp(sec);
      }
    }),
    actualizarUsuario: envolver(async (id, c) => { await updateDoc(doc(db, 'usuarios', id), c); }),
    eliminarUsuario: envolver(async (id) => { await deleteDoc(doc(db, 'usuarios', id)); }),

    guardarEspacio: envolver(async (e) => {
      const { id, ...resto } = e;
      if (id) await setDoc(doc(db, 'espacios', id), resto, { merge: true });
      else await addDoc(collection(db, 'espacios'), resto);
    }),
    guardarPersonal: envolver(async (p) => { await addDoc(collection(db, 'personal'), p); }),
    eliminarPersonal: envolver(async (id) => { await deleteDoc(doc(db, 'personal', id)); }),

    crearEventos: envolver(async (lista) => {
      const b = writeBatch(db);
      const ids = lista.map(e => {
        const ref = doc(collection(db, 'eventos'));
        b.set(ref, { ...e, creado: ahora(), actualizado: serverTimestamp() });
        return ref.id;
      });
      await b.commit();
      return ids;
    }),
    actualizarEventos: envolver(async (lista) => {
      const b = writeBatch(db);
      lista.forEach(({ id, cambios }) => b.update(doc(db, 'eventos', id), { ...cambios, actualizado: serverTimestamp() }));
      await b.commit();
    }),
    crearAvisos: envolver(async (lista) => {
      if (!lista.length) return;
      const b = writeBatch(db);
      lista.forEach(a => b.set(doc(collection(db, 'avisos')), { ...a, de: auth.currentUser.uid, leido: false, fecha: ahora() }));
      await b.commit();
    }),
    marcarAvisos: envolver(async (ids) => {
      const b = writeBatch(db);
      ids.forEach(id => b.update(doc(db, 'avisos', id), { leido: true }));
      await b.commit();
    }),
  };
}
