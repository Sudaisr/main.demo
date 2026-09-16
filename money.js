/**
 * Bright Star Tailor - Payments & Private Money Ledger
 * Payment capture and owner-only totals/cost/profit editing.
 */
"use strict";

  function moneyManagerRow(order) {
    const total = Number(order.totalAmount) || 0;
    const paid = Number(order.paidAmount) || 0;
    const cost = Number(order.costAmount) || 0;
    const due = Math.max(0, total - paid);
    const profit = total - cost;
    return `
      <article class="money-record-row">
        <div class="money-customer"><span class="avatar">${safe((order.customerName || "گ").trim().charAt(0) || "گ")}</span><div><strong>${safe(order.customerName || "بے نام")}</strong><small>رسید ${safe(order.receiptNo)} ${order.phone ? `— ${phoneLink(order.phone)}` : ""}</small></div></div>
        <div><small>کل رقم</small><strong>${safe(formatMoney(total))}</strong></div>
        <div class="received"><small>وصول</small><strong>${safe(formatMoney(paid))}</strong></div>
        <div class="due"><small>بقایا</small><strong>${safe(formatMoney(due))}</strong></div>
        <div class="profit"><small>منافع</small><strong class="${profit < 0 ? "amount-due" : ""}">${safe(formatMoney(profit))}</strong></div>
        <button type="button" class="private-money-button" data-action="money" data-id="${safe(order.id)}">🔒 حساب کھولیں</button>
      </article>`;
  }

  function renderMoneyManager() {
    if (accessMode !== "owner") return;
    const query = byId("moneySearch").value.trim().toLowerCase();
    const orders = [...database.orders]
      .filter((order) => {
        const haystack = `${order.customerName} ${order.phone} ${order.receiptNo}`.toLowerCase();
        return !query || haystack.includes(query);
      })
      .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
    const total = database.orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
    const received = database.orders.reduce((sum, order) => sum + (Number(order.paidAmount) || 0), 0);
    const cost = database.orders.reduce((sum, order) => sum + (Number(order.costAmount) || 0), 0);
    const due = database.orders.reduce((sum, order) => sum + getDue(order), 0);
    const profit = total - cost;
    byId("moneyTotalAmount").textContent = formatMoney(total);
    byId("moneyTotalReceived").textContent = formatMoney(received);
    byId("moneyTotalDue").textContent = formatMoney(due);
    byId("moneyTotalCost").textContent = formatMoney(cost);
    byId("moneyTotalProfit").textContent = formatMoney(profit);
    byId("moneyTotalProfit").classList.toggle("amount-due", profit < 0);
    byId("moneyList").innerHTML = orders.length
      ? orders.map(moneyManagerRow).join("")
      : emptyState("کوئی حساب موجود نہیں", "پہلے پیمائش کا نیا ریکارڈ محفوظ کریں، پھر یہاں رقم درج کریں۔");
  }


  function openPayment(id) {
    if (accessMode !== "owner") {
      showToast("رقم کا حساب صرف Owner Login میں کھل سکتا ہے۔", "error");
      return;
    }
    const order = database.orders.find((item) => item.id === id);
    if (!order) return;
    closeModal("detailModal");
    byId("paymentForm").reset();
    byId("paymentOrderId").value = order.id;
    byId("paymentCustomer").textContent = `${order.customerName} — رسید نمبر ${order.receiptNo}`;
    byId("paymentDue").textContent = formatMoney(getDue(order));
    byId("paymentAmount").max = String(getDue(order));
    byId("paymentDate").value = todayIso();
    openModal("paymentModal");
  }

  async function submitPayment(event) {
    event.preventDefault();
    if (accessMode !== "owner") {
      showToast("ادائیگی صرف Owner Login میں محفوظ ہوسکتی ہے۔", "error");
      return;
    }
    const order = database.orders.find((item) => item.id === value("paymentOrderId"));
    if (!order) return;
    const amount = Number(byId("paymentAmount").value) || 0;
    const due = getDue(order);
    if (amount <= 0 || amount > due) {
      showToast(`رقم ایک روپے سے ${formatMoney(due)} تک ہونی چاہیے۔`, "error");
      return;
    }
    order.paidAmount = (Number(order.paidAmount) || 0) + amount;
    order.payments = Array.isArray(order.payments) ? order.payments : [];
    order.payments.push({ id: createId(), amount, date: value("paymentDate"), note: value("paymentNote") || "اضافی ادائیگی" });
    order.updatedAt = new Date().toISOString();
    const fullySaved = await saveDatabase();
    closeModal("paymentModal");
    renderDashboard();
    renderStatusManager();
    renderOrders();
    renderCompletedOrders();
    renderMoneyManager();
    showToast(fullySaved ? "ادائیگی MySQL میں محفوظ ہوگئی۔" : "Payment browser میں موجود ہے، MySQL save ناکام ہے۔", fullySaved ? "success" : "error");
  }

  function updateMoneyPreview() {
    const total = Number(byId("moneyTotalInput").value) || 0;
    const cost = Number(byId("moneyCostInput").value) || 0;
    const paid = Number(byId("moneyPaidInput").value) || 0;
    byId("moneyDuePreview").textContent = formatMoney(Math.max(0, total - paid));
    byId("moneyProfitPreview").textContent = formatMoney(total - cost);
    byId("moneyProfitPreview").classList.toggle("amount-due", cost > total);
  }

  function openMoneyManager(id) {
    if (accessMode !== "owner") {
      showToast("نجی حساب صرف Owner Login میں دستیاب ہے۔", "error");
      return;
    }
    const order = database.orders.find((item) => item.id === id);
    if (!order) return;
    byId("moneyForm").reset();
    byId("moneyOrderId").value = order.id;
    byId("moneyCustomer").textContent = `${order.customerName} — رسید نمبر ${order.receiptNo}`;
    byId("moneyTotalInput").value = Number(order.totalAmount) || 0;
    byId("moneyCostInput").value = Number(order.costAmount) || 0;
    byId("moneyPaidInput").value = Number(order.paidAmount) || 0;
    updateMoneyPreview();
    openModal("moneyModal");
  }

  async function submitMoneyManager(event) {
    event.preventDefault();
    if (accessMode !== "owner") {
      showToast("نجی حساب صرف Owner محفوظ کرسکتا ہے۔", "error");
      return;
    }
    const order = database.orders.find((item) => item.id === value("moneyOrderId"));
    if (!order) return;
    const total = Math.max(0, Number(byId("moneyTotalInput").value) || 0);
    const cost = Math.max(0, Number(byId("moneyCostInput").value) || 0);
    const paid = Math.max(0, Number(byId("moneyPaidInput").value) || 0);
    if (paid > total) {
      showToast("وصول رقم کل رقم سے زیادہ نہیں ہوسکتی۔", "error");
      return;
    }
    const previousPaid = Number(order.paidAmount) || 0;
    const adjustment = paid - previousPaid;
    order.totalAmount = total;
    order.costAmount = cost;
    order.paidAmount = paid;
    order.payments = Array.isArray(order.payments) ? order.payments : [];
    if (adjustment !== 0) {
      order.payments.push({
        id: createId(),
        amount: adjustment,
        date: todayIso(),
        note: adjustment > 0 ? "نجی حساب میں وصولی" : "Owner کی حسابی تصحیح"
      });
    }
    order.updatedAt = new Date().toISOString();
    const fullySaved = await saveDatabase();
    closeModal("moneyModal");
    renderDashboard();
    renderOrders();
    renderCompletedOrders();
    renderMoneyManager();
    showToast(fullySaved ? "نجی حساب MySQL میں محفوظ ہوگیا۔" : "حساب browser میں محفوظ ہے، MySQL save ناکام ہے۔", fullySaved ? "success" : "error");
  }
