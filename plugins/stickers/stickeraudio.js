/**
 * Name   : Audio Sticker (Static & Animated GIF)
 * Type   : Plugin ESM (Adaptado para Ado-Bot)
 * Author : Nimzz (Adaptación: Sergio Dev)
 * Desc   : Sticker con sonido. Video (auto-extrae audio) e Imagen (pide audio).
 */

import baileys from '../../lib/baileys.js'; 
const { prepareWAMessageMedia, proto, downloadMediaMessage, downloadContentFromMessage } = baileys;

import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const execFileAsync = promisify(execFile);
const MAX_DURATION = 25;
const SESSION_SECONDS = 60;

if (!globalThis.__audioStickerSessions) {
    globalThis.__audioStickerSessions = new Map();
}
const sessions = globalThis.__audioStickerSessions;

// ══════════════════════════════════════════════════════════════════
// MAGIA: PARCHEO DEL PROTOCOLO
// ══════════════════════════════════════════════════════════════════
function patchProtoInstance(p) {
    const M = p?.Message;
    if (!M || M.__audioStickerPatchedV3) return;

    if (M.StickerMessage) {
        const prevStickerEncode = M.StickerMessage.encode;
        M.StickerMessage.encode = function (message, writer) {
            const audio = message?.audioMessage;
            if (audio && Object.prototype.hasOwnProperty.call(message, 'audioMessage')) {
                delete message.audioMessage;
            }
            const w = prevStickerEncode.call(this, message, writer);
            if (audio && M.AudioMessage) {
                message.audioMessage = audio;
                M.AudioMessage.encode(audio, w.uint32(210).fork()).ldelim();
            }
            return w;
        };

        if (typeof M.StickerMessage.fromObject === 'function') {
            const prevStickerFromObj = M.StickerMessage.fromObject;
            M.StickerMessage.fromObject = function (object) {
                const msg = prevStickerFromObj.call(this, object);
                if (object?.audioMessage) {
                    msg.audioMessage = M.AudioMessage?.fromObject
                        ? M.AudioMessage.fromObject(object.audioMessage)
                        : object.audioMessage;
                }
                return msg;
            }
        }
    }

    const prevMsgEncode = M.encode;
    M.encode = function (message, writer) {
        const asm = message?.audioStickerMessage;
        if (asm) {
            if (Object.prototype.hasOwnProperty.call(message, 'stickerMessage')) {
                delete message.stickerMessage;
            }
            if (Object.prototype.hasOwnProperty.call(message, 'audioStickerMessage')) {
                delete message.audioStickerMessage;
            }
        }
        const w = prevMsgEncode.call(this, message, writer);
        if (asm && M.FutureProofMessage) {
            message.audioStickerMessage = asm;
            M.FutureProofMessage.encode(asm, w.uint32(1074).fork()).ldelim();
        }
        return w;
    }

    if (typeof M.fromObject === 'function') {
        const prevMsgFromObj = M.fromObject;
        M.fromObject = function (object) {
            const msg = prevMsgFromObj.call(this, object)
            if (object?.audioStickerMessage) {
                const inner = object.audioStickerMessage.message || object.audioStickerMessage;
                if (inner?.stickerMessage && object.audioStickerMessage.message?.stickerMessage?.audioMessage) {
                    inner.stickerMessage.audioMessage = object.audioStickerMessage.message.stickerMessage.audioMessage;
                }
                msg.audioStickerMessage = { message: inner };
                delete msg.stickerMessage;
                if (inner) {
                    Object.setPrototypeOf(msg, inner);
                }
            }
            return msg;
        }
    }

    M.__audioStickerPatchedV3 = true;
}

async function ensurePatched() {
    patchProtoInstance(proto);
    for (const pkg of ['@itsliaaa/baileys', 'baileys', '@whiskeysockets/baileys']) {
        try {
            const mod = await import(pkg);
            if (mod?.proto) patchProtoInstance(mod.proto);
            if (mod?.default?.proto) patchProtoInstance(mod.default.proto);
        } catch {}
    }
}

// ══════════════════════════════════════════════════════════════════
// UTILIDADES
// ══════════════════════════════════════════════════════════════════
function getSessionKey(m, from) {
    return `${from}:${m?.sender || 'test'}`;
}

function clearUserSession(key) {
    const existing = sessions.get(key);
    if (existing?.timer) clearTimeout(existing.timer);
    sessions.delete(key);
}

function unwrapMessageContainer(raw) {
    let cur = raw;
    for (let i = 0; i < 6 && cur; i++) {
        const next = cur.ephemeralMessage?.message || cur.viewOnceMessageV2?.message || cur.viewOnceMessageV2Extension?.message || cur.viewOnceMessage?.message || cur.documentWithCaptionMessage?.message || cur.editedMessage?.message;
        if (!next) break;
        cur = next;
    }
    return cur || {};
}

function detectMediaInfo(node) {
    if (!node || !node.message) return { kind: null, mime: '', seconds: 0, mediaObj: null, dlType: null };
    const container = unwrapMessageContainer(node.message || node.fakeObj?.message || {});
    const mtype = node.mtype || node.type || Object.keys(container).find(k => /imageMessage|videoMessage|stickerMessage|audioMessage|documentMessage/i.test(k)) || '';
    
    if (!mtype) return { kind: null, mime: '', seconds: 0, mediaObj: null, dlType: null };

    const directMsg = node.msg && typeof node.msg === 'object' && (node.msg.mediaKey || node.msg.url || node.msg.directPath || node.msg.mimetype) ? node.msg : null;
    const mediaObj = directMsg || container[mtype] || container.videoMessage || container.imageMessage || container.stickerMessage || container.audioMessage || container.documentMessage || (node.mediaKey || node.url || node.directPath ? node : null);
    
    if (!mediaObj) return { kind: null, mime: '', seconds: 0, mediaObj: null, dlType: null };

    const mime = String(node.mimetype || mediaObj?.mimetype || '').toLowerCase();
    const seconds = Number(mediaObj?.seconds || node.seconds || node.msg?.seconds || 0);

    if (/video/i.test(mime) || /videoMessage/i.test(mtype)) return { kind: 'video', mime: mime || 'video/mp4', seconds, mediaObj, dlType: 'video' };
    if (/webp/i.test(mime) || /stickerMessage/i.test(mtype)) return { kind: 'webp', mime: 'image/webp', seconds, isAnimated: Boolean(mediaObj?.isAnimated), mediaObj, dlType: 'sticker' };
    if (/image/i.test(mime) || /imageMessage/i.test(mtype)) return { kind: 'image', mime: mime || 'image/jpeg', seconds: 0, mediaObj, dlType: 'image' };
    if (/audio|ogg|opus|mpeg|mp3|wav|m4a|aac/i.test(mime) || /audioMessage/i.test(mtype)) return { kind: 'audio', mime: mime || 'audio/mpeg', seconds, mediaObj, dlType: 'audio' };
    
    return { kind: null, mime: '', seconds: 0, mediaObj: null, dlType: null };
}

async function downloadBuffer(node, info, client) {
    if (!node || !info?.mediaObj || !info?.dlType) return null;
    try {
        const stream = await downloadContentFromMessage(info.mediaObj, info.dlType);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return Buffer.concat(chunks);
    } catch {
        try {
            const synthetic = { key: node.key || { remoteJid: node.chat || 'status@broadcast', id: '0' }, message: { [`${info.dlType}Message`]: info.mediaObj } };
            return await downloadMediaMessage(synthetic, 'buffer', {}, { logger: { info: () => {}, error: () => {}, warn: () => {} }, reuploadRequest: client?.updateMediaMessage });
        } catch {}
    }
    return null;
}

// ══════════════════════════════════════════════════════════════════
// CONVERSIÓN Y EXIF (Sin node-webpmux)
// ══════════════════════════════════════════════════════════════════
function buildExifPayload(packname, author) {
    const json = { 'sticker-pack-id': 'com.alya.ai.audiosticker', 'sticker-pack-name': String(packname || ''), 'sticker-pack-publisher': String(author || ''), emojis: ['🔊'] };
    const exifAttr = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    return exif;
}

function injectExifRiffFallback(webpBuffer, exifData) {
    if (!Buffer.isBuffer(webpBuffer) || webpBuffer.length < 16 || webpBuffer.toString('ascii', 0, 4) !== 'RIFF' || webpBuffer.toString('ascii', 8, 12) !== 'WEBP') return webpBuffer;
    const chunks = []; let offset = 12, hasVp8x = false, isAnim = false;
    while (offset + 8 <= webpBuffer.length) {
        const id = webpBuffer.toString('ascii', offset, offset + 4);
        const size = webpBuffer.readUInt32LE(offset + 4);
        const padded = size + (size % 2);
        const end = Math.min(webpBuffer.length, offset + 8 + padded);
        const rawChunk = Buffer.from(webpBuffer.subarray(offset, end));
        if (id === 'VP8X') hasVp8x = true;
        if (id === 'ANIM' || id === 'ANMF') isAnim = true;
        if (id !== 'EXIF') chunks.push({ id, rawChunk });
        offset = end;
    }
    if (!hasVp8x) {
        const vp8x = Buffer.alloc(18);
        vp8x.write('VP8X', 0, 4, 'ascii'); vp8x.writeUInt32LE(10, 4); vp8x[8] = 0x18;
        vp8x.writeUIntLE(511, 12, 3); vp8x.writeUIntLE(511, 15, 3);
        chunks.unshift({ id: 'VP8X', rawChunk: vp8x });
    } else {
        const vp8xEntry = chunks.find(c => c.id === 'VP8X');
        if (vp8xEntry && vp8xEntry.rawChunk.length >= 18) {
            vp8xEntry.rawChunk[8] |= 0x08;
            if (isAnim) vp8xEntry.rawChunk[8] |= 0x02;
        }
    }
    const padByte = exifData.length % 2 === 1 ? Buffer.from([0x00]) : Buffer.alloc(0);
    const exifHeader = Buffer.alloc(8);
    exifHeader.write('EXIF', 0, 4, 'ascii'); exifHeader.writeUInt32LE(exifData.length, 4);
    chunks.push({ id: 'EXIF', rawChunk: Buffer.concat([exifHeader, exifData, padByte]) });
    const body = Buffer.concat(chunks.map(c => c.rawChunk));
    const header = Buffer.alloc(12);
    header.write('RIFF', 0, 4, 'ascii'); header.writeUInt32LE(body.length + 4, 4); header.write('WEBP', 8, 4, 'ascii');
    return Buffer.concat([header, body]);
}

async function addStickerExif(webpBuffer, packname, author) {
    const exifData = buildExifPayload(packname, author);
    return injectExifRiffFallback(webpBuffer, exifData);
}

async function videoBufferToAnimatedWebp(buffer) {
    const tmpId = randomBytes(6).toString('hex');
    const inPath = path.join(os.tmpdir(), `as_vid_${tmpId}.mp4`);
    const outPath = path.join(os.tmpdir(), `as_out_${tmpId}.webp`);
    try {
        await fs.writeFile(inPath, buffer);
        await execFileAsync('ffmpeg', ['-y', '-i', inPath, '-t', String(MAX_DURATION), '-vf', `fps=10,scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1`, '-c:v', 'libwebp', '-lossless', '0', '-compression_level', '6', '-q:v', '50', '-loop', '0', '-preset', 'picture', '-an', '-vsync', '0', outPath]);
        return await fs.readFile(outPath);
    } finally {
        await fs.unlink(inPath).catch(() => {}); await fs.unlink(outPath).catch(() => {});
    }
}

async function imageBufferToWebp(buffer) {
    try {
        const sharp = (await import('sharp')).default;
        return await sharp(buffer, { animated: true }).rotate().resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 82 }).toBuffer();
    } catch {
        return buffer;
    }
}

async function buildStickerWithExif(buffer, kind, packname, author) {
    let rawWebp = buffer;
    if (kind === 'video') rawWebp = await videoBufferToAnimatedWebp(buffer);
    else if (kind === 'image') rawWebp = await imageBufferToWebp(buffer);
    return await addStickerExif(rawWebp, packname, author);
}

async function convertToOggOpus(buffer, ext = 'mp3') {
    const tmpId = randomBytes(6).toString('hex');
    const inPath = path.join(os.tmpdir(), `ptt_in_${tmpId}.${ext}`);
    const outPath = path.join(os.tmpdir(), `ptt_out_${tmpId}.ogg`);
    try {
        await fs.writeFile(inPath, buffer);
        await execFileAsync('ffmpeg', ['-y', '-i', inPath, '-vn', '-map', '0:a:0', '-t', String(MAX_DURATION), '-af', 'aresample=48000:async=1:first_pts=0', '-c:a', 'libopus', '-b:a', '48k', '-vbr', 'on', '-compression_level', '10', '-ac', '1', '-ar', '48000', '-application', 'audio', '-avoid_negative_ts', 'make_zero', '-f', 'ogg', outPath]);
        const oggBuffer = await fs.readFile(outPath);
        return { oggBuffer };
    } finally {
        await fs.unlink(inPath).catch(() => {}); await fs.unlink(outPath).catch(() => {});
    }
}

async function buildAudioMessageFromBuffer(client, buffer, ext, fallbackSeconds = 0) {
    const { oggBuffer } = await convertToOggOpus(buffer, ext);
    const { audioMessage } = await prepareWAMessageMedia({ audio: oggBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { upload: client.waUploadToServer });
    audioMessage.seconds = Math.max(1, Math.min(MAX_DURATION, Math.round(fallbackSeconds || 5)));
    audioMessage.ptt = true;
    audioMessage.mimetype = 'audio/ogg; codecs=opus';
    const wf = Buffer.alloc(64);
    for (let i = 0; i < 64; i++) wf[i] = 18 + ((i * 11) % 76);
    audioMessage.waveform = wf;
    return audioMessage;
}

async function sendCombinedAudioSticker(client, chat, stickerBuffer, isAnimated, audioMsg) {
    await ensurePatched();
    const prepared = await prepareWAMessageMedia({ sticker: stickerBuffer, isAnimated }, { upload: client.waUploadToServer });
    prepared.stickerMessage.isAnimated = Boolean(isAnimated);
    prepared.stickerMessage.audioMessage = audioMsg;

    const payload = {
        __proto__: prepared,
        audioStickerMessage: { message: prepared },
        messageContextInfo: { messageSecret: randomBytes(32) }
    };
    await client.relayMessage(chat, payload, {});
}

// ══════════════════════════════════════════════════════════════════
// LÓGICA DEL COMANDO
// ══════════════════════════════════════════════════════════════════
export default {
    command: ["audiosticker", "sa", "sticker-audio"],
    category: "stickers",
    execute: async (ctx) => {
        const { sock, from, m, args = [], enviartexto, config = {}, comando } = ctx || {};
        if (!sock || !from || !m) return; 

        const p = (config.prefix && config.prefix[0]) || '.';
        const cmd = comando || "audiosticker";
        
        const client = sock;
        const react = async (emoji) => {
            if (client?.sendMessage) await client.sendMessage(from, { react: { text: emoji, key: m.key } }).catch(() => {});
        };

        const key = getSessionKey(m, from);
        const activeSession = sessions.get(key);
        const rawText = String(args.join(" ")).trim();

        // Cancelar
        if (/^(cancelar|batal|cancel|stop)$/i.test(rawText)) {
            if (!activeSession) return enviartexto('⚠️ No hay sesión activa.');
            clearUserSession(key);
            await react('✅');
            return enviartexto('✅ Sesión cancelada.');
        }

        const ownInfo = detectMediaInfo(m);
        const quoted = m.quoted;
        const quotedInfo = detectMediaInfo(quoted);

        const hasOwnVisual = ['video', 'image', 'webp'].includes(ownInfo.kind);
        const hasQuotedVisual = ['video', 'image', 'webp'].includes(quotedInfo.kind);
        const hasOwnAudio = ownInfo.kind === 'audio';
        const hasQuotedAudio = quotedInfo.kind === 'audio';

        // 1. Unir Audio (Solo si estamos en sesión y envían el audio)
        if (activeSession && !activeSession.processing && (hasOwnAudio || hasQuotedAudio) && !hasOwnVisual) {
            const targetAudioNode = hasOwnAudio ? m : quoted;
            const targetAudioInfo = hasOwnAudio ? ownInfo : quotedInfo;
            
            activeSession.processing = true;
            await react('⏳');
            
            try {
                const audioBuf = await downloadBuffer(targetAudioNode, targetAudioInfo, client);
                if (!audioBuf) throw new Error('No se pudo descargar el audio.');

                const ext = targetAudioInfo.kind === 'video' ? 'mp4' : /ogg|opus/i.test(targetAudioInfo.mime) ? 'ogg' : /mp4|m4a|aac/i.test(targetAudioInfo.mime) ? 'm4a' : 'mp3';
                const audioMsg = await buildAudioMessageFromBuffer(client, audioBuf, ext, targetAudioInfo.seconds);

                await sendCombinedAudioSticker(client, from, activeSession.stickerBuffer, activeSession.isAnimated, audioMsg);
                clearUserSession(key);
                await react('✅');
            } catch (err) {
                activeSession.processing = false;
                await react('❌');
                await enviartexto(`❌ Error al unir el audio: ${err.message}`);
            }
            return;
        }

        // 2. Procesar Video o Imagen
        if (hasOwnVisual || hasQuotedVisual) {
            const targetNode = hasOwnVisual ? m : quoted;
            const targetInfo = hasOwnVisual ? ownInfo : quotedInfo;
            
            await react('🕒');
            try {
                const mediaBuf = await downloadBuffer(targetNode, targetInfo, client);
                if (!mediaBuf) throw new Error("No se pudo descargar la imagen/video.");

                const userDb = global.db?.data?.users?.[ctx.sender] || {};
                const packname = userDb.metadatos || 'Ado-Bot';
                const author = userDb.metadatos2 || 'Sergio Dev';
                
                const stickerBuffer = await buildStickerWithExif(mediaBuf, targetInfo.kind, packname, author);
                const isAnimated = targetInfo.kind === 'video' || targetInfo.isAnimated;

                // ⚡ SI ES UN VIDEO: Extraemos su audio automáticamente y enviamos al instante
                if (targetInfo.kind === 'video') {
                    try {
                        const { oggBuffer } = await convertToOggOpus(mediaBuf, 'mp4');
                        const { audioMessage } = await prepareWAMessageMedia({ audio: oggBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { upload: client.waUploadToServer });
                        
                        audioMessage.seconds = Math.max(1, Math.min(MAX_DURATION, Math.round(targetInfo.seconds || 5)));
                        audioMessage.ptt = true;
                        audioMessage.mimetype = 'audio/ogg; codecs=opus';
                        const wf = Buffer.alloc(64);
                        for (let i = 0; i < 64; i++) wf[i] = 18 + ((i * 11) % 76);
                        audioMessage.waveform = wf;

                        await sendCombinedAudioSticker(client, from, stickerBuffer, isAnimated, audioMessage);
                        await react('✅');
                        return; // Terminamos, no hacemos sesión
                    } catch (audioErr) {
                        console.error('[AUDIOSTICKER] Fallo al extraer audio del video:', audioErr);
                        await client.sendMessage(from, { sticker: stickerBuffer }, { quoted: m });
                        await react('⚠️');
                        return enviartexto("⚠️ Se envió el sticker, pero no se pudo extraer el audio del video.");
                    }
                }

                // 📸 SI ES UNA IMAGEN: Iniciamos la sesión de 60s para pedir el audio
                clearUserSession(key);
                const timer = setTimeout(() => {
                    if (sessions.has(key)) {
                        sessions.delete(key);
                        client.sendMessage(from, { text: `⏰ *TIEMPO AGOTADO*\n> Los ${SESSION_SECONDS} segundos pasaron. Vuelve a enviar la imagen.` }, { quoted: m }).catch(() => {});
                    }
                }, SESSION_SECONDS * 1000);

                sessions.set(key, { stickerBuffer, isAnimated, packname, author, expiresAt: Date.now() + SESSION_SECONDS * 1000, processing: false, timer });

                await react('✅');
                return enviartexto(
                    `✦ *SESIÓN DE STICKER CON AUDIO ACTIVA* ✦\n\n` +
                    `> La imagen se guardó. Envía un *Audio / Nota de Voz* para unirlo.\n` +
                    `> ⏳ Tienes *${SESSION_SECONDS} segundos*.\n` +
                    `> ❌ Escribe *${p}${cmd} cancelar* para abortar.`
                );

            } catch (e) {
                await react('❌');
                return enviartexto(`⚠️ Error: ${e.message}`);
            }
        }

        // 3. Ayuda
        return enviartexto(
            `🎵 *STICKER CON AUDIO*\n\n` +
            `> 1. Envía un *Video* con *${p}${cmd}* para extraer su audio automáticamente.\n` +
            `> 2. O envía una *Imagen* con *${p}${cmd}* y luego mándale un audio.\n` +
            `> _Máximo de audio: 25s._`
        );
    }
};