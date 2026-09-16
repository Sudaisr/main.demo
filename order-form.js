/**
 * Bright Star Tailor - New Order Form
 * Design picker, measurement form helpers, order submission.
 */
"use strict";

  function renderDesignPicker() {
    const container = byId("designPickerGrid");
    if (!container) return;
    container.innerHTML = Object.keys(designLabels).map((key) => `
      <div class="new-design-card">
        <img src="${safe(designImages[key])}" alt="${safe(designLabels[key])}" loading="lazy">
        <div class="design-field-row">
          <input id="${safe(key)}" maxlength="20" placeholder="لفظ لکھیں">
        </div>
        <div class="design-field-row">
          <input id="${safe(key)}_karigar" maxlength="20" placeholder="لفظ لکھیں">
        </div>
      </div>`).join("");
  }

  function prepareNewForm(force = false) {
    if (!force && byId("editingId").value) return;
    byId("orderForm").reset();
    byId("savedMeasurementPanel").hidden = true;
    byId("editingId").value = "";
    byId("formTitle").textContent = "نیا آرڈر درج کریں";
    byId("saveOrderButton").textContent = "✓ آرڈر محفوظ کریں";
    const receipt = generateReceiptNumber();
    byId("receiptNo").value = receipt;
    byId("receiptPreview").textContent = receipt;
    byId("orderDate").value = todayIso();
    byId("deliveryDate").value = addDays(todayIso(), 7);
    byId("status").value = "pending";
  }

  function value(id) {
    return byId(id).value.trim();
  }

  function designValue(key) {
    return byId(key)?.value.trim().slice(0, 20) || "";
  }

  function setDesignValue(key, selectedValue) {
    if (byId(key)) byId(key).value = String(selectedValue || "").slice(0, 20);
  }

  function karigarValue(key) {
    return byId(`${key}_karigar`)?.value.trim().slice(0, 20) || "";
  }

  function setKarigarValue(key, selectedValue) {
    if (byId(`${key}_karigar`)) byId(`${key}_karigar`).value = String(selectedValue || "").slice(0, 20);
  }

  function collectFormData(existing) {
    const measurements = {};
    Object.keys(measurementLabels).forEach((key) => { measurements[key] = value(key); });
    const design = {};
    const karigar = {};
    Object.keys(designLabels).forEach((key) => { design[key] = designValue(key); karigar[key] = karigarValue(key); });

    const now = new Date().toISOString();
    const newStatus = value("status");
    const payments = existing ? [...(existing.payments || [])] : [];

    return {
      id: existing ? existing.id : createId(),
      receiptNo: value("receiptNo"),
      customerName: value("customerName"),
      phone: value("phone"),
      address: value("address"),
      orderDate: value("orderDate"),
      deliveryDate: value("deliveryDate"),
      suitCount: existing ? Math.max(1, Number(existing.suitCount) || 1) : 1,
      status: newStatus,
      readyAt: newStatus === "ready" || newStatus === "packed" || newStatus === "delivered" ? (existing?.readyAt || now) : null,
      packedAt: newStatus === "packed" || newStatus === "delivered" ? (existing?.packedAt || now) : null,
      deliveredAt: newStatus === "delivered" ? (existing?.deliveredAt || now) : null,
      measurements,
      design,
      karigar,
      notes: value("notes"),
      totalAmount: existing ? Number(existing.totalAmount) || 0 : 0,
      costAmount: existing ? Number(existing.costAmount) || 0 : 0,
      paidAmount: existing ? Number(existing.paidAmount) || 0 : 0,
      payments,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (accessMode === "guest") {
      showToast("Guest Demo میں record save نہیں ہوتا۔ Owner Login استعمال کریں۔", "error");
      return;
    }
    const editId = value("editingId");
    const existingIndex = editId ? database.orders.findIndex((order) => order.id === editId) : -1;
    const existing = existingIndex >= 0 ? database.orders[existingIndex] : null;
    try {
      const order = collectFormData(existing);
      if (existing) database.orders.splice(existingIndex, 1, order);
      else {
        database.orders.push(order);
        const usedReceipt = Number(order.receiptNo);
        if (Number.isInteger(usedReceipt) && usedReceipt > 0) {
          database.receiptCounter = Math.max(Number(database.receiptCounter) || 1, usedReceipt + 1);
        }
      }
      const fullySaved = await saveDatabase();
      lastSavedOrderId = order.id;
      prepareNewForm(true);
      renderDashboard();
      renderStatusManager();
      renderOrders();
      renderCompletedOrders();
      renderMoneyManager();
      byId("savedMeasurementTitle").textContent = `${order.customerName} کی پیمائش محفوظ ہوگئی`;
      byId("savedMeasurementDetail").textContent = `رسید / سلپ نمبر ${order.receiptNo} — پرنٹ کے لیے نیچے بٹن دبائیں۔`;
      byId("savedMeasurementPanel").hidden = false;
      showToast(fullySaved
        ? (existing ? "آرڈر کی ترمیم MySQL میں محفوظ ہوگئی۔" : "نیا آرڈر MySQL میں محفوظ ہوگیا۔")
        : "Record browser میں موجود ہے، MySQL status سرخ ہے۔", fullySaved ? "success" : "error");
    } catch (error) {
      showToast(error.message || "آرڈر محفوظ نہیں ہوسکا۔", "error");
    }
  }
