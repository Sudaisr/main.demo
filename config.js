/**
 * Bright Star Tailor - Configuration & Constants
 * Shop info, static labels, design catalogue, page routing map.
 */
"use strict";

  const STORAGE_KEY = "baratStarTailorsDataV1";
  const WORKER_STORAGE_KEY = "baratStarTailorsWorkerShareV1";
  const SHOP_NAME_EN = "Bright Star Tailor";
  const SHOP_NAME_UR = "برائٹ سٹار ٹیلرز";
  const SHOP_ADDRESS_EN = "Zab City, Near Tablighi Markaz, 2nd Door, Opposite Qazi Taraf";
  const SHOP_ADDRESS_UR = "زیب سٹی سنٹر تبلیغی مرکز گیٹ نمبر 2 تیمرگرہ";
  const SHOP_MOBILE_1 = "0301-8945188";
  const SHOP_MOBILE_2 = "0344-9316390";
  const SHOP_WHATSAPP = "";
  const SHOP_EASYPAISA = "";
  const SERVER_API = "api.php";
  const TRANSFER_SECRET = "BrightTailor-Offline-Transfer-2026-SR112";
  const OWNER_NAME_HASH = "356c39fa3142056a1824f2b46ac1a9c9252614dc2e34d1d386fa77b58f720ffc";
  const OWNER_PASSWORD_HASH = "b069e82ab42b96cd42f330760012f8c2fd455be507fcf0b446997cfdc1325440";
  const statusLabels = {
    pending: "زیرِ سلائی",
    ready: "تیار ہے",
    packed: "پیک شدہ",
    delivered: "ڈیلیور شدہ / مکمل"
  };

  const measurementLabels = {
    shirtLength: "لمبائی",
    shoulder: "تیرا",
    sleeve: "بازو",
    neck: "کالر",
    chest: "چھاتی",
    hip: "ھپ",
    waist: "کمر",
    shirtBottom: "گھیرا",
    trouserLength: "شلوار لمبائی",
    trouserBottom: "پانچہ"
  };

  const designLabels = {
    pattiGhoom: "گھوم پٹی",
    pattiAam: "عام پٹی",
    pattiSada: "سادہ پٹی",
    collarA: "کالر ون",
    collarB: "کالر ٹو",
    cuffRound: "کف گول",
    cuffSquare: "کف چوکور",
    pocketFrontA: "فرنٹ پاکٹ ون",
    pocketFrontB: "فرنٹ پاکٹ ٹو",
    pocketSide: "سائیڈ پاکٹ",
    pocketTrouser: "شلوار پاکٹ",
    hemA: "دامن ون",
    hemB: "دامن ٹو",
    hemC: "دامن تھری"
  };

  const designImages = {
    pattiGhoom: "assets/designs/patti-ghoom.png",
    pattiAam: "assets/designs/patti-aam.png",
    pattiSada: "assets/designs/patti-sada.png",
    collarA: "assets/designs/collar-a.png",
    collarB: "assets/designs/collar-b.png",
    cuffRound: "assets/designs/cuff-round.png",
    cuffSquare: "assets/designs/cuff-square.png",
    pocketFrontA: "assets/designs/pocket-front-a.png",
    pocketFrontB: "assets/designs/pocket-front-b.png",
    pocketSide: "assets/designs/pocket-side.png",
    pocketTrouser: "assets/designs/pocket-trouser.png",
    hemA: "assets/designs/hem-a.png",
    hemB: "assets/designs/hem-b.png",
    hemC: "assets/designs/hem-c.png"
  };

  const pages = {
    dashboard: { element: "dashboardPage", title: "مرکزی صفحہ" },
    "new-order": { element: "newOrderPage", title: "نیا آرڈر" },
    status: { element: "statusPage", title: "سوٹ کی حالت اپڈیٹ" },
    orders: { element: "ordersPage", title: "تمام آرڈرز" },
    completed: { element: "completedOrdersPage", title: "مکمل شدہ آرڈرز" },
    money: { element: "moneyPage", title: "نجی حساب" },
    transfer: { element: "transferPage", title: "ریکارڈ شیئر / وصول" },
    backup: { element: "backupPage", title: "بیک اَپ" }
  };
