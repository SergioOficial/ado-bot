import puppeteer from "puppeteer";
import os from "os";

export default {
  command: ["infobothtml", "botinfohtml", "infohtml"],
  category: "info",
  execute: async (ctx) => {
    const { sock, from, m, BOT_NAME, config } = ctx;

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

    // 1. Recopilar datos del sistema
    const uptime = process.uptime();
    const horas = Math.floor(uptime / 3600);
    const minutos = Math.floor((uptime % 3600) / 60);
    const ramTotal = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const ramLibre = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const ramUsada = (ramTotal - ramLibre).toFixed(2);
    const plataforma = os.platform();
    const nodeVersion = process.version;

    // 2. Crear el HTML con diseño
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #e2e8f0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          width: 100vw;
          padding: 20px;
        }
        .card {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid #334155;
          border-radius: 24px;
          padding: 30px;
          width: 500px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          text-align: center;
        }
        .avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #38bdf8, #818cf8);
          margin: 0 auto 15px auto;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 40px;
          font-weight: bold;
          color: white;
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.4);
        }
        h1 { font-size: 28px; color: #fff; margin-bottom: 5px; }
        .subtitle { font-size: 14px; color: #94a3b8; margin-bottom: 25px; }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          text-align: left;
        }
        .item {
          background: #1e293b;
          padding: 15px;
          border-radius: 12px;
          border: 1px solid #334155;
        }
        .item span { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .item strong { font-size: 16px; color: #38bdf8; }
        .footer { margin-top: 25px; font-size: 12px; color: #64748b; border-top: 1px solid #334155; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="avatar">🤖</div>
        <h1>${BOT_NAME || "Mi Bot"}</h1>
        <p class="subtitle">Información del Sistema</p>
        
        <div class="grid">
          <div class="item">
            <span>Prefijo</span>
            <strong>${config.prefix[0]}</strong>
          </div>
          <div class="item">
            <span>Uptime</span>
            <strong>${horas}h ${minutos}m</strong>
          </div>
          <div class="item">
            <span>RAM Usada</span>
            <strong>${ramUsada} GB</strong>
          </div>
          <div class="item">
            <span>RAM Total</span>
            <strong>${ramTotal} GB</strong>
          </div>
          <div class="item">
            <span>Plataforma</span>
            <strong>${plataforma}</strong>
          </div>
          <div class="item">
            <span>Node.js</span>
            <strong>${nodeVersion}</strong>
          </div>
        </div>

        <div class="footer">
          Generado dinámicamente por ${BOT_NAME || "el Bot"}
        </div>
      </div>
    </body>
    </html>
    `;

    let browser;
    try {
      // 3. Abrir navegador invisible y tomar la captura
      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
      });
      const page = await browser.newPage();
      
      // Le decimos al navegador que cargue el HTML
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      // Ajustamos el tamaño de la ventana para que quepa todo
      await page.setViewport({ width: 600, height: 500, deviceScaleFactor: 2 });

      // Tomamos la foto en formato Buffer
      const imageBuffer = await page.screenshot({ type: 'png' });

      // 4. Enviar la imagen a WhatsApp
      await sock.sendMessage(from, {
        image: imageBuffer,
        caption: `✨ *Aquí tienes la información del bot renderizada en HTML.*`
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("Error al generar el HTML:", e);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      
      // Plan B: Si Puppeteer falla (por límites de BotKeep), enviamos el HTML como archivo
      await sock.sendMessage(from, {
        document: Buffer.from(htmlContent, 'utf-8'),
        mimetype: 'text/html',
        fileName: 'info_bot.html',
        caption: '⚠️ No se pudo generar la imagen, pero aquí tienes el archivo HTML.'
      }, { quoted: m });
      
    } finally {
      if (browser) await browser.close();
    }
  }
};