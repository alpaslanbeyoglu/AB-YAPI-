import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfExportOptions {
  filename?: string;
  landscape?: boolean;
  quality?: number;
  onProgress?: (step: string) => void;
}

/**
 * Downloads a standalone formatted HTML document
 */
export function downloadHtmlFile(htmlContent: string, filename: string): void {
  const cleanFilename = filename.endsWith('.html') ? filename : `${filename}.html`;
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Prints HTML content safely, handling sandbox iframes by opening a clean print window
 * or falling back to invisible iframe and direct download if blocked.
 */
export function printHtmlContent(htmlContent: string, documentTitle: string): void {
  // Clean, standard A4 print styling that avoids excessive margins and gaps
  const printStyle = `
    <style media="print">
      @page {
        size: A4 portrait;
        margin: 12mm 10mm 12mm 10mm;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print { display: none !important; }
      .avoid-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      table {
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    </style>
  `;
  const printScript = `
    <script>
      window.addEventListener('load', function() {
        setTimeout(function() {
          try {
            window.focus();
            window.print();
          } catch(e) {
            console.error('Auto print failed:', e);
          }
        }, 300);
      });
    </script>
    <div class="no-print" style="position:fixed; top:16px; right:16px; display:flex; flex-direction:column; align-items:flex-end; gap:6px; z-index:9999; font-family:sans-serif;">
      <button onclick="window.close(); setTimeout(function() { window.history.back(); }, 300);" style="padding:10px 20px; background:#4338ca; color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:bold; box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1); transition: background 0.2s;" onmouseover="this.style.background='#3730a3'" onmouseout="this.style.background='#4338ca'">
        ← Sekmeyi Kapat / Geri Dön
      </button>
      <span style="font-size:11px; color:#475569; background:rgba(255,255,255,0.95); padding:4px 8px; border-radius:4px; border:1px solid #cbd5e1; box-shadow:0 2px 4px rgb(0 0 0 / 0.05);">
        Yazdırma / PDF Kaydetme Penceresi
      </span>
    </div>
  `;

  let printableHtml = htmlContent;
  if (printableHtml.includes('</head>')) {
    printableHtml = printableHtml.replace('</head>', `${printStyle}</head>`);
  }
  if (printableHtml.includes('</body>')) {
    printableHtml = printableHtml.replace('</body>', `${printScript}</body>`);
  } else {
    printableHtml += printScript;
  }

  // 1. Try window.open (most reliable across browsers and bypasses parent iframe modal restrictions)
  try {
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printableHtml);
      printWin.document.close();
      printWin.focus();
      // Remove printWin.print() so the user can see it in a new tab and print/save as PDF themselves
      return;
    }
  } catch (err) {
    console.warn('window.open blocked, falling back:', err);
  }

  // 2. Try Blob URL window.open
  try {
    const blob = new Blob([printableHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWin = window.open(url, '_blank');
    if (printWin) {
      printWin.focus();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return;
    }
  } catch (err) {
    console.warn('Blob window.open blocked:', err);
  }

  // 3. Try direct window.print() inside current window
  try {
    window.print();
    return;
  } catch (err) {
    console.warn('Direct window.print() failed:', err);
  }

  // 4. Ultimate fallback: download the complete printable HTML file directly
  downloadHtmlFile(htmlContent, `${documentTitle}.html`);
}

/**
 * Converts a DOM element to an actual downloadable .pdf file using html2canvas & jsPDF.
 * Uses high-resolution rendering and accurate A4 pagination.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string = 'belge.pdf',
  options?: PdfExportOptions
): Promise<void> {
  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  if (options?.onProgress) {
    options.onProgress('Görsel hazırlanıyor...');
  }

  // Render DOM element to canvas with high resolution
  const canvas = await html2canvas(element, {
    scale: 2, // High resolution retina rendering
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth || 1200,
    onclone: (clonedDoc, clonedElement) => {
      // 1. Ensure element in clone is visible with clean white background for print
      clonedElement.style.overflow = 'visible';
      clonedElement.style.maxHeight = 'none';
      clonedElement.style.height = 'auto';
      clonedElement.style.backgroundColor = '#ffffff';
      clonedElement.style.color = '#000000';

      // 2. Fix for html2canvas oklch/oklab crash (Tailwind v4 uses these by default)
      // This is a critical fix for PDF exports failing in modern browsers
      const styles = clonedDoc.querySelectorAll('style');
      styles.forEach(styleTag => {
        if (styleTag.textContent?.includes('oklch') || styleTag.textContent?.includes('oklab')) {
          // Replace oklch(...) and oklab(...) with a standard color if parsing fails
          // html2canvas fails specifically on these function calls
          styleTag.textContent = styleTag.textContent
            .replace(/oklch\([^)]+\)/g, '#475569')
            .replace(/oklab\([^)]+\)/g, '#475569');
        }
      });

      // Also handle inline styles if any
      const oklchElements = clonedElement.querySelectorAll('*');
      oklchElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        const colorStyles = ['color', 'backgroundColor', 'borderColor'];
        colorStyles.forEach(prop => {
          const val = (htmlEl.style as any)[prop];
          if (val && (val.includes('oklch') || val.includes('oklab'))) {
            if (prop === 'color') htmlEl.style.color = '#000000';
            else if (prop === 'backgroundColor') htmlEl.style.backgroundColor = '#ffffff';
            else if (prop === 'borderColor') htmlEl.style.borderColor = '#cbd5e1';
          }
        });
      });
    },
  });

  if (options?.onProgress) {
    options.onProgress('PDF sayfaları oluşturuluyor...');
  }

  const isLandscape = options?.landscape || false;
  const pdf = new jsPDF({
    orientation: isLandscape ? 'l' : 'p',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;
  const margin = 8; // 8mm margin
  const printWidth = pageWidth - margin * 2;
  const printHeight = pageHeight - margin * 2;

  // Calculate scaling
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // Height of one A4 page in canvas coordinates
  const canvasPageHeight = Math.floor((canvasWidth * printHeight) / printWidth);

  let sourceY = 0;
  let pageIndex = 0;

  while (sourceY < canvasHeight) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    const currentSliceHeight = Math.min(canvasPageHeight, canvasHeight - sourceY);
    
    // Create temporary canvas for this page slice
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvasWidth;
    pageCanvas.height = currentSliceHeight;
    const pageCtx = pageCanvas.getContext('2d');

    if (pageCtx) {
      // Fill white background
      pageCtx.fillStyle = '#ffffff';
      pageCtx.fillRect(0, 0, canvasWidth, currentSliceHeight);

      // Draw slice from the main canvas
      pageCtx.drawImage(
        canvas,
        0,
        sourceY,
        canvasWidth,
        currentSliceHeight,
        0,
        0,
        canvasWidth,
        currentSliceHeight
      );

      const sliceImgData = pageCanvas.toDataURL('image/jpeg', options?.quality || 0.95);
      const renderedHeight = (currentSliceHeight * printWidth) / canvasWidth;

      pdf.addImage(
        sliceImgData,
        'JPEG',
        margin,
        margin,
        printWidth,
        renderedHeight,
        undefined,
        'FAST'
      );
    }

    sourceY += currentSliceHeight;
    pageIndex++;
  }

  if (options?.onProgress) {
    options.onProgress('İndiriliyor...');
  }

  pdf.save(cleanFilename);
}
