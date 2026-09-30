// =====================================================================
//  CONFIGURACIÓN DE FIREBASE
//  1. Pega aquí los datos de tu proyecto (Consola de Firebase →
//     Configuración del proyecto → Tus apps → App web → Configuración).
//  2. Escribe en ADMIN_EMAILS el correo del administrador inicial.
//  Mientras apiKey diga "PEGAR_AQUI", la plataforma funciona en
//  MODO DEMOSTRACIÓN (datos de ejemplo guardados solo en el navegador).
// =====================================================================

export const firebaseConfig = {
  apiKey: 'AIzaSyCn9UIXp7PZ22ZBZee2OuoXTsfEJHC-0A8',
  authDomain: 'agenda-americanista.firebaseapp.com',
  projectId: 'agenda-americanista',
  storageBucket: 'agenda-americanista.firebasestorage.app',
  messagingSenderId: '1090059772092',
  appId: '1:1090059772092:web:2888896257098c0cf170b9',
  measurementId: 'G-TYTFZ9X04F',
};

// Correo(s) que se registran automáticamente como Administrador del sistema
// la primera vez que inician sesión (debe coincidir con firestore.rules).
export const ADMIN_EMAILS = ['eventos@colegio-americano.edu.co'];

// true = modo demostración (datos de ejemplo en el navegador), aunque Firebase ya esté configurado.
// Cambia a false para usar Firebase.
export const FORZAR_DEMO = false;

export const MODO_DEMO = FORZAR_DEMO || !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('PEGAR');
