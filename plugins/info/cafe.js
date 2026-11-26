export default {
  command: ["cafe"],
  execute: async (ctx) => {
    const { enviartexto } = ctx;
    await enviartexto(`Toca tu Café ☕`);
  }
};