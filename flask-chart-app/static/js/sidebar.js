/* ============================================================
   SIDEBAR.JS
   ------------------------------------------------------------
   เอนจิ้นของแถบเครื่องมือซ้าย: อ่านโครงสร้างจาก SIDEBAR_GROUPS
   (sidebar-config.js) แล้ว render ปุ่มจริง + ผูก interaction ทั้งหมด:

     - Tooltip: hover ค้าง 300-400ms ถึงจะโชว์ กันกระพริบตอนลากเมาส์ผ่าน
     - Flyout Sub-menu: เปิดได้ 2 ทาง — คลิกลูกศร หรือกดค้าง (long press) 500ms
     - คลิกปุ่มหลักตรงๆ (ไม่ใช่ลูกศร) = เรียก "เครื่องมือล่าสุด" ของหมวดนั้นทันที
     - จำเครื่องมือล่าสุดต่อหมวด (lastUsedTool) แล้วเปลี่ยนไอคอนหลักตาม
     - Click Outside ปิดเมนูย่อยอัตโนมัติ

   ไฟล์นี้เรียก DrawingsModule ตรงๆ (setTool/setLocked/setVisible/
   setMagnet/removeSelected/clearAll) เหมือนที่ app.js เคยทำ ดังนั้น
   app.js ไม่ต้องผูกปุ่มพวกนี้เองอีกแล้ว — แค่เรียก SidebarModule.init()
   ============================================================ */

const SidebarModule = (() => {

  const HOVER_DELAY_MS = 350;      // หน่วงก่อนโชว์ tooltip (สเปคคือ 300-400ms)
  const LONG_PRESS_MS = 500;       // กดค้างเท่านี้ = เปิดเมนูย่อย

  let container;
  let tooltipEl, submenuEl;
  let hoverTimer = null;
  let longPressTimer = null;
  let longPressTriggered = false;  // กันไม่ให้ click event หลัง long-press ไปเลือก tool ซ้ำ
  let openGroupId = null;          // id ของ group ที่เมนูย่อยกำลังเปิดอยู่ (null = ปิดอยู่)
  const lastUsedTool = {};         // { groupId: toolName } จำเครื่องมือล่าสุดต่อหมวด
  const toolToGroupId = {};        // reverse lookup: toolName -> groupId (หรือ id ของปุ่มเดี่ยว)

  // ---- เริ่มต้นระบบ ----
  function init({ containerEl }) {
    container = containerEl;

    // สร้าง reverse lookup ไว้ล่วงหน้า เพื่อให้รู้ว่า tool ไหนเป็นของกลุ่มไหน
    SIDEBAR_GROUPS.forEach(group => {
      if (group.type === 'group') {
        group.tools.forEach(t => { toolToGroupId[t.tool] = group.id; });
        lastUsedTool[group.id] = group.tools[0].tool; // ค่าเริ่มต้น = ตัวแรกในลิสต์
      } else if (group.type === 'tool') {
        toolToGroupId[group.tool] = group.id;
      }
    });

    createFloatingElements();
    renderButtons();
    document.addEventListener('click', onDocumentClick, true);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSubmenu();
    });
  }

  function createFloatingElements() {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'sidebar-tooltip';
    document.body.appendChild(tooltipEl);

    submenuEl = document.createElement('div');
    submenuEl.className = 'sidebar-submenu';
    document.body.appendChild(submenuEl);
  }

  // ---- Render ปุ่มทั้งหมดจาก config ----
  function renderButtons() {
    container.innerHTML = '';
    SIDEBAR_GROUPS.forEach(group => {
      const btn = buildButton(group);
      container.appendChild(btn);
    });
    // ตั้งค่า active เริ่มต้นที่ cursor
    setActiveTool('cursor');
  }

  function buildButton(group) {
    const btn = document.createElement('div');
    btn.className = 'lt-btn';
    btn.dataset.groupId = group.id;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'lt-btn-icon';
    iconSpan.innerHTML = ICONS[group.icon] || '';
    btn.appendChild(iconSpan);

    if (group.type === 'group') {
      const caret = document.createElement('span');
      caret.className = 'lt-caret';
      caret.innerHTML = ICONS.caretRight || '›';
      caret.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSubmenu(group, btn);
      });
      btn.appendChild(caret);
    }

    // ---- Tooltip: hover ค้างก่อนโชว์ ----
    btn.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => showTooltip(btn, currentTooltipText(group)), HOVER_DELAY_MS);
    });
    btn.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimer);
      hideTooltip();
    });

    // ---- คลิก / กดค้าง ----
    btn.addEventListener('mousedown', (e) => {
      if (e.target.closest('.lt-caret')) return; // ลูกศรจัดการเองแล้วด้านบน
      if (group.type === 'group') {
        longPressTimer = setTimeout(() => {
          longPressTimer = null;
          longPressTriggered = true;
          toggleSubmenu(group, btn);
        }, LONG_PRESS_MS);
      }
    });
    btn.addEventListener('mouseup', () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    });

    btn.addEventListener('click', (e) => {
      if (e.target.closest('.lt-caret')) return;
      if (longPressTriggered) {
        // click นี้เป็นผลพวงจาก mouseup หลัง long-press ที่เพิ่งเปิดเมนูไปแล้ว ข้ามไปเลย
        longPressTriggered = false;
        return;
      }
      handleMainClick(group, btn);
    });

    return btn;
  }

  function currentTooltipText(group) {
    if (group.type === 'group') {
      const active = lastUsedTool[group.id];
      const activeTool = group.tools.find(t => t.tool === active);
      return activeTool ? activeTool.title : group.title;
    }
    return group.title;
  }

  // ---- คลิกปุ่มหลัก (ไม่โดนลูกศร) ----
  function handleMainClick(group, btn) {
    hideTooltip();

    if (group.type === 'tool') {
      applyTool(group.tool);
      setActiveTool(group.tool);
      return;
    }

    if (group.type === 'group') {
      // เรียกเครื่องมือล่าสุดของหมวดนี้ทันที ไม่ต้องเปิดเมนูย่อย
      const tool = lastUsedTool[group.id] || group.tools[0].tool;
      applyTool(tool);
      setActiveTool(tool);
      return;
    }

    if (group.type === 'toggle') {
      btn.classList.toggle('active');
      const isOn = btn.classList.contains('active');
      applyToggle(group.toggle, isOn);
      return;
    }

    if (group.type === 'action') {
      applyAction(group.action);
    }
  }

  // ---- ส่งคำสั่งจริงไปยัง DrawingsModule ----
  function applyTool(tool) {
    if (window.DrawingsModule) DrawingsModule.setTool(tool);
  }

  function applyToggle(toggle, isOn) {
    if (!window.DrawingsModule) return;
    if (toggle === 'lock') DrawingsModule.setLocked(isOn);
    else if (toggle === 'eye') DrawingsModule.setVisible(!isOn); // active = ซ่อนอยู่
    else if (toggle === 'magnet') DrawingsModule.setMagnet(isOn);
  }

  function applyAction(action) {
    if (!window.DrawingsModule) return;
    if (action === 'trash') {
      const removedSomething = DrawingsModule.removeSelected();
      if (!removedSomething) {
        if (confirm('ยังไม่ได้เลือกเส้นไหนไว้ — ต้องการลบเส้น/เครื่องมือวาดทั้งหมดบนกราฟเลยไหม?')) {
          DrawingsModule.clearAll();
        }
      }
    }
  }

  // ================================================================
  // FLYOUT SUB-MENU
  // ================================================================
  function toggleSubmenu(group, btn) {
    if (openGroupId === group.id) {
      closeSubmenu();
    } else {
      openSubmenu(group, btn);
    }
  }

  function openSubmenu(group, btn) {
    hideTooltip();
    openGroupId = group.id;
    submenuEl.innerHTML = '';

    group.tools.forEach(t => {
      const item = document.createElement('div');
      item.className = 'sidebar-submenu-item';
      if (lastUsedTool[group.id] === t.tool) item.classList.add('active');
      item.innerHTML = `
        <span class="sidebar-submenu-icon">${ICONS[t.icon] || ''}</span>
        <span class="sidebar-submenu-label">${t.title}</span>
      `;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        lastUsedTool[group.id] = t.tool;
        updateGroupIcon(group.id, t.icon);
        applyTool(t.tool);
        setActiveTool(t.tool);
        closeSubmenu();
      });
      submenuEl.appendChild(item);
    });

    const rect = btn.getBoundingClientRect();
    submenuEl.style.top = `${rect.top}px`;
    submenuEl.style.left = `${rect.right + 6}px`;
    submenuEl.classList.add('visible');
  }

  function closeSubmenu() {
    openGroupId = null;
    submenuEl.classList.remove('visible');
  }

  function onDocumentClick(e) {
    if (!openGroupId) return;
    if (submenuEl.contains(e.target)) return; // คลิกในเมนูเอง จัดการแยกไว้แล้ว
    if (e.target.closest && e.target.closest('.lt-caret')) return; // ให้ caret click handler จัดการเอง
    closeSubmenu();
  }

  // ================================================================
  // TOOLTIP
  // ================================================================
  function showTooltip(btn, text) {
    if (openGroupId) return; // ถ้ามีเมนูย่อยเปิดอยู่ ไม่ต้องโชว์ tooltip ซ้อน
    const rect = btn.getBoundingClientRect();
    tooltipEl.textContent = text;
    tooltipEl.style.top = `${rect.top + rect.height / 2}px`;
    tooltipEl.style.left = `${rect.right + 8}px`;
    tooltipEl.classList.add('visible');
  }

  function hideTooltip() {
    tooltipEl.classList.remove('visible');
  }

  // ================================================================
  // ACTIVE STATE (เรียกจากภายนอกด้วย เช่นตอน drawings.js สลับกลับเป็น cursor เอง)
  // ================================================================
  function setActiveTool(tool) {
    const groupId = toolToGroupId[tool] || (tool === 'cursor' ? 'cursor' : null);
    if (!groupId) return;

    container.querySelectorAll('.lt-btn').forEach(b => b.classList.remove('active'));
    const btn = container.querySelector(`.lt-btn[data-group-id="${groupId}"]`);
    if (btn) btn.classList.add('active');

    // ถ้าเป็นปุ่มกลุ่ม อัปเดต "เครื่องมือล่าสุด" + ไอคอนหลักให้ตรงกับ tool ที่เพิ่งใช้
    const group = SIDEBAR_GROUPS.find(g => g.id === groupId);
    if (group && group.type === 'group') {
      const toolDef = group.tools.find(t => t.tool === tool);
      if (toolDef) {
        lastUsedTool[groupId] = tool;
        updateGroupIcon(groupId, toolDef.icon);
      }
    }
  }

  function updateGroupIcon(groupId, iconKey) {
    const btn = container.querySelector(`.lt-btn[data-group-id="${groupId}"]`);
    if (!btn) return;
    const iconSpan = btn.querySelector('.lt-btn-icon');
    if (iconSpan) iconSpan.innerHTML = ICONS[iconKey] || '';
  }

  return { init, setActiveTool };
})();
