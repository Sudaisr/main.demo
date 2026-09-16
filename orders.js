/**
 * Bright Star Tailor - Orders List & Lifecycle
 * All-orders / status / completed lists, edit, delete, status changes, detail view.
 */
"use strict";

  function filteredOrders() {
    const query = byId("orderSearch").value.trim().toLowerCase();
    const filter = byId("statusFilter").value;
    return [...database.orders]
      .filter((order) => filter === "all" || order.status === filter)
      .filter((order) => {
        const haystack = `${order.customerName} ${order.phone} ${order.receiptNo} ${order.address}`.toLowerCase();
        return !query || haystack.includes(query);
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function renderOrders() {
    const orders = filteredOrders();
    byId("ordersList").innerHTML = orders.length
      ? orders.map((order) => orderRow(order)).join("")
      : emptyState("کوئی ریکارڈ نہیں ملا", "تلاش کے الفاظ یا منتخب حالت تبدیل کرکے دوبارہ دیکھیں۔");
  }

  function statusUpdateRow(order) {
    const states = ["pending", "ready", "packed", "delivered"];
    const canUpdateStatus = accessMode !== "worker" || (workerAccess?.permission === "status" && workerAccessIsValid());
    return `
      <article class="status-update-row" data-record-id="${safe(order.id)}">
        <div class="status-order-copy">
          <div class="avatar">${safe((order.customerName || "گ").trim().charAt(0) || "گ")}</div>
          <div><strong>${safe(order.customerName || "بے نام")}</strong><small>رسید ${safe(order.receiptNo)} ${order.phone ? `— ${phoneLink(order.phone)}` : ""}</small></div>
        </div>
        <div class="status-choice-grid">
          ${states.map((status) => `<button type="button" class="status-choice ${status} ${order.status === status ? "active" : ""}" data-action="set-status" data-status="${status}" data-id="${safe(order.id)}" ${order.status === status || !canUpdateStatus ? "disabled" : ""}>${order.status === status ? "✓ " : ""}${statusLabels[status]}</button>`).join("")}
        </div>
      </article>`;
  }

  function renderStatusManager() {
    const query = byId("statusSearch").value.trim().toLowerCase();
    const orders = [...database.orders]
      .filter((order) => {
        const haystack = `${order.customerName} ${order.phone} ${order.receiptNo} ${order.address}`.toLowerCase();
        return !query || haystack.includes(query);
      })
      .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
    byId("statusPendingCount").textContent = formatNumber(database.orders.filter((order) => order.status === "pending").length);
    byId("statusReadyCount").textContent = formatNumber(database.orders.filter((order) => order.status === "ready").length);
    byId("statusPackedCount").textContent = formatNumber(database.orders.filter((order) => order.status === "packed").length);
    byId("statusDeliveredCount").textContent = formatNumber(database.orders.filter((order) => order.status === "delivered").length);
    byId("statusResults").innerHTML = orders.length
      ? orders.map(statusUpdateRow).join("")
      : emptyState("کوئی آرڈر نہیں ملا", "رسید نمبر یا گاہک کا نام دوبارہ لکھیں۔");
  }

  function renderCompletedOrders() {
    const query = byId("completedSearch").value.trim().toLowerCase();
    const completedOrders = [...database.orders]
      .filter((order) => order.status === "delivered")
      .filter((order) => {
        const haystack = `${order.customerName} ${order.phone} ${order.receiptNo} ${order.address}`.toLowerCase();
        return !query || haystack.includes(query);
      })
      .sort((a, b) => String(b.deliveredAt || b.updatedAt || b.createdAt).localeCompare(String(a.deliveredAt || a.updatedAt || a.createdAt)));
    byId("completedList").innerHTML = completedOrders.length
      ? completedOrders.map((order) => orderRow(order, { allowDelete: false })).join("")
      : emptyState("ابھی کوئی مکمل آرڈر نہیں", "تیار آرڈر گاہک کو دینے کے بعد یہاں خودکار طور پر محفوظ ہوجائے گا۔");
  }


  function editOrder(id) {
    const order = database.orders.find((item) => item.id === id);
    if (!order) return;
    byId("orderForm").reset();
    byId("savedMeasurementPanel").hidden = true;
    byId("editingId").value = order.id;
    byId("formTitle").textContent = "آرڈر میں ترمیم کریں";
    byId("saveOrderButton").textContent = "✓ ترمیم محفوظ کریں";
    const simpleFields = ["receiptNo", "customerName", "phone", "address", "orderDate", "deliveryDate", "status", "notes"];
    simpleFields.forEach((key) => { byId(key).value = order[key] ?? ""; });
    Object.keys(measurementLabels).forEach((key) => { byId(key).value = order.measurements?.[key] ?? ""; });
    Object.keys(designLabels).forEach((key) => { setDesignValue(key, order.design?.[key] ?? ""); setKarigarValue(key, order.karigar?.[key] ?? ""); });
    byId("receiptPreview").textContent = order.receiptNo;
    navigate("new-order");
  }

  async function deleteOrder(id) {
    if (accessMode === "guest") {
      showToast("Guest Demo میں record تبدیل نہیں ہوسکتا۔", "error");
      return;
    }
    const order = database.orders.find((item) => item.id === id);
    if (!order) return;
    const confirmed = window.confirm(`کیا آپ واقعی ${order.customerName} کا رسید نمبر ${order.receiptNo} ختم کرنا چاہتے ہیں؟`);
    if (!confirmed) return;
    database.orders = database.orders.filter((item) => item.id !== id);
    const fullySaved = await saveDatabase();
    renderDashboard();
    renderStatusManager();
    renderOrders();
    renderCompletedOrders();
    renderMoneyManager();
    showToast(fullySaved ? "ریکارڈ MySQL سے ختم کردیا گیا۔" : "Browser copy بدلی ہے، MySQL save ناکام ہے۔", fullySaved ? "success" : "error");
  }

  async function setOrderStatus(id, nextStatus, navigateAfterDelivery = false) {
    if (accessMode === "guest") {
      showToast("Guest Demo میں status تبدیل نہیں ہوسکتا۔", "error");
      return;
    }
    if (accessMode === "worker" && (!workerAccessIsValid() || workerAccess?.permission !== "status")) {
      showToast("Owner نے status update کی اجازت نہیں دی یا اجازت کا وقت ختم ہوگیا ہے۔", "error");
      return;
    }
    const order = database.orders.find((item) => item.id === id);
    if (!order || !statusLabels[nextStatus] || order.status === nextStatus) return;
    if (nextStatus === "delivered") {
      const confirmed = window.confirm(`${order.customerName} کا سوٹ گاہک کو دے دیا گیا ہے؟ آرڈر مکمل شدہ ریکارڈ میں محفوظ ہوجائے گا۔`);
      if (!confirmed) return;
    }
    const now = new Date().toISOString();
    order.status = nextStatus;
    order.updatedAt = now;
    order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    order.statusHistory.push({ status: nextStatus, changedAt: now });
    if (nextStatus === "pending") {
      order.readyAt = null;
      order.packedAt = null;
      order.deliveredAt = null;
    }
    if (nextStatus === "ready") {
      order.readyAt = order.readyAt || now;
      order.packedAt = null;
      order.deliveredAt = null;
    }
    if (nextStatus === "packed") {
      order.readyAt = order.readyAt || now;
      order.packedAt = now;
      order.deliveredAt = null;
    }
    if (nextStatus === "delivered") {
      order.readyAt = order.readyAt || now;
      order.packedAt = order.packedAt || now;
      order.deliveredAt = now;
    }
    const fullySaved = await saveDatabase();
    closeModal("detailModal");
    renderDashboard();
    renderStatusManager();
    renderOrders();
    renderCompletedOrders();
    renderMoneyManager();
    if (nextStatus === "delivered" && navigateAfterDelivery) navigate("completed");
    const messages = {
      pending: "آرڈر دوبارہ زیرِ سلائی میں منتقل ہوگیا۔",
      ready: "سلائی مکمل ہوگئی—آرڈر تیار میں منتقل ہوگیا۔",
      packed: "تیار سوٹ پیک شدہ حالت میں منتقل ہوگیا۔",
      delivered: "آرڈر مکمل شدہ ریکارڈ میں محفوظ ہوگیا۔"
    };
    showToast(fullySaved ? messages[nextStatus] : "Status browser میں بدلا ہے، MySQL save ناکام ہے۔", fullySaved ? "success" : "error");
  }

  function advanceOrderStatus(id) {
    const order = database.orders.find((item) => item.id === id);
    if (!order || order.status === "delivered") return;
    const nextStatus = { pending: "ready", ready: "packed", packed: "delivered" }[order.status];
    if (nextStatus) setOrderStatus(id, nextStatus, true);
  }

  function showOrderDetail(id) {
    const order = database.orders.find((item) => item.id === id);
    if (!order) return;
    const due = getDue(order);
    const showFinancialDetails = accessMode === "owner";
    const designItems = Object.entries(designLabels).map(([key, label]) => `
      <div class="detail-item"><span>${safe(label)} — کٹر</span><strong>${safe(order.design?.[key] || "—")}</strong></div>
      <div class="detail-item"><span>${safe(label)} — کاریگر</span><strong>${safe(order.karigar?.[key] || "—")}</strong></div>`).join("");
    const payments = order.payments?.length
      ? order.payments.map((payment) => `<div class="payment-line"><span>${safe(formatDate(payment.date))} — ${safe(payment.note || "ادائیگی")}</span><strong>${safe(formatMoney(payment.amount))}</strong></div>`).join("")
      : `<div class="empty-state"><p>کوئی ادائیگی درج نہیں ہے۔</p></div>`;

    byId("detailContent").innerHTML = `
      <div class="detail-header">
        <div><span class="eyebrow">رسید نمبر ${safe(order.receiptNo)}</span><h2>${safe(order.customerName)}</h2><p>${order.phone ? phoneLink(order.phone) : safe("موبائل نمبر درج نہیں")} ${order.address ? `— ${safe(order.address)}` : ""}</p></div>
        ${statusBadge(order.status)}
      </div>
      <div class="detail-grid">
        <div class="detail-item"><span>آرڈر کی تاریخ</span><strong>${safe(formatDate(order.orderDate))}</strong></div>
        <div class="detail-item"><span>واپسی کی تاریخ</span><strong>${safe(formatDate(order.deliveryDate))}</strong></div>
        <div class="detail-item"><span>جوڑوں کی تعداد</span><strong>${safe(formatNumber(order.suitCount))}</strong></div>
        ${showFinancialDetails ? `<div class="detail-item"><span>کل رقم</span><strong>${safe(formatMoney(order.totalAmount))}</strong></div>
        <div class="detail-item"><span>کل لاگت</span><strong>${safe(formatMoney(order.costAmount))}</strong></div>
        <div class="detail-item"><span>متوقع منافع</span><strong class="amount-paid">${safe(formatMoney((Number(order.totalAmount) || 0) - (Number(order.costAmount) || 0)))}</strong></div>
        <div class="detail-item"><span>وصول رقم</span><strong class="amount-paid">${safe(formatMoney(order.paidAmount))}</strong></div>
        <div class="detail-item"><span>بقایا</span><strong class="amount-due">${safe(formatMoney(due))}</strong></div>` : ""}
        ${designItems}
      </div>
      <div class="detail-section"><h4>مکمل پیمائش</h4><table class="measurement-table"><tbody>
        ${measurementRows(order)}
      </tbody></table></div>
      <div class="detail-section"><h4>خصوصی ہدایات</h4><div class="detail-item">${safe(order.notes || "کوئی خصوصی ہدایت درج نہیں ہے۔")}</div></div>
      ${showFinancialDetails ? `<div class="detail-section"><h4>ادائیگی کی تفصیل</h4><div class="payment-history">${payments}</div></div>` : ""}
      <div class="detail-actions">
        ${order.status === "pending" ? `<button class="primary" data-action="advance-status" data-id="${safe(order.id)}">✓ سلائی مکمل — تیار کریں</button>` : ""}
        ${order.status === "ready" ? `<button class="primary" data-action="advance-status" data-id="${safe(order.id)}">▣ تیار سوٹ پیک کریں</button>` : ""}
        ${order.status === "packed" ? `<button class="primary" data-action="advance-status" data-id="${safe(order.id)}">✓ گاہک کو دیا — مکمل کریں</button>` : ""}
        ${accessMode === "owner" && due > 0 ? `<button class="primary" data-action="payment" data-id="${safe(order.id)}">نئی ادائیگی</button>` : ""}
        <button class="secondary" data-action="print-measurements" data-id="${safe(order.id)}">پیمائش پرنٹ کریں</button>
        ${accessMode === "owner" ? `<button class="secondary" data-action="print" data-id="${safe(order.id)}">نجی مالی رسید پرنٹ کریں</button>` : ""}
        ${accessMode === "owner" ? `<button class="secondary" data-action="edit" data-id="${safe(order.id)}">آرڈر میں ترمیم</button>` : ""}
      </div>`;
    openModal("detailModal");
  }

  function measurementRows(order) {
    const entries = Object.entries(measurementLabels);
    const rows = [];
    for (let index = 0; index < entries.length; index += 4) {
      const cells = entries.slice(index, index + 4).map(([key, label]) =>
        `<td><small>${safe(label)}</small><strong>${safe(order.measurements?.[key] || "—")}</strong></td>`
      );
      while (cells.length < 4) cells.push("<td></td>");
      rows.push(`<tr>${cells.join("")}</tr>`);
    }
    return rows.join("");
  }


  function handleRecordAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === "view") showOrderDetail(id);
    if (action === "payment") openPayment(id);
    if (action === "money") openMoneyManager(id);
    if (action === "print") printOrder(id);
    if (action === "print-measurements") printMeasurementCard(id);
    if (action === "advance-status") advanceOrderStatus(id);
    if (action === "set-status") setOrderStatus(id, button.dataset.status);
    if (action === "edit") {
      closeModal("detailModal");
      editOrder(id);
    }
    if (action === "delete") deleteOrder(id);
  }
