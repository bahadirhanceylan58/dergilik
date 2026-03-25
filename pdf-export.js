/* ===================================================
   DERGI STÜDYOSU — PDF EXPORT
   pdf-export.js

   A4 tek sayfa & A3 kitapçık (saddle-stitch imposition)
   =================================================== */

'use strict';

const { jsPDF } = window.jspdf;

// ─── A4 PDF (TÜM SAYFALAR SIRAYLA) ──────────────────
window.exportA4PDF = async function() {
  showLoading('A4 PDF oluşturuluyor…');
  deselectAll();

  const fmt = PAGE_FORMATS['A4'];
  // Use A4 mm dimensions
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const savedPage = App.currentPageIndex;

  try {
    for (let i = 0; i < App.pages.length; i++) {
      if (i > 0) pdf.addPage('a4', 'portrait');

      switchPage(i);
      await sleep(80);

      const canvas = document.getElementById('page-canvas');
      const imgData = await capturePageCanvas(canvas, fmt);
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }

    pdf.save(`${getDocTitle()}_A4.pdf`);
    showToast('✅ A4 PDF indirildi!', 'success');
  } catch(e) {
    console.error(e);
    showToast('PDF oluşturulamadı: ' + e.message, 'error');
  } finally {
    switchPage(savedPage);
    hideLoading();
  }
};

// ─── A3 TEK SAYFA PDF ────────────────────────────────
window.exportA3SinglePages = async function() {
  showLoading('A3 PDF oluşturuluyor…');
  deselectAll();

  const fmt = PAGE_FORMATS['A3'];
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a3' });
  const savedPage = App.currentPageIndex;

  try {
    for (let i = 0; i < App.pages.length; i++) {
      if (i > 0) pdf.addPage('a3', 'portrait');

      switchPage(i);
      await sleep(80);

      const canvas = document.getElementById('page-canvas');
      const imgData = await capturePageCanvas(canvas, fmt);
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 420, undefined, 'FAST');
    }

    pdf.save(`${getDocTitle()}_A3.pdf`);
    showToast('✅ A3 PDF indirildi!', 'success');
  } catch(e) {
    console.error(e);
    showToast('PDF oluşturulamadı: ' + e.message, 'error');
  } finally {
    switchPage(savedPage);
    hideLoading();
  }
};

// ─── A3 KİTAPÇIK (IMPOSITION / DİZGİ) ───────────────
//
//  Saddle-stitch imposition algoritması:
//  N sayfa (4'ün katı olmalı)
//  Tabaka k (1-indexed):
//    Ön yüz SOL  = sayfa (N - 2k + 2)
//    Ön yüz SAĞ  = sayfa (2k - 1)
//    Arka yüz SOL = sayfa (2k)
//    Arka yüz SAĞ = sayfa (N - 2k + 1)
//
//  Örn. N=36, k=1: Ön [36,1], Arka [2,35]
//                  k=2: Ön [34,3], Arka [4,33]
//
window.exportA3Booklet = async function() {
  deselectAll();

  let pageCount = App.pages.length;

  // Pad to next multiple of 4
  let padded = 0;
  while ((pageCount + padded) % 4 !== 0) padded++;
  if (padded > 0) {
    showToast(`Sayfa sayısı 4'ün katına tamamlanacak: ${padded} boş sayfa eklendi (geçici).`, 'info');
  }

  const totalPages = pageCount + padded;
  const sheetCount = totalPages / 4;

  // Build imposition pairs: array of {front: [leftIdx, rightIdx], back: [leftIdx, rightIdx]}
  // Indices are 1-based page numbers (0 = blank)
  const sheets = [];
  for (let k = 1; k <= sheetCount; k++) {
    sheets.push({
      front: [totalPages - 2*k + 2,  2*k - 1],
      back:  [2*k,                   totalPages - 2*k + 1],
    });
  }

  showLoading(`A3 Kitapçık PDF oluşturuluyor… (${sheetCount} tabaka)`);

  // We'll render each page as an image first
  const savedPageIdx  = App.currentPageIndex;
  const A4_W_MM = 210, A4_H_MM = 297;
  const A4_FMT = PAGE_FORMATS['A4'];

  // Capture all pages as images
  const pageImages = [null]; // index 0 unused (1-based), null = blank

  try {
    for (let i = 0; i < pageCount; i++) {
      switchPage(i);
      await sleep(100);
      const canvasEl = document.getElementById('page-canvas');
      const imgData = await capturePageCanvas(canvasEl, A4_FMT);
      pageImages.push(imgData);
    }

    // Add blank pages
    for (let i = 0; i < padded; i++) {
      pageImages.push(null); // null = white blank
    }

    // Build PDF: A3 landscape, each sheet = front side then back side
    // A3 landscape = 420mm wide × 297mm tall
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    let firstPage = true;

    for (const sheet of sheets) {
      // ── FRONT SIDE ──
      if (!firstPage) pdf.addPage('a3', 'landscape');
      firstPage = false;

      renderImpositionSide(pdf, sheet.front, pageImages, A4_W_MM, A4_H_MM);

      // ── BACK SIDE ──
      pdf.addPage('a3', 'landscape');
      renderImpositionSide(pdf, sheet.back, pageImages, A4_W_MM, A4_H_MM);
    }

    pdf.save(`${getDocTitle()}_A3_Kitapcik.pdf`);
    showToast(`✅ A3 Kitapçık PDF indirildi! (${sheetCount} tabaka, ${totalPages} sayfa)`, 'success');

  } catch(e) {
    console.error(e);
    showToast('PDF oluşturulamadı: ' + e.message, 'error');
  } finally {
    switchPage(savedPageIdx);
    hideLoading();
  }
};

// Renders one side of an A3 sheet: [leftPageNum, rightPageNum] 1-based
function renderImpositionSide(pdf, pair, pageImages, pageW, pageH) {
  const [leftNum, rightNum] = pair;

  // LEFT PAGE (x=0)
  if (pageImages[leftNum]) {
    pdf.addImage(pageImages[leftNum], 'PNG', 0, 0, pageW, pageH, undefined, 'FAST');
  } else {
    // Blank page
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageW, pageH, 'F');
  }

  // Add page number label (small, for reference)
  pdf.setFontSize(6);
  pdf.setTextColor(150);
  if (leftNum && leftNum <= pageImages.length - 1 && pageImages[leftNum])
    pdf.text(`s.${leftNum}`, 3, pageH - 2);

  // RIGHT PAGE (x = A4 width)
  if (pageImages[rightNum]) {
    pdf.addImage(pageImages[rightNum], 'PNG', pageW, 0, pageW, pageH, undefined, 'FAST');
  } else {
    pdf.setFillColor(255, 255, 255);
    pdf.rect(pageW, 0, pageW, pageH, 'F');
  }

  if (rightNum && rightNum <= pageImages.length - 1 && pageImages[rightNum])
    pdf.text(`s.${rightNum}`, pageW + 3, pageH - 2);

  // Center fold line
  pdf.setDrawColor(200);
  pdf.setLineWidth(0.2);
  pdf.line(pageW, 0, pageW, pageH);
}

// ─── CAPTURE HELPER ──────────────────────────────────
async function capturePageCanvas(canvasEl, fmt) {
  const origW     = canvasEl.style.width;
  const origH     = canvasEl.style.height;
  const savedZoom = App.zoom;
  const scale     = 2; // 2× kalite

  // Yüksek çözünürlük için geçici ölçek uygula
  canvasEl.style.width  = fmt.w * scale + 'px';
  canvasEl.style.height = fmt.h * scale + 'px';
  App.zoom = scale;
  document.querySelectorAll('.canvas-element').forEach(el => {
    const data = getElementData(el.dataset.id);
    if (data) applyElementStyles(el, data);
  });

  await sleep(60);

  try {
    const htmlCanvas = await html2canvas(canvasEl, {
      scale: 1,
      useCORS: true,
      backgroundColor: App.pages[App.currentPageIndex]?.background || '#ffffff',
      logging: false,
    });
    return htmlCanvas.toDataURL('image/png');
  } finally {
    // Hata olsa bile zoom ve boyutu geri yükle
    App.zoom = savedZoom;
    canvasEl.style.width  = origW;
    canvasEl.style.height = origH;
    document.querySelectorAll('.canvas-element').forEach(el => {
      const data = getElementData(el.dataset.id);
      if (data) applyElementStyles(el, data);
    });
  }
}

// ─── UTILS ────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getDocTitle() {
  const t = document.getElementById('doc-title-display');
  return (t ? t.textContent.trim() : 'Dergi').replace(/[^a-zA-Z0-9ğüşöçıĞÜŞÖÇİ\s_-]/g, '').trim() || 'Dergi';
}
