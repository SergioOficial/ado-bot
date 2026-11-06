import fs from 'fs';
import path from 'path';

// Archivo donde se guardarán los datos
const dbFile = path.join(process.cwd(), 'lib/database.json');

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
      console.error('❌ Error al leer database.json:', e.message);
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
  if (!force && !hasPendingChanges()) return;
  try {
    fs.writeFileSync(dbFile, JSON.stringify(global.db.data, null, 2));
    global.db._snapshot = JSON.stringify(global.db.data);
  } catch (e) {
    console.error('❌ Error al guardar database.json:', e.message);
  }
};

// Auto-guardado cada 1 segundo si hay cambios
setInterval(() => {
  if (hasPendingChanges()) {
    global.saveDatabase();
  }
}, 1000);

export default global.db;
