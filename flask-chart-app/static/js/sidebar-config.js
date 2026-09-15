/* ============================================================
   SIDEBAR-CONFIG.JS
   ------------------------------------------------------------
   ไฟล์นี้เก็บ "โครงสร้างข้อมูล" ของปุ่มทั้งหมดในแถบเครื่องมือซ้าย
   ไม่มี logic การ render หรือ event ใดๆ อยู่ในไฟล์นี้

   *** สถานะปัจจุบัน: Phase "โครงเครื่องมือ" ***
   ไฟล์นี้ตอนนี้มีเครื่องมือครบตามสเปคที่วางไว้ทั้งหมด แต่เครื่องมือ
   ส่วนใหญ่ยังเป็นแค่ "โครง" — เลือกได้ เห็นชื่อ/ไอคอนถูกต้อง แต่ยัง
   วาดอะไรไม่ได้จริง (ดูรายการที่ implemented แล้วใน drawings.js
   ตัวแปร IMPLEMENTED_TOOLS) เครื่องมือที่ title มีคำว่า "(เร็วๆ นี้)"
   คือยังไม่ใส่ logic — จะทยอยใส่ทีละตัวในรอบถัดๆ ไป

   รูปแบบแต่ละปุ่ม (เทียบเท่า Props ของ "Tool Item" ตามสเปค):
   {
     id, title, type: 'tool'|'group'|'toggle'|'action',
     icon, tool, toggle, action, tools: [{ tool, icon, title }]
   }
   ============================================================ */

const SIDEBAR_GROUPS = [

  // ---------------------------------------------------------
  // 1) CURSORS
  // ---------------------------------------------------------
  {
    id: 'cursors',
    type: 'group',
    icon: 'cursor',
    title: 'Cursors',
    tools: [
      { tool: 'cursor', icon: 'cursor', title: 'Arrow' },
      { tool: 'cursorCross', icon: 'cursorCross', title: 'Cross (เร็วๆ นี้)' },
      { tool: 'cursorDot', icon: 'cursorDot', title: 'Dot (เร็วๆ นี้)' },
      { tool: 'cursorEraser', icon: 'cursorEraser', title: 'Eraser (เร็วๆ นี้)' },
    ],
  },

  // ---------------------------------------------------------
  // 2) TREND LINE TOOLS
  // ---------------------------------------------------------
  {
    id: 'trendlines',
    type: 'group',
    icon: 'trendline',
    title: 'Trend Line Tools',
    tools: [
      { tool: 'trendline', icon: 'trendline', title: 'Trend Line' },
      { tool: 'ray', icon: 'ray', title: 'Ray' },
      { tool: 'infoLine', icon: 'trendline', title: 'Info Line' },
      { tool: 'extendedLine', icon: 'extendedLine', title: 'Extended Line' },
      { tool: 'trendAngle', icon: 'trendAngle', title: 'Trend Angle (เร็วๆ นี้)' },
      { tool: 'horizontal', icon: 'horizontalLine', title: 'Horizontal Line' },
      { tool: 'horizontalRay', icon: 'horizontalRay', title: 'Horizontal Ray' },
      { tool: 'verticalLine', icon: 'verticalLine', title: 'Vertical Line' },
      { tool: 'crossLine', icon: 'crossLine', title: 'Cross Line' },
      { tool: 'parallelChannel', icon: 'parallelChannel', title: 'Parallel Channel (เร็วๆ นี้)' },
      { tool: 'flatTopBottom', icon: 'parallelChannel', title: 'Flat Top/Bottom (เร็วๆ นี้)' },
      { tool: 'disjointChannel', icon: 'parallelChannel', title: 'Disjoint Channel (เร็วๆ นี้)' },
      { tool: 'regressionTrend', icon: 'trendline', title: 'Regression Trend (เร็วๆ นี้)' },
    ],
  },

  // ---------------------------------------------------------
  // 3) GANN & FIBONACCI TOOLS
  // ---------------------------------------------------------
  {
    id: 'gannfib',
    type: 'group',
    icon: 'fibRetracement',
    title: 'Gann and Fibonacci tools',
    tools: [
      { tool: 'fibonacci', icon: 'fibRetracement', title: 'Fib Retracement' },
      { tool: 'fibExtension', icon: 'fibRetracement', title: 'Trend-Based Fib Extension (เร็วๆ นี้)' },
      { tool: 'fibChannel', icon: 'fibChannel', title: 'Fib Channel (เร็วๆ นี้)' },
      { tool: 'fibTimeZone', icon: 'fibTimeZone', title: 'Fib Time Zone (เร็วๆ นี้)' },
      { tool: 'fibTrendTime', icon: 'fibTimeZone', title: 'Trend-Based Fib Time (เร็วๆ นี้)' },
      { tool: 'fibCircles', icon: 'fibCircles', title: 'Fib Circles (เร็วๆ นี้)' },
      { tool: 'fibSpeedFan', icon: 'fibCircles', title: 'Fib Speed Resistance Fan (เร็วๆ นี้)' },
      { tool: 'fibSpeedArcs', icon: 'fibCircles', title: 'Fib Speed Resistance Arcs (เร็วๆ นี้)' },
      { tool: 'fibWedge', icon: 'fibRetracement', title: 'Fib Wedge (เร็วๆ นี้)' },
      { tool: 'pitchfork', icon: 'pitchfork', title: 'Pitchfork (เร็วๆ นี้)' },
      { tool: 'schiffPitchfork', icon: 'pitchfork', title: 'Schiff Pitchfork (เร็วๆ นี้)' },
      { tool: 'modSchiffPitchfork', icon: 'pitchfork', title: 'Modified Schiff Pitchfork (เร็วๆ นี้)' },
      { tool: 'insidePitchfork', icon: 'pitchfork', title: 'Inside Pitchfork (เร็วๆ นี้)' },
      { tool: 'pitchfan', icon: 'pitchfork', title: 'Pitchfan (เร็วๆ นี้)' },
      { tool: 'gann', icon: 'gannBox', title: 'Gann Box (เร็วๆ นี้)' },
      { tool: 'gannSquare', icon: 'gannSquare', title: 'Gann Square (เร็วๆ นี้)' },
      { tool: 'gannSquareFixed', icon: 'gannSquare', title: 'Gann Square Fixed (เร็วๆ นี้)' },
      { tool: 'gannFan', icon: 'gannSquare', title: 'Gann Fan (เร็วๆ นี้)' },
    ],
  },

  // ---------------------------------------------------------
  // 4) GEOMETRIC SHAPES
  // ---------------------------------------------------------
  {
    id: 'shapes',
    type: 'group',
    icon: 'rectangle',
    title: 'Geometric Shapes',
    tools: [
      { tool: 'brush', icon: 'brush', title: 'Brush (เร็วๆ นี้)' },
      { tool: 'highlighter', icon: 'brush', title: 'Highlighter (เร็วๆ นี้)' },
      { tool: 'rectangle', icon: 'rectangle', title: 'Rectangle' },
      { tool: 'rotatedRectangle', icon: 'rectangle', title: 'Rotated Rectangle (เร็วๆ นี้)' },
      { tool: 'circle', icon: 'circleShape', title: 'Circle' },
      { tool: 'ellipse', icon: 'circleShape', title: 'Ellipse' },
      { tool: 'triangle', icon: 'triangleShape', title: 'Triangle' },
      { tool: 'polyline', icon: 'polyline', title: 'Polyline (เร็วๆ นี้)' },
      { tool: 'path', icon: 'polyline', title: 'Path (เร็วๆ นี้)' },
      { tool: 'curve', icon: 'polyline', title: 'Curve (เร็วๆ นี้)' },
      { tool: 'doubleCurve', icon: 'polyline', title: 'Double Curve (เร็วๆ นี้)' },
      { tool: 'arc', icon: 'circleShape', title: 'Arc (เร็วๆ นี้)' },
    ],
  },

  // ---------------------------------------------------------
  // 5) ANNOTATION TOOLS
  // ---------------------------------------------------------
  {
    id: 'annotations',
    type: 'group',
    icon: 'textTool',
    title: 'Annotation Tools',
    tools: [
      { tool: 'text', icon: 'textTool', title: 'Text' },
      { tool: 'anchoredText', icon: 'textTool', title: 'Anchored Text (เร็วๆ นี้)' },
      { tool: 'note', icon: 'note', title: 'Note (เร็วๆ นี้)' },
      { tool: 'anchoredNote', icon: 'note', title: 'Anchored Note (เร็วๆ นี้)' },
      { tool: 'callout', icon: 'callout', title: 'Callout (เร็วๆ นี้)' },
      { tool: 'balloon', icon: 'callout', title: 'Balloon (เร็วๆ นี้)' },
      { tool: 'priceLabel', icon: 'priceLabel', title: 'Price Label (เร็วๆ นี้)' },
      { tool: 'priceNote', icon: 'priceLabel', title: 'Price Note (เร็วๆ นี้)' },
      { tool: 'signpost', icon: 'priceLabel', title: 'Signpost (เร็วๆ นี้)' },
      { tool: 'arrowMarkUp', icon: 'arrowUp', title: 'Arrow Mark Up (เร็วๆ นี้)' },
      { tool: 'arrowMarkDown', icon: 'arrowDown', title: 'Arrow Mark Down (เร็วๆ นี้)' },
      { tool: 'arrowMarkLeft', icon: 'arrowLeft', title: 'Arrow Mark Left (เร็วๆ นี้)' },
      { tool: 'arrowMarkRight', icon: 'arrowRight', title: 'Arrow Mark Right (เร็วๆ นี้)' },
      { tool: 'flagMark', icon: 'flagMark', title: 'Flag Mark (เร็วๆ นี้)' },
      { tool: 'emoji', icon: 'emoji', title: 'Icons / Emoji (เร็วๆ นี้)' },
    ],
  },

  // ---------------------------------------------------------
  // 6) PATTERNS
  // ---------------------------------------------------------
  {
    id: 'patterns',
    type: 'group',
    icon: 'patternWave',
    title: 'Patterns',
    tools: [
      { tool: 'xabcd', icon: 'patternWave', title: 'XABCD Pattern (เร็วๆ นี้)' },
      { tool: 'cypher', icon: 'patternWave', title: 'Cypher Pattern (เร็วๆ นี้)' },
      { tool: 'abcd', icon: 'patternWave', title: 'ABCD Pattern (เร็วๆ นี้)' },
      { tool: 'trianglePattern', icon: 'triangleShape', title: 'Triangle Pattern (เร็วๆ นี้)' },
      { tool: 'threeDrives', icon: 'patternWave', title: 'Three Drives Pattern (เร็วๆ นี้)' },
      { tool: 'headShoulders', icon: 'patternWave', title: 'Head and Shoulders (เร็วๆ นี้)' },
      { tool: 'elliottImpulse', icon: 'patternWave', title: 'Elliott Impulse Wave (12345) (เร็วๆ นี้)' },
      { tool: 'elliottTriangle', icon: 'patternWave', title: 'Elliott Triangle Wave (ABCDE) (เร็วๆ นี้)' },
      { tool: 'elliottTripleCombo', icon: 'patternWave', title: 'Elliott Triple Combo (WXYXZ) (เร็วๆ นี้)' },
      { tool: 'elliottCorrection', icon: 'patternWave', title: 'Elliott Correction Wave (ABC) (เร็วๆ นี้)' },
      { tool: 'elliottDoubleCombo', icon: 'patternWave', title: 'Elliott Double Combo (WXY) (เร็วๆ นี้)' },
      { tool: 'cyclicLines', icon: 'sineWave', title: 'Cyclic Lines (เร็วๆ นี้)' },
      { tool: 'timeCycles', icon: 'sineWave', title: 'Time Cycles (เร็วๆ นี้)' },
      { tool: 'sineLine', icon: 'sineWave', title: 'Sine Line (เร็วๆ นี้)' },
    ],
  },

  // ---------------------------------------------------------
  // 7) PREDICTION AND MEASUREMENT
  // ---------------------------------------------------------
  {
    id: 'prediction',
    type: 'group',
    icon: 'longPosition', // ให้ตรงกับเครื่องมือแรกสุด/ที่ใช้บ่อยสุดในกลุ่มนี้ (เดิมตั้งเป็น 'measure' ทำให้มองไม่เห็นว่าข้างในมี Long/Short Position)
    title: 'Prediction and Measurement',
    tools: [
      { sectionHeader: 'Forecasting' },
      { tool: 'longPosition', icon: 'longPosition', title: 'Long Position' },
      { tool: 'shortPosition', icon: 'shortPosition', title: 'Short Position' },
      { tool: 'forecast', icon: 'patternWave', title: 'Position Forecast (เร็วๆ นี้)' },
      { tool: 'barPattern', icon: 'patternWave', title: 'Bars Pattern (เร็วๆ นี้)' },
      { tool: 'ghostFeed', icon: 'ghostFeed', title: 'Ghost Feed (เร็วๆ นี้)' },
      { tool: 'sector', icon: 'patternWave', title: 'Sector (เร็วๆ นี้)' },
      { sectionHeader: 'Volume-Based' },
      { tool: 'anchoredVWAP', icon: 'anchoredVWAP', title: 'Anchored VWAP (เร็วๆ นี้)' },
      { tool: 'fixedRangeVolumeProfile', icon: 'patternWave', title: 'Fixed Range Volume Profile (เร็วๆ นี้)' },
      { tool: 'anchoredVolumeProfile', icon: 'patternWave', title: 'Anchored Volume Profile (เร็วๆ นี้)' },
      { sectionHeader: 'Measurers' },
      { tool: 'priceRange', icon: 'priceRange', title: 'Price Range (เร็วๆ นี้)' },
      { tool: 'dateRange', icon: 'dateRange', title: 'Date Range (เร็วๆ นี้)' },
      { tool: 'dateAndPriceRange', icon: 'dateRange', title: 'Date and Price Range (เร็วๆ นี้)' },
      { tool: 'measure', icon: 'measure', title: 'Measure' },
      { tool: 'projection', icon: 'ghostFeed', title: 'Projection (เร็วๆ นี้)' },
    ],
  },

  // ---------------------------------------------------------
  // เครื่องมือเดี่ยว + toggle + action (ไม่มีเมนูย่อย)
  // ---------------------------------------------------------
  {
    id: 'zoom',
    type: 'tool',
    tool: 'zoom',
    icon: 'zoom',
    title: 'Zoom (เร็วๆ นี้)',
  },
  {
    id: 'magnet',
    type: 'toggle',
    toggle: 'magnet',
    icon: 'magnet',
    title: 'Magnet Mode — สแนปเข้าจุดแท่งเทียน',
  },
  {
    id: 'lock',
    type: 'toggle',
    toggle: 'lock',
    icon: 'lock',
    title: 'Lock All Drawing Tools',
  },
  {
    id: 'eye',
    type: 'toggle',
    toggle: 'eye',
    icon: 'eye',
    title: 'Hide/Show drawings',
  },
  {
    id: 'trash',
    type: 'action',
    action: 'trash',
    icon: 'trash',
    title: 'Remove (ลบเส้นที่เลือก หรือลบทั้งหมดถ้าไม่ได้เลือก)',
  },
];
