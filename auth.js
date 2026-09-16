/**
 * Bright Star Tailor - Authentication & Session
 * Login screen flow, owner/guest/worker session modes.
 */
"use strict";

  function showLoginStep(stage) {
    loginStage = stage;
    const isNameStep = stage === "name";
    const isPasswordStep = stage === "password";
    byId("accessChoiceStep").classList.toggle("active", stage === "choice");
    byId("nameLoginStep").classList.toggle("active", isNameStep);
    byId("passwordLoginStep").classList.toggle("active", isPasswordStep);
    byId("loginProgress").classList.toggle("visible", stage !== "choice");
    byId("nameStepDot").classList.toggle("active", isNameStep);
    byId("passwordStepDot").classList.toggle("active", isPasswordStep);
    byId("loginError").textContent = "";
    const focusId = stage === "choice" ? "ownerLoginChoiceButton" : isNameStep ? "loginName" : "loginPassword";
    window.setTimeout(() => byId(focusId).focus(), 30);
  }

  function enterApp(mode) {
    accessMode = mode;
    database = mode === "owner" ? loadDatabase() : mode === "worker" ? loadWorkerDatabase() : normalizeDatabase({ orders: [] });
    document.body.classList.remove("locked");
    document.body.classList.add("authenticated");
    document.body.classList.toggle("owner-session", mode === "owner");
    document.body.classList.toggle("guest-session", mode === "guest");
    document.body.classList.toggle("worker-session", mode === "worker");
    byId("appShell").setAttribute("aria-hidden", "false");
    byId("sessionModeLabel").textContent = mode === "guest" ? "Guest Demo — save بند ہے"
      : mode === "worker" ? "Student / Worker — Owner کا مشترکہ ریکارڈ"
      : "مالک موڈ — ڈیٹا محفوظ ہے";
    const notice = byId("guestModeNotice");
    if (mode === "worker") notice.innerHTML = "<strong>Student / Worker Mode</strong><span>صرف Owner سے موصول ریکارڈ اور دی گئی اجازت استعمال ہوسکتی ہے۔</span>";
    else notice.innerHTML = "<strong>Guest Demo</strong><span>اس mode میں نیا record مستقل محفوظ نہیں ہوگا۔ مستقل کام کے لیے Owner Login کریں۔</span>";
    prepareNewForm(true);
    renderDashboard();
    renderStatusManager();
    renderOrders();
    renderCompletedOrders();
    renderMoneyManager();
    renderTransferCenter();
    navigate(mode === "worker" ? (workerAccess ? "status" : "transfer") : "dashboard");
  }

  function enterGuestMode() {
    byId("loginForm").reset();
    enterApp("guest");
  }

  function enterWorkerMode() {
    byId("loginForm").reset();
    enterApp("worker");
  }

  function exitSession() {
    const guestWasActive = accessMode === "guest";
    const ownerWasActive = accessMode === "owner";
    accessMode = null;
    serverDatabaseConnected = false;
    if (ownerWasActive) {
      void serverSaveQueue.finally(() => serverRequest("logout", { method: "POST" })).catch(() => undefined);
    }
    database = normalizeDatabase({ orders: [] });
    dashboardPeriod = "all";
    document.querySelectorAll(".modal.open").forEach((modal) => closeModal(modal.id));
    closeSidebar();
    document.body.classList.remove("authenticated", "owner-session", "guest-session", "worker-session");
    document.body.classList.add("locked");
    byId("appShell").setAttribute("aria-hidden", "true");
    byId("loginError").textContent = "";
    if (guestWasActive) console.info("مہمان کا عارضی ڈیٹا حذف کردیا گیا۔");
  }

  function denyLogin(message, focusId) {
    const error = byId("loginError");
    const card = document.querySelector(".login-card");
    error.textContent = message;
    card.classList.remove("login-denied");
    void card.offsetWidth;
    card.classList.add("login-denied");
    byId(focusId).focus();
  }

  async function nextLoginStep() {
    const button = byId("nextLoginButton");
    button.disabled = true;
    byId("loginError").textContent = "";
    try {
      const nameHash = await sha256(byId("loginName").value);
      if (nameHash !== OWNER_NAME_HASH) {
        denyLogin("نام غلط ہے۔", "loginName");
        return;
      }
      showLoginStep("password");
    } catch (loginError) {
      byId("loginError").textContent = "اس فون پر محفوظ لاگ اِن شروع نہیں ہوسکا۔";
    } finally {
      button.disabled = false;
    }
  }

  function backLoginStep() {
    byId("loginPassword").value = "";
    showLoginStep("name");
  }

  async function submitLogin(event) {
    event.preventDefault();
    const button = byId("loginButton");
    button.disabled = true;
    byId("loginError").textContent = "";
    try {
      const loaded = await loginAndLoadServerDatabase();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded.database));
      serverDatabaseConnected = true;
      enterApp("owner");
      byId("sessionModeLabel").textContent = "مالک موڈ — MySQL Database فعال ہے";
      updateDatabaseSyncStatus("saved", `${formatNumber(loaded.database.orders.length)} records محفوظ`);
      void refreshServerBackupStatus();
      showToast("Owner Login کامیاب ہوگیا۔");
    } catch (loginError) {
      serverDatabaseConnected = false;
      byId("loginError").textContent = loginError.message || "Owner Login شروع نہیں ہوسکا۔";
    } finally {
      button.disabled = false;
    }
  }
