# Agenda Americanista

Plataforma web de solicitud de espacios y eventos del Colegio Americano de Barranquilla.
HTML, CSS y JavaScript sin frameworks, Firebase (plan gratuito Spark) y publicación en GitHub Pages.

## Estructura

```
index.html            Página única de la aplicación
css/styles.css        Estilos (azul marino, naranja quemado, blanco)
js/config.js          Configuración de Firebase y correo del administrador inicial
js/app.js             Interfaz: vistas, formularios y acciones
js/logic.js           Reglas de negocio: estados, choques de horario, recurrencia, permisos
js/data.js            Elige la capa de datos (demostración o Firebase)
js/data-demo.js       Datos de ejemplo guardados en el navegador
js/data-firebase.js   Conexión con Firebase Authentication y Cloud Firestore
firestore.rules       Reglas de seguridad para Firestore
assets/logo.png       Escudo del colegio
```

## Probarla sin configurar nada (modo demostración)

Mientras `apiKey` en `js/config.js` diga `PEGAR_AQUI`, la plataforma arranca en modo demostración con el directorio del colegio y eventos de ejemplo. En la pantalla de ingreso eliges "Entrar como" cualquier persona para ver lo que ve cada rol.

Los módulos de JavaScript no abren con doble clic (`file://`); se necesita un servidor local:

- Visual Studio Code: extensión **Live Server** → clic derecho en `index.html` → *Open with Live Server*.
- O con Python: `python -m http.server 8000` en la carpeta del proyecto y abrir `http://localhost:8000`.

## Puesta en marcha con Firebase

> Para pasar de la demostración a Firebase, cambia `FORZAR_DEMO` a `false` en `js/config.js`.

1. **Crear el proyecto.** En https://console.firebase.google.com crea un proyecto nuevo (ej. `agenda-americanista`), sin Google Analytics.
2. **Registrar la app web.** Configuración del proyecto → *Tus apps* → ícono `</>` → copia el objeto `firebaseConfig` y pégalo en `js/config.js`.
3. **Activar el inicio de sesión.** Authentication → *Comenzar* → Método de acceso → **Correo electrónico/contraseña** → Habilitar.
4. **Crear la base de datos.** Firestore Database → *Crear base de datos* → modo producción → ubicación `southamerica-east1` (o `us-east1`).
5. **Publicar las reglas.** Firestore → Reglas → pega el contenido de `firestore.rules` (ya trae `eventos@colegio-americano.edu.co` como administrador) y presiona *Publicar*.
6. **Administrador inicial.** En `js/config.js` escribe el mismo correo en `ADMIN_EMAILS`. Luego en Authentication → Usuarios → *Agregar usuario* crea tu cuenta con ese correo. La primera vez que entres, la plataforma te registra como Administrador del sistema.
7. **Espacios.** Entra como administrador → *Espacios y personal* → **Cargar los 7 espacios del colegio y Salón**.
8. **Usuarios.** En *Usuarios* → *Nuevo usuario*: nombre, correo institucional, cargo, rol y grupo o área. Todas las cuentas nuevas inician con la contraseña temporal `Americano` + año actual (ej. `Americano2026`); la persona la cambia en su primer ingreso. El botón **Copiar** deja listos correo, enlace y clave para enviarlos.
9. **Dominio autorizado.** Cuando publiques en GitHub Pages, agrega `tuusuario.github.io` en Authentication → Configuración → *Dominios autorizados*.

## Publicar en Firebase Hosting (recomendado)

El proyecto ya trae `firebase.json` y `.firebaserc` apuntando a `agenda-americanista`.

1. Instala Node.js (versión LTS) desde https://nodejs.org.
2. En una terminal: `npm install -g firebase-tools`
3. `firebase login` (inicia sesión con la cuenta dueña del proyecto).
4. Dentro de la carpeta del proyecto: `firebase deploy`
   Publica la página y también las reglas de `firestore.rules` (primero debe existir la base de datos Firestore).
5. Queda en `https://agenda-americanista.web.app`. Para actualizar, repite `firebase deploy`.

## Publicar en GitHub Pages (alternativa)

1. Crea un repositorio (ej. `agenda-americanista`) y sube todos los archivos.
2. Settings → Pages → *Deploy from a branch* → rama `main`, carpeta `/ (root)` → Save.
3. En uno o dos minutos queda en `https://tuusuario.github.io/agenda-americanista/`.

## Roles

| Rol | Qué hace |
| --- | --- |
| Administrador del sistema | Gestiona usuarios, espacios y personal sin usuario; puede aprobar y cancelar |
| Directivo | Crea eventos que pasan directo a las áreas; ve todo; cancela cualquier evento |
| Coordinación de sección | Aprueba o rechaza los eventos de su grupo; crea eventos |
| Dependencia | Crea eventos que pasan directo a las áreas (Capellanía además aprueba los de educación religiosa) |
| Docente | Crea eventos que aprueba su grupo (Bachillerato, Preescolar y Primaria o Capellanía) |
| Líder de apoyo | Confirma, marca listo o no disponible su parte; asigna personal |
| Personal de apoyo | Ve sus asignaciones y las marca como listas |
| Responsable de espacio | Recibe avisos y agenda de los eventos en sus espacios |
| Consulta | Solo ve el calendario |

Quién aprueba se define con el **grupo**: al docente se le asigna el grupo que lo aprueba, y al aprobador el grupo que aprueba (campo "Aprueba solicitudes de").

## Edición de solicitudes

El solicitante (y Directivos o el Administrador) puede editar un evento hasta el día anterior a su fecha, desde el detalle del evento → **Editar**.

- Si cambia fecha, hora o lugar de un evento que requiere aprobación, vuelve a *Pendiente de aprobación*.
- Si solo cambia requerimientos, únicamente las áreas afectadas vuelven a *Pendiente*; las demás conservan su confirmación.
- Un evento rechazado se puede corregir con **Editar y reenviar**.
- En una serie semanal, la edición aplica solo a esa fecha.

## Gestión de usuarios

- Editar, activar/inactivar y eliminar desde *Usuarios*.
- **Restablecer clave** envía a la persona un correo de Firebase con un enlace (puede llegar a spam la primera vez).
- **Eliminar** borra el usuario de la plataforma; su cuenta de acceso se borra aparte en Authentication → Usuarios. Para impedir el acceso basta con **Inactivar**.

## Paso a Microsoft 365 (fase futura)

Los usuarios ya usan su correo institucional, así que el cambio solo toca el ingreso: TIC registra la app en Microsoft Entra ID, se habilita el proveedor **Microsoft** en Firebase Authentication y se agrega el botón "Entrar con Microsoft" en `js/data-firebase.js`. Roles, eventos y datos se conservan.

## Límites de la fase 1

- Los choques de horario se verifican en el navegador con los eventos cargados; dos solicitudes enviadas en el mismo segundo para el mismo espacio podrían pasar ambas.
- Los avisos son internos (campana); no se envían correos.
- Una serie semanal admite hasta 60 fechas.
