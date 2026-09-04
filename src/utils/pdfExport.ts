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
  // Inject auto-print script and print styling into the HTML if not present
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
        }, 500);
      });
    </script>
  `;

  let printableHtml = htmlContent;
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
      // Ensure element in clone is visible with clean white background for print
      clonedElement.style.overflow = 'visible';
      clonedElement.style.maxHeight = 'none';
      clonedElement.style.height = 'auto';
      clonedElement.style.backgroundColor = '#ffffff';
      clonedElement.style.color = '#000000';
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
