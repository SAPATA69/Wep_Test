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

  // เมื่อ drawings.js เปลี่ยนเครื่องมือเอง (เช่น วาง text เสร็จแล้วสลับกลับ cursor อัตโนมัติ)
  // ให้ sync ปุ่มบน toolbar ให้ตรงกันด้วย
  DrawingsModule.onToolChange((tool) => {
    document.querySelectorAll('.lt-btn[data-tool]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tool') === tool);
    });
  });

  // ---- 3.1) Panel ตั้งค่า Fibonacci (Dynamic Levels) ----
  const fibPanel = document.getElementById('fibPanel');
  const fibLevelsList = document.getElementById('fibLevelsList');
  const fibLabelPosition = document.getElementById('fibLabelPosition');
  const fibValueMode = document.getElementById('fibValueMode');
  const fibAddLevelBtn = document.getElementById('fibAddLevelBtn');
  const fibPanelClose = document.getElementById('fibPanelClose');

  // เปิด/ปิด panel ทุกครั้งที่การเลือกเส้นเปลี่ยน (มาจาก drawings.js)
  DrawingsModule.onSelectionChange((drawing) => {
    if (drawing && drawing.type === 'fibonacci') {
      showFibPanel(drawing);
    } else {
      fibPanel.classList.remove('visible');
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
  //    แบ่งเป็น 3 กลุ่มตาม data-attribute ที่กำหนดไว้ใน index.html:
  //    - data-tool     : เครื่องมือวาด เลือกได้ทีละอัน (mutually exclusive)
  //    - data-toggle   : ปุ่มเปิด/ปิด อิสระจากกัน (lock, eye, magnet)
  //    - data-action   : ปุ่มกดแล้วทำงานทันที ไม่ใช่โหมด (trash)
  // ================================================================

  // 7.1 กลุ่มเครื่องมือวาด (คลิกแล้วเลือกทีละอัน)
  document.querySelectorAll('.lt-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lt-btn[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      DrawingsModule.setTool(btn.getAttribute('data-tool'));
    });
  });

  // 7.2 กลุ่มปุ่ม toggle (lock / eye / magnet)
  document.querySelectorAll('.lt-btn[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const isOn = btn.classList.contains('active');
      const toggle = btn.getAttribute('data-toggle');

      if (toggle === 'lock') {
        DrawingsModule.setLocked(isOn);
      } else if (toggle === 'eye') {
        // ปุ่มนี้แสดงสถานะ "ซ่อนเส้นทั้งหมด" ตอนกด active
        DrawingsModule.setVisible(!isOn);
      } else if (toggle === 'magnet') {
        DrawingsModule.setMagnet(isOn);
      }
    });
  });

  // 7.3 ปุ่ม trash: ลบเส้นที่เลือกอยู่ ถ้าไม่มีอะไรเลือกอยู่ให้ถามก่อนลบทั้งหมด
  document.querySelectorAll('.lt-btn[data-action="trash"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const removedSomething = DrawingsModule.removeSelected();
      if (!removedSomething) {
        if (confirm('ยังไม่ได้เลือกเส้นไหนไว้ — ต้องการลบเส้น/เครื่องมือวาดทั้งหมดบนกราฟเลยไหม?')) {
          DrawingsModule.clearAll();
        }
      }
    });
  });

});