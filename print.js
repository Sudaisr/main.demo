/**
 * Bright Star Tailor - Printing
 * Receipt + measurement-card print rendering.
 */
"use strict";

  function printOrder(id) {
    if (accessMode !== "owner") {
      showToast("مالی رسید صرف Owner Login میں پرنٹ ہوسکتی ہے۔", "error");
      return;
    }
    const order = database.orders.find((item) => item.id === id);
    if (!order) return;
    const shirtKeys = ["shirtLength", "shoulder", "sleeve", "neck", "chest", "hip", "waist", "shirtBottom"];
    const trouserKeys = ["trouserLength", "trouserBottom"];
    const measurementPrintTable = (keys) => `
      <table class="print-table">
        <thead><tr>${keys.map((key) => `<th>${safe(measurementLabels[key])}</th>`).join("")}</tr></thead>
        <tbody><tr>${keys.map((key) => `<td>${safe(order.measurements?.[key] || "—")}</td>`).join("")}</tr></tbody>
      </table>`;
    byId("printArea").innerHTML = `
      <div class="print-sheet">
        <header class="print-header">
          <img class="print-brand-logo" src="assets/bright-tailor-logo.jpg" alt="${safe(SHOP_NAME_EN)} logo">
          <h1>${safe(SHOP_NAME_UR)}</h1><p class="print-name-en">${safe(SHOP_NAME_EN)}</p>
          <p>نفیس سلائی، بہترین معیار</p>
          <small>⌖ ${safe(SHOP_ADDRESS_UR)}<br>${safe(SHOP_ADDRESS_EN)}</small>
          <div class="print-shop-contact"><span class="whatsapp-mark">WhatsApp</span><b>${safe(SHOP_WHATSAPP)}</b><img class="easypaisa-logo" src="assets/easypaisa-logo.svg" alt="easypaisa"><b>${safe(SHOP_EASYPAISA)}</b></div>
        </header>
        <div class="print-meta">
          <div><small>رسید نمبر</small><strong>${safe(order.receiptNo)}</strong></div>
          <div><small>گاہک کا نام</small><strong>${safe(order.customerName)}</strong></div>
          <div><small>موبائل نمبر</small><strong>${safe(order.phone || "—")}</strong></div>
          <div><small>پتہ</small><strong>${safe(order.address || "—")}</strong></div>
          <div><small>آرڈر کی تاریخ</small><strong>${safe(formatDate(order.orderDate))}</strong></div>
          <div><small>واپسی کی تاریخ</small><strong>${safe(formatDate(order.deliveryDate))}</strong></div>
          <div><small>جوڑوں کی تعداد</small><strong>${safe(formatNumber(order.suitCount))}</strong></div>
          <div><small>حالت</small><strong>${safe(statusLabels[order.status] || statusLabels.pending)}</strong></div>
          <div><small>پرنٹ کی تاریخ</small><strong>${safe(formatDate(todayIso()))}</strong></div>
        </div>
        <section class="print-section"><h3>قمیض کی پیمائش</h3>${measurementPrintTable(shirtKeys)}</section>
        <section class="print-section"><h3>شلوار کی پیمائش</h3>${measurementPrintTable(trouserKeys)}</section>
        <section class="print-section"><h3>خصوصی ہدایات</h3><div class="print-notes">${safe(order.notes || "—")}</div></section>
        <section class="print-section"><h3>ادائیگی</h3><table class="print-table"><thead><tr><th>کل رقم</th><th>وصول رقم</th><th>بقایا</th></tr></thead><tbody><tr><td>${safe(formatMoney(order.totalAmount))}</td><td>${safe(formatMoney(order.paidAmount))}</td><td>${safe(formatMoney(getDue(order)))}</td></tr></tbody></table></section>
        <footer class="print-footer"><span>گاہک کے دستخط: ________________</span><span>درزی کے دستخط: ________________</span><small>${safe(SHOP_NAME_EN)} • WhatsApp ${safe(SHOP_WHATSAPP)} • easypaisa ${safe(SHOP_EASYPAISA)}<br>${safe(SHOP_ADDRESS_EN)}</small></footer>
      </div>`;
    openPrintDialog(`${SHOP_NAME_EN} Receipt ${order.receiptNo}`);
  }

  function openPrintDialog(jobName) {
    if (window.AndroidBackup && typeof window.AndroidBackup.printPage === "function") {
      window.AndroidBackup.printPage(jobName || `${SHOP_NAME_EN} Print`);
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }

  function printMeasurementCard(id) {
    const order = database.orders.find((item) => item.id === id);
    if (!order) {
      showToast("پرنٹ کے لیے محفوظ پیمائش نہیں ملی۔", "error");
      return;
    }
    const measurementKeys = ["shirtLength", "shoulder", "sleeve", "neck", "chest", "hip", "waist", "shirtBottom", "trouserLength", "trouserBottom"];
    const measurementRows = measurementKeys.map((key, index) => `
      <tr>
        <td class="measure-number">${index + 1}</td>
        <td class="measure-name">${safe(measurementLabels[key])}</td>
        <td class="measure-value">${safe(order.measurements?.[key] || "")}</td>
      </tr>`).join("");
    const chosenDesignKeys = Object.keys(designLabels).filter((key) => order.design?.[key] || order.karigar?.[key]);
    const designSection = chosenDesignKeys.length ? `
      <section class="timer-designs">
        <div class="timer-designs-head">
          <span class="timer-designs-field">کٹر <b></b></span>
          <span class="timer-designs-field">کاریگر <b></b></span>
        </div>
        <div class="timer-design-grid">
          ${chosenDesignKeys.map((key) => `
            <div class="slip-design-item">
              <img class="print-design-image" src="${safe(designImages[key])}" alt="${safe(designLabels[key])}">
              <div>
                ${order.design?.[key] ? `<b>${safe(order.design[key])}</b>` : ""}
                ${order.karigar?.[key] ? `<b>${safe(order.karigar[key])}</b>` : ""}
              </div>
            </div>`).join("")}
        </div>
      </section>` : "";
    byId("printArea").innerHTML = `
      <div class="print-sheet measurement-print-sheet timer-gera-slip">
        <img class="dev-badge" src="assets/branding/sr-badge.png" alt="SR">
        <header class="timer-slip-header">
          <div class="timer-mobiles">
            <span>Mob:</span>
            <b>${safe(SHOP_MOBILE_1)}</b>
            <b>${safe(SHOP_MOBILE_2)}</b>
          </div>
          <div class="timer-main-title">
            <span class="timer-name-en">Bright Star Tailors</span>
            <span class="timer-name-arrow">↓</span>
            <span class="timer-name-place">Timergera</span>
          </div>
          <div class="timer-name-ur">${safe(SHOP_NAME_UR)}</div>
          <div class="timer-address"><b>${safe(SHOP_ADDRESS_UR)}</b></div>
        </header>
        <section class="timer-customer-meta">
          <label><span>سلپ نمبر</span><b>${safe(order.receiptNo)}</b></label>
          <label><span>نام</span><b>${safe(order.customerName)}</b></label>
          <label><span>تاریخ واپسی</span><b>${safe(formatDate(order.deliveryDate))}</b></label>
          <label><span>موبائل</span><b>${safe(order.phone || "")}</b></label>
        </section>
        <div class="timer-slip-content">
          <section class="timer-measurements">
            <table><tbody>${measurementRows}</tbody></table>
          </section>
          ${designSection}
        </div>
        <footer class="timer-slip-footer">
          <p class="timer-disclaimer">نوٹ: سلائی میں کسی قسم کا نقصان کا ذمہ دار کاریگر ہوگا۔</p>
          <div class="timer-signature">دستخط: ________________</div>
        </footer>
      </div>`;
    openPrintDialog(`${SHOP_NAME_EN} Measurements ${order.receiptNo}`);
  }
