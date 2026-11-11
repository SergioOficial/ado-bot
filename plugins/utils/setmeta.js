export default {
  command: ['setstickermeta', 'setmeta'],
  execute: async (ctx) => {
    const { m, args, enviartexto, db, sender } = ctx;
    
    if (!args || args.length === 0) return enviartexto('《✧》 Por favor, ingresa los metadatos.\nEjemplo: .setmeta Pack | Autor');

    try {
      const fullArgs = args.join(' ');
      const [metadatos01, metadatos02] = fullArgs.split(/\||•/).map((meta) => meta.trim());

      if (!db.users[sender]) db.users[sender] = {};
      db.users[sender].metadatos = metadatos01 || '';
      db.users[sender].metadatos2 = metadatos02 || '';

      await enviartexto(`✎ Los metadatos de tus stickers se han actualizado correctamente.`);
    } catch (e) {
      await enviartexto(`> Error: *${e.message}*`);
    }
  },
};