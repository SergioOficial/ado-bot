export default {
  command: ["cafe", "café", "☕"],
  execute: async (ctx) => {
    const { enviartexto } = ctx;
    await enviartexto(`Toma tu Café ☕`);
  }
};