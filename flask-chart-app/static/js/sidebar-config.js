/* ============================================================
   SIDEBAR-CONFIG.JS
   ------------------------------------------------------------
   ไฟล์นี้เก็บ "โครงสร้างข้อมูล" ของปุ่มทั้งหมดในแถบเครื่องมือซ้าย
   ไม่มี logic การ render หรือ event ใดๆ อยู่ในไฟล์นี้ — เพื่อให้
   แก้ไข/เพิ่ม/ลบปุ่ม หรือจัดกลุ่มเครื่องมือใหม่ทำได้ง่ายที่นี่ที่เดียว
   โดยไม่ต้องไปแตะ logic ใน sidebar.js เลย

   รูปแบบแต่ละปุ่ม (เทียบเท่า Props ของ "Tool Item" ตามสเปค):
   {
     id:        string   — ตัวระบุไม่ซ้ำกัน ใช้ผูก state (เช่น lastUsedTool)
     title:     string   — ข้อความ Tooltip เมื่อ hover ปุ่มนี้ (เมื่อยังไม่มี sub-menu)
     type:      'tool' | 'group' | 'toggle' | 'action'
                  - 'tool'   : ปุ่มเดี่ยว คลิกแล้วเลือกเครื่องมือทันที ไม่มีเมนูย่อย
                  - 'group'  : มีเมนูย่อย (hasSubMenu = true) มีลูกศรเล็กๆ มุมขวา
                  - 'toggle' : ปุ่มเปิด/ปิด อิสระ (เช่น lock, eye, magnet)
                  - 'action' : ปุ่มกดแล้วทำงานทันที ไม่ใช่โหมด (เช่น trash)
     icon:      string   — key ที่ตรงกับ ICONS ใน icons.js (ไอคอนเริ่มต้นที่โชว์)
     tool:      string   — (เฉพาะ type: 'tool') ชื่อ tool ที่จะส่งให้ DrawingsModule.setTool()
     toggle:    string   — (เฉพาะ type: 'toggle') ชื่อ toggle: 'lock' | 'eye' | 'magnet'
     action:    string   — (เฉพาะ type: 'action') ชื่อ action: 'trash'
     tools:     array    — (เฉพาะ type: 'group') รายการเครื่องมือย่อยใน flyout menu
                            แต่ละอันมี { tool, icon, title }
   }
   ============================================================ */

const SIDEBAR_GROUPS = [
  {
    id: 'cursor',
    type: 'tool',
    tool: 'cursor',
    icon: 'cursor',
    title: 'Cursor / Crosshair (Esc)',
  },
  {
    id: 'trendlines',
    type: 'group',
    icon: 'trendline', // ไอคอนเริ่มต้นก่อนผู้ใช้เลือกอะไร (จะถูกแทนที่ด้วย "เครื่องมือล่าสุด" หลังใช้งาน)
    title: 'Trend Line Tools',
    tools: [
      { tool: 'trendline', icon: 'trendline', title: 'Trend Line' },
      { tool: 'ray', icon: 'ray', title: 'Ray' },
      { tool: 'extendedLine', icon: 'extendedLine', title: 'Extended Line' },
      { tool: 'horizontal', icon: 'horizontalLine', title: 'Horizontal Line' },
      { tool: 'horizontalRay', icon: 'horizontalRay', title: 'Horizontal Ray' },
      { tool: 'verticalLine', icon: 'verticalLine', title: 'Vertical Line' },
      { tool: 'crossLine', icon: 'crossLine', title: 'Cross Line' },
    ],
  },
  {
    id: 'gannfib',
    type: 'group',
    icon: 'fibRetracement',
    title: 'Gann and Fibonacci tools',
    tools: [
      { tool: 'fibonacci', icon: 'fibRetracement', title: 'Fib Retracement' },
      { tool: 'gann', icon: 'gannBox', title: 'Gann Box (เร็วๆ นี้)' },
    ],
  },
  {
    id: 'text',
    type: 'tool',
    tool: 'text',
    icon: 'textTool',
    title: 'Text',
  },
  {
    id: 'emoji',
    type: 'tool',
    tool: 'emoji',
    icon: 'emoji',
    title: 'Icons / Emoji (เร็วๆ นี้)',
  },
  {
    id: 'measure',
    type: 'tool',
    tool: 'measure',
    icon: 'measure',
    title: 'Measure (วัดระยะ/ราคา)',
  },
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
    title: 'Magnet — สแนปเข้าจุดแท่งเทียน',
  },
  {
    id: 'lock',
    type: 'toggle',
    toggle: 'lock',
    icon: 'lock',
    title: 'Lock — ล็อกเส้นทั้งหมดไม่ให้แก้ไข',
  },
  {
    id: 'eye',
    type: 'toggle',
    toggle: 'eye',
    icon: 'eye',
    title: 'Show / Hide drawings',
  },
  {
    id: 'trash',
    type: 'action',
    action: 'trash',
    icon: 'trash',
    title: 'ลบเส้นที่เลือก (หรือลบทั้งหมดถ้าไม่ได้เลือก)',
  },
];
