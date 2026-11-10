/**
 * Levi-Bot — Copyright (C) 2026 los autores de Levi-Bot · AGPL-3.0-only
 * Parte portada de Shin-MD (https://github.com/riokuroxi-svg/Shin-MD)
 * Copyright (C) 2026 riokuroxi-svg · AGPL-3.0-only. Ver NOTICE.
 *
 * .wastalk <número> — qué se puede saber de un número de WhatsApp.
 *
 * Solo lo público: si existe, su estado (bio) y su foto si no la esconde. Nada
 * de «espiar»: si la persona restringe el estado, se dice que no se puede.
 */
import { numeroDe } from "../../lib/grupo.js";

export default {
  command: ["wastalk", "stalknum", "numbstalk", "perfilwa", "infowa"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, PREFIX } = ctx;

    const crudo = (args || []).join(" ");
    const numero = numeroDe(crudo);
    if (numero.length < 8 || numero.length > 15) {
      return enviartexto(
        `《✧》 Dame un número con código de país.\n> Ejemplo: *${PREFIX}wastalk 5215512345678*`
      );
    }

    await sock.sendMessage(from, { react: { text: "🔎", key: m.key } }).catch(() => {});

    const [resultado] = await sock
      .onWhatsApp(numero)
      .catch(() => []);
    if (!resultado?.exists) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } }).catch(() => {});
      return enviartexto(`《✧》 El número *${numero}* no tiene WhatsApp (o está mal escrito).`);
    }

    const jid = resultado.jid;
    const lineas = [`🔎 *${numero}*`, "│", "│ ◈ En WhatsApp › *sí*"];

    // Estado (bio): solo si la privacidad lo permite.
    try {
      const estado = await sock.fetchStatus(jid);
      const texto = estado?.[0]?.status;
      lineas.push(texto ? `│ ◈ Estado › ${String(texto).slice(0, 200)}` : "│ ◈ Estado › _(vacío)_");
    } catch {
      lineas.push("│ ◈ Estado › _(no visible)_");
    }

    let foto = null;
    try {
      foto = await sock.profilePictureUrl(jid, "image", { url: "image" });
    } catch {
      foto = null;
    }
    lineas.push(foto ? "│ ◈ Foto › visible" : "│ ◈ Foto › _(no visible)_");
    lineas.push("╰─");

    const cuerpo = lineas.join("\n");
    try {
      if (foto) return await sock.sendMessage(from, { image: { url: foto }, caption: cuerpo }, { quoted: m });
      return await sock.sendMessage(from, { text: cuerpo }, { quoted: m });
    } catch (err) {
      return enviartexto(`⚠️ ${cuerpo}\n_(no pude mandar la foto: ${err.message})_`);
    }
  },
};
