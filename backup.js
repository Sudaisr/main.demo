/**
 * Bright Star Tailor - Backup & Restore
 * JSON export/import, server backup status, danger-zone data clear.
 */
"use strict";

  function createBackupPackage() {
    return {
      application: SHOP_NAME_UR,
      version: 4,
      exportedAt: new Date().toISOString(),
      receiptCounter: database.receiptCounter,
      orders: database.orders
    };
  }

  function exportBackup() {
    const packageData = createBackupPackage();
    const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: "application/json;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `برائٹ-سٹار-ٹیلرز-بیک-اپ-${todayIso()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    showToast("بیک اَپ فائل تیار ہوگئی۔");
  }

  function updateBackupFolderStatus(message, connected = false) {
    byId("backupFolderStatus").textContent = message;
    byId("backupFolderDot").classList.toggle("connected", connected);
  }

  async function refreshServerBackupStatus() {
    if (accessMode !== "owner" || !serverDatabaseConnected) return;
    try {
      const result = await serverRequest("backup-status");
      if (!result.backup_exists) {
        updateBackupFolderStatus("ابھی server backup نہیں بنا—پہلا order save کریں", false);
        return;
      }
      const time = result.updated_at
        ? new Intl.DateTimeFormat("ur-PK-u-nu-arabext", { dateStyle: "medium", timeStyle: "short" }).format(new Date(result.updated_at))
        : "موجود";
      updateBackupFolderStatus(`Server backup محفوظ — ${time}`, true);
    } catch (error) {
      updateBackupFolderStatus(error.message || "Server backup status نہیں ملا", false);
    }
  }

  async function createServerBackupNow() {
    if (accessMode !== "owner") return;
    const button = byId("serverBackupNowButton");
    button.disabled = true;
    try {
      const result = await serverRequest("backup-now", { method: "POST", body: {} });
      updateBackupFolderStatus("Server backup ابھی محفوظ ہوگیا", true);
      showToast(result.message || "Server backup محفوظ ہوگیا۔");
    } catch (error) {
      updateBackupFolderStatus("Server backup محفوظ نہیں ہوسکا", false);
      showToast(error.message || "Server backup محفوظ نہیں ہوسکا۔", "error");
    } finally {
      button.disabled = false;
    }
  }

  async function restoreLatestServerBackup() {
    if (accessMode !== "owner") return;
    if (!window.confirm("آخری XAMPP server backup سے موجودہ records بدل دیے جائیں؟")) return;
    const button = byId("serverRestoreLatestButton");
    button.disabled = true;
    try {
      const result = await serverRequest("restore-latest", { method: "POST", body: {} });
      database = normalizeDatabase(result.state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
      prepareNewForm(true);
      renderDashboard();
      renderStatusManager();
      renderOrders();
      renderCompletedOrders();
      renderMoneyManager();
      updateDatabaseSyncStatus("saved", `${formatNumber(database.orders.length)} records backup سے بحال`);
      updateBackupFolderStatus("آخری Server backup بحال ہوگیا", true);
      navigate("dashboard");
      showToast(`${formatNumber(database.orders.length)} records server backup سے بحال ہوگئے۔`);
    } catch (error) {
      showToast(error.message || "Server backup بحال نہیں ہوسکا۔", "error");
    } finally {
      button.disabled = false;
    }
  }


  function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!imported || !Array.isArray(imported.orders)) throw new Error("غلط فائل");
        const confirmed = window.confirm(`اس بیک اَپ میں ${formatNumber(imported.orders.length)} آرڈرز ہیں۔ موجودہ ڈیٹا بدل دیا جائے؟`);
        if (!confirmed) return;
        database = normalizeDatabase(imported);
        const fullySaved = await saveDatabase();
        prepareNewForm(true);
        renderDashboard();
        renderStatusManager();
        renderOrders();
        renderCompletedOrders();
        renderMoneyManager();
        showToast(fullySaved ? "بیک اَپ MySQL میں کامیابی سے بحال ہوگیا۔" : "Backup browser میں کھلا ہے، MySQL save ناکام ہے۔", fullySaved ? "success" : "error");
        navigate("dashboard");
      } catch (error) {
        showToast("یہ درست بیک اَپ فائل نہیں ہے۔", "error");
      } finally {
        event.target.value = "";
      }
    };
    reader.onerror = () => showToast("فائل پڑھی نہیں جا سکی۔", "error");
    reader.readAsText(file);
  }

  async function clearAllData() {
    const first = window.confirm("کیا آپ واقعی تمام آرڈرز، پیمائشیں اور ادائیگیاں ختم کرنا چاہتے ہیں؟");
    if (!first) return;
    const second = window.confirm("آخری تصدیق: یہ تمام ریکارڈ مستقل طور پر ختم کردے گا۔");
    if (!second) return;
    database = normalizeDatabase({ orders: [] });
    const fullySaved = await saveDatabase();
    prepareNewForm(true);
    renderDashboard();
    renderStatusManager();
    renderOrders();
    renderCompletedOrders();
    renderMoneyManager();
    showToast(fullySaved ? "تمام ریکارڈ MySQL سے ختم کردیے گئے۔" : "Browser data ختم ہے، مگر MySQL save ناکام ہے۔", fullySaved ? "success" : "error");
    navigate("dashboard");
  }
