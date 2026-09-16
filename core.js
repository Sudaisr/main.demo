/**
 * Bright Star Tailor - Core App State
 * Shared mutable state and tiny DOM/escape helpers used across all modules.
 */
"use strict";

  let database = { version: 4, receiptCounter: 1, orders: [] };
  let toastTimer;
  let loginStage = "choice";
  let accessMode = null;
  let dashboardPeriod = "all";
  let chartPeriod = "day";
  let lastSavedOrderId = null;
  let workerAccess = null;
  let lastTransferEnvelope = null;
  const selectedTransferOrderIds = new Set();
  let serverDatabaseConnected = false;
  let serverSaveQueue = Promise.resolve();

  const byId = (id) => document.getElementById(id);
  const safe = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
