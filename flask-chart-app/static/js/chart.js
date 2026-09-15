/* ============================================================
   CHART.JS
   ------------------------------------------------------------
   ไฟล์นี้รับผิดชอบเรื่อง "กราฟแท่งเทียน" ล้วนๆ:
     - ดึงข้อมูลราคาจาก Flask API (/api/candles)
     - วาดแท่งเทียนลงบน <canvas>
     - คำนวณและแสดงราคาบน price scale ด้านขวา

   *** จุดที่ต้องแก้เมื่อจะต่อข้อมูลจริง ***
   ไม่ต้องแก้ที่ไฟล์นี้ครับ ไปแก้ที่ app.py ฟังก์ชัน
   generate_candles() แทน — ไฟล์นี้แค่ fetch("/api/candles")
   ไม่สนใจว่าข้อมูลข้างหลังมาจากไหน
   ============================================================ */

const ChartModule = (() => {

  let canvas, ctx, priceScaleEl, ohlcEl;
  let candles = [];
  let currentSymbol = 'AUDUSD';
  let currentTimeframe = '1h';
  let lastTopPrice = null;
  let lastBottomPrice = null;

  // ---- 1) ดึงข้อมูลแท่งเทียนจาก Flask API ----
  async function fetchCandles(symbol = currentSymbol, timeframe = currentTimeframe, count = 140) {
    const url = `/api/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&count=${count}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`โหลดข้อมูลแท่งเทียนไม่สำเร็จ: HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.candles;
  }

  // ---- 2) ปรับขนาด canvas ให้พอดีกับกรอบ แล้ววาดใหม่ ----
  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    draw();
  }

  // ---- 3) วาดแท่งเทียนทั้งหมด ----
  function draw() {
    if (!candles.length) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const prices = candles.flatMap(c => [c.high, c.low]);
    const maxP = Math.max(...prices);
    const minP = Math.min(...prices);
    const pad = (maxP - minP) * 0.1;
    const top = maxP + pad;
    const bottom = minP - pad;
    const range = top - bottom;

    const marginLeft = 6, marginRight = 6;
    const usableW = w - marginLeft - marginRight;
    const candleW = usableW / candles.length;
    const bodyW = Math.max(1, candleW * 0.6);

    // เส้น grid แนวนอนจางๆ
    ctx.strokeStyle = '#181b23';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = (h / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    candles.forEach((c, i) => {
      const x = marginLeft + i * candleW + candleW / 2;
      const yHigh = h - ((c.high - bottom) / range) * h;
      const yLow = h - ((c.low - bottom) / range) * h;
      const yOpen = h - ((c.open - bottom) / range) * h;
      const yClose = h - ((c.close - bottom) / range) * h;
      const up = c.close >= c.open;

      ctx.strokeStyle = up ? '#26a69a' : '#ef5350';
      ctx.fillStyle = up ? '#26a69a' : '#ef5350';
      ctx.lineWidth = 1;

      // ไส้ตะเกียง (wick)
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // ตัวแท่ง (body)
      const bodyTop = Math.min(yOpen, yClose);
      const bodyH = Math.max(1, Math.abs(yClose - yOpen));
      ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, bodyH);
    });

    lastTopPrice = top;
    lastBottomPrice = bottom;

    renderPriceScale(top, bottom, candles[candles.length - 1]);
    renderOhlcReadout(candles[0], candles[candles.length - 1], maxP, minP);
  }

  // ---- แปลงตำแหน่ง y (พิกเซล บน canvas) กลับเป็นราคา ----
  // ใช้โดย drawings.js เพื่อเขียนราคาบนเส้น Fibonacci / Horizontal / Measure
  function priceAtY(yPixel) {
    if (lastTopPrice == null || !canvas) return null;
    const h = canvas.clientHeight;
    const range = lastTopPrice - lastBottomPrice;
    return lastTopPrice - (yPixel / h) * range;
  }

  // ---- สมการย้อนกลับของ priceAtY: รับราคา คืนตำแหน่ง y (พิกเซล) ----
  // ใช้ตอนผู้ใช้พิมพ์ราคา Entry/TP/SL ตรงๆ ในหน้าตั้งค่า (แทนที่จะลากบนกราฟอย่างเดียว)
  function yForPrice(price) {
    if (lastTopPrice == null || !canvas) return null;
    const h = canvas.clientHeight;
    const range = lastTopPrice - lastBottomPrice;
    if (range === 0) return null;
    return ((lastTopPrice - price) / range) * h;
  }

  // ---- 4) วาด tick ราคาบน price scale (คอลัมน์ขวา) ----
  function renderPriceScale(top, bottom, lastCandle) {
    priceScaleEl.innerHTML = '';
    const h = priceScaleEl.clientHeight;
    const range = top - bottom;
    const step = range / 8;

    for (let i = 0; i <= 8; i++) {
      const price = bottom + step * i;
      const y = h - (i / 8) * h;
      const tick = document.createElement('div');
      tick.className = 'price-tick';
      tick.style.top = y + 'px';
      tick.textContent = price.toFixed(4);
      priceScaleEl.appendChild(tick);
    }

    // ไฮไลต์ราคาปัจจุบัน (แท่งล่าสุด)
    const curTick = document.createElement('div');
    curTick.className = 'price-tick hl-current';
    const yCur = h - ((lastCandle.close - bottom) / range) * h;
    curTick.style.top = yCur + 'px';
    curTick.textContent = lastCandle.close.toFixed(5);
    priceScaleEl.appendChild(curTick);
  }

  // ---- 5) อัปเดตแถบ O/H/L/C มุมซ้ายบน ----
  function renderOhlcReadout(firstCandle, lastCandle, maxP, minP) {
    if (!ohlcEl) return;
    const up = lastCandle.close >= firstCandle.open;
    const pct = ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100;
    ohlcEl.innerHTML =
      `O ${firstCandle.open.toFixed(5)} H ${maxP.toFixed(5)} L ${minP.toFixed(5)} ` +
      `C <span class="${up ? 'up' : ''}">${lastCandle.close.toFixed(5)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)</span>`;
  }

  // ---- 6) โหลดข้อมูลใหม่ (เช่นตอนสลับ timeframe) ----
  async function loadCandles(symbol, timeframe, count = 140) {
    currentSymbol = symbol ?? currentSymbol;
    currentTimeframe = timeframe ?? currentTimeframe;
    candles = await fetchCandles(currentSymbol, currentTimeframe, count);
    draw();
  }

  // ---- 7) เริ่มต้นระบบ ----
  async function init({ canvasEl, priceScaleElement, ohlcElement, symbol = 'AUDUSD', timeframe = '1h', candleCount = 140 }) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    priceScaleEl = priceScaleElement;
    ohlcEl = ohlcElement;
    currentSymbol = symbol;
    currentTimeframe = timeframe;

    await loadCandles(symbol, timeframe, candleCount);

    window.addEventListener('resize', resize);
    resize();
  }

  function getCandles() {
    return candles;
  }

  return { init, draw, getCandles, loadCandles, priceAtY, yForPrice };
})();
