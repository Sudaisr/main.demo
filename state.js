/**
 * Bright Star Tailor - Local Database State
 * Load/save/normalize the app database in localStorage + worker access.
 */
"use strict";

  function normalizeDatabase(data) {
    const orders = Array.isArray(data?.orders) ? data.orders : [];
    const savedCounter = Number(data?.receiptCounter);
    return {
      ...data,
      version: 4,
      receiptCounter: Number.isInteger(savedCounter) && savedCounter > 0 ? savedCounter : 1,
      orders
    };
  }

  function loadDatabase() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.orders)) return normalizeDatabase(saved);
    } catch (error) {
      console.warn("محفوظ ریکارڈ پڑھا نہیں جا سکا۔", error);
    }
    return normalizeDatabase({ orders: [] });
  }

  function workerAccessIsValid() {
    return Boolean(workerAccess && Number(workerAccess.expiresAt) > Date.now());
  }

  function loadWorkerDatabase() {
    workerAccess = null;
    try {
      const saved = JSON.parse(localStorage.getItem(WORKER_STORAGE_KEY));
      if (saved?.access && saved?.database && Number(saved.access.expiresAt) > Date.now()) {
        workerAccess = saved.access;
        return normalizeDatabase(saved.database);
      }
      if (saved) localStorage.removeItem(WORKER_STORAGE_KEY);
    } catch (error) {
      console.warn("Student / Worker کا موصول ریکارڈ نہیں پڑھا جاسکا۔", error);
    }
    return normalizeDatabase({ orders: [] });
  }

  function expireWorkerAccessIfNeeded() {
    if (accessMode !== "worker" || !workerAccess || workerAccessIsValid()) return;
    localStorage.removeItem(WORKER_STORAGE_KEY);
    workerAccess = null;
    database = normalizeDatabase({ orders: [] });
    renderStatusManager();
    renderOrders();
    renderCompletedOrders();
    renderTransferCenter();
    navigate("transfer");
    showToast("Owner کی دی ہوئی اجازت کا وقت ختم ہوگیا ہے۔", "error");
  }

  async function saveDatabase() {
    if (accessMode === "owner") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
      try {
        const result = await queueServerDatabaseSave();
        const savedTime = new Intl.DateTimeFormat("ur-PK-u-nu-arabext", { hour: "numeric", minute: "2-digit" }).format(new Date());
        updateDatabaseSyncStatus("saved", `${formatNumber(result.order_count ?? database.orders.length)} records — ${savedTime}`);
        updateBackupFolderStatus(result.backup_written === false
          ? "MySQL محفوظ ہے، مگر XAMPP backup folder لکھا نہیں جاسکا"
          : `Auto backup محفوظ — ${savedTime}`, result.backup_written !== false);
        return true;
      } catch (error) {
        console.warn("MySQL database میں record محفوظ نہیں ہوسکا۔", error);
        updateDatabaseSyncStatus("error", error.message || "XAMPP میں Apache/MySQL چیک کریں");
        showToast("Record browser میں محفوظ ہے، مگر MySQL save ناکام ہے۔ XAMPP چیک کریں۔", "error");
        return false;
      }
    }
    if (accessMode === "worker" && workerAccess?.permission === "status" && workerAccessIsValid()) {
      localStorage.setItem(WORKER_STORAGE_KEY, JSON.stringify({ access: workerAccess, database }));
      return true;
    }
    return accessMode !== "guest";
  }
