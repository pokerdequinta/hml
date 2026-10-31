/* ============================================================
   FIREBASE — POKER DE QUINTA
   Configuração pública do Realtime Database usada pelo site.
   Não coloque aqui chaves privadas, senhas ou dados sensíveis.
   ============================================================ */

window.PQ_FIREBASE = {
  enabled: true,

  /* Configuração web pública do projeto Firebase. */
  config: {
    apiKey: "AIzaSyD_XXjcjJYM73wLTTzpDgzKCOZnztcJhjE",
    authDomain: "poker-de-quinta.firebaseapp.com",
    databaseURL: "https://poker-de-quinta-default-rtdb.firebaseio.com",
    projectId: "poker-de-quinta",
    storageBucket: "poker-de-quinta.firebasestorage.app",
    messagingSenderId: "776724152456",
    appId: "1:776724152456:web:fbffde9a1c1a7628c61f3d",
  },

  /* Nó temporada: deve conter { config, etapas }. */
  seasonPath: "temporada2027",

  /* Nó público usado pela página oficial de confirmação. */
  liveConfigPath: "config",

  /* Mapa nome -> URL de foto já mantido no Firebase. */
  photosPath: "fotosJogadores",

  /* Usado como fallback somente quando o Firebase não tem /temporada2027. */
  season: "2027",
  cacheTtlMs: 5 * 60 * 1000,
};
