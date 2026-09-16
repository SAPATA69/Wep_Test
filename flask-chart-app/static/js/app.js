/* ============================================================
   APP.JS
   ------------------------------------------------------------
   ไฟล์นี้รับผิดชอบ "พฤติกรรม/interaction" ของหน้าเว็บ:
     - เอาไอคอนจาก icons.js มาใส่ในปุ่มต่างๆ อัตโนมัติ
     - เปิด/ปิดแถบ Replay
     - นาฬิกามุมขวาล่าง
     - เริ่มต้นกราฟผ่าน chart.js (ดึงข้อมูลจาก Flask API)
     - สลับ timeframe แล้วโหลดข้อมูลใหม่
     - ผูกปุ่มเครื่องมือวาดฝั่งซ้ายเข้ากับ drawings.js

   ไฟล์นี้ "ไม่ต้องแก้" ถ้าคุณแค่อยากเปลี่ยนรูปไอคอน
   (ไปแก้ที่ icons.js แทน)
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  // ---- 1) ฝังไอคอนทั้งหมดจาก icons.js ----
  document.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.getAttribute('data-icon');
    if (ICONS[name]) {
      el.innerHTML = ICONS[name];
    } else {
      console.warn(`ไม่พบไอคอนชื่อ "${name}" ใน icons.js`);
    }
  });

  // ---- 2) เริ่มต้นกราฟ (ดึงข้อมูลจาก /api/candles) ----
  await ChartModule.init({
    canvasEl: document.getElementById('chartCanvas'),
    priceScaleElement: document.getElementById('priceScale'),
    ohlcElement: document.getElementById('ohlcReadout'),
    symbol: 'AUDUSD',
    timeframe: '1h',
    candleCount: 140,
  });

  // ---- 3) เริ่มต้นระบบเครื่องมือวาด (overlay canvas ทับกราฟ) ----
  DrawingsModule.init({
    canvasEl: document.getElementById('drawingCanvas'),
    containerEl: document.getElementById('chartArea'),
  });

  // ---- 3.0) เริ่มต้นแถบเครื่องมือซ้าย (ปุ่ม + tooltip + เมนูย่อย) ----
  SidebarModule.init({
    containerEl: document.getElementById('sidebarToolsContainer'),
  });

  // เมื่อ drawings.js เปลี่ยนเครื่องมือเอง (เช่น วาง text เสร็จแล้วสลับกลับ cursor อัตโนมัติ)
  // ให้ sidebar sync ปุ่ม active + ไอคอนหลักของกลุ่มให้ตรงกันด้วย
  DrawingsModule.onToolChange((tool) => {
    SidebarModule.setActiveTool(tool);
  });

  // ---- 3.1) Panel ตั้งค่า Fibonacci (Dynamic Levels) ----
  const fibPanel = document.getElementById('fibPanel');
  const fibLevelsList = document.getElementById('fibLevelsList');
  const fibLabelPosition = document.getElementById('fibLabelPosition');
  const fibValueMode = document.getElementById('fibValueMode');
  const fibAddLevelBtn = document.getElementById('fibAddLevelBtn');
  const fibPanelClose = document.getElementById('fibPanelClose');

  // ---- 3.0.1) Floating Drawing Toolbar (ลอยเหนือ drawing ที่เลือกอยู่ — ตอนนี้รองรับ Position เท่านั้น) ----
  const drawingToolbar = document.getElementById('drawingToolbar');
  const chartAreaEl = document.getElementById('chartArea'); // ใช้ clamp ไม่ให้ toolbar หลุดขอบ
  const drawingCanvasEl = document.getElementById('drawingCanvas');
  const dtGripHandle = document.getElementById('dtGripHandle');
  const dtLockBtn = document.getElementById('dtLockBtn');
  const dtTrashBtn = document.getElementById('dtTrashBtn');
  const dtSettingsBtn = document.getElementById('dtSettingsBtn');

  // ระยะที่ผู้ใช้เคยลาก toolbar ไป (จำแบบ "เดียวกันทุกกล่อง" ตามที่ตกลงกันไว้
  // ไม่ใช่จำแยกต่อกล่อง — ค่านี้จะรีเซ็ตกลับ 0 ตอน refresh หน้าเว็บใหม่)
  let toolbarOffset = { dx: 0, dy: 0 };
  let toolbarDragging = false;
  let toolbarDragStartMouse = null;
  let toolbarDragStartOffset = null;

  const TOOLBAR_EDGE_MARGIN = 6; // ห่างขอบ chart-area อย่างน้อยเท่านี้ กันโดน overflow:hidden ตัดหาย

  // เรียกทุกครั้งที่ต้อง sync ตำแหน่ง/สถานะ toolbar ใหม่
  // (ตอนเลือก/ยกเลิกเลือก, ลากกล่อง/ลาก toolbar เอง, resize หน้าต่าง, แก้ผ่าน settings panel)
  function updateDrawingToolbar(drawing) {
    const anchor = DrawingsModule.getSelectionAnchor();
    if (!drawing || !anchor) {
      drawingToolbar.classList.remove('visible');
      return;
    }

    // วัด offsetWidth/Height ได้ถูกต้องเสมอ เพราะ CSS ซ่อนด้วย visibility/opacity
    // แทน display:none แล้ว (ดู styles.css) — ไม่ต้องเดา fallback ผิดๆ อีก
    const toolbarW = drawingToolbar.offsetWidth;
    const toolbarH = drawingToolbar.offsetHeight;
    const defaultLeft = anchor.x - toolbarW / 2;
    const defaultTop = anchor.y - 40;

    let left = defaultLeft + toolbarOffset.dx;
    let top = defaultTop + toolbarOffset.dy;

    // Clamp ไม่ให้ toolbar หลุดออกนอกขอบ chart-area (ที่ overflow:hidden อยู่)
    // ทำแค่ตอน "วางจริง" เท่านั้น ไม่แก้ toolbarOffset ที่จำไว้ ไม่งั้นกล่องอื่นจะเพี้ยนตามไปด้วย
    const rect = chartAreaEl.getBoundingClientRect();
    const maxLeft = Math.max(TOOLBAR_EDGE_MARGIN, rect.width - toolbarW - TOOLBAR_EDGE_MARGIN);
    const maxTop = Math.max(TOOLBAR_EDGE_MARGIN, rect.height - toolbarH - TOOLBAR_EDGE_MARGIN);
    left = Math.min(Math.max(left, TOOLBAR_EDGE_MARGIN), maxLeft);
    top = Math.min(Math.max(top, TOOLBAR_EDGE_MARGIN), maxTop);

    drawingToolbar.style.left = `${left}px`;
    drawingToolbar.style.top = `${top}px`;
    drawingToolbar.classList.add('visible');
    dtLockBtn.classList.toggle('dt-active', !!drawing.locked);
  }

  // ลากจับที่ ⠿ ซ้ายสุด -> ย้าย toolbar ได้อิสระ แล้วจำ offset ไว้ใช้ต่อกับทุกกล่องถัดไป
  dtGripHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    toolbarDragging = true;
    toolbarDragStartMouse = { x: e.clientX, y: e.clientY };
    toolbarDragStartOffset = { ...toolbarOffset };
  });

  window.addEventListener('mousemove', (e) => {
    if (!toolbarDragging) return;
    toolbarOffset = {
      dx: toolbarDragStartOffset.dx + (e.clientX - toolbarDragStartMouse.x),
      dy: toolbarDragStartOffset.dy + (e.clientY - toolbarDragStartMouse.y),
    };
    updateDrawingToolbar(DrawingsModule.getSelectedDrawing());
  });

  window.addEventListener('mouseup', () => {
    toolbarDragging = false;
    // เผื่อกรณีลากปรับกล่อง Position เสร็จ (ไม่ใช่ลาก toolbar) -> ตำแหน่ง anchor เปลี่ยน ต้อง sync ใหม่
    updateDrawingToolbar(DrawingsModule.getSelectedDrawing());
  });

  // ลอยตามกล่อง Position แบบ real-time ระหว่างกำลังลากกล่องด้วยเมาส์ (เหมือน TradingView จริง)
  // guard ด้วย toolbarDragging กันชนกับตอนกำลังลาก toolbar เอง (คนละโหมดกัน)
  drawingCanvasEl.addEventListener('mousemove', () => {
    if (toolbarDragging) return;
    updateDrawingToolbar(DrawingsModule.getSelectedDrawing());
  });

  // Resize เบราว์เซอร์/พาเนล -> ตำแหน่งพิกเซลของกล่องเปลี่ยนตามสัดส่วน -> toolbar ต้อง sync ตามด้วย
  window.addEventListener('resize', () => {
    updateDrawingToolbar(DrawingsModule.getSelectedDrawing());
  });

  // ล็อกเฉพาะกล่องนี้กล่องเดียว (ต่างจากปุ่ม Lock All ที่ sidebar ซ้ายซึ่งล็อกทุกอันพร้อมกัน)
  dtLockBtn.addEventListener('click', () => {
    const d = DrawingsModule.getSelectedDrawing();
    if (!d) return;
    const newLocked = !d.locked;
    DrawingsModule.setDrawingLocked(d.id, newLocked);
    dtLockBtn.classList.toggle('dt-active', newLocked);
  });

  // ปุ่มถังขยะบน toolbar ลบได้เสมอแม้กล่องนั้นถูกล็อกอยู่ (ต่างจากปุ่ม Delete บนคีย์บอร์ดที่เคารพสถานะล็อก)
  dtTrashBtn.addEventListener('click', () => {
    DrawingsModule.removeSelected(true);
  });

  // ปุ่ม Settings (⚙) บน toolbar — ตอนนี้ toolbar ลอยรองรับแค่ Position เท่านั้น
  // เลยเปิด Position Settings panel ของกล่องที่เลือกอยู่ตรงๆ ได้เลย (ไม่ต้องเช็ค type)
  dtSettingsBtn.addEventListener('click', () => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d && d.type === 'position') showPositionPanel(d);
  });

  const LINE_FAMILY_TYPES = ['trendline', 'horizontal', 'horizontalRay', 'verticalLine', 'crossLine'];
  const SHAPE_TYPES = ['rectangle', 'ellipse', 'triangle'];

  // เหมือน TradingView: คลิกเลือกเฉยๆ (ครั้งเดียว) แค่ปิด panel เก่า + sync floating toolbar
  // "ไม่" เปิด panel ตั้งค่าอัตโนมัติอีกต่อไป — ต้องดับเบิลคลิก หรือกดปุ่ม Settings ถึงจะเปิด
  // (ดู DrawingsModule.onOpenSettings ด้านล่าง ซึ่งเป็นคนละ event กับอันนี้)
  DrawingsModule.onSelectionChange((drawing) => {
    fibPanel.classList.remove('visible');
    linePanel.classList.remove('visible');
    shapePanel.classList.remove('visible');
    positionPanel.classList.remove('visible');

    updateDrawingToolbar(drawing);
  });

  // ดับเบิลคลิกที่เส้น/รูปทรงบนกราฟ (มาจาก drawings.js) -> เปิด panel ตั้งค่าที่ตรงกับชนิดนั้น
  DrawingsModule.onOpenSettings((drawing) => {
    if (!drawing) return;
    if (drawing.type === 'fibonacci') {
      showFibPanel(drawing);
    } else if (LINE_FAMILY_TYPES.includes(drawing.type)) {
      showLinePanel(drawing);
    } else if (SHAPE_TYPES.includes(drawing.type)) {
      showShapePanel(drawing);
    } else if (drawing.type === 'position') {
      showPositionPanel(drawing);
    }
  });

  function showFibPanel(drawing) {
    fibPanel.classList.add('visible');
    fibLabelPosition.value = drawing.labelPosition || 'right';
    fibValueMode.value = drawing.valueMode || 'decimal';
    renderFibLevelRows(drawing);
  }

  function renderFibLevelRows(drawing) {
    fibLevelsList.innerHTML = '';
    drawing.levels.forEach(level => {
      const row = document.createElement('div');
      row.className = 'fib-level-row';
      row.dataset.levelId = level.id;
      row.innerHTML = `
        <input type="checkbox" class="fib-level-enabled" ${level.enabled ? 'checked' : ''}>
        <input type="number" class="fib-level-value" step="0.001" value="${level.value}">
        <input type="color" class="fib-level-color" value="${level.color}">
        <span class="fib-level-remove" title="ลบระดับนี้">✕</span>
      `;
      fibLevelsList.appendChild(row);

      const currentDrawingId = drawing.id;
      const levelId = level.id;

      row.querySelector('.fib-level-enabled').addEventListener('change', (e) => {
        DrawingsModule.updateFibLevel(currentDrawingId, levelId, { enabled: e.target.checked });
      });
      row.querySelector('.fib-level-value').addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        if (!Number.isNaN(val)) {
          DrawingsModule.updateFibLevel(currentDrawingId, levelId, { value: val });
          const refreshed = DrawingsModule.getSelectedDrawing();
          if (refreshed) renderFibLevelRows(refreshed);
        }
      });
      row.querySelector('.fib-level-color').addEventListener('input', (e) => {
        DrawingsModule.updateFibLevel(currentDrawingId, levelId, { color: e.target.value });
      });
      row.querySelector('.fib-level-remove').addEventListener('click', () => {
        DrawingsModule.removeFibLevel(currentDrawingId, levelId);
        const refreshed = DrawingsModule.getSelectedDrawing();
        if (refreshed) renderFibLevelRows(refreshed);
      });
    });
  }

  fibLabelPosition.addEventListener('change', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) DrawingsModule.setFibLabelPosition(d.id, e.target.value);
  });

  fibValueMode.addEventListener('change', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) DrawingsModule.setFibValueMode(d.id, e.target.value);
  });

  fibAddLevelBtn.addEventListener('click', () => {
    const d = DrawingsModule.getSelectedDrawing();
    if (!d) return;
    DrawingsModule.addFibLevel(d.id, 0.5, '#9598a1');
    const refreshed = DrawingsModule.getSelectedDrawing();
    if (refreshed) renderFibLevelRows(refreshed);
  });

  fibPanelClose.addEventListener('click', () => {
    fibPanel.classList.remove('visible');
  });

  // ---- 3.2) Panel ตั้งค่าเส้น (Trend Line / Ray / Extended Line / H-Ray / Vertical / Cross) ----
  const linePanel = document.getElementById('linePanel');
  const lineColorInput = document.getElementById('lineColorInput');
  const lineWidthInput = document.getElementById('lineWidthInput');
  const lineStyleInput = document.getElementById('lineStyleInput');
  const lineExtendLeftInput = document.getElementById('lineExtendLeftInput');
  const lineExtendRightInput = document.getElementById('lineExtendRightInput');
  const lineShowInfoInput = document.getElementById('lineShowInfoInput');
  const lineExtendLeftRow = document.getElementById('lineExtendLeftRow');
  const lineExtendRightRow = document.getElementById('lineExtendRightRow');
  const lineShowInfoRow = document.getElementById('lineShowInfoRow');
  const linePanelClose = document.getElementById('linePanelClose');

  function showLinePanel(drawing) {
    linePanel.classList.add('visible');
    lineColorInput.value = drawing.color || '#2962ff';
    lineWidthInput.value = String(drawing.lineWidth || 2);
    lineStyleInput.value = drawing.lineStyle || 'solid';

    // Extend Left/Right และ Info Line ใช้ได้เฉพาะ Trend Line (+ variants) เท่านั้น
    // เส้นแนวนอน/แนวตั้ง/กากบาท ไม่มีทิศทางให้ extend แบบนี้ เลยซ่อนแถวไว้
    const isTrendline = drawing.type === 'trendline';
    lineExtendLeftRow.classList.toggle('hidden-row', !isTrendline);
    lineExtendRightRow.classList.toggle('hidden-row', !isTrendline);
    lineShowInfoRow.classList.toggle('hidden-row', !isTrendline);
    if (isTrendline) {
      lineExtendLeftInput.checked = !!drawing.extendLeft;
      lineExtendRightInput.checked = !!drawing.extendRight;
      lineShowInfoInput.checked = !!drawing.showInfo;
    }
  }

  lineColorInput.addEventListener('input', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) DrawingsModule.setLineColor(d.id, e.target.value);
  });

  lineWidthInput.addEventListener('change', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) DrawingsModule.setLineWidth(d.id, parseInt(e.target.value, 10));
  });

  lineStyleInput.addEventListener('change', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) DrawingsModule.setLineStyle(d.id, e.target.value);
  });

  lineExtendLeftInput.addEventListener('change', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) DrawingsModule.setLineExtend(d.id, { left: e.target.checked });
  });

  lineExtendRightInput.addEventListener('change', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) DrawingsModule.setLineExtend(d.id, { right: e.target.checked });
  });

  lineShowInfoInput.addEventListener('change', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) DrawingsModule.setLineShowInfo(d.id, e.target.checked);
  });

  linePanelClose.addEventListener('click', () => {
    linePanel.classList.remove('visible');
  });

  // ---- 3.3) Panel ตั้งค่ารูปทรง (Rectangle / Circle / Ellipse / Triangle) ----
  const shapePanel = document.getElementById('shapePanel');
  const shapeBorderColorInput = document.getElementById('shapeBorderColorInput');
  const shapeFillColorInput = document.getElementById('shapeFillColorInput');
  const shapeFillOpacityInput = document.getElementById('shapeFillOpacityInput');
  const shapeLineStyleInput = document.getElementById('shapeLineStyleInput');
  const shapeExtendLeftInput = document.getElementById('shapeExtendLeftInput');
  const shapeExtendRightInput = document.getElementById('shapeExtendRightInput');
  const shapeExtendLeftRow = document.getElementById('shapeExtendLeftRow');
  const shapeExtendRightRow = document.getElementById('shapeExtendRightRow');
  const shapePanelClose = document.getElementById('shapePanelClose');

  function showShapePanel(drawing) {
    shapePanel.classList.add('visible');
    shapeBorderColorInput.value = drawing.color || '#2962ff';
    shapeFillColorInput.value = drawing.fillColor || '#2962ff';
    shapeFillOpacityInput.value = Math.round((drawing.fillOpacity != null ? drawing.fillOpacity : 0.15) * 100);
    shapeLineStyleInput.value = drawing.lineStyle || 'solid';

    // Extend Left/Right (โซน Demand/Supply) ใช้ได้เฉพาะ Rectangle เท่านั้น
    const isRectangle = drawing.type === 'rectangle';
    shapeExtendLeftRow.classList.toggle('hidden-row', !isRectangle);
    shapeExtendRightRow.classList.toggle('hidden-row', !isRectangle);
    if (isRectangle) {
      shapeExtendLeftInput.checked = !!drawing.extendLeft;
      shapeExtendRightInput.checked = !!drawing.extendRight;
    }
  }

  shapeBorderColorInput.addEventListener('input', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) DrawingsModule.setShapeBorderColor(d.id, e.target.value);
  });

  shapeFillColorInput.addEventListener('input', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) DrawingsModule.setShapeFillColor(d.id, e.target.value);
  });

  shapeFillOpacityInput.addEventListener('input', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) DrawingsModule.setShapeFillOpacity(d.id, parseInt(e.target.value, 10) / 100);
  });

  shapeLineStyleInput.addEventListener('change', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) DrawingsModule.setShapeLineStyle(d.id, e.target.value);
  });

  shapeExtendLeftInput.addEventListener('change', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) DrawingsModule.setShapeExtend(d.id, { left: e.target.checked });
  });

  shapeExtendRightInput.addEventListener('change', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) DrawingsModule.setShapeExtend(d.id, { right: e.target.checked });
  });

  shapePanelClose.addEventListener('click', () => {
    shapePanel.classList.remove('visible');
  });

  // ---- 3.4) Panel ตั้งค่า Long/Short Position ----
  const positionPanel = document.getElementById('positionPanel');
  const positionDirectionInput = document.getElementById('positionDirectionInput');
  const positionEntryPriceInput = document.getElementById('positionEntryPriceInput');
  const positionTpPriceInput = document.getElementById('positionTpPriceInput');
  const positionSlPriceInput = document.getElementById('positionSlPriceInput');
  const positionTpColorInput = document.getElementById('positionTpColorInput');
  const positionSlColorInput = document.getElementById('positionSlColorInput');
  const positionFillOpacityInput = document.getElementById('positionFillOpacityInput');
  const positionBoxWidthInput = document.getElementById('positionBoxWidthInput');
  const positionAccountSizeInput = document.getElementById('positionAccountSizeInput');
  const positionRiskModeInput = document.getElementById('positionRiskModeInput');
  const positionRiskPercentInput = document.getElementById('positionRiskPercentInput');
  const positionFixedRiskInput = document.getElementById('positionFixedRiskInput');
  const positionRiskPercentRow = document.getElementById('positionRiskPercentRow');
  const positionFixedRiskRow = document.getElementById('positionFixedRiskRow');
  const positionContractMultiplierInput = document.getElementById('positionContractMultiplierInput');
  const positionLotStepInput = document.getElementById('positionLotStepInput');
  const positionMaxLeverageInput = document.getElementById('positionMaxLeverageInput');
  const positionPanelClose = document.getElementById('positionPanelClose');

  function showPositionPanel(drawing) {
    positionPanel.classList.add('visible');
    positionDirectionInput.value = drawing.direction || 'long';

    // แปลง yFrac ของแต่ละจุดกลับเป็นราคาจริง เพื่อโชว์ในช่องพิมพ์
    const canvasEl = document.getElementById('drawingCanvas');
    const h = canvasEl.clientHeight;
    const entryPrice = ChartModule.priceAtY(drawing.points[0].yFrac * h);
    const tpPrice = ChartModule.priceAtY(drawing.points[1].yFrac * h);
    const slPrice = ChartModule.priceAtY(drawing.points[2].yFrac * h);
    if (entryPrice != null) positionEntryPriceInput.value = entryPrice.toFixed(5);
    if (tpPrice != null) positionTpPriceInput.value = tpPrice.toFixed(5);
    if (slPrice != null) positionSlPriceInput.value = slPrice.toFixed(5);

    positionTpColorInput.value = drawing.tpColor || '#26a69a';
    positionSlColorInput.value = drawing.slColor || '#ef5350';
    positionFillOpacityInput.value = Math.round((drawing.fillOpacity != null ? drawing.fillOpacity : 0.18) * 100);
    positionBoxWidthInput.value = Math.round((drawing.boxWidthFrac != null ? drawing.boxWidthFrac : 0.18) * 100);
    positionAccountSizeInput.value = drawing.accountSize != null ? drawing.accountSize : 10000;

    const riskMode = drawing.riskMode || 'percent';
    positionRiskModeInput.value = riskMode;
    positionRiskPercentInput.value = drawing.riskPercent != null ? drawing.riskPercent : 1;
    positionFixedRiskInput.value = drawing.fixedRiskAmount != null ? drawing.fixedRiskAmount : 100;
    // โชว์แค่ช่องที่ตรงกับโหมดที่เลือกอยู่ (% หรือ $ คงที่)
    positionRiskPercentRow.classList.toggle('hidden-row', riskMode !== 'percent');
    positionFixedRiskRow.classList.toggle('hidden-row', riskMode !== 'fixed');

    positionContractMultiplierInput.value = drawing.contractMultiplier != null ? drawing.contractMultiplier : 1;
    positionLotStepInput.value = drawing.lotStep != null ? drawing.lotStep : 0.01;
    positionMaxLeverageInput.value = drawing.maxLeverage != null ? drawing.maxLeverage : 20;
  }

  positionDirectionInput.addEventListener('change', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) {
      DrawingsModule.setPositionDirection(d.id, e.target.value);
      updateDrawingToolbar(d); // สลับ Long/Short สลับ TP/SL -> กล่องพลิกด้าน -> anchor เปลี่ยน
    }
  });

  // ใช้ 'input' แทน 'change' เพื่อให้กล่องบนกราฟขยับตามทันทีทุกตัวอักษรที่พิมพ์
  // (ไม่ต้องรอ blur ออกจากช่อง) — ตรงตาม requirement "Real-time update"
  positionEntryPriceInput.addEventListener('input', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    const val = parseFloat(e.target.value);
    if (d && !Number.isNaN(val)) {
      DrawingsModule.setPositionEntryPrice(d.id, val);
      updateDrawingToolbar(d); // ราคา Entry ขยับ -> กล่องขยับ -> ต้อง sync toolbar ตาม
    }
  });

  positionTpPriceInput.addEventListener('input', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    const val = parseFloat(e.target.value);
    if (d && !Number.isNaN(val)) {
      DrawingsModule.setPositionTpPrice(d.id, val);
      updateDrawingToolbar(d);
    }
  });

  positionSlPriceInput.addEventListener('input', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    const val = parseFloat(e.target.value);
    if (d && !Number.isNaN(val)) {
      DrawingsModule.setPositionSlPrice(d.id, val);
      updateDrawingToolbar(d);
    }
  });

  positionTpColorInput.addEventListener('input', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) DrawingsModule.setPositionTpColor(d.id, e.target.value);
  });

  positionSlColorInput.addEventListener('input', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) DrawingsModule.setPositionSlColor(d.id, e.target.value);
  });

  positionFillOpacityInput.addEventListener('input', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) DrawingsModule.setPositionFillOpacity(d.id, parseInt(e.target.value, 10) / 100);
  });

  positionBoxWidthInput.addEventListener('input', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (d) {
      DrawingsModule.setPositionBoxWidth(d.id, parseInt(e.target.value, 10) / 100);
      updateDrawingToolbar(d); // ความกว้างกล่องเปลี่ยน -> จุดกึ่งกลาง (anchor) เปลี่ยนด้วย
    }
  });

  positionAccountSizeInput.addEventListener('input', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    const val = parseFloat(e.target.value);
    if (d && !Number.isNaN(val)) DrawingsModule.setPositionAccountSize(d.id, val);
  });

  positionRiskModeInput.addEventListener('change', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    if (!d) return;
    DrawingsModule.setPositionRiskMode(d.id, e.target.value);
    positionRiskPercentRow.classList.toggle('hidden-row', e.target.value !== 'percent');
    positionFixedRiskRow.classList.toggle('hidden-row', e.target.value !== 'fixed');
  });

  positionRiskPercentInput.addEventListener('input', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    const val = parseFloat(e.target.value);
    if (d && !Number.isNaN(val)) DrawingsModule.setPositionRiskPercent(d.id, val);
  });

  positionFixedRiskInput.addEventListener('input', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    const val = parseFloat(e.target.value);
    if (d && !Number.isNaN(val)) DrawingsModule.setPositionFixedRiskAmount(d.id, val);
  });

  positionContractMultiplierInput.addEventListener('input', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    const val = parseFloat(e.target.value);
    if (d && !Number.isNaN(val)) DrawingsModule.setPositionContractMultiplier(d.id, val);
  });

  positionLotStepInput.addEventListener('input', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    const val = parseFloat(e.target.value);
    if (d && !Number.isNaN(val)) DrawingsModule.setPositionLotStep(d.id, val);
  });

  positionMaxLeverageInput.addEventListener('input', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    const val = parseFloat(e.target.value);
    if (d && !Number.isNaN(val)) DrawingsModule.setPositionMaxLeverage(d.id, val);
  });

  positionPanelClose.addEventListener('click', () => {
    positionPanel.classList.remove('visible');
  });

  // ---- 4) ปุ่ม Replay: เปิด/ปิดแถบควบคุมลอยเหนือกราฟ ----
  const replayBtn = document.getElementById('replayToggleBtn');
  const replayBar = document.getElementById('replayBar');
  replayBtn.addEventListener('click', () => {
    replayBar.classList.toggle('visible');
    replayBtn.classList.toggle('active-hint');
  });

  // ---- 5) นาฬิกามุมขวาล่าง ----
  function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent =
      now.toLocaleTimeString('en-GB') + ' UTC+7';
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ---- 6) สลับ timeframe -> โหลดข้อมูลใหม่จาก API จริง ----
  document.querySelectorAll('.tf-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      document.querySelectorAll('.tf-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const timeframe = tab.getAttribute('data-tf') || '1h';
      try {
        await ChartModule.loadCandles(undefined, timeframe);
      } catch (err) {
        console.error(err);
      }
    });
  });

  // ================================================================
  // 7) ปุ่มเครื่องมือวาดฝั่งซ้าย
  //    ย้ายไปอยู่ใน sidebar.js ทั้งหมดแล้ว (รองรับ tooltip + เมนูย่อย)
  //    ดู SidebarModule.init() ที่เรียกไว้ด้านบน (ขั้นตอน 3.0)
  // ================================================================

});