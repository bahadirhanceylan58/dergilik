/* ===================================================
   DERGI STÜDYOSU — CORE APPLICATION
   app.js
   =================================================== */

'use strict';

// ─── CONSTANTS ───────────────────────────────────────
const PAGE_FORMATS = {
  A4: { w: 794, h: 1123, label: 'A4 (210×297mm)' },
  A3: { w: 1123, h: 1587, label: 'A3 (297×420mm)' }
};

// ─── APP STATE ────────────────────────────────────────
const App = {
  format: 'A3',
  zoom: 1,
  pages: [],
  currentPageIndex: 0,
  selectedElement: null,
  selectedElements: [],   // çoklu seçim kümesi
  currentTool: 'select',
  gridVisible: false,
  history: [],
  redoStack: [],
  idCounter: 0,
  dragging: false,
  drawing: false,
  drawStart: null,
};

// ─── DOM REFERENCES ───────────────────────────────────
const canvas       = document.getElementById('page-canvas');
const canvasArea   = document.getElementById('canvas-area');
const thumbsPanel  = document.getElementById('page-thumbnails');
const zoomLabel    = document.getElementById('zoom-label');
const gridOverlay  = document.getElementById('grid-overlay');
const formatBadge  = document.getElementById('format-badge');
const contextMenu  = document.getElementById('context-menu');
const loadingOv    = document.getElementById('loading-overlay');
const loadingTxt   = document.getElementById('loading-text');

// ─── INITIAL TEMPLATES ────────────────────────────────
// Tüm şablonlar A3 boyutlarına göre tanımlıdır.
// loadTemplate() aktif formata göre otomatik ölçekler.
const TEMPLATES = {
  cover: {
    background: '#1a1a2e',
    elements: [
      { id: 't1', type: 'image', x: 0, y: 0, w: 1123, h: 1587, src: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1123&q=80', zIndex: 1, opacity: 80 },
      { id: 't2', type: 'text', x: 50, y: 100, w: 1000, h: 150, text: 'VOGUE', fontFamily: 'Playfair Display', fontSize: 180, color: '#ffffff', bold: true, align: 'center', zIndex: 2 },
      { id: 't3', type: 'text', x: 100, y: 300, w: 900, h: 80, text: 'YAZ KOLEKSİYONU 2026', fontFamily: 'Inter', fontSize: 40, color: '#facc15', align: 'center', bold: true, zIndex: 2 },
      { id: 't4', type: 'text', x: 100, y: 1200, w: 500, h: 200, text: 'MODANIN\nYENİ KURALLARI\nBAŞLIYOR', fontFamily: 'Playfair Display', fontSize: 60, color: '#ffffff', bold: true, align: 'left', lineHeight: 1.2, zIndex: 2 },
      { id: 't5', type: 'rect', x: 80, y: 1180, w: 10, h: 220, fill: '#facc15', stroke: 'transparent', strokeWidth: 0, zIndex: 2 }
    ]
  },
  article: {
    background: '#ffffff',
    elements: [
      { id: 't1', type: 'text', x: 100, y: 150, w: 900, h: 120, text: 'Geleceğin Mimarisi', fontFamily: 'Playfair Display', fontSize: 80, color: '#111827', bold: true, align: 'left', zIndex: 1 },
      { id: 't2', type: 'line', x: 100, y: 300, w: 900, h: 4, fill: '#111827', stroke: 'transparent', strokeWidth: 0, zIndex: 1 },
      { id: 't3', type: 'column', x: 100, y: 350, w: 420, h: 800, fill: 'transparent', stroke: 'transparent', strokeWidth: 0, zIndex: 1 },
      { id: 't4', type: 'text', x: 100, y: 350, w: 420, h: 800, text: 'Mimari tasarım, yalnızca bir yapının fiziksel inşası değil, aynı zamanda toplumun kültürel ve sosyolojik yapısının mekansal bir yansımasıdır. Geleneksel yaklaşımlar yerini çok daha entegre ve sürdürülebilir yöntemlere bırakıyor.<br><br>Yapay zeka ve parametrik tasarım, modern mimarinin temel taşları haline geldi. Bu yeni çağda, yapılar çevresel verileri analiz edip kendi iklimlendirmesini optimize edebiliyor.', fontFamily: 'Inter', fontSize: 24, color: '#374151', align: 'justify', lineHeight: 1.6, zIndex: 2 },
      { id: 't5', type: 'column', x: 580, y: 350, w: 420, h: 800, fill: 'transparent', stroke: 'transparent', strokeWidth: 0, zIndex: 1 },
      { id: 't6', type: 'text', x: 580, y: 350, w: 420, h: 800, text: 'Akıllı şehir konseptleri, mimari tasarımların bireysel binalardan çıkıp devasa kentsel ekosistemlere dönüşmesini sağlıyor.<br><br>Malzeme bilimi de bu devrime katkıda bulunuyor. Kendi kendini onaran beton, enerji üreten camlar ve karbon negatif materyaller geleceğin şehirlerini inşa etmekte kullanılacak. Tasarımcılar artık sadece form ile değil, performans ile de ilgilenmek zorunda.', fontFamily: 'Inter', fontSize: 24, color: '#374151', align: 'justify', lineHeight: 1.6, zIndex: 2 },
      { id: 't7', type: 'text', x: 100, y: 1400, w: 200, h: 40, text: 'Sayfa 2', fontFamily: 'Inter', fontSize: 18, color: '#9ca3af', align: 'left', zIndex: 1 }
    ]
  },
  photo: {
    background: '#000000',
    elements: [
      { id: 't1', type: 'image', x: 100, y: 200, w: 923, h: 800, src: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1000&q=80', zIndex: 1 },
      { id: 't2', type: 'text', x: 100, y: 1050, w: 923, h: 100, text: 'ŞEHİR IŞIKLARI', fontFamily: 'Roboto Condensed', fontSize: 70, color: '#ffffff', bold: true, align: 'center', zIndex: 2 },
      { id: 't3', type: 'text', x: 100, y: 1150, w: 923, h: 40, text: 'Fotoğraf: Alexander Smith', fontFamily: 'Inter', fontSize: 24, color: '#9ca3af', align: 'center', italic: true, zIndex: 2 }
    ]
  }
};

window.loadTemplate = function(templateId) {
  const tpl = TEMPLATES[templateId];
  if (!tpl) return;

  if (App.pages[App.currentPageIndex].elements.length > 0) {
    if (!confirm('Bu sayfaya şablon yüklerseniz mevcut öğeler silinecek. Devam edilsin mi?')) return;
  }

  App.pages[App.currentPageIndex].background = tpl.background;

  // Şablonlar A3 için tanımlıdır; aktif formata orantılı ölçekle
  const A3_W = PAGE_FORMATS['A3'].w;
  const A3_H = PAGE_FORMATS['A3'].h;
  const fmt  = PAGE_FORMATS[App.format];
  const scaleX = fmt.w / A3_W;
  const scaleY = fmt.h / A3_H;

  App.pages[App.currentPageIndex].elements = tpl.elements.map(el => {
    const newEl = {
      ...el,
      id: ++App.idCounter,
      x: Math.round(el.x * scaleX),
      y: Math.round(el.y * scaleY),
      w: Math.round(el.w * scaleX),
      h: Math.round(el.h * scaleY),
    };
    if (el.fontSize) newEl.fontSize = Math.round(el.fontSize * scaleX);
    return newEl;
  });

  deselectAll();
  renderCanvas();
  renderThumbnails();
  pushHistory();
  showToast('Şablon yüklendi!', 'success');
  toggleDropdown('dd-templates');
};

// ─── INIT ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Splash screen
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    splash.classList.add('hidden');
    setTimeout(() => splash.remove(), 700);
  }, 1400);

  // Kaydedilmiş çalışmayı yükle; yoksa boş sayfa oluştur
  if (!loadFromStorage()) {
    addPage();
  }

  applyZoom();
  fitZoomToMobile(); // mobilde sayfayı ekrana sığdır
  renderThumbnails();

  setupCanvasListeners();
  setupKeyboard();
  setupMenubar();
  setupContextMenu();
  setupImageUpload();
  setupFileLoad();
  setupMobilePanels();
});

// ─── PAGE MANAGEMENT ─────────────────────────────────
function createPage() {
  return {
    id: ++App.idCounter,
    elements: [],
    background: '#ffffff',
  };
}

function addPage(afterIndex = null) {
  const page = createPage();
  if (afterIndex === null) {
    App.pages.push(page);
  } else {
    App.pages.splice(afterIndex + 1, 0, page);
  }
  const idx = App.pages.indexOf(page);
  switchPage(idx);
  renderThumbnails();
  return page;
}

function duplicatePage(idx) {
  const orig = App.pages[idx];
  const copy = createPage();
  copy.background = orig.background;
  copy.elements = orig.elements.map(el => ({ ...el, id: ++App.idCounter }));
  App.pages.splice(idx + 1, 0, copy);
  switchPage(idx + 1);
  renderThumbnails();
}

function deletePage(idx) {
  if (App.pages.length === 1) { showToast('En az 1 sayfa olmalı.', 'error'); return; }
  App.pages.splice(idx, 1);
  const newIdx = Math.min(idx, App.pages.length - 1);
  switchPage(newIdx);
  renderThumbnails();
}

function switchPage(idx) {
  deselectAll();
  App.currentPageIndex = idx;
  renderCanvas();
  renderThumbnails();
}

// ─── FORMAT ───────────────────────────────────────────
window.setPageFormat = function(fmt) {
  App.format = fmt;
  formatBadge.textContent = fmt;
  updateCanvasSize();
  fitZoomToMobile();
  showToast(`Format: ${PAGE_FORMATS[fmt].label}`, 'info');
};

function updateCanvasSize() {
  const fmt = PAGE_FORMATS[App.format];
  canvas.style.width  = fmt.w * App.zoom + 'px';
  canvas.style.height = fmt.h * App.zoom + 'px';
  canvas.dataset.baseW = fmt.w;
  canvas.dataset.baseH = fmt.h;
}

// ─── ZOOM ─────────────────────────────────────────────
// applyZoom, updateCanvasSize'ı çağırır — boyut ayarı tek yerde
function applyZoom() {
  updateCanvasSize();
  zoomLabel.textContent = Math.round(App.zoom * 100) + '%';
  document.querySelectorAll('.canvas-element').forEach(el => {
    const data = getElementData(el.dataset.id);
    if (data) applyElementStyles(el, data);
  });
}

// Mobilde sayfayı ekran genişliğine otomatik sığdır
function fitZoomToMobile() {
  if (window.innerWidth > 768) return;
  const padding   = 32; // canvas-wrapper padding (16px × 2)
  const available = window.innerWidth - padding;
  const fmt       = PAGE_FORMATS[App.format];
  App.zoom = parseFloat(Math.max(0.15, Math.min(available / fmt.w, 1.0)).toFixed(2));
  applyZoom();
}

// Mobil özellikler paneli aç
function openMobileProps() {
  if (window.innerWidth > 768) return;
  document.getElementById('properties-panel').classList.add('mobile-open');
  document.getElementById('btn-mobile-props')?.classList.add('active');
}

// Mobil özellikler paneli kapat
function closeMobileProps() {
  if (window.innerWidth > 768) return;
  document.getElementById('properties-panel').classList.remove('mobile-open');
  document.getElementById('btn-mobile-props')?.classList.remove('active');
}

document.getElementById('btn-zoom-in').addEventListener('click', () => {
  App.zoom = Math.min(App.zoom + 0.1, 3);
  applyZoom();
});
document.getElementById('btn-zoom-out').addEventListener('click', () => {
  App.zoom = Math.max(App.zoom - 0.1, 0.2);
  applyZoom();
});

// Ekran döndürme / resize → tekrar fit
window.addEventListener('resize', () => fitZoomToMobile());

// ─── MENUBAR ──────────────────────────────────────────
function setupMenubar() {
  document.getElementById('btn-grid').addEventListener('click', function() {
    App.gridVisible = !App.gridVisible;
    gridOverlay.classList.toggle('visible', App.gridVisible);
    this.classList.toggle('active', App.gridVisible);
  });
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);
  document.getElementById('btn-add-page').addEventListener('click', () => addPage(App.currentPageIndex));
  document.getElementById('btn-dup-page').addEventListener('click', () => duplicatePage(App.currentPageIndex));
  document.getElementById('btn-del-page').addEventListener('click', () => deletePage(App.currentPageIndex));
  document.getElementById('btn-new-doc').addEventListener('click', newDocument);
}

function newDocument() {
  if (!confirm('Yeni belge açmak istediğinizden emin misiniz? Mevcut çalışmanız kaybolacak.')) return;
  localStorage.removeItem('dergi-studio-autosave');
  App.pages = [];
  App.currentPageIndex = 0;
  App.history = [];
  App.redoStack = [];
  App.selectedElement = null;
  App.selectedElements = [];
  addPage();
}

// ─── CANVAS RENDER ────────────────────────────────────
function renderCanvas() {
  canvas.querySelectorAll('.canvas-element').forEach(el => el.remove());

  const page = App.pages[App.currentPageIndex];
  if (!page) return;

  canvas.style.background = page.background || '#ffffff';

  page.elements.forEach(elData => {
    const domEl = createDOMElement(elData);
    canvas.appendChild(domEl);
    attachInteract(domEl);
  });

  updateCanvasSize();
}

// ─── THUMBNAIL RENDER ─────────────────────────────────
function renderThumbnails() {
  thumbsPanel.innerHTML = '';
  App.pages.forEach((page, idx) => {
    const thumb = document.createElement('div');
    thumb.className = 'page-thumb' + (idx === App.currentPageIndex ? ' active' : '');
    thumb.dataset.idx = idx;

    const preview = document.createElement('div');
    preview.className = 'thumb-preview';
    preview.style.background = page.background || '#fff';
    const scale = 130 / PAGE_FORMATS[App.format].w;
    preview.style.height = (PAGE_FORMATS[App.format].h * scale) + 'px';

    page.elements.forEach(el => {
      const mini = document.createElement('div');
      mini.style.cssText = `
        position:absolute;
        left:${el.x * scale}px; top:${el.y * scale}px;
        width:${el.w * scale}px; height:${el.h * scale}px;
        background:${el.type === 'text' ? '#6655cc55' : (el.fill || '#6655cc')};
        border-radius:${el.type === 'circle' ? '50%' : '0'};
        opacity:${el.opacity !== undefined ? el.opacity/100 : 1};
        font-size:${Math.max(4, (el.fontSize || 16) * scale)}px;
        color:#333; overflow:hidden; pointer-events:none;
      `;
      if (el.type === 'text') mini.textContent = el.text || '';
      preview.appendChild(mini);
    });

    const label = document.createElement('div');
    label.className = 'thumb-label';
    label.textContent = `Sayfa ${idx + 1}`;

    const delBtn = document.createElement('button');
    delBtn.className = 'thumb-delete';
    delBtn.textContent = '×';
    delBtn.title = 'Sayfayı Sil';
    delBtn.addEventListener('click', e => { e.stopPropagation(); deletePage(idx); });

    thumb.appendChild(preview);
    thumb.appendChild(label);
    thumb.appendChild(delBtn);
    thumb.addEventListener('click', () => switchPage(idx));

    thumbsPanel.appendChild(thumb);
  });
}

// ─── ELEMENT CREATION ─────────────────────────────────
function addElement(data) {
  const page = App.pages[App.currentPageIndex];
  data.id = ++App.idCounter;
  page.elements.push(data);
  const domEl = createDOMElement(data);
  canvas.appendChild(domEl);
  attachInteract(domEl);
  selectElement(domEl);
  pushHistory();
  renderThumbnails();
  return domEl;
}

// Temel HTML temizleyici — script/iframe ve inline handler'ları siler
function sanitizeHTML(html) {
  return (html || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\bon\w+\s*=/gi, 'data-removed=');
}

function createDOMElement(data) {
  const el = document.createElement('div');
  el.className = 'canvas-element';
  el.dataset.id = data.id;
  applyElementStyles(el, data);

  if (data.type === 'text') {
    el.classList.add('text-el');
    el.contentEditable = 'false';
    el.innerHTML = sanitizeHTML(data.text || 'Metin buraya');
    el.addEventListener('dblclick', () => startTextEdit(el, data));
  } else if (data.type === 'image') {
    el.classList.add('image-el');
    const img = document.createElement('img');
    img.src = data.src || '';
    img.draggable = false;
    el.appendChild(img);
  } else if (data.type === 'rect' || data.type === 'column') {
    el.classList.add('shape-el');
  } else if (data.type === 'circle') {
    el.classList.add('shape-el', 'shape-circle');
  } else if (data.type === 'line') {
    el.classList.add('shape-el', 'shape-line');
  }

  return el;
}

function applyElementStyles(el, data) {
  const z = App.zoom;
  el.style.left      = (data.x * z) + 'px';
  el.style.top       = (data.y * z) + 'px';
  el.style.width     = (data.w * z) + 'px';
  el.style.height    = (data.h * z) + 'px';
  el.style.transform = `rotate(${data.rotation || 0}deg)`;
  el.style.zIndex    = data.zIndex || 1;
  el.style.opacity   = (data.opacity !== undefined ? data.opacity / 100 : 1);

  if (data.type === 'text') {
    el.style.fontFamily     = data.fontFamily  || 'Inter';
    el.style.fontSize       = ((data.fontSize || 16) * z) + 'px';
    el.style.fontWeight     = data.bold      ? '700' : '400';
    el.style.fontStyle      = data.italic    ? 'italic' : 'normal';
    el.style.textDecoration = data.underline ? 'underline' : 'none';
    el.style.color          = data.color     || '#1a1a1a';
    el.style.textAlign      = data.align     || 'left';
    el.style.lineHeight     = data.lineHeight || 1.4;
    el.style.padding        = '4px';
    el.style.background     = 'transparent';
  } else if (data.type === 'image') {
    el.style.background = 'transparent';
  } else {
    el.style.background   = data.fill        || 'transparent';
    el.style.borderColor  = data.stroke      || 'transparent';
    el.style.borderWidth  = (data.strokeWidth || 0) + 'px';
    el.style.borderStyle  = data.strokeWidth ? 'solid' : 'none';
    el.style.borderRadius = data.type === 'circle' ? '50%' : (data.borderRadius || 0) + 'px';
  }
}

function getElementData(id) {
  const page = App.pages[App.currentPageIndex];
  return page ? page.elements.find(e => String(e.id) === String(id)) : null;
}

// ─── SELECTION ────────────────────────────────────────
function selectElement(el, addToSelection = false) {
  if (!addToSelection) {
    deselectAll();
  }
  if (!el) return;

  if (addToSelection && App.selectedElements.includes(el)) {
    // Shift+tık ile seçimi kaldır
    el.classList.remove('selected');
    App.selectedElements = App.selectedElements.filter(e => e !== el);
    App.selectedElement  = App.selectedElements[App.selectedElements.length - 1] || null;
  } else {
    App.selectedElement = el;
    if (!App.selectedElements.includes(el)) App.selectedElements.push(el);
    el.classList.add('selected');
  }

  refreshPropertiesForSelection();

  // Mobil: element seçilince özellikler panelini otomatik aç
  if (window.innerWidth <= 768 && App.selectedElements.length > 0) {
    openMobileProps();
    if (document.getElementById('pages-panel').classList.contains('mobile-open')) {
      document.getElementById('pages-panel').classList.remove('mobile-open');
      document.getElementById('btn-mobile-pages')?.classList.remove('active');
      document.getElementById('mobile-overlay').classList.remove('active');
    }
  }
}

function deselectAll() {
  document.querySelectorAll('.canvas-element.selected').forEach(el => el.classList.remove('selected'));
  App.selectedElement  = null;
  App.selectedElements = [];
  updatePropertiesPanel(null);
  closeMobileProps(); // mobil: seçim kalmayınca paneli kapat
}

// Seçim durumuna göre özellikler panelini güncelle
function refreshPropertiesForSelection() {
  if (App.selectedElements.length === 0) {
    updatePropertiesPanel(null);
  } else if (App.selectedElements.length === 1) {
    const data = getElementData(App.selectedElement.dataset.id);
    updatePropertiesPanel(data);
  } else {
    // Çoklu seçim: sadece konum panelini göster
    updatePropertiesPanel(null);
    const data = App.selectedElement ? getElementData(App.selectedElement.dataset.id) : null;
    if (data) {
      document.getElementById('prop-position').style.display = 'block';
      updatePositionInputs(data);
    }
  }
}

// ─── INTERACT.JS ─────────────────────────────────────
function attachInteract(el) {
  interact(el)
    .draggable({
      listeners: {
        move(event) {
          if (App.currentTool !== 'select') return;
          const data = getElementData(el.dataset.id);
          if (!data) return;

          // Çoklu seçimde tüm seçili öğeleri birlikte taşı
          const targets = App.selectedElements.includes(el) && App.selectedElements.length > 1
            ? App.selectedElements
            : [el];

          targets.forEach(target => {
            const tData = getElementData(target.dataset.id);
            if (!tData) return;
            tData.x += event.dx / App.zoom;
            tData.y += event.dy / App.zoom;
            target.style.left = (tData.x * App.zoom) + 'px';
            target.style.top  = (tData.y * App.zoom) + 'px';
          });

          updatePositionInputs(data);
        },
        end() {
          pushHistory();
          renderThumbnails();
        }
      }
    })
    .resizable({
      edges: { right: true, bottom: true, top: true, left: true },
      listeners: {
        move(event) {
          const data = getElementData(el.dataset.id);
          if (!data) return;
          data.w = Math.max(20, event.rect.width  / App.zoom);
          data.h = Math.max(10, event.rect.height / App.zoom);
          data.x += event.deltaRect.left / App.zoom;
          data.y += event.deltaRect.top  / App.zoom;
          applyElementStyles(el, data);
          updatePositionInputs(data);
        },
        end() {
          pushHistory();
          renderThumbnails();
        }
      },
      modifiers: [interact.modifiers.restrictSize({ min: { width: 20, height: 10 } })]
    });

  el.addEventListener('pointerdown', (e) => {
    if (App.currentTool !== 'select') return;
    e.stopPropagation();
    selectElement(el, e.shiftKey); // Shift → çoklu seçim
  });
}

// ─── CANVAS CLICKS (draw tools) ───────────────────────
function setupCanvasListeners() {
  canvas.addEventListener('pointerdown', (e) => {
    if (e.target !== canvas && e.target !== gridOverlay) return;
    if (App.currentTool === 'select') {
      deselectAll();
      closeContextMenu();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / App.zoom;
    const y = (e.clientY - rect.top)  / App.zoom;
    App.drawing  = true;
    App.drawStart = { x, y };

    if (App.currentTool === 'text') {
      addElement({ type: 'text', x, y, w: 200, h: 60, text: 'Metin giriniz…', fontFamily: 'Inter', fontSize: 18, color: '#1a1a1a', align: 'left', lineHeight: 1.4 });
      App.currentTool = 'select';
      setActiveTool('select');
    } else if (App.currentTool === 'image') {
      document.getElementById('image-upload').click();
      App.pendingImagePos = { x, y };
    } else if (App.currentTool === 'rect') {
      addElement({ type: 'rect', x, y, w: 150, h: 100, fill: '#7c6ef5', stroke: 'transparent', strokeWidth: 0, borderRadius: 0 });
    } else if (App.currentTool === 'circle') {
      addElement({ type: 'circle', x, y, w: 100, h: 100, fill: '#7c6ef5', stroke: 'transparent', strokeWidth: 0 });
    } else if (App.currentTool === 'line') {
      addElement({ type: 'line', x, y, w: 200, h: 3, fill: '#7c6ef5', stroke: 'transparent', strokeWidth: 0 });
    } else if (App.currentTool === 'column') {
      addElement({ type: 'column', x, y, w: 160, h: 300, fill: 'rgba(124,110,245,0.06)', stroke: 'rgba(124,110,245,0.3)', strokeWidth: 1, borderRadius: 4 });
    }
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const target = e.target.closest('.canvas-element');
    if (target) {
      selectElement(target);
      showContextMenu(e.clientX, e.clientY);
    }
  });

  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#context-menu')) closeContextMenu();
  });
}

// ─── TEXT EDITING ─────────────────────────────────────
function startTextEdit(el, data) {
  if (el.contentEditable === 'true') return; // zaten düzenleniyor
  el.contentEditable = 'true';
  el.focus();
  el.style.cursor = 'text';

  // Listener'ı adlandırıp blur'da temizle — birikim önlenir
  function onInput() {
    data.text = el.innerHTML;
  }
  el.addEventListener('input', onInput);

  el.addEventListener('blur', () => {
    el.removeEventListener('input', onInput);
    el.contentEditable = 'false';
    el.style.cursor    = 'default';
    data.text = el.innerHTML;
    pushHistory();
    renderThumbnails();
  }, { once: true });
}

// ─── IMAGE UPLOAD ─────────────────────────────────────
function setupImageUpload() {
  const input = document.getElementById('image-upload');
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const pos = App.pendingImagePos || { x: 50, y: 50 };
      addElement({ type: 'image', x: pos.x, y: pos.y, w: 300, h: 220, src: ev.target.result });
      App.currentTool = 'select';
      setActiveTool('select');
    };
    reader.readAsDataURL(file);
    input.value = '';
  });
}

// ─── CONTEXT MENU ─────────────────────────────────────
function showContextMenu(x, y) {
  contextMenu.style.display = 'block';
  contextMenu.style.left    = x + 'px';
  contextMenu.style.top     = y + 'px';
}
function closeContextMenu() {
  contextMenu.style.display = 'none';
}
function setupContextMenu() {
  document.getElementById('ctx-duplicate').addEventListener('click', () => { duplicateSelected(); closeContextMenu(); });
  document.getElementById('ctx-front').addEventListener('click',     () => { bringToFront();     closeContextMenu(); });
  document.getElementById('ctx-back').addEventListener('click',      () => { sendToBack();       closeContextMenu(); });
  document.getElementById('ctx-delete').addEventListener('click',    () => { deleteSelected();   closeContextMenu(); });
}

// ─── ELEMENT OPERATIONS ───────────────────────────────
// İşlem hedeflerini döndürür: çoklu seçim > tekil seçim > boş
function getActionTargets() {
  if (App.selectedElements.length) return App.selectedElements;
  if (App.selectedElement)         return [App.selectedElement];
  return [];
}

function deleteSelected() {
  const targets = getActionTargets();
  if (!targets.length) return;
  const page = App.pages[App.currentPageIndex];
  targets.forEach(target => {
    const id = target.dataset.id;
    page.elements = page.elements.filter(e => String(e.id) !== String(id));
    target.remove();
  });
  App.selectedElement  = null;
  App.selectedElements = [];
  pushHistory();
  renderThumbnails();
}

function duplicateSelected() {
  const targets = getActionTargets();
  if (!targets.length) return;
  const page     = App.pages[App.currentPageIndex];
  const newDOMEls = [];

  targets.forEach(target => {
    const data = getElementData(target.dataset.id);
    if (!data) return;
    const copy = { ...data, x: data.x + 20, y: data.y + 20, id: ++App.idCounter };
    page.elements.push(copy);
    const domEl = createDOMElement(copy);
    canvas.appendChild(domEl);
    attachInteract(domEl);
    newDOMEls.push(domEl);
  });

  deselectAll();
  newDOMEls.forEach(domEl => {
    domEl.classList.add('selected');
    App.selectedElements.push(domEl);
  });
  App.selectedElement = newDOMEls[newDOMEls.length - 1] || null;
  refreshPropertiesForSelection();
  pushHistory();
  renderThumbnails();
}

function bringToFront() {
  const targets = getActionTargets();
  if (!targets.length) return;
  const page = App.pages[App.currentPageIndex];
  const maxZ = Math.max(...page.elements.map(e => e.zIndex || 1));
  targets.forEach((target, i) => {
    const data = getElementData(target.dataset.id);
    if (data) { data.zIndex = maxZ + 1 + i; target.style.zIndex = data.zIndex; }
  });
}

function sendToBack() {
  const targets = getActionTargets();
  if (!targets.length) return;
  const page = App.pages[App.currentPageIndex];
  const minZ = Math.min(...page.elements.map(e => e.zIndex || 1));
  targets.forEach((target, i) => {
    const data = getElementData(target.dataset.id);
    if (data) { data.zIndex = Math.max(0, minZ - 1 - i); target.style.zIndex = data.zIndex; }
  });
}

function bringForward() {
  getActionTargets().forEach(target => {
    const data = getElementData(target.dataset.id);
    if (data) { data.zIndex = (data.zIndex || 1) + 1; target.style.zIndex = data.zIndex; }
  });
}

function sendBackward() {
  getActionTargets().forEach(target => {
    const data = getElementData(target.dataset.id);
    if (data) { data.zIndex = Math.max(0, (data.zIndex || 1) - 1); target.style.zIndex = data.zIndex; }
  });
}

// ─── HISTORY (UNDO/REDO) ──────────────────────────────
function pushHistory() {
  const snap = JSON.stringify(App.pages);
  App.history.push(snap);
  if (App.history.length > 50) App.history.shift();
  App.redoStack = [];
  saveToStorage(); // her işlem sonrası otomatik kayıt
}

function undo() {
  if (App.history.length < 2) { showToast('Geri alınacak işlem yok.', 'info'); return; }
  App.redoStack.push(App.history.pop());
  App.pages = JSON.parse(App.history[App.history.length - 1]);
  deselectAll();
  renderCanvas();
  renderThumbnails();
}

function redo() {
  if (!App.redoStack.length) { showToast('Yinelenecek işlem yok.', 'info'); return; }
  const next = App.redoStack.pop();
  App.history.push(next);
  App.pages = JSON.parse(next);
  deselectAll();
  renderCanvas();
  renderThumbnails();
}

// ─── KEYBOARD ─────────────────────────────────────────
function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement.contentEditable === 'true') return;

    if      (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
    else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); }
    else if (e.ctrlKey && e.key === 'd') { e.preventDefault(); duplicateSelected(); }
    else if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveToStorage(); showToast('💾 Kaydedildi.', 'success'); }

    // Araç kısayolları: Ctrl/Alt ile çakışmayı önle
    else if (!e.ctrlKey && !e.altKey && (e.key === 'v' || e.key === 'V')) { setActiveTool('select'); }
    else if (!e.ctrlKey && !e.altKey && (e.key === 't' || e.key === 'T')) { setActiveTool('text'); }
    else if (!e.ctrlKey && !e.altKey && (e.key === 'i' || e.key === 'I')) { setActiveTool('image'); }
    else if (!e.ctrlKey && !e.altKey && (e.key === 'r' || e.key === 'R')) { setActiveTool('rect'); }
    else if (!e.ctrlKey && !e.altKey && (e.key === 'c' || e.key === 'C')) { setActiveTool('circle'); }
    else if (!e.ctrlKey && !e.altKey && (e.key === 'l' || e.key === 'L')) { setActiveTool('line'); }
    else if (!e.ctrlKey && !e.altKey && (e.key === 'u' || e.key === 'U')) { setActiveTool('column'); }

    else if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); }
    else if (e.key === 'Escape') { deselectAll(); setActiveTool('select'); }

    // Ok tuşları ile piksel kaydırma (Shift = ×10)
    else if (App.selectedElement && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      getActionTargets().forEach(target => {
        const data = getElementData(target.dataset.id);
        if (!data) return;
        if (e.key === 'ArrowLeft')  data.x -= step;
        if (e.key === 'ArrowRight') data.x += step;
        if (e.key === 'ArrowUp')    data.y -= step;
        if (e.key === 'ArrowDown')  data.y += step;
        applyElementStyles(target, data);
      });
      if (App.selectedElement) {
        const data = getElementData(App.selectedElement.dataset.id);
        if (data) updatePositionInputs(data);
      }
    }
  });
}

// ─── TOOL SWITCHING ───────────────────────────────────
function setActiveTool(tool) {
  App.currentTool = tool;
  document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
  const btn = document.getElementById('tool-' + tool);
  if (btn) btn.classList.add('active');
  canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
}

document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => setActiveTool(btn.dataset.tool));
});

// ─── PROPERTIES PANEL HELPERS ────────────────────────
function updatePositionInputs(data) {
  document.getElementById('prop-x').value   = Math.round(data.x);
  document.getElementById('prop-y').value   = Math.round(data.y);
  document.getElementById('prop-w').value   = Math.round(data.w);
  document.getElementById('prop-h').value   = Math.round(data.h);
  document.getElementById('prop-rot').value = data.rotation || 0;
}

function updatePropertiesPanel(data) {
  const posSection   = document.getElementById('prop-position');
  const textSection  = document.getElementById('prop-text');
  const shapeSection = document.getElementById('prop-shape');

  if (!data) {
    posSection.style.display   = 'none';
    textSection.style.display  = 'none';
    shapeSection.style.display = 'none';
    return;
  }

  posSection.style.display = 'block';
  updatePositionInputs(data);

  if (data.type === 'text') {
    textSection.style.display  = 'block';
    shapeSection.style.display = 'none';
    document.getElementById('prop-font').value        = data.fontFamily || 'Inter';
    document.getElementById('prop-font-size').value   = data.fontSize   || 16;
    document.getElementById('prop-line-height').value = data.lineHeight || 1.4;
    document.getElementById('prop-text-color').value  = data.color      || '#1a1a1a';
    document.getElementById('prop-bold').classList.toggle('active',      !!data.bold);
    document.getElementById('prop-italic').classList.toggle('active',    !!data.italic);
    document.getElementById('prop-underline').classList.toggle('active', !!data.underline);
    ['left','center','right','justify'].forEach(a => {
      document.getElementById('align-' + a).classList.toggle('active', data.align === a);
    });
  } else if (['rect','circle','line','column'].includes(data.type)) {
    textSection.style.display  = 'none';
    shapeSection.style.display = 'block';
    document.getElementById('prop-fill').value          = data.fill         || 'transparent';
    document.getElementById('prop-stroke').value        = data.stroke       || 'transparent';
    document.getElementById('prop-stroke-width').value  = data.strokeWidth  || 0;
    document.getElementById('prop-border-radius').value = data.borderRadius || 0;
    document.getElementById('prop-opacity').value       = data.opacity !== undefined ? data.opacity : 100;
    document.getElementById('prop-opacity-label').textContent = (data.opacity !== undefined ? data.opacity : 100) + '%';
  } else {
    textSection.style.display  = 'none';
    shapeSection.style.display = 'none';
  }
}

// ─── DROPDOWN TOGGLE ──────────────────────────────────
window.toggleDropdown = function(id) {
  document.querySelectorAll('.dropdown-content').forEach(d => {
    if (d.parentElement.id !== id) d.classList.remove('open');
  });
  document.querySelector(`#${id} .dropdown-content`).classList.toggle('open');
};
document.addEventListener('click', e => {
  if (!e.target.closest('.menu-dropdown')) {
    document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('open'));
  }
});

// ─── MOBİL PANEL YÖNETİMİ ────────────────────────────
function closeAllMobilePanels() {
  document.getElementById('pages-panel').classList.remove('mobile-open');
  document.getElementById('properties-panel').classList.remove('mobile-open');
  document.getElementById('mobile-overlay').classList.remove('active');
  document.getElementById('mobile-menu-panel')?.classList.remove('open');
  document.getElementById('btn-mobile-pages')?.classList.remove('active');
  document.getElementById('btn-mobile-props')?.classList.remove('active');
  document.getElementById('btn-mobile-menu')?.classList.remove('active');
}

function setupMobilePanels() {
  const overlay    = document.getElementById('mobile-overlay');
  const pagesPanel = document.getElementById('pages-panel');
  const propsPanel = document.getElementById('properties-panel');
  const menuPanel  = document.getElementById('mobile-menu-panel');

  // Hamburger menü
  document.getElementById('btn-mobile-menu').addEventListener('click', () => {
    const isOpen = menuPanel.classList.toggle('open');
    overlay.classList.toggle('active', isOpen);
    document.getElementById('btn-mobile-menu').classList.toggle('active', isOpen);
    if (isOpen) {
      pagesPanel.classList.remove('mobile-open');
      document.getElementById('btn-mobile-pages').classList.remove('active');
    }
  });

  // Sayfalar paneli toggle
  document.getElementById('btn-mobile-pages').addEventListener('click', () => {
    const isOpen = pagesPanel.classList.toggle('mobile-open');
    overlay.classList.toggle('active', isOpen);
    document.getElementById('btn-mobile-pages').classList.toggle('active', isOpen);
    if (isOpen) {
      menuPanel.classList.remove('open');
      document.getElementById('btn-mobile-menu').classList.remove('active');
    }
  });

  // Özellikler paneli toggle
  document.getElementById('btn-mobile-props').addEventListener('click', () => {
    const isOpen = propsPanel.classList.toggle('mobile-open');
    document.getElementById('btn-mobile-props').classList.toggle('active', isOpen);
    // Özellikler paneli overlay kullanmaz — canvas erişilebilir kalır
  });

  // Özellikler paneli kapat düğmesi
  document.getElementById('btn-close-props').addEventListener('click', (e) => {
    e.stopPropagation();
    propsPanel.classList.remove('mobile-open');
    document.getElementById('btn-mobile-props').classList.remove('active');
  });

  // Panel başlığına dokunarak aç/kapat (mobil kolaylık)
  propsPanel.querySelector('.panel-header').addEventListener('click', () => {
    if (window.innerWidth > 768) return;
    const isOpen = propsPanel.classList.toggle('mobile-open');
    document.getElementById('btn-mobile-props').classList.toggle('active', isOpen);
  });

  // Overlay tıklandığında hamburger ve sayfalar panelini kapat
  overlay.addEventListener('click', () => {
    pagesPanel.classList.remove('mobile-open');
    menuPanel.classList.remove('open');
    overlay.classList.remove('active');
    document.getElementById('btn-mobile-pages').classList.remove('active');
    document.getElementById('btn-mobile-menu').classList.remove('active');
  });
}

// ─── SAVE / LOAD ──────────────────────────────────────
function saveToStorage() {
  const docTitle = document.getElementById('doc-title-display')?.textContent.trim() || 'Dergi';
  try {
    localStorage.setItem('dergi-studio-autosave', JSON.stringify({
      version: 1,
      title: docTitle,
      format: App.format,
      pages: App.pages,
    }));
  } catch(e) {
    console.warn('Otomatik kayıt başarısız:', e);
  }
}

function loadFromStorage() {
  const raw = localStorage.getItem('dergi-studio-autosave');
  if (!raw) return false;
  try {
    const snap = JSON.parse(raw);
    if (!snap.pages || !snap.pages.length) return false;
    App.pages  = snap.pages;
    App.format = snap.format || 'A3';
    // En yüksek ID'yi bul — çakışmaları önle
    const allIds = [
      ...App.pages.map(p => Number(p.id) || 0),
      ...App.pages.flatMap(p => p.elements.map(e => Number(e.id) || 0)),
    ];
    App.idCounter = Math.max(0, ...allIds);
    formatBadge.textContent = App.format;
    const titleEl = document.getElementById('doc-title-display');
    if (titleEl && snap.title) titleEl.textContent = snap.title;
    App.currentPageIndex = 0;
    renderCanvas();
    return true;
  } catch(e) {
    console.warn('Kayıt yüklenemedi:', e);
    return false;
  }
}

window.saveToFile = function() {
  const docTitle = document.getElementById('doc-title-display')?.textContent.trim() || 'Dergi';
  const blob = new Blob(
    [JSON.stringify({ version: 1, title: docTitle, format: App.format, pages: App.pages }, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = docTitle.replace(/[^a-zA-Z0-9ğüşöçıĞÜŞÖÇİ_\- ]/g, '').trim().replace(/\s+/g, '_') + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 JSON dosyası indirildi.', 'success');
};

function setupFileLoad() {
  const fileInput = document.createElement('input');
  fileInput.type    = 'file';
  fileInput.accept  = '.json';
  fileInput.style.display = 'none';
  fileInput.id      = 'json-upload';
  document.body.appendChild(fileInput);

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const snap = JSON.parse(ev.target.result);
        if (!snap.pages) throw new Error('Geçersiz dosya formatı');
        App.pages  = snap.pages;
        App.format = snap.format || 'A3';
        const allIds = [
          ...App.pages.map(p => Number(p.id) || 0),
          ...App.pages.flatMap(p => p.elements.map(e => Number(e.id) || 0)),
        ];
        App.idCounter = Math.max(0, ...allIds);
        formatBadge.textContent = App.format;
        const titleEl = document.getElementById('doc-title-display');
        if (titleEl && snap.title) titleEl.textContent = snap.title;
        App.currentPageIndex = 0;
        deselectAll();
        renderCanvas();
        renderThumbnails();
        applyZoom();
        pushHistory();
        showToast('📂 Dosya yüklendi!', 'success');
      } catch(err) {
        showToast('Dosya yüklenemedi: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });
}

// ─── TOAST ────────────────────────────────────────────
window.showToast = function(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className  = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

// ─── LOADING OVERLAY ─────────────────────────────────
window.showLoading = function(msg = 'İşlem yapılıyor…') {
  loadingTxt.textContent = msg;
  loadingOv.style.display = 'flex';
};
window.hideLoading = function() {
  loadingOv.style.display = 'none';
};

// ─── GLOBAL GETTERS (diğer modüller için) ─────────────
window.App              = App;
window.PAGE_FORMATS     = PAGE_FORMATS;
window.addPage          = addPage;
window.duplicatePage    = duplicatePage;
window.deletePage       = deletePage;
window.switchPage       = switchPage;
window.renderCanvas     = renderCanvas;
window.renderThumbnails = renderThumbnails;
window.setActiveTool    = setActiveTool;
window.applyElementStyles   = applyElementStyles;
window.getElementData       = getElementData;
window.updatePropertiesPanel = updatePropertiesPanel;
window.deleteSelected   = deleteSelected;
window.duplicateSelected = duplicateSelected;
window.bringToFront     = bringToFront;
window.sendToBack       = sendToBack;
window.bringForward     = bringForward;
window.sendBackward     = sendBackward;
window.pushHistory      = pushHistory;
window.deselectAll      = deselectAll;
window.selectElement    = selectElement;
window.saveToStorage       = saveToStorage;
window.closeAllMobilePanels = closeAllMobilePanels;
