export default {
  command: ["join", "unirse"],
  isOwner: true,
  execute: async (ctx) => {
    const { sock, args, enviartexto } = ctx;
    const link = args[0];

    // 1. Verificar que se haya proporcionado un enlace
    if (!link || !link.includes("chat.whatsapp.com/")) {
      return enviartexto("⚠️ Debes ingresar un enlace válido de grupo de WhatsApp.\nEjemplo: .join https://chat.whatsapp.com/XXXXX");
    }

    // 2. Extraer el código de forma más robusta
    // Se divide por la última barra '/' para obtener solo el token final
    const urlParts = link.split('/');
    const code = urlParts[urlParts.length - 1];

    if (!code) {
      return enviartexto("❌ No se pudo extraer el código del enlace. Asegúrate de que el enlace sea correcto.");
    }

    try {
      await enviartexto(`⏳ Intentando unirme con el código: *${code}*...`);
      
      // 3. Llamar a la función con el código limpio
      const groupId = await sock.groupAcceptInvite(code);
      
      await enviartexto(`✅ *¡Me he unido al grupo con éxito!*\n🆔 ID: ${groupId}`);
    } catch (e) {
      console.error("Error en join:", e.message);
      // 4. Manejo de errores más específico
      let errorMsg = e.message;
      if (e.message.includes("bad-request")) {
        errorMsg = "El enlace de invitación es inválido, ha expirado o el grupo ya no existe.";
      } else if (e.message.includes("account_reachout_restricted")) {
        errorMsg = "Tu cuenta de WhatsApp tiene restricciones para unirse a nuevos grupos. Intenta más tarde.";
      }
      await enviartexto(`❌ No pude unirme al grupo.\n_${errorMsg}_`);
    }
  }
};
