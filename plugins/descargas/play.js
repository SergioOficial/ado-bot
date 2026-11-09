
import { spawn, execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import axios from "axios";
import sharp from "sharp";

const MAX_AUDIO_BYTES = 64 * 1024 * 1024;
const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i;

// ═══════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════

const safeFileName = (name) => String(name || 'audio').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 50);

function getBuffer(url) {
  return axios.get(url, { responseType: 'arraybuffer', headers: { 'user-agent': 'Mozilla/5.0' } })
    .then(res => Buffer.from(res.data, 'binary'))
    .catch(() => null);
}

function findYtDlp() {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const out = execFileSync(cmd, ['yt-dlp'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    return out.split(/\r?\n/)[0].trim();
  } catch {
    return null; // No está instalado
  }
}

function runYtDlp(args, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const ytdlp = findYtDlp() || 'yt-dlp';
    const child = spawn(ytdlp, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    
    const timer = setTimeout(() => { child.kill(); reject(new Error('Tiempo de descarga agotado')); }, timeoutMs);
    
    child.stdout.on('data', (chunk) => stdout += chunk);
    child.stderr.on('data', (chunk) => stderr += chunk);
    
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.split('\n').pop() || `yt-dlp error ${code}`));
    });
  });
}

// ═══════════════════════════════════════════
// PLUGIN
// ═══════════════════════════════════════════

export default {
  command: ["play", "mp3", "ytmp3", "audio", "playaudio"],
  execute: async (ctx) => {
    const { sock, from, m, args, enviartexto, config } = ctx;
    
    const parts = [...args];
    const flag = String(parts[0] || '').toLowerCase();
    const forceVip = ['vip', 'premiun', 'premium', 'ytvip'].includes(flag);
    if (forceVip) parts.shift();

    const query = parts.join(' ').trim();
    if (!query) {
      return enviartexto(
        '🎵 *REPRODUCIR AUDIO*\n\n' +
        `🔗 Uso: ${config.prefix}play <canción o enlace de YouTube>\n` +
        `⚡ Forzar VIP: ${config.prefix}play vip <canción>\n\n` +
        `✨ Ejemplo: ${config.prefix}play Ven Mi Amor`
      );
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

    try {
      let youtubeUrl = query;
      let videoInfo = null;

      // 1. Si no es URL, buscar en YouTube con yt-search
      if (!YT_REGEX.test(query)) {
        const { default: yts } = await import("yt-search");
        const search = await yts(query);
        if (!search.all || search.all.length === 0) throw new Error("No se encontraron resultados.");
        
        videoInfo = search.all[0];
        youtubeUrl = videoInfo.url;
      }

      const hasYtDlp = findYtDlp();
      let audioBuffer = null;
      let ext = 'm4a';
      let title = videoInfo?.title || "Audio de YouTube";
      let author = videoInfo?.author?.name || "YouTube";
      let thumbnail = videoInfo?.image;

      // 2. Descargar audio (Preferencia: yt-dlp)
      if (hasYtDlp) {
        const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'levi-play-'));
        try {
          const outPath = path.join(dir, 'audio.%(ext)s');
          // Configuración para máxima compatibilidad con WhatsApp
          await runYtDlp([
            '--no-playlist', '--no-warnings', '--no-progress',
            '-f', '140/bestaudio[ext=m4a]/best',
            '-o', outPath, youtubeUrl
          ]);
          
          const files = await fs.promises.readdir(dir);
          const downloadedFile = files.find(f => f.startsWith('audio.'));
          if (!downloadedFile) throw new Error("yt-dlp no generó el archivo.");
          
          const filePath = path.join(dir, downloadedFile);
          const stat = await fs.promises.stat(filePath);
          if (stat.size > MAX_AUDIO_BYTES) throw new Error("El audio supera los 64MB.");
          
          audioBuffer = await fs.promises.readFile(filePath);
          ext = path.extname(downloadedFile).replace('.', '');
        } finally {
          fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
        }
      } else {
        // 3. Respaldo: Usar API si yt-dlp no está instalado
        const apiUrl = `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
        const res = await axios.get(apiUrl, { timeout: 20000 });
        if (!res.data || !res.data.data || !res.data.data.url) throw new Error("La API de respaldo falló.");
        
        const audioRes = await axios.get(res.data.data.url, { responseType: 'arraybuffer' });
        audioBuffer = Buffer.from(audioRes.data, 'binary');
        title = res.data.data.title || title;
        ext = 'mp3';
      }

      // 4. Preparar y enviar la tarjeta (Miniatura)
      const caption = 
        `⊱ ──── {.⋅ ♫ ⋅.} ──── ⊰\n` +
        `✦ *ɴᴏᴍʙʀᴇ:* ${title}\n` +
        `❐ *ғᴏʀᴍᴀᴛᴏ:* ${ext.toUpperCase()}\n` +
        `✎ *ᴄᴀɴᴀʟ:* ${author}\n` +
        `✧ *ᴜʀʟ:* ${youtubeUrl}\n\n` +
        `> ɢʀᴀᴄɪᴀs ᴘᴏʀ ᴜsᴀʀ ᴀ ${config.botName} ✦`;

      let thumbBuffer = thumbnail ? await getBuffer(thumbnail) : null;
      
      if (thumbBuffer) {
        try {
          // Comprimir miniatura para que no falle en WhatsApp
          thumbBuffer = await sharp(thumbBuffer).resize({ width: 600 }).jpeg({ quality: 80 }).toBuffer();
          await sock.sendMessage(from, { image: thumbBuffer, caption }, { quoted: m });
        } catch {
          await enviartexto(caption);
        }
      } else {
        await enviartexto(caption);
      }

      // 5. Enviar el audio
      const mimetype = ext === 'ogg' ? 'audio/ogg' : ext === 'mp3' ? 'audio/mpeg' : 'audio/mp4';
      await sock.sendMessage(from, {
        audio: audioBuffer,
        mimetype: mimetype,
        fileName: `${safeFileName(title)}.${ext}`,
        ptt: false
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (err) {
      console.error("Error en #play:", err.message);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await enviartexto(`❌ *ERROR DE DESCARGA*\n\n📛 No se pudo reproducir el audio.\n🔎 Detalle: ${err.message}`);
    }
  }
};