/**
 * Bright Star Tailor - UI Primitives
 * Toasts, navigation, sidebar, modals, shared row renderers.
 */
"use strict";

  function showToast(message, type = "success") {
    const toast = byId("toast");
    toast.textContent = message;
    toast.classList.toggle("error", type === "error");
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function navigate(pageName) {
    const workerAllowedPages = new Set(["status", "orders", "completed", "transfer"]);
    if (accessMode === "worker" && !workerAllowedPages.has(pageName)) pageName = "transfer";
    if (pageName === "money" && accessMode !== "owner") pageName = accessMode === "worker" ? "transfer" : "dashboard";
    if (!pages[pageName]) return;
    document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach((button) => {
      button.classList.toggle("active", button.dataset.page === pageName);
    });
    byId(pages[pageName].element).classList.add("active");
    byId("pageTitle").textContent = pages[pageName].title;
    closeSidebar();
    if (pageName === "dashboard") renderDashboard();
    if (pageName === "status") renderStatusManager();
    if (pageName === "orders") renderOrders();
    if (pageName === "completed") renderCompletedOrders();
    if (pageName === "money") renderMoneyManager();
    if (pageName === "transfer") renderTransferCenter();
    if (pageName === "backup" && accessMode === "owner") void refreshServerBackupStatus();
    if (pageName === "new-order" && !byId("editingId").value) prepareNewForm();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openSidebar() {
    document.querySelector(".sidebar").classList.add("open");
    byId("sidebarOverlay").classList.add("open");
  }

  function closeSidebar() {
    document.querySelector(".sidebar").classList.remove("open");
    byId("sidebarOverlay").classList.remove("open");
  }

  function openModal(id) {
    const modal = byId(id);
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal(id) {
    const modal = byId(id);
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function emptyState(title, message) {
    return `<div class="empty-state"><div class="empty-icon">▤</div><h4>${safe(title)}</h4><p>${safe(message)}</p></div>`;
  }

  function statusBadge(status) {
    const validStatus = statusLabels[status] ? status : "pending";
    return `<span class="status-badge ${validStatus}">${statusLabels[validStatus]}</span>`;
  }

  function orderRow(order, options = {}) {
    const due = getDue(order);
    const initial = (order.customerName || "گ").trim().charAt(0) || "گ";
    const isWorker = accessMode === "worker";
    const isOwner = accessMode === "owner";
    const canUpdateStatus = !isWorker || (workerAccess?.permission === "status" && workerAccessIsValid());
    const showPayment = isOwner && options.showPayment !== false && due > 0;
    const allowEdit = isOwner && options.allowEdit !== false;
    const allowDelete = isOwner && options.allowDelete !== false;
    return `
      <article class="record-row" data-record-id="${safe(order.id)}">
        <div class="customer-cell">
          <div class="avatar">${safe(initial)}</div>
          <div><strong>${safe(order.customerName || "بے نام")}</strong><small>${order.phone ? phoneLink(order.phone) : safe("موبائل نمبر درج نہیں")}</small></div>
        </div>
        <div class="record-cell"><small>رسید نمبر</small><strong>${safe(order.receiptNo)}</strong></div>
        <div class="record-cell"><small>واپسی کی تاریخ</small><strong>${safe(formatDate(order.deliveryDate))}</strong></div>
        ${isOwner
          ? `<div class="record-cell"><small>بقایا</small><strong class="${due ? "amount-due" : "amount-paid"}">${safe(formatMoney(due))}</strong></div>`
          : `<div class="record-cell"><small>جوڑے</small><strong>${safe(formatNumber(order.suitCount || 1))}</strong></div>`}
        <div class="row-actions">
          ${statusBadge(order.status)}
          ${canUpdateStatus && order.status === "pending" ? `<button class="status-action-button ready-action" data-action="advance-status" data-id="${safe(order.id)}" title="سلائی مکمل کرکے تیار کریں">✓ تیار کریں</button>` : ""}
          ${canUpdateStatus && order.status === "ready" ? `<button class="status-action-button packed-action" data-action="advance-status" data-id="${safe(order.id)}" title="تیار سوٹ پیک کریں">▣ پیک کریں</button>` : ""}
          ${canUpdateStatus && order.status === "packed" ? `<button class="status-action-button delivered-action" data-action="advance-status" data-id="${safe(order.id)}" title="گاہک کو دے کر آرڈر مکمل کریں">✓ مکمل کریں</button>` : ""}
          <button class="icon-button" data-action="view" data-id="${safe(order.id)}" title="تفصیل دیکھیں">◉</button>
          ${showPayment ? `<button class="icon-button" data-action="payment" data-id="${safe(order.id)}" title="ادائیگی درج کریں">₨</button>` : ""}
          <button class="icon-button" data-action="print-measurements" data-id="${safe(order.id)}" title="پیمائش پرنٹ کریں">▣</button>
          ${isOwner ? `<button class="icon-button private-action" data-action="print" data-id="${safe(order.id)}" title="نجی مالی رسید پرنٹ کریں">₨</button>` : ""}
          ${allowEdit ? `<button class="icon-button" data-action="edit" data-id="${safe(order.id)}" title="ترمیم کریں">✎</button>` : ""}
          ${allowDelete ? `<button class="icon-button delete" data-action="delete" data-id="${safe(order.id)}" title="ریکارڈ ختم کریں">×</button>` : ""}
        </div>
      </article>`;
  }
