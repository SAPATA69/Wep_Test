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

    if (magnetOn && window.ChartModule && typeof ChartModule.getCandles === 'function') {
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
    if (!window.ChartModule || typeof ChartModule.priceAtY !== 'function') return null;
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
      // เส้นแนวนอนใช้แค่คลิกเดียว (ระบุแค่ระดับราคา y)
      const d = addDrawing('horizontal', [{ xFrac: pt.xFrac, yFrac: pt.yFrac }]);
      selectAndReturnToCursor(d);
      return;
    }

    // เครื่องมือแบบ 2 จุด: trendline, fibonacci, measure
    tempPoints.push({ xFrac: pt.xFrac, yFrac: pt.yFrac });
    if (tempPoints.length === 2) {
      let extra = {};
      if (currentTool === 'fibonacci') {
        // Fibonacci แต่ละเส้นมีชุดระดับเป็นของตัวเอง (Dynamic Levels)
        extra = { levels: createDefaultFibLevels(), labelPosition: 'right', valueMode: 'decimal' };
      }
      const d = addDrawing(currentTool, tempPoints.slice(), extra);
      tempPoints = [];
      previewPoint = null;
      selectAndReturnToCursor(d);
      return;
    }
    render();
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
    if (tempPoints.length === 1) {
      previewPoint = { xFrac: pt.xFrac, yFrac: pt.yFrac };
      render();
    }
  }

  function onMouseUp() {
    draggingHandle = null;
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
      d.points[draggingHandle.index] = { xFrac: pt.xFrac, yFrac: pt.yFrac };
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
    if (d.type === 'text') {
      const x = d.points[0].xFrac * w, y = d.points[0].yFrac * h;
      return px > x - 4 && px < x + 100 && py > y - 14 && py < y + 6;
    }
    if (d.points.length === 2) {
      const p1 = { x: d.points[0].xFrac * w, y: d.points[0].yFrac * h };
      const p2 = { x: d.points[1].xFrac * w, y: d.points[1].yFrac * h };
      return distToSegment({ x: px, y: py }, p1, p2) < 6;
    }
    return false;
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

    // พรีวิวเส้นระหว่างกำลังวาด (คลิกจุดแรกไปแล้ว รอจุดที่สอง)
    if (tempPoints.length === 1 && previewPoint) {
      drawOne({ type: currentTool, points: [tempPoints[0], previewPoint] }, w, h, false, true);
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
      ctx.strokeStyle = COLOR_TRENDLINE;
      ctx.lineWidth = selected ? 2.4 : 1.6;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      if (selected) drawHandles([p1, p2]);

    } else if (d.type === 'horizontal') {
      const y = d.points[0].yFrac * h;
      ctx.strokeStyle = COLOR_HORIZONTAL;
      ctx.lineWidth = selected ? 2.4 : 1.6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      const price = window.ChartModule && ChartModule.priceAtY(y);
      if (price != null) {
        drawPriceTag(price, y, w, COLOR_HORIZONTAL);
      }
      if (selected) drawHandles([{ x: w / 2, y }]);

    } else if (d.type === 'fibonacci') {
      const p1 = toPixel(d.points[0], w, h);
      const p2 = toPixel(d.points[1], w, h);
      const x1 = Math.min(p1.x, p2.x), x2 = Math.max(p1.x, p2.x);
      const levels = d.levels || [];
      const labelPosition = d.labelPosition || 'right';
      const valueMode = d.valueMode || 'decimal';

      levels.forEach((lvl, i) => {
        if (!lvl.enabled) return;

        const y = p1.y + (p2.y - p1.y) * lvl.value;
        ctx.strokeStyle = lvl.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();

        // แถบสีจางๆ คั่นระหว่างระดับที่ "เปิดอยู่ทั้งคู่" ที่อยู่ติดกันในลิสต์
        const next = levels[i + 1];
        if (next && next.enabled) {
          const yNext = p1.y + (p2.y - p1.y) * next.value;
          ctx.fillStyle = hexToRgba(lvl.color, 0.06);
          ctx.fillRect(x1, Math.min(y, yNext), x2 - x1, Math.abs(yNext - y));
        }

        const price = window.ChartModule && ChartModule.priceAtY(y);
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

      const price1 = window.ChartModule && ChartModule.priceAtY(p1.y);
      const price2 = window.ChartModule && ChartModule.priceAtY(p2.y);
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

  function hexToRgba(hex, alpha) {
    const bigint = parseInt(hex.replace('#', ''), 16);
    const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return {
    init, setTool, onToolChange, onSelectionChange, getSelectedDrawing,
    clearAll, removeSelected,
    setVisible, setLocked, setMagnet,
    addFibLevel, removeFibLevel, updateFibLevel, setFibLabelPosition, setFibValueMode,
    render,
  };
})();