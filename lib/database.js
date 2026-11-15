/**
 * riokuroxi — https://github.com/riokuroxi-svg
 * Copyright (C) 2026 riokuroxi-svg
 * SPDX-License-Identifier: AGPL-3.0-only
 * Mantener esta cabecera es obligatorio por AGPL. Ver NOTICE.
 *
 * lib/database.js — la base JSON, con escritura atómica.
 *
 * Dos arreglos sobre lo que había:
 *
 *   1. ESCRITURA ATÓMICA. Se escribía directo sobre `database.json`. Si el
 *      proceso moría a mitad (OOM, `kill -9`, se fue la luz en el VPS, el
 *      hosting recicló el contenedor) el archivo quedaba partido y el bot
 *      arrancaba con la base vacía: perfiles, economía y mascotas de todos,
 *      perdidos. Ahora se escribe en un temporal y se renombra; `rename` dentro
 *      del mismo sistema de archivos es atómico, así que o está el archivo viejo
 *      completo o está el nuevo completo.
 *   2. UNA SOLA RUTA. El archivo se resolvía aquí a mano mientras `lib/rutas.js`
 *      ya exportaba `BASE_DATOS` con la misma ruta. Se usa la de allí.
 *
 * Se mantiene la forma de siempre: `global.db.data` y `global.saveDatabase()`,
 * que es lo que usan los plugins. El autoguardado sigue siendo cada segundo y
 * solo si cambió algo.
 */

import fs from "fs";
import path from "path";
import { BASE_DATOS } from "./rutas.js";

const dbFile = BASE_DATOS;

// Estructura inicial de la base de datos
global.db = {
  data: {
    users: {},     // Aquí irá el perfil, economía y RPG de cada usuario
    settings: {},  // Aquí irá la configuración de cada bot (nombre, bio, etc.)
    chats: {}      // (Opcional) Para configuraciones de grupos
  },
  _snapshot: '{}'
};

// Función para cargar los datos al iniciar el bot
global.loadDatabase = function loadDatabase() {
  if (fs.existsSync(dbFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      // Fusionar los datos guardados con la estructura inicial
      global.db.data = Object.assign(global.db.data, parsed);
      console.log('✅ Base de datos cargada correctamente.');
    } catch (e) {
      // Un JSON roto no puede dejar al bot sin arrancar, pero tampoco se debe
      // pisar en silencio: se aparta el archivo para poder mirarlo después.
      console.error('❌ Error al leer database.json:', e.message);
      try {
        const apartado = `${dbFile}.roto-${Date.now()}`;
        fs.copyFileSync(dbFile, apartado);
        console.error(`   Se guardó una copia para revisarla en ${path.basename(apartado)}`);
      } catch {}
    }
  } else {
    console.log('📁 Creando nueva base de datos...');
    global.saveDatabase(true); // Crear archivo si no existe
  }
  global.db._snapshot = JSON.stringify(global.db.data);
  return global.db.data;
};

// Función para verificar si hay cambios
function hasPendingChanges() {
  return global.db._snapshot !== JSON.stringify(global.db.data);
}

// Función para guardar los datos en el disco
global.saveDatabase = function saveDatabase(force = false) {
  if (!force && !hasPendingChanges()) return false;
  const serializado = JSON.stringify(global.db.data, null, 2);
  const temporal = `${dbFile}.${process.pid}.tmp`;
  try {
    fs.mkdirSync(path.dirname(dbFile), { recursive: true });
    fs.writeFileSync(temporal, serializado);
    fs.renameSync(temporal, dbFile); // atómico: o el viejo o el nuevo, nunca a medias
    global.db._snapshot = serializado;
    return true;
  } catch (e) {
    console.error('❌ Error al guardar database.json:', e.message);
    try { fs.unlinkSync(temporal); } catch {}
    return false;
  }
};

// Auto-guardado cada 1 segundo si hay cambios
const autoguardado = setInterval(() => {
  if (hasPendingChanges()) {
    global.saveDatabase();
  }
}, 1000);
autoguardado.unref?.();

/** Para las pruebas y para el apagado limpio. */
export function detenerAutoguardado() {
  clearInterval(autoguardado);
}

export { dbFile };
export default global.db;
