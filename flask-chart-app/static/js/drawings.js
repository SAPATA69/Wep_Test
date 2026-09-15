/* ============================================================
   DRAWINGS.JS
   ------------------------------------------------------------
   โมดูลนี้รับผิดชอบ "เครื่องมือวาด" ทั้งหมดบนกราฟ เช่น
   Trendline, Horizontal Line, Fibonacci Retracement, Text, Measure
   วาดลงบน <canvas id="drawingCanvas"> ซึ่งเป็นชั้นที่ลอยทับ
   อยู่เหนือ <canvas id="chartCanvas"> ของ chart.js อีกที

   หลักการเก็บข้อมูล:
   จุดของเส้นแต่ละเส้นเก็บเป็น "สัดส่วน" (xFrac, yFrac ระหว่าง 0-1)
   ไม่ใช่พิกเซลตรงๆ เพื่อให้เส้นขยับตามสัดส่วนถูกต้องเวลาเว็บ
   ถูกปรับขนาดหน้าจอ (resize)

   วิธีเพิ่มเครื่องมือวาดชนิดใหม่ในอนาคต:
   1. เพิ่มเงื่อนไขรับ mousedown ใน onMouseDown() ว่าจะเก็บกี่จุด
   2. เพิ่มเงื่อนไขวาดรูปทรงใน drawOne()
   3. เพิ่มเงื่อนไข hit-test (คลิกโดนเส้นไหม) ใน isPointNearDrawing()
   ============================================================ */

const DrawingsModule = (() => {

  let canvas, ctx, container;
  let drawings = [];           // เก็บเส้น/รูปทั้งหมดที่วาดไว้
  let currentTool = 'cursor';  // เครื่องมือที่กำลังเลือกอยู่
  let tempPoints = [];         // จุดที่คลิกไปแล้วระหว่างวาดเส้นแบบ 2 จุด
  let previewPoint = null;     // จุดพรีวิวตามเมาส์ ก่อนคลิกจุดที่ 2
  let firstPointPixel = null;  // ตำแหน่งพิกเซล (ไม่ใช่ fraction) ตอนวางจุดแรก ใช้เช็คว่าเป็นการ "ลาก" หรือแค่ "คลิก"
  let previewFibLevels = null; // ชุดระดับ Fibo ที่ใช้ตอน preview ระหว่างลาก (แคชไว้ ไม่สร้างใหม่ทุกเฟรม)
  const DRAG_THRESHOLD_PX = 4; // ขยับเกินนี้ถือว่าเป็นการลาก ปล่อยเมาส์แล้ววาดเสร็จเลย (พฤติกรรมแบบ TradingView)
  let selectedId = null;       // id ของเส้นที่กำลังถูกเลือกอยู่
  let draggingHandle = null;   // ข้อมูลตอนกำลังลาก handle/ย้ายเส้น
  let visible = true;          // true = แสดงเส้นทั้งหมด, false = ซ่อน
  let locked = false;          // true = ห้ามแก้ไข/ย้ายเส้น
  let magnetOn = false;        // true = สแนปเข้าจุดแท่งเทียน (high/low/close)
  let idCounter = 1;
  let onToolChangeCallback = null;
  let onSelectionChangeCallback = null;

  const COLOR_TRENDLINE = '#2962ff';
  const COLOR_HORIZONTAL = '#f5a623';
  const COLOR_FIB_LINE = '#787b86';
  const COLOR_TEXT = '#d1d4dc';
  const COLOR_MEASURE = '#2962ff';

  // Ray / Extended Line / Info Line ทั้งหมดคือ "เส้นเทรนด์" (type: 'trendline')
  // ต่างกันแค่ค่าเริ่มต้นของ extendLeft/extendRight/showInfo เท่านั้น
  // (ตรงกับสเปค: Extend Left/Right เป็นแค่ตัวเลือกในหน้าตั้งค่าของ Trend Line)
  const TREND_VARIANT_DEFAULTS = {
    trendline: { extendLeft: false, extendRight: false, showInfo: false },
    ray: { extendLeft: false, extendRight: true, showInfo: false },
    extendedLine: { extendLeft: true, extendRight: true, showInfo: false },
    infoLine: { extendLeft: false, extendRight: false, showInfo: true },
  };
  const TREND_TOOL_NAMES = Object.keys(TREND_VARIANT_DEFAULTS);

  // รายชื่อเครื่องมือที่ "ใส่ logic การวาดจริงแล้ว" ตอนนี้
  // เครื่องมือไหนไม่อยู่ในลิสต์นี้ = ยังเป็นแค่โครง (เลือกได้ในเมนู แต่คลิกบนกราฟแล้วไม่มีอะไรเกิดขึ้น)
  // เพิ่มชื่อ tool เข้าลิสต์นี้เมื่อไหร่ที่ implement เครื่องมือนั้นเสร็จจริง
  const IMPLEMENTED_TOOLS = new Set([
    'cursor',
    ...TREND_TOOL_NAMES,        // trendline, ray, extendedLine, infoLine
    'horizontal', 'horizontalRay', 'verticalLine', 'crossLine',
    'fibonacci',
    'text',
    'measure',
    'rectangle', 'circle', 'ellipse', 'triangle',
    'longPosition', 'shortPosition',
  ]);

  const LINE_STYLE_DASH = { solid: [], dashed: [7, 5], dotted: [1.5, 4] };
  const DEFAULT_LINE_COLOR = COLOR_TRENDLINE;
  const DEFAULT_LINE_WIDTH = 2;
  const DEFAULT_LINE_STYLE = 'solid';

  // สไตล์เริ่มต้นของรูปทรงเรขาคณิต (Rectangle/Circle/Ellipse/Triangle)
  // color = สีเส้นขอบ, fillColor/fillOpacity = สีและความโปร่งใสของพื้นหลัง
  const DEFAULT_SHAPE_STYLE = {
    color: '#2962ff',
    fillColor: '#2962ff',
    fillOpacity: 0.15,
    lineStyle: 'solid',
  };

  // ---- Long / Short Position ----
  // จุดที่ 1 = Entry, จุดที่ 2 = Take Profit (โซนสีเขียว), จุดที่ 3 = Stop Loss (โซนสีแดง)
  // ระยะเริ่มต้นเป็นสัดส่วนของพื้นที่กราฟ (คำนวณเป็นราคา/% จริงตอน render จาก priceAtY)
  const POSITION_TP_COLOR = '#26a69a';
  const POSITION_SL_COLOR = '#ef5350';
  const POSITION_DEFAULT_BOX_WIDTH_FRAC = 0.18;
  const POSITION_DEFAULT_REWARD_FRAC = 0.12; // ระยะจาก entry ไป TP (สัดส่วนความสูงกราฟ)
  const POSITION_DEFAULT_RISK_FRAC = 0.06;   // ระยะจาก entry ไป SL (สัดส่วนความสูงกราฟ) -> R:R เริ่มต้น 1:2
  const POSITION_DEFAULT_FILL_OPACITY = 0.18;
  const POSITION_DEFAULT_ACCOUNT_SIZE = 10000;
  const POSITION_DEFAULT_RISK_PERCENT = 1; // เสี่ยง 1% ของบัญชีต่อไม้ (มาตรฐานที่นักเทรดมืออาชีพใช้)
  const POSITION_DEFAULT_RISK_MODE = 'percent'; // 'percent' | 'fixed'
  const POSITION_DEFAULT_FIXED_RISK = 100;      // ใช้เมื่อ riskMode === 'fixed'
  const POSITION_DEFAULT_CONTRACT_MULTIPLIER = 1; // Tick value / เลเวอเรจของสัญญา (Forex/Futures/Crypto/หุ้น)
  const POSITION_DEFAULT_LOT_STEP = 0.01;         // ปัดขนาดไม้ให้ตรง step ขั้นต่ำของตลาด
  const POSITION_DEFAULT_MAX_LEVERAGE = 20;       // ใช้เตือน "Insufficient Margin" ถ้ามูลค่าไม้เกินเงินทุน x เลเวอเรจ
  const POSITION_MIN_GAP_FRAC = 0.006; // ระยะห่างขั้นต่ำระหว่าง Entry กับ TP/SL (กัน RRR หารด้วยศูนย์ + กันลำดับราคาผิด)

  // ระดับ Fibonacci เริ่มต้น + สีประจำแต่ละระดับ (ใกล้เคียงโทนสีของ TradingView)
  // เก็บเป็น "แม่แบบ" — เวลาวาด Fibonacci ใหม่แต่ละเส้น จะ clone ชุดนี้แยกเป็นของตัวเอง
  // เพื่อให้แต่ละเส้นปรับระดับ/สี/เปิดปิดเองได้อิสระ ไม่ปนกัน (ตามสเปค Dynamic Levels)
  const DEFAULT_FIB_TEMPLATE = [
    { value: 0, color: '#787b86' },
    { value: 0.236, color: '#f23645' },
    { value: 0.382, color: '#ff9800' },
    { value: 0.5, color: '#4caf50' },
    { value: 0.618, color: '#26a69a' },
    { value: 0.786, color: '#2962ff' },
    { value: 1, color: '#787b86' },
  ];

  function createDefaultFibLevels() {
    return DEFAULT_FIB_TEMPLATE.map(t => ({
      id: idCounter++,
      value: t.value,
      color: t.color,
      enabled: true,
    }));
  }

  // ---- เริ่มต้นระบบ ----
  function init({ canvasEl, containerEl }) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    container = containerEl;

    window.addEventListener('resize', resize);
    resize();

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);

    setTool('cursor');
  }

  function resize() {
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    render();
  }

  // ---- เปลี่ยนเครื่องมือที่ใช้งานอยู่ ----
  function setTool(tool) {
    currentTool = tool;
    tempPoints = [];
    previewPoint = null;
    firstPointPixel = null;
    previewFibLevels = null;
    canvas.style.cursor = (tool === 'cursor') ? 'default' : 'crosshair';
    render();
  }

  function onToolChange(cb) { onToolChangeCallback = cb; }
  function onSelectionChange(cb) { onSelectionChangeCallback = cb; }

  function getSelectedDrawing() {
    return drawings.find(d => d.id === selectedId) || null;
  }

  function fireSelectionChange() {
    if (onSelectionChangeCallback) onSelectionChangeCallback(getSelectedDrawing());
  }

  // ---- แปลงพิกัดเมาส์ (หน้าจอ) เป็นพิกัดบน canvas + สัดส่วน 0-1 ----
  function toXY(e) {
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    if (magnetOn && typeof ChartModule !== 'undefined' && typeof ChartModule.getCandles === 'function') {
      const snapped = snapToNearestCandlePoint(x, y, rect);
      if (snapped) { x = snapped.x; y = snapped.y; }
    }

    return { x, y, xFrac: x / rect.width, yFrac: y / rect.height };
  }

  // ---- Magnet mode: ดึงจุดที่คลิกให้เข้าใกล้ high/low/close ของแท่งเทียนที่ใกล้ที่สุด ----
  function snapToNearestCandlePoint(x, y, rect) {
    const candles = ChartModule.getCandles();
    if (!candles || !candles.length) return null;
    const candleW = rect.width / candles.length;
    const idx = Math.max(0, Math.min(candles.length - 1, Math.floor(x / candleW)));
    const c = candles[idx];
    const candidateYs = [c.high, c.low, c.open, c.close]
      .map(price => ({ price, y: yForPrice(price) }))
      .filter(p => p.y != null);
    if (!candidateYs.length) return null;

    let nearest = candidateYs[0];
    candidateYs.forEach(p => {
      if (Math.abs(p.y - y) < Math.abs(nearest.y - y)) nearest = p;
    });
    // สแนปเฉพาะตอนเมาส์อยู่ใกล้ๆ จุดนั้นจริง (ในระยะ 10px) ไม่งั้นจะสแนปทุกที่จนวาดอิสระไม่ได้
    if (Math.abs(nearest.y - y) > 10) return null;

    const snappedX = idx * candleW + candleW / 2;
    return { x: snappedX, y: nearest.y };
  }

  function yForPrice(price) {
    // ใช้สมการย้อนกลับของ priceAtY ใน chart.js
    if (typeof ChartModule === 'undefined' || typeof ChartModule.priceAtY !== 'function') return null;
    const h = canvas.clientHeight;
    const topPrice = ChartModule.priceAtY(0);
    const bottomPrice = ChartModule.priceAtY(h);
    if (topPrice == null || bottomPrice == null) return null;
    const range = topPrice - bottomPrice;
    if (range === 0) return null;
    return ((topPrice - price) / range) * h;
  }

  // ---- เพิ่มเส้น/รูปใหม่เข้า list ----
  function addDrawing(type, points, extra = {}) {
    const d = { id: idCounter++, type, points, ...extra };
    drawings.push(d);
    render();
    return d;
  }

  function removeDrawing(id) {
    drawings = drawings.filter(d => d.id !== id);
    render();
  }

  function removeSelected() {
    if (selectedId) {
      removeDrawing(selectedId);
      selectedId = null;
      fireSelectionChange();
      return true;
    }
    return false;
  }

  function clearAll() {
    drawings = [];
    selectedId = null;
    fireSelectionChange();
    render();
  }

  function setVisible(v) { visible = v; render(); }
  function setLocked(v) { locked = v; }
  function setMagnet(v) { magnetOn = v; }

  // ================================================================
  // LINE FAMILY SETTINGS (trendline, horizontal, horizontalRay, verticalLine, crossLine)
  // ================================================================
  const LINE_FAMILY_TYPES = ['trendline', 'horizontal', 'horizontalRay', 'verticalLine', 'crossLine'];

  function findLineDrawing(drawingId) {
    return drawings.find(d => d.id === drawingId && LINE_FAMILY_TYPES.includes(d.type)) || null;
  }

  function setLineColor(drawingId, color) {
    const d = findLineDrawing(drawingId);
    if (d) { d.color = color; render(); }
  }

  function setLineWidth(drawingId, width) {
    const d = findLineDrawing(drawingId);
    if (d) { d.lineWidth = width; render(); }
  }

  function setLineStyle(drawingId, style) {
    const d = findLineDrawing(drawingId);
    if (d) { d.lineStyle = style; render(); }
  }

  // Extend Left/Right ใช้ได้เฉพาะ type 'trendline' เท่านั้น (Ray/Extended Line คือ trendline ที่ extend อยู่)
  function setLineExtend(drawingId, { left, right } = {}) {
    const d = findLineDrawing(drawingId);
    if (!d || d.type !== 'trendline') return;
    if (left !== undefined) d.extendLeft = left;
    if (right !== undefined) d.extendRight = right;
    render();
  }

  // Info Line: โชว์ระยะ (pips), จำนวนแท่ง, และองศาของเส้น — ใช้ได้เฉพาะ trendline
  function setLineShowInfo(drawingId, show) {
    const d = findLineDrawing(drawingId);
    if (d && d.type === 'trendline') { d.showInfo = show; render(); }
  }

  // ================================================================
  // LONG/SHORT POSITION SETTINGS
  // ================================================================
  function findPositionDrawing(drawingId) {
    return drawings.find(d => d.id === drawingId && d.type === 'position') || null;
  }

  // ---- เครื่องคำนวณกลาง: รับราคาจริง + การตั้งค่าทั้งหมด คืนค่าตัวเลขทุกอย่างที่ต้องโชว์ ----
  // แยกออกมาเป็นฟังก์ชัน pure function ต่างหาก (ไม่แตะ canvas/DOM เลย) เพื่อให้:
  //  1) เทสได้ตรงๆ โดยไม่ต้องจำลอง canvas
  //  2) ใช้ซ้ำได้ทั้งตอน render และถ้าจะเอาไปโชว์ที่อื่น (เช่น export เป็น JSON) ในอนาคต
  function computePositionMetrics({
    entryPrice, tpPrice, slPrice, direction,
    accountSize, riskMode, riskPercent, fixedRiskAmount,
    contractMultiplier, lotStep, maxLeverage,
    currentPrice,
  }) {
    const isLong = direction === 'long';

    // Price Delta ตามสูตรสเปค (แยกสูตร Long/Short ตรงๆ ตามที่กำหนด)
    const targetDelta = isLong ? (tpPrice - entryPrice) : (entryPrice - tpPrice);
    const stopDelta = isLong ? (entryPrice - slPrice) : (slPrice - entryPrice);

    // Edge case: Entry == Stop Loss (หรือ delta ติดลบจากลำดับราคาที่ผิด) -> RRR เป็น N/A ไม่ใช่ Infinity/NaN
    const validStop = stopDelta > 1e-9;
    const rrr = validStop ? (targetDelta / stopDelta) : null;

    // Risk Amount: เลือกได้ระหว่างเสี่ยงเป็น "จำนวนเงินคงที่" หรือ "% ของพอร์ต"
    const safeAccountSize = Math.max(0, accountSize || 0);
    const riskAmount = riskMode === 'fixed'
      ? Math.max(0, fixedRiskAmount || 0)
      : safeAccountSize * (Math.max(0, riskPercent || 0) / 100);

    // Quantity: ป้องกันหารด้วยศูนย์ (stopDelta<=0 หรือ multiplier<=0) -> quantity = 0 แทนที่จะ error
    const safeMultiplier = contractMultiplier > 0 ? contractMultiplier : 0;
    let quantity = 0;
    if (validStop && safeMultiplier > 0) {
      quantity = riskAmount / (stopDelta * safeMultiplier);
      if (lotStep > 0) quantity = Math.round(quantity / lotStep) * lotStep; // ปัดตาม step ขั้นต่ำของตลาด
      quantity = Math.max(0, quantity);
    }

    const totalPositionValue = quantity * entryPrice * safeMultiplier;
    const profitAmount = quantity * targetDelta * safeMultiplier;
    const profitPercent = safeAccountSize > 0 ? (profitAmount / safeAccountSize) * 100 : 0;
    const lossAmount = quantity * stopDelta * safeMultiplier;
    const lossPercent = safeAccountSize > 0 ? (lossAmount / safeAccountSize) * 100 : 0;

    // Margin warning: มูลค่าไม้รวมเกินเงินทุน x เลเวอเรจสูงสุดที่อนุญาตไหม
    const marginWarning = maxLeverage > 0 && safeAccountSize > 0 && totalPositionValue > safeAccountSize * maxLeverage;

    // Open P&L: ใช้ราคาปัจจุบัน (แท่งล่าสุด) เทียบกับ Entry
    let openPnl = null;
    if (currentPrice != null && quantity > 0) {
      const currentDelta = isLong ? (currentPrice - entryPrice) : (entryPrice - currentPrice);
      openPnl = currentDelta * quantity * safeMultiplier;
    }

    return {
      targetDelta, stopDelta, rrr, riskAmount, quantity,
      totalPositionValue, profitAmount, profitPercent, lossAmount, lossPercent,
      marginWarning, openPnl, validStop,
    };
  }

  // ---- บังคับลำดับราคาให้ถูกต้องเสมอ (Edge Case #1 ในสเปค) ----
  // Long ต้องเป็น TP > Entry > SL, Short ต้องเป็น SL > Entry > TP
  // ทำงานในพิกัด yFrac (ค่ามาก = ราคาต่ำ เพราะแกน y จอกลับด้านกับราคา)
  function sanitizePositionOrdering(d) {
    const entryY = d.points[0].yFrac;
    const isLong = d.direction === 'long';

    if (isLong) {
      // TP ต้องอยู่ "เหนือ" entry (yFrac น้อยกว่า) อย่างน้อย MIN_GAP
      if (d.points[1].yFrac > entryY - POSITION_MIN_GAP_FRAC) {
        d.points[1].yFrac = entryY - POSITION_MIN_GAP_FRAC;
      }
      // SL ต้องอยู่ "ใต้" entry (yFrac มากกว่า) อย่างน้อย MIN_GAP
      if (d.points[2].yFrac < entryY + POSITION_MIN_GAP_FRAC) {
        d.points[2].yFrac = entryY + POSITION_MIN_GAP_FRAC;
      }
    } else {
      if (d.points[1].yFrac < entryY + POSITION_MIN_GAP_FRAC) {
        d.points[1].yFrac = entryY + POSITION_MIN_GAP_FRAC;
      }
      if (d.points[2].yFrac > entryY - POSITION_MIN_GAP_FRAC) {
        d.points[2].yFrac = entryY - POSITION_MIN_GAP_FRAC;
      }
    }
  }

  function setPositionTpColor(drawingId, color) {
    const d = findPositionDrawing(drawingId);
    if (d) { d.tpColor = color; render(); }
  }

  function setPositionSlColor(drawingId, color) {
    const d = findPositionDrawing(drawingId);
    if (d) { d.slColor = color; render(); }
  }

  function setPositionFillOpacity(drawingId, opacity) {
    const d = findPositionDrawing(drawingId);
    if (d) { d.fillOpacity = Math.max(0, Math.min(1, opacity)); render(); }
  }

  function setPositionBoxWidth(drawingId, widthFrac) {
    const d = findPositionDrawing(drawingId);
    if (d) { d.boxWidthFrac = Math.max(0.02, Math.min(0.9, widthFrac)); render(); }
  }

  // ---- Position Sizing: คำนวณขนาดไม้จาก Account Size + Risk % ----
  function setPositionAccountSize(drawingId, accountSize) {
    const d = findPositionDrawing(drawingId);
    if (d) { d.accountSize = Math.max(0, accountSize); render(); }
  }

  function setPositionRiskPercent(drawingId, riskPercent) {
    const d = findPositionDrawing(drawingId);
    if (d) { d.riskPercent = Math.max(0.01, Math.min(100, riskPercent)); render(); }
  }

  // ---- Risk Mode: เลือกเสี่ยงเป็น "จำนวนเงินคงที่ ($)" หรือ "% ของพอร์ต" ----
  function setPositionRiskMode(drawingId, mode) {
    const d = findPositionDrawing(drawingId);
    if (d && (mode === 'percent' || mode === 'fixed')) { d.riskMode = mode; render(); }
  }

  function setPositionFixedRiskAmount(drawingId, amount) {
    const d = findPositionDrawing(drawingId);
    if (d) { d.fixedRiskAmount = Math.max(0, amount); render(); }
  }

  // ---- Contract Multiplier: ตัวคูณ tick value / เลเวอเรจของสัญญา (Forex/Futures/Crypto/หุ้น) ----
  function setPositionContractMultiplier(drawingId, multiplier) {
    const d = findPositionDrawing(drawingId);
    if (d) { d.contractMultiplier = Math.max(0.0001, multiplier); render(); }
  }

  function setPositionLotStep(drawingId, step) {
    const d = findPositionDrawing(drawingId);
    if (d) { d.lotStep = Math.max(0, step); render(); }
  }

  function setPositionMaxLeverage(drawingId, leverage) {
    const d = findPositionDrawing(drawingId);
    if (d) { d.maxLeverage = Math.max(0, leverage); render(); }
  }

  // ---- พิมพ์ราคาตรงๆ (Entry/Target/Stop) แทนการลากบนกราฟอย่างเดียว ----
  // ตรงตามสเปค TradingView: "Entry Price: Allows for precise placement of trade's entry point"
  // และ "Profit/Stop Level: Price - Allows you to manually specify the exact price level"
  function setPositionEntryPrice(drawingId, price) {
    const d = findPositionDrawing(drawingId);
    if (!d || typeof ChartModule === 'undefined') return;
    const y = ChartModule.yForPrice(price);
    if (y == null) return;
    d.points[0] = { xFrac: d.points[0].xFrac, yFrac: y / canvas.clientHeight };
    sanitizePositionOrdering(d); // ขยับ entry แล้ว TP/SL ต้องยังอยู่ฝั่งที่ถูกต้องเสมอ
    render();
  }

  function setPositionTpPrice(drawingId, price) {
    const d = findPositionDrawing(drawingId);
    if (!d || typeof ChartModule === 'undefined') return;
    const y = ChartModule.yForPrice(price);
    if (y == null) return;
    d.points[1] = { xFrac: d.points[1].xFrac, yFrac: y / canvas.clientHeight };
    sanitizePositionOrdering(d);
    render();
  }

  function setPositionSlPrice(drawingId, price) {
    const d = findPositionDrawing(drawingId);
    if (!d || typeof ChartModule === 'undefined') return;
    const y = ChartModule.yForPrice(price);
    if (y == null) return;
    d.points[2] = { xFrac: d.points[2].xFrac, yFrac: y / canvas.clientHeight };
    sanitizePositionOrdering(d);
    render();
  }

  // สลับทิศทาง Long <-> Short: ต้องสลับตำแหน่ง TP กับ SL ด้วย
  // ไม่งั้นโซนกำไร/ขาดทุนจะค้างอยู่ผิดฝั่งจากทิศทางใหม่
  function setPositionDirection(drawingId, direction) {
    const d = findPositionDrawing(drawingId);
    if (!d || d.direction === direction) return;
    const tmp = d.points[1];
    d.points[1] = d.points[2];
    d.points[2] = tmp;
    d.direction = direction;
    render();
  }

  // ================================================================
  // GEOMETRIC SHAPES SETTINGS (Rectangle / Circle / Ellipse / Triangle)
  // ================================================================
  const SHAPE_TYPES = ['rectangle', 'ellipse', 'triangle'];

  function findShapeDrawing(drawingId) {
    return drawings.find(d => d.id === drawingId && SHAPE_TYPES.includes(d.type)) || null;
  }

  function setShapeBorderColor(drawingId, color) {
    const d = findShapeDrawing(drawingId);
    if (d) { d.color = color; render(); }
  }

  function setShapeFillColor(drawingId, color) {
    const d = findShapeDrawing(drawingId);
    if (d) { d.fillColor = color; render(); }
  }

  // opacity รับค่า 0-1 (0 = โปร่งใสหมด, 1 = ทึบเต็มที่)
  function setShapeFillOpacity(drawingId, opacity) {
    const d = findShapeDrawing(drawingId);
    if (d) { d.fillOpacity = Math.max(0, Math.min(1, opacity)); render(); }
  }

  function setShapeLineStyle(drawingId, style) {
    const d = findShapeDrawing(drawingId);
    if (d) { d.lineStyle = style; render(); }
  }

  // Extend Left/Right สำหรับทำโซน Demand/Supply — ใช้ได้เฉพาะ Rectangle
  function setShapeExtend(drawingId, { left, right } = {}) {
    const d = findShapeDrawing(drawingId);
    if (!d || d.type !== 'rectangle') return;
    if (left !== undefined) d.extendLeft = left;
    if (right !== undefined) d.extendRight = right;
    render();
  }

  // ================================================================
  // FIBONACCI: DYNAMIC LEVELS
  // ================================================================
  function findFibDrawing(drawingId) {
    return drawings.find(d => d.id === drawingId && d.type === 'fibonacci') || null;
  }

  function addFibLevel(drawingId, value = 0.5, color = '#9598a1') {
    const d = findFibDrawing(drawingId);
    if (!d) return null;
    const newLevel = { id: idCounter++, value, color, enabled: true };
    d.levels.push(newLevel);
    d.levels.sort((a, b) => a.value - b.value);
    render();
    return newLevel;
  }

  function removeFibLevel(drawingId, levelId) {
    const d = findFibDrawing(drawingId);
    if (!d) return;
    d.levels = d.levels.filter(l => l.id !== levelId);
    render();
  }

  function updateFibLevel(drawingId, levelId, patch) {
    const d = findFibDrawing(drawingId);
    if (!d) return;
    const lvl = d.levels.find(l => l.id === levelId);
    if (!lvl) return;
    Object.assign(lvl, patch);
    if ('value' in patch) {
      d.levels.sort((a, b) => a.value - b.value);
    }
    render();
  }

  function setFibLabelPosition(drawingId, position) {
    const d = findFibDrawing(drawingId);
    if (d) { d.labelPosition = position; render(); }
  }

  function setFibValueMode(drawingId, mode) {
    const d = findFibDrawing(drawingId);
    if (d) { d.valueMode = mode; render(); }
  }

  // ================================================================
  // MOUSE EVENTS
  // ================================================================
  function onMouseDown(e) {
    const pt = toXY(e);

    if (currentTool === 'cursor') {
      handleSelectMouseDown(pt);
      return;
    }

    if (locked) return; // ล็อกอยู่ ห้ามวาดเพิ่ม

    if (!IMPLEMENTED_TOOLS.has(currentTool)) {
      // เครื่องมือนี้ยังเป็นแค่โครง (เมนูเลือกได้ แต่ยังไม่ใส่ logic วาดจริง)
      return;
    }

    if (currentTool === 'text') {
      const text = prompt('พิมพ์ข้อความที่จะแปะบนกราฟ:');
      if (text && text.trim()) {
        const d = addDrawing('text', [{ xFrac: pt.xFrac, yFrac: pt.yFrac }], { text: text.trim() });
        selectAndReturnToCursor(d);
      } else {
        setTool('cursor');
        if (onToolChangeCallback) onToolChangeCallback('cursor');
      }
      return;
    }

    if (currentTool === 'horizontal') {
      // เส้นแนวนอนใช้แค่คลิกเดียว (ระบุแค่ระดับราคา y) — ยาวเต็มความกว้าง
      const d = addDrawing('horizontal', [{ xFrac: pt.xFrac, yFrac: pt.yFrac }], {
        color: DEFAULT_LINE_COLOR, lineWidth: DEFAULT_LINE_WIDTH, lineStyle: DEFAULT_LINE_STYLE,
      });
      selectAndReturnToCursor(d);
      return;
    }

    if (currentTool === 'horizontalRay') {
      // เหมือน horizontal แต่ลากจากจุดคลิกไปทางขวาอย่างเดียว
      const d = addDrawing('horizontalRay', [{ xFrac: pt.xFrac, yFrac: pt.yFrac }], {
        color: DEFAULT_LINE_COLOR, lineWidth: DEFAULT_LINE_WIDTH, lineStyle: DEFAULT_LINE_STYLE,
      });
      selectAndReturnToCursor(d);
      return;
    }

    if (currentTool === 'verticalLine') {
      const d = addDrawing('verticalLine', [{ xFrac: pt.xFrac, yFrac: pt.yFrac }], {
        color: DEFAULT_LINE_COLOR, lineWidth: DEFAULT_LINE_WIDTH, lineStyle: DEFAULT_LINE_STYLE,
      });
      selectAndReturnToCursor(d);
      return;
    }

    if (currentTool === 'crossLine') {
      const d = addDrawing('crossLine', [{ xFrac: pt.xFrac, yFrac: pt.yFrac }], {
        color: DEFAULT_LINE_COLOR, lineWidth: DEFAULT_LINE_WIDTH, lineStyle: DEFAULT_LINE_STYLE,
      });
      selectAndReturnToCursor(d);
      return;
    }

    if (currentTool === 'longPosition' || currentTool === 'shortPosition') {
      // คลิกจุดเดียว = จุด Entry แล้วสร้างกล่อง TP (เขียว) / SL (แดง) เริ่มต้นให้ทันที
      // Long: TP อยู่เหนือ entry (ราคาขึ้น = กำไร), SL อยู่ใต้ entry
      // Short: กลับด้านกัน (ราคาลง = กำไร)
      const direction = currentTool === 'longPosition' ? 'long' : 'short';
      const sign = direction === 'long' ? -1 : 1; // TP: y น้อยกว่า entry เมื่อเป็น long (อยู่สูงกว่าบนจอ)
      const entryPoint = { xFrac: pt.xFrac, yFrac: pt.yFrac };
      const tpPoint = { xFrac: pt.xFrac, yFrac: pt.yFrac + sign * POSITION_DEFAULT_REWARD_FRAC };
      const slPoint = { xFrac: pt.xFrac, yFrac: pt.yFrac - sign * POSITION_DEFAULT_RISK_FRAC };

      const d = addDrawing('position', [entryPoint, tpPoint, slPoint], {
        direction,
        boxWidthFrac: POSITION_DEFAULT_BOX_WIDTH_FRAC,
        tpColor: POSITION_TP_COLOR,
        slColor: POSITION_SL_COLOR,
        fillOpacity: POSITION_DEFAULT_FILL_OPACITY,
        accountSize: POSITION_DEFAULT_ACCOUNT_SIZE,
        riskPercent: POSITION_DEFAULT_RISK_PERCENT,
        riskMode: POSITION_DEFAULT_RISK_MODE,
        fixedRiskAmount: POSITION_DEFAULT_FIXED_RISK,
        contractMultiplier: POSITION_DEFAULT_CONTRACT_MULTIPLIER,
        lotStep: POSITION_DEFAULT_LOT_STEP,
        maxLeverage: POSITION_DEFAULT_MAX_LEVERAGE,
      });
      selectAndReturnToCursor(d);
      return;
    }

    // เครื่องมือแบบหลายจุด: ส่วนใหญ่ใช้ 2 จุด (trendline family, fibonacci, measure,
    // rectangle, circle/ellipse) ยกเว้น triangle ที่ต้องคลิก 3 จุดอิสระ
    if (tempPoints.length === 0) {
      firstPointPixel = { x: pt.x, y: pt.y }; // จำตำแหน่งจุดแรกไว้เช็คว่า "ลาก" หรือแค่ "คลิก" ตอนปล่อยเมาส์
    }
    tempPoints.push({ xFrac: pt.xFrac, yFrac: pt.yFrac });

    const pointsNeeded = (currentTool === 'triangle') ? 3 : 2;
    if (tempPoints.length === pointsNeeded) {
      finishMultiPointDrawing();
      return;
    }
    render();
  }

  // สร้างเส้น/รูปจริงจาก tempPoints ที่ครบตามจำนวนที่ต้องการแล้ว
  // เรียกได้จาก 2 ทาง: (1) คลิกครบทุกจุดใน onMouseDown (แบบคลิก-คลิก)
  //                    (2) ลากค้างแล้วปล่อยใน onMouseUp (แบบลาก-ปล่อย เหมือน TradingView จริง)
  function finishMultiPointDrawing() {
    let type = currentTool;
    let extra = {};

    if (TREND_TOOL_NAMES.includes(currentTool)) {
      // ไม่ว่าจะกดปุ่ม Trend Line / Ray / Extended Line / Info Line
      // ข้างในเก็บเป็น type 'trendline' เหมือนกันหมด ต่างกันแค่ค่าเริ่มต้น
      type = 'trendline';
      extra = {
        ...TREND_VARIANT_DEFAULTS[currentTool],
        color: DEFAULT_LINE_COLOR,
        lineWidth: DEFAULT_LINE_WIDTH,
        lineStyle: DEFAULT_LINE_STYLE,
      };
    } else if (currentTool === 'fibonacci') {
      // Fibonacci แต่ละเส้นมีชุดระดับเป็นของตัวเอง (Dynamic Levels)
      extra = { levels: createDefaultFibLevels(), labelPosition: 'right', valueMode: 'decimal' };
    } else if (currentTool === 'rectangle') {
      extra = { ...DEFAULT_SHAPE_STYLE, extendLeft: false, extendRight: false };
    } else if (currentTool === 'circle' || currentTool === 'ellipse') {
      // ปุ่ม Circle และ Ellipse ใช้กลไกเดียวกัน (วาดวงรีในกรอบสี่เหลี่ยมที่ลาก)
      // ถ้าลากให้กว้าง=สูงเท่ากันก็จะได้วงกลมพอดี ไม่ต้องแยก type
      type = 'ellipse';
      extra = { ...DEFAULT_SHAPE_STYLE };
    } else if (currentTool === 'triangle') {
      extra = { ...DEFAULT_SHAPE_STYLE };
    }

    const d = addDrawing(type, tempPoints.slice(), extra);
    tempPoints = [];
    previewPoint = null;
    firstPointPixel = null;
    previewFibLevels = null;
    selectAndReturnToCursor(d);
  }

  // วาดรูปเสร็จ 1 ชิ้น -> เลือกรูปนั้นทันที + สลับกลับไปโหมด cursor อัตโนมัติ
  // (พฤติกรรม default ของ TradingView; ในอนาคตจะมีปุ่ม "Stay in Drawing Mode"
  //  ให้ผู้ใช้เลือกค้างโหมดวาดไว้แทนพฤติกรรมนี้ได้)
  function selectAndReturnToCursor(drawing) {
    selectedId = drawing.id;
    setTool('cursor');
    if (onToolChangeCallback) onToolChangeCallback('cursor');
    fireSelectionChange();
  }

  function onMouseMove(e) {
    const pt = toXY(e);

    if (draggingHandle) {
      handleDragMove(pt);
      return;
    }
    if (tempPoints.length >= 1) {
      previewPoint = { xFrac: pt.xFrac, yFrac: pt.yFrac };
      render();
    }
  }

  function onMouseUp(e) {
    draggingHandle = null;

    // พฤติกรรมแบบ TradingView: ถ้ากดเมาส์ค้างแล้ว "ลาก" จริงๆ (ขยับเกิน threshold)
    // ให้ถือว่าปล่อยเมาส์ = วางจุดสุดท้ายและวาดเสร็จเลย ไม่ต้องรอคลิกซ้ำ
    // (ใช้ได้เฉพาะเครื่องมือ 2 จุด ไม่รวม triangle ที่ต้องคลิกอิสระ 3 จุด)
    if (tempPoints.length === 1 && currentTool !== 'triangle' && firstPointPixel) {
      const pt = toXY(e);
      const dx = pt.x - firstPointPixel.x;
      const dy = pt.y - firstPointPixel.y;
      const draggedDistance = Math.hypot(dx, dy);

      if (draggedDistance > DRAG_THRESHOLD_PX) {
        tempPoints.push({ xFrac: pt.xFrac, yFrac: pt.yFrac });
        finishMultiPointDrawing();
      }
      // ถ้าขยับน้อยกว่านี้ = แค่คลิกเบาๆ ไม่ได้ลาก -> ปล่อยให้รอคลิกจุดที่สองแยกตามปกติ (fallback)
    }
  }

  function onKeyDown(e) {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return; // อย่ารบกวนตอนพิมพ์ในช่อง input อื่น

    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !locked) {
      removeSelected();
    }
    if (e.key === 'Escape') {
      tempPoints = [];
      previewPoint = null;
      firstPointPixel = null;
      previewFibLevels = null;
      selectedId = null;
      fireSelectionChange();
      render();
    }
  }

  // ================================================================
  // SELECT / DRAG
  // ================================================================
  function handleSelectMouseDown(pt) {
    // เช็ค handle (จุดปลายเส้น) ของเส้นที่เลือกอยู่ก่อน เผื่อจะลากปรับ
    if (selectedId && !locked) {
      const d = drawings.find(x => x.id === selectedId);
      if (d) {
        const hIdx = hitTestHandle(d, pt);
        if (hIdx !== -1) {
          draggingHandle = { id: d.id, mode: 'point', index: hIdx };
          return;
        }
      }
    }

    const hit = hitTestDrawing(pt);
    if (hit) {
      selectedId = hit.id;
      if (!locked) {
        draggingHandle = {
          id: hit.id,
          mode: 'move',
          startPt: pt,
          originalPoints: hit.points.map(p => ({ ...p })),
        };
      }
    } else {
      selectedId = null;
    }
    fireSelectionChange();
    render();
  }

  function handleDragMove(pt) {
    const d = drawings.find(x => x.id === draggingHandle.id);
    if (!d) return;

    if (draggingHandle.mode === 'point') {
      if (d.type === 'position' && draggingHandle.index === 3) {
        // จุดยึดที่ 4 (virtual handle) = ปรับความกว้างกล่อง ไม่ใช่จุดราคา
        const newWidthFrac = pt.xFrac - d.points[0].xFrac;
        d.boxWidthFrac = Math.max(0.02, Math.min(0.9, newWidthFrac));
      } else {
        d.points[draggingHandle.index] = { xFrac: pt.xFrac, yFrac: pt.yFrac };
        if (d.type === 'position') sanitizePositionOrdering(d); // บังคับลำดับราคาให้ถูกเสมอ (Edge Case #1)
      }
    } else if (draggingHandle.mode === 'move') {
      const dx = pt.xFrac - draggingHandle.startPt.xFrac;
      const dy = pt.yFrac - draggingHandle.startPt.yFrac;
      d.points = draggingHandle.originalPoints.map(p => ({
        xFrac: p.xFrac + dx,
        yFrac: p.yFrac + dy,
      }));
    }
    render();
  }

  function hitTestDrawing(pt) {
    for (let i = drawings.length - 1; i >= 0; i--) {
      if (isPointNearDrawing(drawings[i], pt)) return drawings[i];
    }
    return null;
  }

  function isPointNearDrawing(d, pt) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const px = pt.x, py = pt.y;

    if (d.type === 'horizontal') {
      const y = d.points[0].yFrac * h;
      return Math.abs(py - y) < 6;
    }
    if (d.type === 'horizontalRay') {
      const x0 = d.points[0].xFrac * w, y = d.points[0].yFrac * h;
      return px >= x0 - 6 && Math.abs(py - y) < 6;
    }
    if (d.type === 'verticalLine') {
      const x = d.points[0].xFrac * w;
      return Math.abs(px - x) < 6;
    }
    if (d.type === 'crossLine') {
      const x = d.points[0].xFrac * w, y = d.points[0].yFrac * h;
      return Math.abs(py - y) < 6 || Math.abs(px - x) < 6;
    }
    if (d.type === 'text') {
      const x = d.points[0].xFrac * w, y = d.points[0].yFrac * h;
      return px > x - 4 && px < x + 100 && py > y - 14 && py < y + 6;
    }
    if (d.type === 'trendline') {
      // เช็คตามเส้นที่ "แสดงผลจริง" (รวมส่วนต่อขยายถ้ามี) ไม่ใช่แค่ช่วง 2 จุดเดิม
      const p1 = toPixel(d.points[0], w, h);
      const p2 = toPixel(d.points[1], w, h);
      const { start, end } = getExtendedEndpoints(p1, p2, d.extendLeft, d.extendRight, w, h);
      return distToSegment({ x: px, y: py }, start, end) < 6;
    }
    if (d.type === 'rectangle') {
      const p1 = toPixel(d.points[0], w, h);
      const p2 = toPixel(d.points[1], w, h);
      let x1 = Math.min(p1.x, p2.x), x2 = Math.max(p1.x, p2.x);
      const y1 = Math.min(p1.y, p2.y), y2 = Math.max(p1.y, p2.y);
      if (d.extendLeft) x1 = 0;
      if (d.extendRight) x2 = w;
      // คลิกได้ทั้งขอบและด้านในของพื้นที่สี่เหลี่ยม (ใช้งานง่ายกว่าบังคับให้โดนเส้นขอบเป๊ะๆ)
      return px >= x1 - 4 && px <= x2 + 4 && py >= y1 - 4 && py <= y2 + 4;
    }
    if (d.type === 'ellipse') {
      const p1 = toPixel(d.points[0], w, h);
      const p2 = toPixel(d.points[1], w, h);
      const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
      const rx = Math.max(Math.abs(p2.x - p1.x) / 2, 1), ry = Math.max(Math.abs(p2.y - p1.y) / 2, 1);
      const norm = ((px - cx) ** 2) / (rx ** 2) + ((py - cy) ** 2) / (ry ** 2);
      return norm <= 1.15; // เผื่อระยะคลาดเคลื่อนเล็กน้อยรอบขอบวงรี
    }
    if (d.type === 'triangle') {
      if (d.points.length < 3) return false;
      const pts = d.points.map(p => toPixel(p, w, h));
      if (pointInTriangle({ x: px, y: py }, pts[0], pts[1], pts[2])) return true;
      // ถ้าไม่ได้อยู่ข้างใน ลองเช็คว่าใกล้เส้นขอบทั้ง 3 ด้านไหม
      return (
        distToSegment({ x: px, y: py }, pts[0], pts[1]) < 6 ||
        distToSegment({ x: px, y: py }, pts[1], pts[2]) < 6 ||
        distToSegment({ x: px, y: py }, pts[2], pts[0]) < 6
      );
    }
    if (d.type === 'position') {
      const entry = toPixel(d.points[0], w, h);
      const tp = toPixel(d.points[1], w, h);
      const sl = toPixel(d.points[2], w, h);
      const x1 = entry.x;
      const x2 = entry.x + (d.boxWidthFrac || 0.18) * w;
      const yTop = Math.min(tp.y, sl.y);
      const yBottom = Math.max(tp.y, sl.y);
      return px >= x1 - 4 && px <= x2 + 4 && py >= yTop - 4 && py <= yBottom + 4;
    }
    if (d.points.length === 2) {
      const p1 = { x: d.points[0].xFrac * w, y: d.points[0].yFrac * h };
      const p2 = { x: d.points[1].xFrac * w, y: d.points[1].yFrac * h };
      return distToSegment({ x: px, y: py }, p1, p2) < 6;
    }
    return false;
  }

  // Point-in-triangle test ด้วยวิธีเช็คเครื่องหมาย cross product ทั้ง 3 ด้าน
  function pointInTriangle(p, a, b, c) {
    const sign = (p1, p2, p3) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    const d1 = sign(p, a, b), d2 = sign(p, b, c), d3 = sign(p, c, a);
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    return !(hasNeg && hasPos);
  }

  // คำนวณจุดปลายเส้นจริงที่จะวาดบนจอ โดยต่อขยายไปทาง extendLeft/extendRight
  // ไปจนสุดขอบ canvas ตามสมการเส้นตรง (ใช้ทั้งตอนวาดและตอน hit-test)
  function getExtendedEndpoints(p1, p2, extendLeft, extendRight, w, h) {
    let start = { ...p1 };
    let end = { ...p2 };
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const isVertical = Math.abs(dx) < 0.0001;

    if (extendRight) {
      if (isVertical) {
        end = { x: p2.x, y: dy >= 0 ? h : 0 };
      } else {
        const slope = dy / dx;
        const targetX = dx > 0 ? w : 0;
        end = { x: targetX, y: p1.y + slope * (targetX - p1.x) };
      }
    }
    if (extendLeft) {
      if (isVertical) {
        start = { x: p1.x, y: dy >= 0 ? 0 : h };
      } else {
        const slope = dy / dx;
        const targetX = dx > 0 ? 0 : w;
        start = { x: targetX, y: p1.y + slope * (targetX - p1.x) };
      }
    }
    return { start, end };
  }

  function distToSegment(p, a, b) {
    const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const proj = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    return Math.hypot(p.x - proj.x, p.y - proj.y);
  }

  function hitTestHandle(d, pt) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (let i = 0; i < d.points.length; i++) {
      const x = d.points[i].xFrac * w, y = d.points[i].yFrac * h;
      if (Math.hypot(pt.x - x, pt.y - y) < 7) return i;
    }
    // Position มีจุดยึดที่ 4 แบบ virtual (ไม่ได้เก็บใน d.points) ไว้ลากปรับความกว้างกล่องโดยเฉพาะ
    if (d.type === 'position') {
      const entry = d.points[0];
      const widthHandleX = (entry.xFrac + (d.boxWidthFrac || POSITION_DEFAULT_BOX_WIDTH_FRAC)) * w;
      const widthHandleY = entry.yFrac * h;
      if (Math.hypot(pt.x - widthHandleX, pt.y - widthHandleY) < 7) return 3;
    }
    return -1;
  }

  // ================================================================
  // RENDER
  // ================================================================
  function render() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    if (!visible) return;

    drawings.forEach(d => drawOne(d, w, h, d.id === selectedId));

    // พรีวิวรูประหว่างกำลังวาด (คลิกไปแล้วอย่างน้อย 1 จุด ยังไม่ครบ รอจุดสุดท้าย)
    // ใช้ได้ทั้งเครื่องมือ 2 จุด (เส้น/fibonacci/rectangle/ellipse) และ 3 จุด (triangle)
    if (tempPoints.length >= 1 && previewPoint) {
      let previewType = currentTool;
      let previewExtra = { color: DEFAULT_LINE_COLOR, lineWidth: DEFAULT_LINE_WIDTH, lineStyle: DEFAULT_LINE_STYLE };

      if (TREND_TOOL_NAMES.includes(currentTool)) {
        previewType = 'trendline';
        previewExtra = { ...previewExtra, ...TREND_VARIANT_DEFAULTS[currentTool] };
      } else if (currentTool === 'fibonacci') {
        // สำคัญ: ต้องมี levels ให้ preview ด้วย ไม่งั้นตอนลากจะเห็นแค่เส้นเปล่าๆ
        // ไม่มีตัวเลข/สี Fibo โผล่ขึ้นมาจนกว่าจะปล่อยเมาส์ (ต้องเหมือน TradingView
        // ที่โชว์ระดับ Fibo แบบเรียลไทม์ตั้งแต่ยังลากอยู่)
        if (!previewFibLevels) previewFibLevels = createDefaultFibLevels();
        previewExtra = { levels: previewFibLevels, labelPosition: 'right', valueMode: 'decimal' };
      } else if (currentTool === 'rectangle' || currentTool === 'triangle') {
        previewExtra = { ...DEFAULT_SHAPE_STYLE };
      } else if (currentTool === 'circle' || currentTool === 'ellipse') {
        previewType = 'ellipse';
        previewExtra = { ...DEFAULT_SHAPE_STYLE };
      }

      drawOne({ type: previewType, points: [...tempPoints, previewPoint], ...previewExtra }, w, h, false, true);
    }
  }

  function toPixel(pt, w, h) {
    return { x: pt.xFrac * w, y: pt.yFrac * h };
  }

  function drawHandles(points) {
    points.forEach(p => {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#2962ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  function drawOne(d, w, h, selected = false, isPreview = false) {
    ctx.save();
    ctx.globalAlpha = isPreview ? 0.55 : 1;

    if (d.type === 'trendline') {
      const p1 = toPixel(d.points[0], w, h);
      const p2 = toPixel(d.points[1], w, h);
      const { start, end } = getExtendedEndpoints(p1, p2, d.extendLeft, d.extendRight, w, h);

      ctx.strokeStyle = d.color || COLOR_TRENDLINE;
      ctx.lineWidth = selected ? (d.lineWidth || 2) + 0.8 : (d.lineWidth || 2);
      ctx.setLineDash(LINE_STYLE_DASH[d.lineStyle] || []);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);

      if (d.showInfo) drawTrendlineInfo(p1, p2);
      // handle การลากยังคงอยู่ที่จุดยึดดั้งเดิม (p1, p2) ไม่ใช่จุดที่ต่อขยายแล้ว
      if (selected) drawHandles([p1, p2]);

    } else if (d.type === 'horizontal') {
      const y = d.points[0].yFrac * h;
      ctx.strokeStyle = d.color || COLOR_HORIZONTAL;
      ctx.lineWidth = selected ? (d.lineWidth || 2) + 0.8 : (d.lineWidth || 2);
      ctx.setLineDash(LINE_STYLE_DASH[d.lineStyle] || []);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.setLineDash([]);

      const price = typeof ChartModule !== 'undefined' && ChartModule.priceAtY(y);
      if (price != null) {
        drawPriceTag(price, y, w, d.color || COLOR_HORIZONTAL);
      }
      if (selected) drawHandles([{ x: w / 2, y }]);

    } else if (d.type === 'horizontalRay') {
      const x0 = d.points[0].xFrac * w, y = d.points[0].yFrac * h;
      ctx.strokeStyle = d.color || COLOR_HORIZONTAL;
      ctx.lineWidth = selected ? (d.lineWidth || 2) + 0.8 : (d.lineWidth || 2);
      ctx.setLineDash(LINE_STYLE_DASH[d.lineStyle] || []);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.setLineDash([]);

      const price = typeof ChartModule !== 'undefined' && ChartModule.priceAtY(y);
      if (price != null) drawPriceTag(price, y, w, d.color || COLOR_HORIZONTAL);
      if (selected) drawHandles([{ x: x0, y }]);

    } else if (d.type === 'verticalLine') {
      const x = d.points[0].xFrac * w;
      ctx.strokeStyle = d.color || COLOR_TRENDLINE;
      ctx.lineWidth = selected ? (d.lineWidth || 2) + 0.8 : (d.lineWidth || 2);
      ctx.setLineDash(LINE_STYLE_DASH[d.lineStyle] || []);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.setLineDash([]);
      if (selected) drawHandles([{ x, y: h / 2 }]);

    } else if (d.type === 'crossLine') {
      const x = d.points[0].xFrac * w, y = d.points[0].yFrac * h;
      ctx.strokeStyle = d.color || COLOR_TRENDLINE;
      ctx.lineWidth = selected ? (d.lineWidth || 2) + 0.8 : (d.lineWidth || 2);
      ctx.setLineDash(LINE_STYLE_DASH[d.lineStyle] || []);
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
      ctx.stroke();
      ctx.setLineDash([]);

      const price = typeof ChartModule !== 'undefined' && ChartModule.priceAtY(y);
      if (price != null) drawPriceTag(price, y, w, d.color || COLOR_TRENDLINE);
      if (selected) drawHandles([{ x, y }]);

    } else if (d.type === 'fibonacci') {
      const p1 = toPixel(d.points[0], w, h);
      const p2 = toPixel(d.points[1], w, h);
      const x1 = Math.min(p1.x, p2.x), x2 = Math.max(p1.x, p2.x);
      const levels = d.levels || [];
      const labelPosition = d.labelPosition || 'right';
      const valueMode = d.valueMode || 'decimal';

      levels.forEach((lvl, i) => {
        if (!lvl.enabled) return;

        // สำคัญ: 0% ต้องอยู่ที่จุดคลิก "ที่สอง" (จุดปลาย) และ 100% อยู่ที่จุดคลิก "แรก" (จุดเริ่ม)
        // ตามธรรมเนียม TradingView — ถ้าลากจาก Low ไป High (หาจังหวะ Buy) 0% จะอยู่ที่ High
        // และ 100% อยู่ที่ Low ตัวเลข % จึงสื่อถึง "ย่อตัวจาก High กลับเข้าหา Low" ได้ถูกต้อง
        const y = p1.y + (p2.y - p1.y) * (1 - lvl.value);
        ctx.strokeStyle = lvl.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();

        // แถบสีจางๆ คั่นระหว่างระดับที่ "เปิดอยู่ทั้งคู่" ที่อยู่ติดกันในลิสต์
        const next = levels[i + 1];
        if (next && next.enabled) {
          const yNext = p1.y + (p2.y - p1.y) * (1 - next.value);
          ctx.fillStyle = hexToRgba(lvl.color, 0.06);
          ctx.fillRect(x1, Math.min(y, yNext), x2 - x1, Math.abs(yNext - y));
        }

        const price = typeof ChartModule !== 'undefined' && ChartModule.priceAtY(y);
        const valueLabel = valueMode === 'percent' ? `${(lvl.value * 100).toFixed(1)}%` : lvl.value.toFixed(3);
        const label = price != null ? `${valueLabel}  ${price.toFixed(5)}` : valueLabel;

        ctx.font = '10px sans-serif';
        ctx.fillStyle = lvl.color;
        const tw = ctx.measureText(label).width;
        let labelX;
        if (labelPosition === 'left') labelX = x1 - tw - 6;
        else if (labelPosition === 'center') labelX = (x1 + x2) / 2 - tw / 2;
        else labelX = x2 + 4; // right (default)
        ctx.fillText(label, labelX, y + 3);
      });

      // เส้นทแยงบางๆ เชื่อมจุดเริ่ม-จบ
      ctx.strokeStyle = COLOR_FIB_LINE;
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);

      if (selected) drawHandles([p1, p2]);

    } else if (d.type === 'rectangle') {
      const p1 = toPixel(d.points[0], w, h);
      const p2 = toPixel(d.points[1], w, h);
      let x1 = Math.min(p1.x, p2.x), x2 = Math.max(p1.x, p2.x);
      const y1 = Math.min(p1.y, p2.y), y2 = Math.max(p1.y, p2.y);
      if (d.extendLeft) x1 = 0;
      if (d.extendRight) x2 = w;

      ctx.fillStyle = hexToRgba(d.fillColor || '#2962ff', d.fillOpacity != null ? d.fillOpacity : 0.15);
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

      ctx.strokeStyle = d.color || '#2962ff';
      ctx.lineWidth = selected ? 2.4 : 1.6;
      ctx.setLineDash(LINE_STYLE_DASH[d.lineStyle] || []);
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.setLineDash([]);

      // handle การลากยังคงอยู่ที่มุมเดิม แม้จะกด extend ไปแล้วก็ตาม
      if (selected) drawHandles([p1, p2]);

    } else if (d.type === 'ellipse') {
      const p1 = toPixel(d.points[0], w, h);
      const p2 = toPixel(d.points[1], w, h);
      const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
      const rx = Math.abs(p2.x - p1.x) / 2, ry = Math.abs(p2.y - p1.y) / 2;

      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(rx, 0.01), Math.max(ry, 0.01), 0, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(d.fillColor || '#2962ff', d.fillOpacity != null ? d.fillOpacity : 0.15);
      ctx.fill();
      ctx.strokeStyle = d.color || '#2962ff';
      ctx.lineWidth = selected ? 2.4 : 1.6;
      ctx.setLineDash(LINE_STYLE_DASH[d.lineStyle] || []);
      ctx.stroke();
      ctx.setLineDash([]);

      if (selected) drawHandles([p1, p2]);

    } else if (d.type === 'triangle') {
      const pts = d.points.map(p => toPixel(p, w, h));
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      if (pts.length >= 3) ctx.closePath();

      if (pts.length >= 3) {
        ctx.fillStyle = hexToRgba(d.fillColor || '#2962ff', d.fillOpacity != null ? d.fillOpacity : 0.15);
        ctx.fill();
      }
      ctx.strokeStyle = d.color || '#2962ff';
      ctx.lineWidth = selected ? 2.4 : 1.6;
      ctx.setLineDash(LINE_STYLE_DASH[d.lineStyle] || []);
      ctx.stroke();
      ctx.setLineDash([]);

      if (selected) drawHandles(pts);

    } else if (d.type === 'position') {
      const entry = toPixel(d.points[0], w, h);
      const tp = toPixel(d.points[1], w, h);
      const sl = toPixel(d.points[2], w, h);
      const x1 = entry.x;
      const boxWidthFrac = d.boxWidthFrac || POSITION_DEFAULT_BOX_WIDTH_FRAC;
      const x2 = entry.x + boxWidthFrac * w;
      const tpColor = d.tpColor || POSITION_TP_COLOR;
      const slColor = d.slColor || POSITION_SL_COLOR;
      const fillOpacity = d.fillOpacity != null ? d.fillOpacity : POSITION_DEFAULT_FILL_OPACITY;

      // โซน Take Profit (เขียว) และ Stop Loss (แดง)
      ctx.fillStyle = hexToRgba(tpColor, fillOpacity);
      ctx.fillRect(x1, Math.min(entry.y, tp.y), x2 - x1, Math.abs(tp.y - entry.y));
      ctx.fillStyle = hexToRgba(slColor, fillOpacity);
      ctx.fillRect(x1, Math.min(entry.y, sl.y), x2 - x1, Math.abs(sl.y - entry.y));

      // เส้นขอบบน (TP), เส้น Entry (กลาง, เส้นทึบสีกลาง), เส้นขอบล่าง (SL)
      ctx.lineWidth = selected ? 2 : 1.4;
      ctx.strokeStyle = tpColor;
      ctx.beginPath(); ctx.moveTo(x1, tp.y); ctx.lineTo(x2, tp.y); ctx.stroke();
      ctx.strokeStyle = slColor;
      ctx.beginPath(); ctx.moveTo(x1, sl.y); ctx.lineTo(x2, sl.y); ctx.stroke();
      ctx.strokeStyle = '#d1d4dc';
      ctx.beginPath(); ctx.moveTo(x1, entry.y); ctx.lineTo(x2, entry.y); ctx.stroke();

      const entryPrice = typeof ChartModule !== 'undefined' ? ChartModule.priceAtY(entry.y) : null;
      const tpPrice = typeof ChartModule !== 'undefined' ? ChartModule.priceAtY(tp.y) : null;
      const slPrice = typeof ChartModule !== 'undefined' ? ChartModule.priceAtY(sl.y) : null;

      ctx.font = '11px sans-serif';
      if (entryPrice != null && tpPrice != null && slPrice != null) {
        // ราคาปัจจุบัน (แท่งล่าสุด) สำหรับคำนวณ Open P&L
        let currentPrice = null;
        if (typeof ChartModule !== 'undefined' && typeof ChartModule.getCandles === 'function') {
          const candles = ChartModule.getCandles();
          if (candles && candles.length) currentPrice = candles[candles.length - 1].close;
        }

        const m = computePositionMetrics({
          entryPrice, tpPrice, slPrice, direction: d.direction,
          accountSize: d.accountSize != null ? d.accountSize : POSITION_DEFAULT_ACCOUNT_SIZE,
          riskMode: d.riskMode || POSITION_DEFAULT_RISK_MODE,
          riskPercent: d.riskPercent != null ? d.riskPercent : POSITION_DEFAULT_RISK_PERCENT,
          fixedRiskAmount: d.fixedRiskAmount != null ? d.fixedRiskAmount : POSITION_DEFAULT_FIXED_RISK,
          contractMultiplier: d.contractMultiplier != null ? d.contractMultiplier : POSITION_DEFAULT_CONTRACT_MULTIPLIER,
          lotStep: d.lotStep != null ? d.lotStep : POSITION_DEFAULT_LOT_STEP,
          maxLeverage: d.maxLeverage != null ? d.maxLeverage : POSITION_DEFAULT_MAX_LEVERAGE,
          currentPrice,
        });

        const rewardPct = (m.targetDelta / entryPrice) * 100;
        const riskPct = (m.stopDelta / entryPrice) * 100;

        ctx.fillStyle = tpColor;
        ctx.fillText(`TP  ${tpPrice.toFixed(5)}  (+${rewardPct.toFixed(2)}%)`, x2 + 6, tp.y + 4);
        ctx.fillStyle = slColor;
        ctx.fillText(`SL  ${slPrice.toFixed(5)}  (-${riskPct.toFixed(2)}%)`, x2 + 6, sl.y + 4);
        ctx.fillStyle = '#d1d4dc';
        ctx.fillText(`Entry  ${entryPrice.toFixed(5)}`, x2 + 6, entry.y + 4);

        // ---- Info Label Card กลางกล่อง: RRR, Open P&L, Target Profit, Stop Loss, Quantity ----
        const dirLabel = d.direction === 'long' ? 'LONG' : 'SHORT';
        const rrrText = m.rrr != null ? `1:${m.rrr.toFixed(2)}` : 'N/A';
        const pnlText = m.openPnl != null ? `${m.openPnl >= 0 ? '+' : ''}$${m.openPnl.toFixed(2)}` : '—';

        const cardLines = [
          `${dirLabel}   R:R ${rrrText}`,
          `Qty ${m.quantity.toFixed(2)}   Open P&L ${pnlText}`,
          `Target +$${m.profitAmount.toFixed(2)} (+${m.profitPercent.toFixed(2)}%)`,
          `Stop  -$${m.lossAmount.toFixed(2)} (-${m.lossPercent.toFixed(2)}%)`,
        ];
        if (m.marginWarning) cardLines.push('⚠ Insufficient Margin');

        ctx.font = '10px sans-serif';
        const cardWidth = Math.max(...cardLines.map(l => ctx.measureText(l).width)) + 14;
        const lineHeight = 14;
        const cardHeight = cardLines.length * lineHeight + 8;
        const midX = (x1 + x2) / 2;
        const cardTop = entry.y - cardHeight - 10;

        ctx.fillStyle = m.marginWarning ? '#3a1f1f' : '#1a1e27ee';
        ctx.fillRect(midX - cardWidth / 2, cardTop, cardWidth, cardHeight);
        ctx.strokeStyle = m.marginWarning ? '#ef5350' : '#2e333d';
        ctx.lineWidth = 1;
        ctx.strokeRect(midX - cardWidth / 2, cardTop, cardWidth, cardHeight);

        cardLines.forEach((line, i) => {
          ctx.fillStyle = (i === 0)
            ? (d.direction === 'long' ? tpColor : slColor)
            : (line.startsWith('⚠') ? '#ef5350' : '#d1d4dc');
          ctx.fillText(line, midX - cardWidth / 2 + 7, cardTop + 8 + lineHeight * i + 9);
        });
      }

      if (selected) {
        drawHandles([entry, tp, sl]);
        // จุดยึดที่ 4 (สี่เหลี่ยมเล็กๆ แทนวงกลม) ไว้ลากขยาย/หด ความกว้างกล่อง
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x2 - 4, entry.y - 4, 8, 8);
        ctx.strokeRect(x2 - 4, entry.y - 4, 8, 8);
      }

    } else if (d.type === 'measure') {
      const p1 = toPixel(d.points[0], w, h);
      const p2 = toPixel(d.points[1], w, h);
      ctx.strokeStyle = COLOR_MEASURE;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const price1 = typeof ChartModule !== 'undefined' && ChartModule.priceAtY(p1.y);
      const price2 = typeof ChartModule !== 'undefined' && ChartModule.priceAtY(p2.y);
      if (price1 != null && price2 != null) {
        const diff = price2 - price1;
        const pct = (diff / price1) * 100;
        const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
        const label = `${diff >= 0 ? '+' : ''}${diff.toFixed(5)}  (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`;
        ctx.font = '11px sans-serif';
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = diff >= 0 ? '#26a69a' : '#ef5350';
        ctx.fillRect(midX - tw / 2 - 6, midY - 18, tw + 12, 18);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, midX - tw / 2, midY - 5);
      }
      if (selected) drawHandles([p1, p2]);

    } else if (d.type === 'text') {
      const p = toPixel(d.points[0], w, h);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = COLOR_TEXT;
      ctx.fillText(d.text || '', p.x, p.y);
      if (selected) {
        const tw = ctx.measureText(d.text || '').width;
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x - 4, p.y - 14, tw + 8, 20);
      }
    }

    ctx.restore();
  }

  function drawPriceTag(price, y, w, color) {
    const label = price.toFixed(5);
    ctx.font = '11px sans-serif';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = color;
    ctx.fillRect(w - tw - 12, y - 9, tw + 10, 18);
    ctx.fillStyle = '#0c0e13';
    ctx.fillText(label, w - tw - 7, y + 4);
  }

  // Info Line: กล่องข้อความเล็กๆ กลางเส้นเทรนด์ บอกระยะราคา, จำนวนแท่ง, และองศาของเส้น
  function drawTrendlineInfo(p1, p2) {
    const priceStart = typeof ChartModule !== 'undefined' && ChartModule.priceAtY(p1.y);
    const priceEnd = typeof ChartModule !== 'undefined' && ChartModule.priceAtY(p2.y);
    let priceLabel = '';
    if (priceStart != null && priceEnd != null) {
      const diff = priceEnd - priceStart;
      priceLabel = `${diff >= 0 ? '+' : ''}${diff.toFixed(5)}`;
    }

    let barsLabel = '';
    if (typeof ChartModule !== 'undefined' && typeof ChartModule.getCandles === 'function') {
      const candles = ChartModule.getCandles();
      if (candles && candles.length) {
        const candleW = canvas.clientWidth / candles.length;
        const bars = Math.round(Math.abs(p2.x - p1.x) / candleW);
        barsLabel = `${bars} แท่ง`;
      }
    }

    // มุมเอียงของเส้นบนจอ (พิกเซล) — เป็นค่าประมาณสำหรับดูทิศทาง ไม่ใช่มุมราคาจริง
    const angleDeg = Math.atan2(-(p2.y - p1.y), p2.x - p1.x) * (180 / Math.PI);
    const angleLabel = `${angleDeg.toFixed(1)}°`;

    const parts = [priceLabel, barsLabel, angleLabel].filter(Boolean);
    const label = parts.join('   ');
    if (!label) return;

    const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
    ctx.font = '11px sans-serif';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = '#1a1e27ee';
    ctx.fillRect(midX - tw / 2 - 6, midY - 22, tw + 12, 18);
    ctx.strokeStyle = '#2e333d';
    ctx.lineWidth = 1;
    ctx.strokeRect(midX - tw / 2 - 6, midY - 22, tw + 12, 18);
    ctx.fillStyle = '#d1d4dc';
    ctx.fillText(label, midX - tw / 2, midY - 9);
  }

  function hexToRgba(hex, alpha) {
    const bigint = parseInt(hex.replace('#', ''), 16);
    const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return {
    init, setTool, onToolChange, onSelectionChange, getSelectedDrawing,
    clearAll, removeSelected,
    setVisible, setLocked, setMagnet,
    setLineColor, setLineWidth, setLineStyle, setLineExtend, setLineShowInfo,
    setShapeBorderColor, setShapeFillColor, setShapeFillOpacity, setShapeLineStyle, setShapeExtend,
    setPositionTpColor, setPositionSlColor, setPositionFillOpacity, setPositionBoxWidth, setPositionDirection,
    setPositionRiskMode, setPositionFixedRiskAmount, setPositionContractMultiplier, setPositionLotStep, setPositionMaxLeverage,
    setPositionEntryPrice, setPositionTpPrice, setPositionSlPrice,
    computePositionMetrics,
    setPositionAccountSize, setPositionRiskPercent,
    addFibLevel, removeFibLevel, updateFibLevel, setFibLabelPosition, setFibValueMode,
    render,
  };
})();
