/* ============================================================
   FIREBASE — LEITURA PÚBLICA (REALTIME DATABASE REST)
   Sem SDK externo. Os dados são cacheados localmente para que
   o site continue útil quando estiver offline.
   ============================================================ */

(function () {
  "use strict";

  const settings = window.PQ_FIREBASE || {};
  const STORAGE_KEY = "pq2027-firebase-cache-v1";

  function endpoint(path) {
    if (!settings.config || !settings.config.databaseURL) return null;
    return `${settings.config.databaseURL.replace(/\/$/, "")}/${String(path).replace(/^\/|\/$/g, "")}.json`;
  }

  async function getJSON(path) {
    const url = endpoint(path);
    if (!url) return null;
    const response = await fetch(url, { cache: "no-store", credentials: "omit" });
    if (!response.ok) throw new Error(`Firebase ${path}: HTTP ${response.status}`);
    return response.json();
  }

  function readCache() {
    try {
      const cache = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!cache || !cache.savedAt || !cache.data) return null;
      return cache;
    } catch (error) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
    } catch (error) {
      /* Cache é um bônus; não bloqueia o site se o storage estiver cheio. */
    }
  }

  async function load(options = {}) {
    if (!settings.enabled) {
      return { enabled: false, season: null, liveConfig: null, photos: {}, source: "disabled" };
    }

    const cached = readCache();
    const ttl = Number(settings.cacheTtlMs) || 300000;
    if (!options.force && cached && Date.now() - cached.savedAt < ttl) {
      return { ...cached.data, source: "cache" };
    }

    try {
      const [seasonResult, configResult, photosResult] = await Promise.allSettled([
        getJSON(settings.seasonPath || "temporada2027"),
        getJSON(settings.liveConfigPath || "config"),
        getJSON(settings.photosPath || "fotosJogadores"),
      ]);

      const allFailed = [seasonResult, configResult, photosResult].every((result) => result.status === "rejected");
      if (allFailed && cached) return { ...cached.data, source: "cache-offline" };

      const previous = cached && cached.data ? cached.data : {};
      const data = {
        enabled: true,
        season: seasonResult.status === "fulfilled" ? seasonResult.value : previous.season || null,
        liveConfig: configResult.status === "fulfilled" ? configResult.value : previous.liveConfig || null,
        photos: photosResult.status === "fulfilled" && photosResult.value ? photosResult.value : previous.photos || {},
        fetchedAt: new Date().toISOString(),
      };

      writeCache(data);
      return { ...data, source: allFailed ? "cache-offline" : "network" };
    } catch (error) {
      if (cached) return { ...cached.data, source: "cache-offline" };
      return { enabled: true, season: null, liveConfig: null, photos: {}, source: "error", error: error.message };
    }
  }

  window.PQFirebase = {
    enabled: Boolean(settings.enabled),
    endpoint,
    load,
  };
})();
