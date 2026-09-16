/**
 * Bright Star Tailor - Offline Record Transfer
 * WhatsApp/file based owner<->worker record sharing without internet.
 */
"use strict";

  function encodeTransferCode(envelope) {
    return `BST1.${bytesToBase64(new TextEncoder().encode(JSON.stringify(envelope)))}`;
  }

  function decodeTransferCode(code) {
    const normalized = String(code || "").replace(/\s+/g, "");
    if (!normalized.startsWith("BST1.")) throw new Error(`یہ ${SHOP_NAME_EN} transfer code نہیں ہے۔`);
    return JSON.parse(base64ToText(normalized.slice(5)));
  }

  async function createSignedEnvelope(payload) {
    return { format: "bright-tailor-transfer-v1", payload, signature: await sha256(`${TRANSFER_SECRET}|${JSON.stringify(payload)}`) };
  }

  async function verifyTransferEnvelope(envelope) {
    if (envelope?.format !== "bright-tailor-transfer-v1" || !envelope.payload || !envelope.signature) return false;
    const expected = await sha256(`${TRANSFER_SECRET}|${JSON.stringify(envelope.payload)}`);
    return expected === envelope.signature;
  }

  function prepareOrderForTransfer(order, includeFinancials) {
    const shared = JSON.parse(JSON.stringify(order));
    shared.sharedFinancials = Boolean(includeFinancials);
    if (!includeFinancials) {
      shared.totalAmount = 0;
      shared.costAmount = 0;
      shared.paidAmount = 0;
      shared.payments = [];
    }
    return shared;
  }

  function showTransferOutput(envelope) {
    lastTransferEnvelope = envelope;
    byId("generatedTransferCode").value = encodeTransferCode(envelope);
    byId("transferOutputPanel").classList.add("visible");
  }

  function downloadTransferEnvelope(envelope) {
    const fileName = envelope.payload.type === "worker-return"
      ? `Bright-Tailor-Worker-Update-${Date.now()}.bstshare`
      : `Bright-Tailor-Shared-Records-${Date.now()}.bstshare`;
    const blob = new Blob([JSON.stringify(envelope)], { type: "application/json;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 30000);
  }

  async function shareTransferEnvelope(envelope) {
    showTransferOutput(envelope);
    const code = encodeTransferCode(envelope);
    const fileName = envelope.payload.type === "worker-return" ? "Bright-Tailor-Worker-Update.bstshare" : "Bright-Tailor-Records.bstshare";
    try {
      const file = new File([JSON.stringify(envelope)], fileName, { type: "application/json" });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: `${SHOP_NAME_EN} Records`, text: `${SHOP_NAME_EN} کا اجازت یافتہ record/backup`, files: [file] });
        return;
      }
      if (navigator.share && code.length < 50000) {
        await navigator.share({ title: `${SHOP_NAME_EN} Records`, text: code });
        return;
      }
      downloadTransferEnvelope(envelope);
      showToast("Transfer file تیار ہوگئی؛ اسے WhatsApp یا Bluetooth سے بھیجیں۔");
    } catch (error) {
      if (error?.name !== "AbortError") {
        downloadTransferEnvelope(envelope);
        showToast("Transfer file تیار ہوگئی؛ اسے WhatsApp یا Bluetooth سے بھیجیں۔");
      }
    }
  }

  async function copyTransferCode() {
    const code = byId("generatedTransferCode").value;
    if (!code) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(code);
      else {
        byId("generatedTransferCode").select();
        document.execCommand("copy");
      }
      showToast("Transfer code copy ہوگیا۔ اب WhatsApp میں paste کریں۔");
    } catch (error) {
      byId("generatedTransferCode").focus();
      byId("generatedTransferCode").select();
      showToast("Code منتخب ہوگیا؛ Copy دبائیں۔");
    }
  }

  async function createOwnerTransfer() {
    if (accessMode !== "owner") {
      showToast("صرف Owner نیا record share کرسکتا ہے۔", "error");
      return;
    }
    const scope = value("transferScope");
    const includeFinancials = false;
    const sourceOrders = scope === "selected"
      ? database.orders.filter((order) => selectedTransferOrderIds.has(order.id))
      : database.orders;
    if (!sourceOrders.length) {
      showToast(scope === "selected" ? "پہلے کم از کم ایک record منتخب کریں۔" : "Share کرنے کے لیے کوئی record موجود نہیں۔", "error");
      return;
    }
    const now = Date.now();
    const payload = {
      type: "owner-share",
      transferId: createId(),
      createdAt: now,
      expiresAt: now + Number(value("transferDuration")),
      permission: value("transferPermission"),
      scope,
      includeFinancials,
      receiptCounter: database.receiptCounter,
      orders: sourceOrders.map((order) => prepareOrderForTransfer(order, includeFinancials))
    };
    await shareTransferEnvelope(await createSignedEnvelope(payload));
  }

  function applyWorkerShare(payload) {
    workerAccess = {
      transferId: payload.transferId,
      permission: payload.permission,
      scope: payload.scope,
      includeFinancials: payload.includeFinancials,
      createdAt: payload.createdAt,
      expiresAt: payload.expiresAt
    };
    database = normalizeDatabase({ version: 3, receiptCounter: payload.receiptCounter, orders: payload.orders });
    localStorage.setItem(WORKER_STORAGE_KEY, JSON.stringify({ access: workerAccess, database }));
    document.body.classList.remove("guest-session");
    document.body.classList.add("worker-session");
    accessMode = "worker";
    byId("sessionModeLabel").textContent = "Student / Worker — Owner کا مشترکہ ریکارڈ";
    renderDashboard();
    renderStatusManager();
    renderOrders();
    renderCompletedOrders();
    renderMoneyManager();
    renderTransferCenter();
    navigate("status");
    showToast("Owner کا اجازت یافتہ record کامیابی سے کھل گیا۔");
  }

  async function mergeWorkerReturn(payload) {
    if (!window.confirm(`Student / Worker نے ${formatNumber(payload.orders.length)} record کی status update واپس بھیجی ہے۔ Owner record میں شامل کریں؟`)) return;
    let updated = 0;
    payload.orders.forEach((incoming) => {
      const order = database.orders.find((item) => item.id === incoming.id);
      if (!order || !statusLabels[incoming.status]) return;
      order.status = incoming.status;
      order.readyAt = incoming.readyAt || order.readyAt || null;
      order.packedAt = incoming.packedAt || order.packedAt || null;
      order.deliveredAt = incoming.deliveredAt || order.deliveredAt || null;
      order.statusHistory = Array.isArray(incoming.statusHistory) ? incoming.statusHistory : order.statusHistory;
      order.updatedAt = incoming.updatedAt || new Date().toISOString();
      updated += 1;
    });
    const fullySaved = await saveDatabase();
    renderDashboard();
    renderStatusManager();
    renderOrders();
    renderCompletedOrders();
    renderMoneyManager();
    showToast(fullySaved
      ? `${formatNumber(updated)} record کی update MySQL میں شامل ہوگئی۔`
      : "Worker update browser میں موجود ہے، MySQL save ناکام ہے۔", fullySaved ? "success" : "error");
  }

  async function importTransferEnvelope(envelope) {
    if (!(await verifyTransferEnvelope(envelope))) throw new Error("Transfer file/code درست یا محفوظ نہیں ہے۔");
    const payload = envelope.payload;
    if (payload.type === "owner-share") {
      if (Number(payload.expiresAt) <= Date.now()) throw new Error("Owner کی دی ہوئی اجازت کا وقت ختم ہوگیا ہے۔");
      if (!Array.isArray(payload.orders)) throw new Error("Transfer میں record موجود نہیں۔");
      if (accessMode === "owner") throw new Error("یہ Student / Worker کے لیے share package ہے۔ Worker Mode میں کھولیں۔");
      applyWorkerShare(payload);
      return;
    }
    if (payload.type === "worker-return") {
      if (accessMode !== "owner") throw new Error("Worker update صرف Owner Login میں وصول ہوسکتی ہے۔");
      await mergeWorkerReturn(payload);
      return;
    }
    throw new Error("یہ نامعلوم transfer package ہے۔");
  }

  async function receiveTransferCode() {
    try {
      await importTransferEnvelope(decodeTransferCode(value("receivedTransferCode")));
      byId("receivedTransferCode").value = "";
    } catch (error) {
      showToast(error.message || "Transfer code نہیں کھل سکا۔", "error");
    }
  }

  function importTransferFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = String(reader.result || "").trim();
        const envelope = text.startsWith("BST1.") ? decodeTransferCode(text) : JSON.parse(text);
        await importTransferEnvelope(envelope);
      } catch (error) {
        showToast(error.message || "Transfer file نہیں کھل سکی۔", "error");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  async function shareWorkerUpdates() {
    if (accessMode !== "worker" || !workerAccessIsValid()) {
      showToast("فعال Worker record موجود نہیں یا اجازت ختم ہوگئی ہے۔", "error");
      return;
    }
    const payload = {
      type: "worker-return",
      sourceTransferId: workerAccess.transferId,
      createdAt: Date.now(),
      orders: database.orders.map((order) => ({
        id: order.id,
        status: order.status,
        readyAt: order.readyAt || null,
        packedAt: order.packedAt || null,
        deliveredAt: order.deliveredAt || null,
        statusHistory: order.statusHistory || [],
        updatedAt: order.updatedAt
      }))
    };
    await shareTransferEnvelope(await createSignedEnvelope(payload));
  }

  function renderTransferOrderPicker() {
    const availableIds = new Set(database.orders.map((order) => order.id));
    selectedTransferOrderIds.forEach((id) => {
      if (!availableIds.has(id)) selectedTransferOrderIds.delete(id);
    });
    const query = value("transferRecordSearch").trim().toLowerCase();
    const visibleOrders = database.orders.filter((order) => {
      if (!query) return true;
      return [order.customerName, order.phone, order.receiptNo]
        .some((item) => String(item || "").toLowerCase().includes(query));
    });
    byId("transferOrderList").innerHTML = visibleOrders.length
      ? visibleOrders.map((order) => `
        <label class="transfer-record-option">
          <input type="checkbox" data-transfer-order-id="${safe(order.id)}" ${selectedTransferOrderIds.has(order.id) ? "checked" : ""}>
          <span class="transfer-record-copy"><strong>${safe(order.customerName)}</strong><small>رسید ${safe(order.receiptNo)}${order.phone ? ` • ${phoneLink(order.phone)}` : ""}</small></span>
          <b>${safe(statusLabels[order.status] || statusLabels.pending)}</b>
        </label>`).join("")
      : '<div class="transfer-picker-empty">کوئی record نہیں ملا</div>';
    const selectedCount = selectedTransferOrderIds.size;
    byId("transferSelectedCount").textContent = `${formatNumber(selectedCount)} منتخب`;
    byId("transferSelectAll").checked = Boolean(database.orders.length) && selectedCount === database.orders.length;
    byId("transferSelectAll").indeterminate = selectedCount > 0 && selectedCount < database.orders.length;
  }

  function toggleAllTransferRecords(event) {
    selectedTransferOrderIds.clear();
    if (event.target.checked) database.orders.forEach((order) => selectedTransferOrderIds.add(order.id));
    renderTransferOrderPicker();
    showToast(event.target.checked
      ? `${formatNumber(database.orders.length)} تمام محفوظ records منتخب ہوگئے۔`
      : "تمام records کا انتخاب ختم ہوگیا۔");
  }

  function toggleTransferRecord(event) {
    const checkbox = event.target.closest("[data-transfer-order-id]");
    if (!checkbox) return;
    if (checkbox.checked) selectedTransferOrderIds.add(checkbox.dataset.transferOrderId);
    else selectedTransferOrderIds.delete(checkbox.dataset.transferOrderId);
    renderTransferOrderPicker();
  }

  function renderTransferCenter() {
    renderTransferOrderPicker();
    byId("transferOrderField").hidden = value("transferScope") === "backup";
    byId("createTransferButton").textContent = value("transferScope") === "backup"
      ? "تمام ریکارڈ / Backup Share کریں"
      : "منتخب ریکارڈ Share کریں";
    const active = accessMode === "worker" && workerAccessIsValid();
    byId("workerAccessCard").classList.toggle("active", active);
    byId("returnUpdatesButton").hidden = accessMode !== "worker" || !active;
    if (active) {
      const expiry = new Intl.DateTimeFormat("ur-PK-u-nu-arabext", { dateStyle: "medium", timeStyle: "short" }).format(new Date(workerAccess.expiresAt));
      byId("workerAccessTitle").textContent = workerAccess.permission === "status" ? "Status update کی اجازت فعال ہے" : "صرف دیکھنے کی اجازت فعال ہے";
      byId("workerAccessDetail").textContent = `${formatNumber(database.orders.length)} record — اجازت ${expiry} تک`;
    } else {
      byId("workerAccessTitle").textContent = "کوئی فعال Worker record موجود نہیں";
      byId("workerAccessDetail").textContent = accessMode === "owner" ? "Worker کی واپس بھیجی update یہاں وصول کریں" : "Owner سے record یا backup لیں";
    }
  }
