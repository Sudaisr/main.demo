/**
 * Bright Star Tailor - Server API Client
 * Talks to api.php, merges server/local state, tracks sync status.
 */
"use strict";

  async function sha256(value) {
    if (window.crypto?.subtle && typeof TextEncoder !== "undefined") {
      const bytes = new TextEncoder().encode(value);
      const digest = await window.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    return sha256Offline(value);
  }

  async function serverRequest(action, options = {}) {
    const response = await fetch(`${SERVER_API}?action=${encodeURIComponent(action)}`, {
      method: options.method || "GET",
      credentials: "same-origin",
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      keepalive: Boolean(options.keepalive)
    });
    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error("XAMPP/PHP server سے درست جواب نہیں ملا۔");
    }
    if (!response.ok || !result?.ok) throw new Error(result?.message || "MySQL database سے رابطہ نہیں ہوسکا۔");
    return result;
  }

  function mergeDatabaseStates(serverState, localState) {
    const server = normalizeDatabase(serverState);
    const local = normalizeDatabase(localState);
    const mergedOrders = new Map();
    [...server.orders, ...local.orders].forEach((order) => {
      if (!order || !order.id) return;
      const existing = mergedOrders.get(order.id);
      const incomingTime = Date.parse(order.updatedAt || order.createdAt || 0) || 0;
      const existingTime = existing ? (Date.parse(existing.updatedAt || existing.createdAt || 0) || 0) : -1;
      if (!existing || incomingTime >= existingTime) mergedOrders.set(order.id, order);
    });
    return normalizeDatabase({
      version: 4,
      receiptCounter: Math.max(Number(server.receiptCounter) || 1, Number(local.receiptCounter) || 1),
      orders: Array.from(mergedOrders.values())
    });
  }

  async function loginAndLoadServerDatabase() {
    await serverRequest("login", { method: "POST", body: { directOwner: true } });
    const loaded = await serverRequest("load");
    const localDatabase = loadDatabase();
    const serverDatabase = normalizeDatabase(loaded.state);
    const mergedDatabase = mergeDatabaseStates(serverDatabase, localDatabase);
    const recoveredLocalOrders = mergedDatabase.orders.length > serverDatabase.orders.length;
    if (!loaded.has_state || recoveredLocalOrders) {
      await serverRequest("save", {
        method: "POST",
        body: { state: mergedDatabase },
        keepalive: true
      });
    }
    return {
      database: mergedDatabase,
      migrated: recoveredLocalOrders,
      recoveredFromHistory: Boolean(loaded.recovered_from_history)
    };
  }

  function updateDatabaseSyncStatus(state, detail = "") {
    const dot = byId("databaseSyncDot");
    const title = byId("databaseSyncTitle");
    const description = byId("databaseSyncDetail");
    if (!dot || !title || !description) return;
    dot.classList.toggle("connected", state === "saved");
    dot.classList.toggle("error", state === "error");
    title.textContent = state === "saving" ? "MySQL میں محفوظ ہورہا ہے…"
      : state === "saved" ? "MySQL محفوظ ہے"
      : state === "error" ? "MySQL save ناکام"
      : "MySQL انتظار میں";
    description.textContent = detail || (state === "saved"
      ? "Database + XAMPP backup مکمل"
      : state === "error" ? "Browser copy موجود ہے—XAMPP چیک کریں" : "Owner Login کے بعد status دکھے گا");
  }

  function queueServerDatabaseSave(snapshot = JSON.parse(JSON.stringify(database))) {
    if (!serverDatabaseConnected) return Promise.resolve({ ok: true, localOnly: true });
    updateDatabaseSyncStatus("saving");
    const request = serverSaveQueue
      .catch(() => undefined)
      .then(() => serverRequest("save", {
        method: "POST",
        body: { state: snapshot },
        keepalive: true
      }));
    serverSaveQueue = request.catch(() => undefined);
    return request;
  }
