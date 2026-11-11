import { search, download } from 'aptoide-scraper';

export default {
  command: ['apk', 'aptoide', 'apkdl'],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto } = ctx;
    if (!args[0]) return enviartexto('《✧》 Por favor, ingresa el nombre de la aplicación.');

    try {
      const searchA = await search(args.join(' '));
      if (!searchA || searchA.length === 0) throw new Error('No se encontraron resultados.');

      const apkInfo = await download(searchA[0].id);
      if (!apkInfo) throw new Error('No se pudo obtener la información.');

      const caption = `✰ ᩧ　𓈒　ׄ　Aptoide 　ׅ　✿\n\n` +
        `➩ *Nombre ›* ${apkInfo.name}\n` +
        `❖ *Paquete ›* ${apkInfo.package}\n` +
        `✿ *Última actualización ›* ${apkInfo.lastup}\n` +
        `☆ *Tamaño ›* ${apkInfo.size}`;

      await sock.sendMessage(from, { 
        document: { url: apkInfo.dllink }, 
        mimetype: 'application/vnd.android.package-archive', 
        fileName: `${apkInfo.name}.apk`, 
        caption 
      }, { quoted: m });

    } catch (e) {
      await enviartexto(`> Error: *${e.message}*`);
    }
  }
};