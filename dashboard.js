/**
 * Bright Star Tailor - Dashboard Page
 * Search, stats chart, dashboard rendering.
 */
"use strict";

  function renderDashboardSearch() {
    const query = byId("dashboardSearch").value.trim().toLowerCase();
    const container = byId("dashboardSearchResults");
    if (!query) {
      container.innerHTML = "";
      container.classList.remove("visible");
      return;
    }
    const matches = [...database.orders]
      .filter((order) => `${order.customerName} ${order.phone} ${order.receiptNo}`.toLowerCase().includes(query))
      .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))
      .slice(0, 8);
    container.classList.add("visible");
    container.innerHTML = matches.length ? matches.map((order) => `
      <button type="button" class="dashboard-search-result" data-action="view" data-id="${safe(order.id)}">
        <span class="avatar">${safe((order.customerName || "گ").trim().charAt(0) || "گ")}</span>
        <span><strong>${safe(order.customerName || "بے نام")}</strong><small>رسید / سلپ ${safe(order.receiptNo)} ${order.phone ? `— ${phoneLink(order.phone)}` : ""}</small></span>
        ${statusBadge(order.status)}
        <b>تفصیل ←</b>
      </button>`).join("") : emptyState("کوئی گاہک نہیں ملا", "نام یا رسید / سلپ نمبر دوبارہ لکھیں۔");
  }

  function graphBuckets(period) {
    const today = new Date(`${todayIso()}T12:00:00`);
    const buckets = [];
    const dateLabel = (date, options) => new Intl.DateTimeFormat("ur-PK-u-nu-arabext", options).format(date);
    if (period === "day") {
      for (let offset = 6; offset >= 0; offset -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - offset);
        buckets.push({
          start: new Date(date),
          end: new Date(date),
          label: dateLabel(date, { weekday: "short", day: "numeric" })
        });
      }
      return { title: "گزشتہ ۷ دن کی اصل کارکردگی", buckets };
    }
    if (period === "week") {
      const currentMonday = new Date(today);
      const day = currentMonday.getDay();
      currentMonday.setDate(currentMonday.getDate() - (day === 0 ? 6 : day - 1));
      for (let offset = 5; offset >= 0; offset -= 1) {
        const start = new Date(currentMonday);
        start.setDate(currentMonday.getDate() - offset * 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        buckets.push({ start, end, label: dateLabel(start, { day: "numeric", month: "short" }) });
      }
      return { title: "گزشتہ ۶ ہفتوں کی اصل کارکردگی", buckets };
    }
    if (period === "month") {
      for (let offset = 11; offset >= 0; offset -= 1) {
        const start = new Date(today.getFullYear(), today.getMonth() - offset, 1, 12);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12);
        buckets.push({ start, end, label: dateLabel(start, { month: "short", year: "2-digit" }) });
      }
      return { title: "گزشتہ ۱۲ ماہ کی اصل کارکردگی", buckets };
    }
    for (let offset = 4; offset >= 0; offset -= 1) {
      const year = today.getFullYear() - offset;
      buckets.push({
        start: new Date(year, 0, 1, 12),
        end: new Date(year, 11, 31, 12),
        label: formatNumber(year)
      });
    }
    return { title: "گزشتہ ۵ سال کی اصل کارکردگی", buckets };
  }

  function renderProgressChart() {
    const configuration = graphBuckets(chartPeriod);
    const values = configuration.buckets.map((bucket) => {
      const orders = database.orders.filter((order) => {
        const orderDate = new Date(`${order.orderDate}T12:00:00`);
        return !Number.isNaN(orderDate.getTime()) && orderDate >= bucket.start && orderDate <= bucket.end;
      });
      const total = orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
      const received = orders.reduce((sum, order) => sum + (Number(order.paidAmount) || 0), 0);
      const cost = orders.reduce((sum, order) => sum + (Number(order.costAmount) || 0), 0);
      const due = orders.reduce((sum, order) => sum + getDue(order), 0);
      return { ...bucket, orders: orders.length, received, profit: total - cost, due };
    });
    const maximum = Math.max(1, ...values.flatMap((item) => [item.received, Math.max(0, item.profit), item.due]));
    const height = (amount) => amount > 0 ? Math.max(5, Math.round((Math.max(0, amount) / maximum) * 100)) : 0;
    const totalOrders = values.reduce((sum, item) => sum + item.orders, 0);
    const totalReceived = values.reduce((sum, item) => sum + item.received, 0);
    const totalProfit = values.reduce((sum, item) => sum + item.profit, 0);
    const totalDue = values.reduce((sum, item) => sum + item.due, 0);
    byId("progressRangeLabel").textContent = configuration.title;
    byId("chartOrdersTotal").textContent = formatNumber(totalOrders);
    byId("chartReceivedTotal").textContent = formatMoney(totalReceived);
    byId("chartProfitTotal").textContent = formatMoney(totalProfit);
    byId("chartProfitTotal").classList.toggle("amount-due", totalProfit < 0);
    byId("chartDuesTotal").textContent = formatMoney(totalDue);
    document.querySelectorAll("#chartPeriodTabs [data-chart-period]").forEach((button) => {
      button.classList.toggle("active", button.dataset.chartPeriod === chartPeriod);
    });
    byId("progressChart").innerHTML = values.map((item) => `
      <div class="chart-column" title="${safe(item.label)} — وصولی ${safe(formatMoney(item.received))}، منافع ${safe(formatMoney(item.profit))}، بقایا ${safe(formatMoney(item.due))}">
        <div class="chart-bars">
          <i class="chart-bar received" style="height:${height(item.received)}%"><span>${item.received ? safe(formatNumber(item.received)) : ""}</span></i>
          <i class="chart-bar profit" style="height:${height(item.profit)}%"><span>${item.profit ? safe(formatNumber(item.profit)) : ""}</span></i>
          <i class="chart-bar due" style="height:${height(item.due)}%"><span>${item.due ? safe(formatNumber(item.due)) : ""}</span></i>
        </div>
        <small>${safe(item.label)}</small><b>${safe(formatNumber(item.orders))} آرڈر</b>
      </div>`).join("");
  }

  function renderDashboard() {
    const periodTitles = { week: "اس ہفتے", month: "اس مہینے", year: "اس سال", all: "تمام مدت" };
    const allOrders = [...database.orders];
    const orders = allOrders.filter((order) => orderFallsInPeriod(order, dashboardPeriod));
    const totalDue = orders.reduce((sum, order) => sum + getDue(order), 0);
    const totalSuits = orders.reduce((sum, order) => sum + (Number(order.suitCount) || 0), 0);
    const totalEarnings = orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
    const totalCost = orders.reduce((sum, order) => sum + (Number(order.costAmount) || 0), 0);
    const totalProfit = totalEarnings - totalCost;
    byId("periodTitle").textContent = periodTitles[dashboardPeriod];
    document.querySelectorAll("#dashboardPeriodTabs [data-period]").forEach((button) => {
      button.classList.toggle("active", button.dataset.period === dashboardPeriod);
    });
    byId("totalOrders").textContent = formatNumber(orders.length);
    byId("totalSuits").textContent = formatNumber(totalSuits);
    byId("totalEarnings").textContent = formatMoney(totalEarnings);
    byId("totalProfit").textContent = formatMoney(totalProfit);
    byId("totalProfit").classList.toggle("amount-due", totalProfit < 0);
    byId("readyOrders").textContent = formatNumber(orders.filter((order) => order.status === "ready").length);
    byId("pendingOrders").textContent = formatNumber(orders.filter((order) => order.status === "pending").length);
    byId("totalDues").textContent = formatMoney(totalDue);
    byId("totalCost").textContent = formatMoney(totalCost);

    const recent = allOrders
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 5);
    byId("recentOrders").innerHTML = recent.length
      ? recent.map((order) => orderRow(order, { allowDelete: false })).join("")
      : emptyState("ابھی کوئی آرڈر محفوظ نہیں", "اپنا پہلا آرڈر درج کرنے کے لیے نیا آرڈر دبائیں۔");
    renderDashboardSearch();
    renderProgressChart();
  }
