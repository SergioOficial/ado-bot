export default {
  command: ["cazar", "hunt"],
  execute: async (ctx) => {
    const { sender, enviartexto, db, config } = ctx;
    if (!db.users[sender]) db.users[sender] = {};
    const user = db.users[sender];

    const now = Date.now();
    const cd = 5 * 60 * 1000; // 5 minutos
    if (now - (user.lastCazar || 0) < cd) {
      const remain = cd - (now - user.lastCazar);
      return enviartexto(`⏳ Estás recuperando energía. Vuelve en *${Math.floor(remain / 60000)}m ${Math.floor((remain % 60000) / 1000)}s*.`);
    }

    user.lastCazar = now;

    // Tabla de probabilidades (basada en intentos)
    const roll = Math.floor(Math.random() * 100) + 1;
    let animal = null;

    if (roll === 1) animal = { nombre: "godzilla", pts: 500 };
    else if (roll <= 3) animal = { nombre: "megalodon", pts: 50 };
    else if (roll <= 8) animal = { nombre: "leon", pts: 36 };
    else if (roll <= 14) animal = { nombre: "alce", pts: 30 };
    else if (roll <= 24) animal = { nombre: "ñandu", pts: 26 };
    else if (roll <= 44) animal = { nombre: "jabali", pts: 20 };
    else if (roll <= 77) animal = { nombre: "conejo", pts: 16 };
    else if (roll <= 90) animal = { nombre: "cucaracha", pts: 6 };

    if (!animal) {
      return enviartexto(`🌲 *Cacería fallida*\n\nPasaste horas en el bosque pero no encontraste nada.`);
    }

    // 70% de atraparlo, 30% de que se escape
    const atrapado = Math.random() < 0.7;
    let mensaje = "";

    if (atrapado) {
      if (!user.pets) user.pets = {};
      
      if (user.pets[animal.nombre]) {
        // Ya lo tiene, le suma los puntos al que tiene
        const pet = user.pets[animal.nombre];
        pet.points += animal.pts;
        let subio = false;
        while (pet.points >= pet.level * 100 && pet.level < 50) {
          pet.points -= pet.level * 100;
          pet.level++;
          subio = true;
        }
        mensaje = `🏹 *¡Has cazado un/a ${animal.nombre}!*\n\nComo ya lo tenías, le diste *+${animal.pts}* puntos a *${pet.name}*.\n> Nivel actual: ${pet.level}`;
        if (subio) mensaje += `\n🎉 *¡Subió de nivel!*`;
      } else {
        // Lo adopta automáticamente
        user.pets[animal.nombre] = {
          name: animal.nombre.charAt(0).toUpperCase() + animal.nombre.slice(1),
          level: 1, points: animal.pts, lastPet: 0, lastFeed: 0, lastWalk: 0, lastRename: 0
        };
        mensaje = `🏹 *¡Has cazado un/a ${animal.nombre}!*\n\nSe ha unido a tu equipo automáticamente con *${animal.pts}* puntos.`;
      }
    } else {
      // Se escapó
      const ptsMitad = Math.floor(animal.pts / 2);
      if (!user.pets || Object.keys(user.pets).length === 0) {
        mensaje = `🦊 *El/La ${animal.nombre} se escapó...*\n\nNo tienes mascotas a las que darle los *${ptsMitad}* puntos de consuelo.`;
      } else {
        // Le da los puntos a la primera mascota
        const firstPetKey = Object.keys(user.pets)[0];
        const pet = user.pets[firstPetKey];
        pet.points += ptsMitad;
        let subio = false;
        while (pet.points >= pet.level * 100 && pet.level < 50) {
          pet.points -= pet.level * 100;
          pet.level++;
          subio = true;
        }
        mensaje = `🦊 *El/La ${animal.nombre} se escapó...*\n\nTe dio *+${ptsMitad}* puntos de experiencia para *${pet.name}* por el esfuerzo.`;
        if (subio) mensaje += `\n🎉 *¡Subió de nivel!*`;
      }
    }

    await enviartexto(`
┏━━━〔 🏹 𝐂𝐀𝐂𝐄𝐑𝐈́𝐀 〕━━━┓
┃ ${mensaje.replace(/\n/g, "\n┃ ")}
┗━━━━━━━━━━━━━━━━━━━━━━━━┛
${config.footer}
`.trim());
  }
};