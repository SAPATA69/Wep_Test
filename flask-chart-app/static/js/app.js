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

  // เปิด/ปิด panel ทุกครั้งที่การเลือกเส้นเปลี่ยน (มาจาก drawings.js)
  const LINE_FAMILY_TYPES = ['trendline', 'horizontal', 'horizontalRay', 'verticalLine', 'crossLine'];
  const SHAPE_TYPES = ['rectangle', 'ellipse', 'triangle'];
  DrawingsModule.onSelectionChange((drawing) => {
    fibPanel.classList.remove('visible');
    linePanel.classList.remove('visible');
    shapePanel.classList.remove('visible');
    positionPanel.classList.remove('visible');

    if (drawing && drawing.type === 'fibonacci') {
      showFibPanel(drawing);
    } else if (drawing && LINE_FAMILY_TYPES.includes(drawing.type)) {
      showLinePanel(drawing);
    } else if (drawing && SHAPE_TYPES.includes(drawing.type)) {
      showShapePanel(drawing);
    } else if (drawing && drawing.type === 'position') {
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
    if (d) DrawingsModule.setPositionDirection(d.id, e.target.value);
  });

  positionEntryPriceInput.addEventListener('change', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    const val = parseFloat(e.target.value);
    if (d && !Number.isNaN(val)) DrawingsModule.setPositionEntryPrice(d.id, val);
  });

  positionTpPriceInput.addEventListener('change', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    const val = parseFloat(e.target.value);
    if (d && !Number.isNaN(val)) DrawingsModule.setPositionTpPrice(d.id, val);
  });

  positionSlPriceInput.addEventListener('change', (e) => {
    const d = DrawingsModule.getSelectedDrawing();
    const val = parseFloat(e.target.value);
    if (d && !Number.isNaN(val)) DrawingsModule.setPositionSlPrice(d.id, val);
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
    if (d) DrawingsModule.setPositionBoxWidth(d.id, parseInt(e.target.value, 10) / 100);
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
