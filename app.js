/**
 * Bright Star Tailor - App Bootstrap
 * Wires up all event listeners and starts the application.
 */
"use strict";

  function bindEvents() {
    byId("loginForm").addEventListener("submit", submitLogin);
    byId("exitSessionButton").addEventListener("click", exitSession);
    document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.page)));
    document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.go)));
    document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.close)));
    document.querySelectorAll(".modal").forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(modal.id); }));
    [byId("dashboardSearchResults"), byId("recentOrders"), byId("statusResults"), byId("ordersList"), byId("completedList"), byId("moneyList"), byId("detailContent")].forEach((container) => container.addEventListener("click", handleRecordAction));
    byId("menuButton").addEventListener("click", openSidebar);
    byId("sidebarOverlay").addEventListener("click", closeSidebar);
    byId("quickOrderButton").addEventListener("click", () => navigate("new-order"));
    byId("orderForm").addEventListener("submit", submitOrder);
    byId("paymentForm").addEventListener("submit", submitPayment);
    byId("moneyForm").addEventListener("submit", submitMoneyManager);
    [byId("moneyTotalInput"), byId("moneyCostInput"), byId("moneyPaidInput")].forEach((input) => input.addEventListener("input", updateMoneyPreview));
    byId("dashboardPeriodTabs").addEventListener("click", (event) => {
      const button = event.target.closest("[data-period]");
      if (!button) return;
      dashboardPeriod = button.dataset.period;
      renderDashboard();
    });
    byId("chartPeriodTabs").addEventListener("click", (event) => {
      const button = event.target.closest("[data-chart-period]");
      if (!button) return;
      chartPeriod = button.dataset.chartPeriod;
      renderProgressChart();
    });
    byId("dashboardSearch").addEventListener("input", renderDashboardSearch);
    byId("orderSearch").addEventListener("input", renderOrders);
    byId("statusSearch").addEventListener("input", renderStatusManager);
    byId("statusFilter").addEventListener("change", renderOrders);
    byId("completedSearch").addEventListener("input", renderCompletedOrders);
    byId("moneySearch").addEventListener("input", renderMoneyManager);
    byId("transferScope").addEventListener("change", renderTransferCenter);
    byId("transferRecordSearch").addEventListener("input", renderTransferOrderPicker);
    byId("transferSelectAll").addEventListener("change", toggleAllTransferRecords);
    byId("transferOrderList").addEventListener("change", toggleTransferRecord);
    byId("createTransferButton").addEventListener("click", createOwnerTransfer);
    byId("receiveTransferButton").addEventListener("click", receiveTransferCode);
    byId("transferFileInput").addEventListener("change", importTransferFile);
    byId("returnUpdatesButton").addEventListener("click", shareWorkerUpdates);
    byId("copyTransferCodeButton").addEventListener("click", copyTransferCode);
    byId("shareTransferAgainButton").addEventListener("click", () => {
      if (lastTransferEnvelope) shareTransferEnvelope(lastTransferEnvelope);
    });
    byId("resetFormButton").addEventListener("click", () => {
      if (window.confirm("کیا آپ فارم میں لکھی تمام معلومات صاف کرنا چاہتے ہیں؟")) prepareNewForm(true);
    });
    byId("printLastMeasurementButton").addEventListener("click", () => printMeasurementCard(lastSavedOrderId));
    byId("exportButton").addEventListener("click", exportBackup);
    byId("serverBackupNowButton").addEventListener("click", createServerBackupNow);
    byId("serverRestoreLatestButton").addEventListener("click", restoreLatestServerBackup);
    byId("importInput").addEventListener("change", importBackup);
    byId("clearDataButton").addEventListener("click", clearAllData);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") document.querySelectorAll(".modal.open").forEach((modal) => closeModal(modal.id));
    });
  }

  function initialize() {
    byId("todayDate").textContent = formatDate(todayIso(), true);
    renderDesignPicker();
    bindEvents();
    window.setInterval(expireWorkerAccessIfNeeded, 30000);
  }

  initialize();
