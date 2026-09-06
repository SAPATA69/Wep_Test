# ============================================================
# APP.PY
# ------------------------------------------------------------
# Flask server หลักของโปรเจกต์
#   - route "/"            -> render หน้าเว็บ (templates/index.html)
#   - route "/api/candles" -> ส่งข้อมูลแท่งเทียนกลับเป็น JSON
#
# ตอนนี้ /api/candles ยังเป็นข้อมูล "สุ่ม" (placeholder) อยู่
# ในอนาคตให้แก้ฟังก์ชัน generate_candles() ให้ไปดึงข้อมูลจริง
# จากไฟล์ CSV / ฐานข้อมูล / broker API แทน
# ============================================================

import random
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)


def generate_candles(count: int = 140, start_price: float = 0.7180):
    """สร้างข้อมูลแท่งเทียนสุ่ม (placeholder)

    TODO: แทนที่ฟังก์ชันนี้ด้วยการดึงข้อมูลราคาจริง เช่น
        - อ่านจากไฟล์ CSV ที่เก็บ historical data
        - เรียก broker API (เช่น OANDA, Binance, MT5 bridge ฯลฯ)
        - query จากฐานข้อมูล (PostgreSQL / SQLite / TimescaleDB)
    """
    candles = []
    price = start_price
    for _ in range(count):
        open_price = price
        change = random.uniform(-1, 1) * (start_price * 0.004)
        close_price = open_price + change
        high_price = max(open_price, close_price) + random.uniform(0, 1) * start_price * 0.0015
        low_price = min(open_price, close_price) - random.uniform(0, 1) * start_price * 0.0015
        candles.append({
            "open": round(open_price, 5),
            "high": round(high_price, 5),
            "low": round(low_price, 5),
            "close": round(close_price, 5),
        })
        price = close_price
    return candles


@app.route("/")
def index():
    """หน้าเว็บหลัก"""
    return render_template("index.html")


@app.route("/api/candles")
def api_candles():
    """ส่งข้อมูลแท่งเทียนกลับเป็น JSON

    รองรับ query string:
        /api/candles?symbol=AUDUSD&timeframe=1h&count=140
    (ตอนนี้ยังไม่ได้ใช้ symbol/timeframe จริงจัง เตรียมไว้ให้ต่อยอด)
    """
    symbol = request.args.get("symbol", "AUDUSD")
    timeframe = request.args.get("timeframe", "1h")
    count = request.args.get("count", default=140, type=int)

    candles = generate_candles(count=count, start_price=0.7180)

    return jsonify({
        "symbol": symbol,
        "timeframe": timeframe,
        "candles": candles,
    })


if __name__ == "__main__":
    # debug=True ทำให้ auto-reload ตอนแก้โค้ด และเห็น error ละเอียดขึ้น
    # ห้ามเปิด debug=True ตอนขึ้น production จริง
    app.run(debug=True, port=5000)
