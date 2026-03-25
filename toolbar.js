/* ===================================================
   DERGI STÜDYOSU — TOOLBAR & PROPERTIES PANEL
   toolbar.js
   =================================================== */

'use strict';

// Wait for app.js to load
window.addEventListener('DOMContentLoaded', () => {
  setupPropertyBindings();
  setupLayerButtons();
  setupElementActions();
});

// ─── PROPERTY BINDINGS ────────────────────────────────
function setupPropertyBindings() {

  // Position / size inputs
  const posFields = [
    { id: 'prop-x', key: 'x' },
    { id: 'prop-y', key: 'y' },
    { id: 'prop-w', key: 'w' },
    { id: 'prop-h', key: 'h' },
    { id: 'prop-rot', key: 'rotation' },
  ];

  posFields.forEach(({ id, key }) => {
    document.getElementById(id).addEventListener('change', () => {
      const el = App.selectedElement;
      if (!el) return;
      const data = getElementData(el.dataset.id);
      if (!data) return;
      data[key] = parseFloat(document.getElementById(id).value) || 0;
      applyElementStyles(el, data);
      renderThumbnails();
      pushHistory();
    });
  });

  // ── TEXT PROPERTIES ──
  document.getElementById('prop-font').addEventListener('change', e => {
    applyTextProp('fontFamily', e.target.value);
  });

  document.getElementById('prop-font-size').addEventListener('change', e => {
    applyTextProp('fontSize', parseInt(e.target.value) || 16);
  });

  document.getElementById('prop-line-height').addEventListener('change', e => {
    applyTextProp('lineHeight', parseFloat(e.target.value) || 1.4);
  });

  document.getElementById('prop-text-color').addEventListener('change', e => {
    applyTextProp('color', e.target.value);
  });

  // Bold / Italic / Underline
  document.getElementById('prop-bold').addEventListener('click', function() {
    this.classList.toggle('active');
    applyTextProp('bold', this.classList.contains('active'));
  });
  document.getElementById('prop-italic').addEventListener('click', function() {
    this.classList.toggle('active');
    applyTextProp('italic', this.classList.contains('active'));
  });
  document.getElementById('prop-underline').addEventListener('click', function() {
    this.classList.toggle('active');
    applyTextProp('underline', this.classList.contains('active'));
  });

  // Text alignment
  ['left','center','right','justify'].forEach(align => {
    document.getElementById('align-' + align).addEventListener('click', function() {
      document.querySelectorAll('[id^="align-"]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      applyTextProp('align', align);
    });
  });

  // ── SHAPE PROPERTIES ──
  document.getElementById('prop-fill').addEventListener('change', e => {
    applyShapeProp('fill', e.target.value);
  });

  document.getElementById('prop-stroke').addEventListener('change', e => {
    applyShapeProp('stroke', e.target.value);
  });

  document.getElementById('prop-stroke-width').addEventListener('change', e => {
    applyShapeProp('strokeWidth', parseInt(e.target.value) || 0);
  });

  document.getElementById('prop-border-radius').addEventListener('change', e => {
    applyShapeProp('borderRadius', parseInt(e.target.value) || 0);
  });

  document.getElementById('prop-opacity').addEventListener('input', e => {
    const val = parseInt(e.target.value);
    document.getElementById('prop-opacity-label').textContent = val + '%';
    applyShapeProp('opacity', val);
  });
  // Sürükleme bittikten sonra history'e yaz
  document.getElementById('prop-opacity').addEventListener('change', () => pushHistory());

  // Page background
  document.getElementById('prop-page-bg').addEventListener('change', e => {
    const page = App.pages[App.currentPageIndex];
    if (page) {
      page.background = e.target.value;
      window.canvas.style.background = e.target.value;
      renderThumbnails();
    }
  });

  // Color swatches (simple inline pickers using input[type=color])
  setupColorSwatch('text-color-picker', 'prop-text-color', (color) => applyTextProp('color', color));
  setupColorSwatch('fill-color-picker', 'prop-fill', (color) => applyShapeProp('fill', color));
  setupColorSwatch('stroke-color-picker', 'prop-stroke', (color) => applyShapeProp('stroke', color));
  setupColorSwatch('page-bg-picker', 'prop-page-bg', (color) => {
    const page = App.pages[App.currentPageIndex];
    if (page) { page.background = color; window.canvas.style.background = color; renderThumbnails(); }
  });
}

function setupColorSwatch(swatchId, inputId, callback) {
  const swatch = document.getElementById(swatchId);
  const input  = document.getElementById(inputId);

  // Style swatch based on current value
  function syncSwatch() {
    const color = input.value || '#ffffff';
    swatch.style.background = color;
  }
  syncSwatch();
  input.addEventListener('change', syncSwatch);

  // Click swatch → open native color picker
  const picker = document.createElement('input');
  picker.type = 'color';
  picker.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
  swatch.appendChild(picker);

  swatch.addEventListener('click', () => {
    picker.value = rgbToHex(input.value) || '#7c6ef5';
    picker.click();
  });

  picker.addEventListener('input', (e) => {
    const color = e.target.value;
    input.value = color;
    swatch.style.background = color;
    callback(color);
  });

  picker.addEventListener('change', (e) => {
    callback(e.target.value);
    pushHistory();
  });
}

function rgbToHex(color) {
  if (!color || color === 'transparent') return '#ffffff';
  if (color.startsWith('#')) return color;
  // Try parsing rgb()
  const m = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return '#ffffff';
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2,'0')).join('');
}

// ─── HELPER APPLIERS ─────────────────────────────────
function applyTextProp(key, value) {
  const el = App.selectedElement;
  if (!el) return;
  const data = getElementData(el.dataset.id);
  if (!data || data.type !== 'text') return;
  data[key] = value;
  applyElementStyles(el, data);
  renderThumbnails();
}

function applyShapeProp(key, value) {
  const el = App.selectedElement;
  if (!el) return;
  const data = getElementData(el.dataset.id);
  if (!data) return;
  data[key] = value;
  applyElementStyles(el, data);
  renderThumbnails();
}

// ─── LAYER BUTTONS ────────────────────────────────────
function setupLayerButtons() {
  document.getElementById('btn-front').addEventListener('click', bringToFront);
  document.getElementById('btn-back').addEventListener('click', sendToBack);
  document.getElementById('btn-forward').addEventListener('click', bringForward);
  document.getElementById('btn-backward').addEventListener('click', sendBackward);
}

// ─── ELEMENT ACTION BUTTONS ───────────────────────────
function setupElementActions() {
  document.getElementById('btn-duplicate-el').addEventListener('click', duplicateSelected);
  document.getElementById('btn-delete-el').addEventListener('click', deleteSelected);
}
