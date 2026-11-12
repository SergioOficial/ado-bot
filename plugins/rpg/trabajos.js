export default {
  command: [
    "talar", "cultivar", "recolectar",
    "repartir", "limpiar", "construir", "pintar", "vender",
    "hackear", "disenar", "editar", "streamer",
    "hornear",
    "recompensa", "bombero", "policia",
    "exorcizar", "espiar", "mago"
  ],
  execute: async (ctx) => {
    const { sock, from, m, sender, comando, enviartexto, db, config } = ctx;

    if (!db.users[sender]) db.users[sender] = { coins: 0, exp: 0, nivel: 1 };
    const user = db.users[sender];
    const now = Date.now();

    // Diccionario con la configuración de cada trabajo
    const trabajos = {
      // 🌿 Naturaleza
      talar: { nombre: "Talar árboles", cd: 3, min: 100, max: 300, exp: 15, riesgo: 0.1, fallo: "Se te cayó un árbol encima y perdiste" },
      cultivar: { nombre: "Cultivar el campo", cd: 15, min: 500, max: 1500, exp: 50, riesgo: 0.1, fallo: "Una plaga arruinó tu cosecha y perdiste" },
      recolectar: { nombre: "Recolectar frutas y hierbas", cd: 2, min: 50, max: 200, exp: 10, riesgo: 0.05, fallo: "Te picaron las abejas y gastaste en medicina:" },
      
      // 🏙️ Ciudad
      repartir: { nombre: "Hacer delivery", cd: 4, min: 200, max: 500, exp: 20, riesgo: 0.15, fallo: "Te robaron el paquete y tuviste que pagar" },
      limpiar: { nombre: "Limpiar casas", cd: 5, min: 150, max: 400, exp: 15, riesgo: 0.05, fallo: "Rompiste un jarrón caro y tuviste que pagar" },
      construir: { nombre: "Trabajar en construcción", cd: 6, min: 400, max: 900, exp: 35, riesgo: 0.2, fallo: "Te lesionaste y tuviste que pagar el hospital:" },
      pintar: { nombre: "Pintar casas", cd: 5, min: 250, max: 600, exp: 25, riesgo: 0.1, fallo: "Manchaste un sofá de pintura y pagaste" },
      vender: { nombre: "Vender en la calle", cd: 3, min: 50, max: 1000, exp: 20, riesgo: 0.3, fallo: "La policía te multó por vender sin permiso:" },

      // 💻 Tecnología
      hackear: { nombre: "Hackear bases de datos", cd: 10, min: 1000, max: 4000, exp: 100, riesgo: 0.4, fallo: "El FBI te rastreó y pagaste una fianza de" },
      disenar: { nombre: "Diseñar logos", cd: 5, min: 300, max: 800, exp: 30, riesgo: 0.05, fallo: "El cliente no pagó y perdiste tiempo, gastaste" },
      editar: { nombre: "Editar videos", cd: 4, min: 200, max: 600, exp: 25, riesgo: 0.05, fallo: "Se borró el proyecto y tuviste que devolver" },
      streamer: { nombre: "Hacer directos", cd: 8, min: 100, max: 2000, exp: 40, riesgo: 0.1, fallo: "Te banearon la cuenta y perdiste" },

      // 🍞 Comida
      hornear: { nombre: "Hornear pan y tortas", cd: 6, min: 200, max: 700, exp: 30, riesgo: 0.1, fallo: "Se quemó todo en el horno y perdiste" },

      // ⚠️ Peligro / Autoridad
      recompensa: { nombre: "Cazar recompensas", cd: 12, min: 800, max: 2500, exp: 80, riesgo: 0.35, fallo: "El criminal era más fuerte y te quitó" },
      bombero: { nombre: "Apagar incendios", cd: 7, min: 400, max: 1000, exp: 50, riesgo: 0.15, fallo: "Te quemaste y pagaste el doctor con" },
      policia: { nombre: "Patrullar como policía", cd: 9, min: 500, max: 1500, exp: 60, riesgo: 0.2, fallo: "Un ladrón te disparó y gastaste en el hospital:" },

      // 👻 Fumados
      exorcizar: { nombre: "Exorcizar fantasmas", cd: 15, min: 1000, max: 3000, exp: 90, riesgo: 0.3, fallo: "El fantasma te asustó y pagaste a un psiquiatra:" },
      espiar: { nombre: "Espiar a alguien", cd: 8, min: 300, max: 1200, exp: 40, riesgo: 0.4, fallo: "Te descubrieron espiando y pagaste para que no te demanden:" },
      mago: { nombre: "Preparar pociones mágicas", cd: 10, min: 600, max: 2000, exp: 70, riesgo: 0.25, fallo: "La poción explotó y perdiste" }
    };

    const trabajo = trabajos[comando];
    if (!trabajo) return;

    const cooldownMs = trabajo.cd * 60 * 1000;
    const userLastJob = user[`last_${comando}`] || 0;

    // ⏳ Verificar Cooldown
    if (now - userLastJob < cooldownMs) {
      const remain = cooldownMs - (now - userLastJob);
      const min = Math.floor(remain / 60000);
      const seg = Math.floor((remain % 60000) / 1000);
      return enviartexto(`⏳ Estás cansado de *${trabajo.nombre}*.\nVuelve en *${min}m ${seg}s*.`);
    }

    // 🎲 Jugar
    user[`last_${comando}`] = now;
    const suerte = Math.random();
    let mensaje = "";

    if (suerte > trabajo.riesgo) {
      // ✅ Éxito
      const ganancia = Math.floor(Math.random() * (trabajo.max - trabajo.min + 1)) + trabajo.min;
      user.coins = (user.coins || 0) + ganancia;
      user.exp = (user.exp || 0) + trabajo.exp;
      
      mensaje = `✅ *${trabajo.nombre.toUpperCase()}*\n\nTrabajaste duro y ganaste:\n💰 *¥${ganancia.toLocaleString()}* coins\n✨ *+${trabajo.exp}* exp`;
    } else {
      // ❌ Fallo
      const perdida = Math.floor(Math.random() * (trabajo.min * 1.5)) + (trabajo.min / 2);
      user.coins = Math.max(0, (user.coins || 0) - perdida);
      const expFall = Math.floor(trabajo.exp / 2);
      user.exp = (user.exp || 0) + expFall;

      mensaje = `❌ *${trabajo.nombre.toUpperCase()}*\n\n${trabajo.fallo}:\n💸 *-¥${perdida.toLocaleString()}* coins\n✨ *+${expFall}* exp`;
    }

    // 🏅 Verificar subida de nivel
    let subidaNivel = "";
    user.nivel = user.nivel || 1;
    const expNecesaria = user.nivel * 100;

    if (user.exp >= expNecesaria) {
      user.nivel++;
      user.exp -= expNecesaria;
      subidaNivel = `\n\n🎉 *¡SUBISTE DE NIVEL!* Ahora eres nivel *${user.nivel}* 🚀`;
    }

    await enviartexto(`
┏━━━〔 ${trabajo.nombre.toUpperCase()} 〕━━━┓
┃ ${mensaje.replace(/\n/g, '\n┃ ')}
┗━━━━━━━━━━━━━━━━━━━━━━━━┛
> 💰 Balance: *¥${user.coins.toLocaleString()}*${subidaNivel}
`.trim());
  }
};