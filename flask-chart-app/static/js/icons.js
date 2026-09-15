/* ============================================================
   ICONS.JS
   ------------------------------------------------------------
   ไฟล์นี้เก็บ SVG ไอคอนทั้งหมดของเว็บไว้ที่เดียว

   วิธีแก้ไข/แทนที่ไอคอน:
   1. หา key ของไอคอนที่ต้องการแก้ (เช่น "fibRetracement")
   2. วาง SVG code ใหม่ทับใน backtick string (`...`)
      - ต้องใช้ viewBox="0 0 24 24" เพื่อให้ขนาดตรงกับปุ่มเดิม
      - แนะนำให้ใช้ stroke="currentColor" fill="none" เพื่อให้สี
        เปลี่ยนตาม hover/active state อัตโนมัติ (รับสีจาก CSS)
   3. บันทึกไฟล์ แล้ว refresh หน้าเว็บ ไม่ต้องแก้ที่ไหนอื่นเลย

   ไอคอนแต่ละตัวถูกเรียกใช้งานผ่าน app.js ที่จะไปค้นหา element
   ที่มี attribute data-icon="ชื่อ key" แล้วใส่ SVG ให้อัตโนมัติ
   ============================================================ */

const ICONS = {

  /* ---------- โลโก้ ---------- */
  logoMark: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="5"/></svg>`,

  /* ---------- SIDEBAR: ลูกศรเล็กๆ บอกว่ามีเมนูย่อย ---------- */
  caretRight: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 6l6 6-6 6z"/></svg>`,

  /* ---------- TOP TOOLBAR ---------- */
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`,

  chartType: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="4" y="9" width="3" height="8"/><rect x="10.5" y="4" width="3" height="13"/><rect x="17" y="12" width="3" height="5"/>
  </svg>`,

  indicators: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l6-6 4 4 8-8"/></svg>`,

  layoutGrid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>`,

  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,

  replay: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 19V5l-9 7z"/><path d="M22 19V5l-9 7z"/></svg>`,

  undo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 14l-4-4 4-4"/><path d="M5 10h9a5 5 0 0 1 0 10h-2"/></svg>`,

  redo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l4 4-4 4"/><path d="M19 10h-9a5 5 0 0 0 0 10h2"/></svg>`,

  screenshot: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7l1.5-3h5L16 7"/><circle cx="12" cy="13.5" r="3.2"/>
  </svg>`,

  fullscreen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>
  </svg>`,

  /* ---------- LEFT TOOLBAR: DRAWING TOOLS ---------- */
  cursor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l16 6-6.5 2.5L11 19z"/></svg>`,

  trendline: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20L20 4"/></svg>`,

  ray: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20L14 10"/><path d="M14 10l7-7M17 3h4v4" stroke-dasharray="0"/></svg>`,

  extendedLine: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 22L22 2" stroke-dasharray="3 2"/><path d="M7 17L17 7"/></svg>`,

  horizontalLine: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8h18M3 14h12M3 20h8"/></svg>`,

  horizontalRay: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M8 12h13"/></svg>`,

  verticalLine: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18"/></svg>`,

  crossLine: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 12h18"/></svg>`,

  /* ---------- CURSORS (sub-menu) ---------- */
  cursorCross: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/></svg>`,
  cursorDot: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6" opacity="0.4"/></svg>`,
  cursorEraser: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3l4 4-9.5 9.5H7L3 12.5z"/><path d="M7 16.5L3 12.5"/></svg>`,

  /* ---------- TREND LINE FAMILY (เพิ่มเติม) ---------- */
  trendAngle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16M4 20L18 6"/><path d="M4 14a6 6 0 0 1 6-6" stroke-dasharray="2 2"/></svg>`,
  parallelChannel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17L17 3"/><path d="M7 21L21 7"/></svg>`,
  anchoredVWAP: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><path d="M12 3v4M12 17v4"/></svg>`,

  /* ---------- GANN & FIBONACCI FAMILY (เพิ่มเติม) ---------- */
  fibChannel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 19L19 3M6 22L22 6M2 14L14 2"/></svg>`,
  fibTimeZone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 3v18M9 3v18M14 3v18M19 3v18" opacity="0.7"/></svg>`,
  fibCircles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>`,
  pitchfork: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20L12 4"/><path d="M12 4l6 5M12 4l-2 7"/><path d="M18 9l3 11M10 11l-4 9"/></svg>`,
  gannSquare: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18"/><path d="M3 3l18 18M21 3L3 21"/></svg>`,

  /* ---------- GEOMETRIC SHAPES ---------- */
  brush: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20c0-4 2-6 4-6s3 2 3 4-1 3-3 3-4-1-4-1z"/><path d="M11 14L19 4l2 2-10 10"/></svg>`,
  rectangle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="1"/></svg>`,
  circleShape: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/></svg>`,
  triangleShape: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4l9 16H3z"/></svg>`,
  polyline: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18l5-9 5 4 8-9"/></svg>`,

  /* ---------- ANNOTATIONS ---------- */
  note: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3h11l3 3v15H5z"/><path d="M16 3v3h3"/><path d="M8 12h8M8 16h5"/></svg>`,
  callout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 16l-2 4 5-4"/></svg>`,
  priceLabel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l8-8h9v9l-8 8z"/><circle cx="14" cy="9" r="1.4" fill="currentColor" stroke="none"/></svg>`,
  arrowUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V6M6 11l6-6 6 6"/></svg>`,
  arrowDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v14M6 13l6 6 6-6"/></svg>`,
  arrowLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12H6M11 6l-6 6 6 6"/></svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h14M13 6l6 6-6 6"/></svg>`,
  flagMark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 21V4"/><path d="M5 4h13l-3 4 3 4H5"/></svg>`,

  /* ---------- PATTERNS ---------- */
  patternWave: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l4-10 4 8 4-12 4 9 2-4"/></svg>`,
  sineWave: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0"/></svg>`,

  /* ---------- PREDICTION & MEASUREMENT ---------- */
  longPosition: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20L20 4"/><path d="M4 4v6h6" transform="rotate(180 7 7)"/><rect x="14" y="4" width="6" height="4" fill="currentColor" stroke="none" opacity="0.5"/><rect x="4" y="16" width="6" height="4" fill="currentColor" stroke="none" opacity="0.5"/></svg>`,
  shortPosition: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4L20 20"/><rect x="14" y="16" width="6" height="4" fill="currentColor" stroke="none" opacity="0.5"/><rect x="4" y="4" width="6" height="4" fill="currentColor" stroke="none" opacity="0.5"/></svg>`,
  dateRange: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16"/><path d="M4 12l3-3M4 12l3 3M20 12l-3-3M20 12l-3 3"/></svg>`,
  priceRange: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v16"/><path d="M12 4l-3 3M12 4l3 3M12 20l-3-3M12 20l3-3"/></svg>`,
  ghostFeed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2"><path d="M4 20l4-4 4 3 4-6 4 3"/></svg>`,



  /* Fibonacci — จุดนี้แหละที่คุณน่าจะอยากมาแทนที่ก่อนเพื่อน
     ตอนนี้เป็นแค่เส้นแนวนอน 4 เส้น + เส้นทแยง (คร่าวๆ ไม่ใช่ของจริง) */
  fibRetracement: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 5h18M3 9h18M3 13h18M3 17h18" opacity="0.5"/><path d="M4 21L20 3"/>
  </svg>`,

  gannBox: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
  </svg>`,

  textTool: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5h14M12 5v14"/></svg>`,

  emoji: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>
  </svg>`,

  measure: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 17L17 3l4 4L7 21z"/><path d="M8 12l2 2M12 8l2 2"/>
  </svg>`,

  zoom: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/><path d="M8 11h6"/>
  </svg>`,

  magnet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M6 4v7a6 6 0 0 0 12 0V4"/><path d="M6 4h4M14 4h4M6 8h4M14 8h4"/>
  </svg>`,

  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
  </svg>`,

  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
  </svg>`,

  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>
  </svg>`,

  star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.9 6.4 20l1.4-6.2-4.8-4.3 6.4-.6z"/>
  </svg>`,

  /* ---------- EDGE ICON RAIL (ขวาสุด) ---------- */
  watchlist: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h10"/></svg>`,

  notifications: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>
  </svg>`,

  layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>
  </svg>`,

  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20l1.2-4.6A8.4 8.4 0 1 1 21 11.5z"/>
  </svg>`,

  alertsTriangle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/><path d="M3.3 16.9a1 1 0 0 0 .7 1.7h16a1 1 0 0 0 .7-1.7C19.6 15.8 18 14 18 9a6 6 0 0 0-12 0c0 5-1.6 6.8-2.7 7.9z"/>
  </svg>`,

  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>
  </svg>`,

  apps: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="4" y="4" width="4" height="4"/><rect x="10" y="4" width="4" height="4"/><rect x="16" y="4" width="4" height="4"/>
    <rect x="4" y="10" width="4" height="4"/><rect x="10" y="10" width="4" height="4"/><rect x="16" y="10" width="4" height="4"/>
    <rect x="4" y="16" width="4" height="4"/><rect x="10" y="16" width="4" height="4"/><rect x="16" y="16" width="4" height="4"/>
  </svg>`,

  help: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.3 1-1.3 1.9"/><path d="M12 17h.01"/>
  </svg>`,

  /* ---------- REPLAY BAR ---------- */
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,

  jumpNext: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4l10 8-10 8z"/><path d="M19 5v14"/></svg>`,

};
