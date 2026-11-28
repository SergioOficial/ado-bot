import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const execFile = promisify(execFileCallback);
const MAX_BYTES = 64 * 1024 * 1024;
const HOSTS = [
  "youtube.com", "youtu.be", "youtube-nocookie.com",
  "tiktok.com", "instagram.com", "facebook.com", "fb.watch",
  "fb.com", "spotify.com", "spoti.fi"
];

export function validarEnlaceDescarga(value) {
  let url;
  try { url = new URL(String(value)); } catch { throw new Error("El enlace no es una URL válida."); }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Solo se permiten enlaces HTTP/HTTPS.");
  const host = url.hostname.toLowerCase();
  if (!HOSTS.some((domain) => host === domain || host.endsWith(`. ${domain}`.replace(" ", "")))) {
    throw new Error("Este dominio no está admitido para descargas.");
  }
  return url.href;
}

export async function descargarMedia(url, mode = "video") {
  const target = validarEnlaceDescarga(url);
  const dir = await mkdtemp(path.join(os.tmpdir(), "ado-dl-"));
  const output = path.join(dir, "media.%(ext)s");
  const args = [
    "--no-warnings", "--no-playlist", "--no-progress",
    "--max-filesize", "64M", "--socket-timeout", "25",
    "--retries", "2", "--fragment-retries", "2",
    "--print", "after_move:filepath", "-o", output
  ];
  if (mode === "audio") {
    args.push("-x", "--audio-format", "mp3", "--audio-quality", "5");
  } else {
    args.push("-f", "best[ext=mp4]/best", "--merge-output-format", "mp4");
  }
  args.push("--", target);

  try {
    let result;
    try {
      result = await execFile(process.env.YT_DLP_PATH || "yt-dlp", args, {
        timeout: 180_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true
      });
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error("No encuentro yt-dlp en el servidor. Instálalo (pip install -U yt-dlp) y vuelve a intentar.");
      }
      const detail = String(error.stderr || error.message || "falló yt-dlp").trim().slice(-700);
      throw new Error(detail);
    }

    const printed = String(result.stdout || "").trim().split(/\r?\n/).filter(Boolean).at(-1);
    let filePath = printed && path.isAbsolute(printed) ? printed : null;
    if (!filePath) {
      const files = await readdir(dir);
      const file = files.find((name) => name.startsWith("media."));
      if (file) filePath = path.join(dir, file);
    }
    if (!filePath) throw new Error("yt-dlp terminó sin generar un archivo.");
    const buffer = await readFile(filePath);
    if (!buffer.length) throw new Error("La descarga llegó vacía.");
    if (buffer.length > MAX_BYTES) throw new Error("El archivo supera el límite de 64 MB.");
    return { buffer, fileName: path.basename(filePath), mime: mode === "audio" ? "audio/mpeg" : (/\.mp4$/i.test(filePath) ? "video/mp4" : "application/octet-stream") };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
