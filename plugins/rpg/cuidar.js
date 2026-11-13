function checkLevelUp(pet) {
  let subio = false;
  while (pet.points >= pet.level * 100 && pet.level < 50) {
    pet.points -= pet.level * 100;
    pet.level++;
    subio = true;
  }
  return subio;
}

export default {
  command: ["acariciar", "alimentar", "pasear", "nombrar"],
  execute: async (ctx) => {
    const { sender, comando, args, enviartexto, db, config } = ctx;
    if (!db.users[sender] || !db.users[sender].pets) return enviartexto("❌ No tienes mascotas. Adopta una primero.");

    const user = db.users[sender];
    const target = args[0]?.toLowerCase();
    if (!target) return enviartexto(`🐾 Menciona el animal o su nombre.`);

    // Buscar mascota por especie o por nombre
    let petKey = null;
    for (const [key, p] of Object.entries(user.pets)) {
      if (key === target || p.name.toLowerCase() === target) {
        petKey = key;
        break;
      }
    }

    if (!petKey) return enviartexto("❌ No tienes esa mascota.");

    const pet = user.pets[petKey];
    const now = Date.now();
    let msg = "";
    let pts = 0;
    let cd = 0;

    if (comando === "nombrar") {
      cd = 24 * 60 * 60 * 1000;
      if (now - pet.lastRename < cd) return enviartexto("⏳ Solo puedes cambiar el nombre 1 vez cada 24 horas.");
      const newName = args.slice(1).join(" ");
      if (!newName) return enviartexto("⚠️ Escribe el nuevo nombre.");
      pet.name = newName.slice(0, 20);
      pet.lastRename = now;
      return enviartexto(`✅ El animal ahora se llama *${pet.name}*.`);
    }

    if (comando === "acariciar") {
      cd = 10 * 60 * 1000;
      pts = 1;
      msg = "acariciaste";
      if (now - pet.lastPet < cd) return enviartexto(`⏳ Deja descansar a ${pet.name}, vuelve en unos minutos.`);
      pet.lastPet = now;
    }

    if (comando === "alimentar") {
      cd = 5 * 60 * 1000;
      pts = 2;
      msg = "alimentaste";
      if (now - pet.lastFeed < cd) return enviartexto(`⏳ ${pet.name} no tiene hambre ahora.`);
      pet.lastFeed = now;
    }

    if (comando === "pasear") {
      cd = 15 * 60 * 1000;
      pts = 5;
      msg = "paseaste";
      if (now - pet.lastWalk < cd) return enviartexto(`⏳ ${pet.name} está cansado, vuelve más tarde.`);
      pet.lastWalk = now;
    }

    pet.points += pts;
    const subio = checkLevelUp(pet);

    await enviartexto(`
┏━━━〔 🐾 𝐂𝐔𝐈𝐃𝐀𝐃𝐎 〕━━━┓
┃ ✨ Has ${msg} a *${pet.name}*.
┃ ➤ *+${pts}* puntos
┃
┃ 📈 *Nivel:* ${pet.level}
┃ ✨ *Puntos:* ${pet.points}/${pet.level * 100}
┗━━━━━━━━━━━━━━━━━━━━━━━━┛
${subio ? `\n🎉 *¡${pet.name} ha subido al nivel ${pet.level}!* 🚀` : ""}
`.trim());
  }
};