export default {
  command: ["restart", "reiniciar"],
  isOwner: true,
  execute: async (ctx) => {
    const { enviartexto } = ctx;
    
    await enviartexto("♻️ *Reiniciando el bot...*\n_Espera unos segundos._");
    
    // Esperar 2 segundos y cerrar el proceso. 
    // Si estás en BotKeep o PM2, se reiniciará solo. 
    // Si estás en Termux, se apagará y tendrás que encenderlo de nuevo.
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }
};
