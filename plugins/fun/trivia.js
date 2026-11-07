const preguntas = [
  { q: "¿Quién pintó la Mona Lisa?", opciones: ["A) Vincent van Gogh", "B) Leonardo da Vinci", "C) Pablo Picasso"], a: "B" },
  { q: "¿Cuál es el planeta más grande del sistema solar?", opciones: ["A) Marte", "B) Saturno", "C) Júpiter"], a: "C" },
  { q: "¿En qué año cayó el Muro de Berlín?", opciones: ["A) 1989", "B) 1991", "C) 1975"], a: "A" },
  { q: "¿Cuál es el río más largo del mundo?", opciones: ["A) Amazonas", "B) Nilo", "C) Misisipi"], a: "B" },
  { q: "¿Quién escribió 'Cien años de soledad'?", opciones: ["A) Gabriel García Márquez", "B) Mario Vargas Llosa", "C) Pablo Neruda"], a: "A" },
  { q: "¿Cuál es el elemento químico con símbolo 'O'?", opciones: ["A) Oro", "B) Osmio", "C) Oxígeno"], a: "C" },
  { q: "¿Quién fue el primer hombre en pisar la Luna?", opciones: ["A) Yuri Gagarin", "B) Neil Armstrong", "C) Buzz Aldrin"], a: "B" }
];

export default {
  command: ["trivia", "pregunta"],
  execute: async (ctx) => {
    const { sender, enviartexto, db } = ctx;
    
    if (!db.users[sender]) db.users[sender] = {};

    // Elegir pregunta aleatoria
    const t = preguntas[Math.floor(Math.random() * preguntas.length)];
    
    // Guardar la respuesta correcta en la BD
    db.users[sender].trivia = t.a;

    const texto = `
┏━━━〔 🧠 𝐓𝐑𝐈𝐕𝐈𝐀 〕━━━┓
┃ ❓ *Pregunta:*
┃ ${t.q}
┃
┃ ${t.opciones.join('\n┃ ')}
┗━━━━━━━━━━━━━━━━━━━━━━━━┛
> Responde con *${ctx.config.prefix}responder A/B/C* o *${ctx.config.prefix}r A/B/C*
`.trim();

    await enviartexto(texto);
  }
};
