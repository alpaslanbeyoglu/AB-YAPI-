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
 * Converts a modern CSS color function (such as oklch, oklab, color()) to an sRGB format (hex/rgb)
 * using a temporary canvas context, falling back to a safe neutral slate hex color (#475569) if unparseable.
 */
function convertSingleColor(fullColorCall: string): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#00000000';
      ctx.fillStyle = fullColorCall;
      const res = ctx.fillStyle;
      if (res && res !== '#00000000' && res !== 'rgba(0, 0, 0, 0)') {
        return res;
      }
    }
  } catch {}
  return '#475569';
}

/**
 * Parses CSS text and replaces all occurrences of unsupported color functions (oklch, oklab, lch, lab, color)
 * with supported sRGB values using a parenthesis-depth-aware scanner.
 */
export function sanitizeCssColors(cssText: string): string {
  if (!cssText) return '';
  const prefixes = ['oklch', 'oklab', 'lch', 'lab', 'color'];
  let result = '';
  let i = 0;
  const len = cssText.length;

  while (i < len) {
    let matchedPrefix: string | null = null;
    for (const prefix of prefixes) {
      if (cssText.startsWith(prefix + '(', i) || cssText.startsWith(prefix + ' (', i)) {
        matchedPrefix = prefix;
        break;
      }
    }

    if (matchedPrefix) {
      const parenStart = cssText.indexOf('(', i);
      let depth = 1;
      let j = parenStart + 1;
      while (j < len && depth > 0) {
        if (cssText[j] === '(') depth++;
        else if (cssText[j] === ')') depth--;
        j++;
      }
      const fullCall = cssText.substring(i, j);
      result += convertSingleColor(fullCall);
      i = j;
    } else {
      result += cssText[i];
      i++;
    }
  }

  return result;
}

function hasUnsupportedColor(text: string): boolean {
  if (!text) return false;
  return (
    text.includes('oklch') ||
    text.includes('oklab') ||
    text.includes('color(') ||
    text.includes('lch(') ||
    text.includes('lab(')
  );
}

/**
 * Sanitizes all stylesheets and DOM elements in clonedDoc to prevent html2canvas
 * from throwing "Attempting to parse an unsupported color function 'oklch'".
 */
export function sanitizeClonedDocColors(clonedDoc: Document, clonedElement?: HTMLElement): void {
  // 1. Process <link rel="stylesheet"> tags: inline them as <style> so oklch can be scrubbed
  const linkTags = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
  for (const link of linkTags) {
    try {
      if (link.sheet) {
        let combinedCss = '';
        const rules = link.sheet.cssRules;
        for (let r = 0; r < rules.length; r++) {
          combinedCss += rules[r].cssText + '\n';
        }
        if (combinedCss) {
          const styleEl = clonedDoc.createElement('style');
          styleEl.textContent = sanitizeCssColors(combinedCss);
          link.parentNode?.replaceChild(styleEl, link);
        }
      }
    } catch {
      // Cross-origin or restricted stylesheet: remove to prevent html2canvas from crashing when parsing
      try {
        link.disabled = true;
        link.remove();
      } catch {}
    }
  }

  // 2. Process all <style> tags in the cloned document
  const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
  for (const style of styleTags) {
    if (style.textContent && hasUnsupportedColor(style.textContent)) {
      style.textContent = sanitizeCssColors(style.textContent);
    }
  }

  // 3. Process clonedElement and all descendants for inline & computed styles
  const targetElement = clonedElement || (clonedDoc.body as HTMLElement);
  if (targetElement) {
    const allElements = [targetElement, ...Array.from(targetElement.querySelectorAll('*'))] as HTMLElement[];
    const win = clonedDoc.defaultView || window;

    for (const el of allElements) {
      // Check inline style attribute
      const inlineStyle = el.getAttribute('style');
      if (inlineStyle && hasUnsupportedColor(inlineStyle)) {
        el.setAttribute('style', sanitizeCssColors(inlineStyle));
      }

      // Check SVG presentation attributes
      if (el.hasAttribute('fill')) {
        const fill = el.getAttribute('fill') || '';
        if (hasUnsupportedColor(fill)) {
          el.setAttribute('fill', sanitizeCssColors(fill));
        }
      }
      if (el.hasAttribute('stroke')) {
        const stroke = el.getAttribute('stroke') || '';
        if (hasUnsupportedColor(stroke)) {
          el.setAttribute('stroke', sanitizeCssColors(stroke));
        }
      }

      // Check computed styles on element
      if (win && win.getComputedStyle) {
        try {
          const computed = win.getComputedStyle(el);
          const colorProps = [
            'color',
            'backgroundColor',
            'borderColor',
            'borderTopColor',
            'borderRightColor',
            'borderBottomColor',
            'borderLeftColor',
            'outlineColor',
            'fill',
            'stroke'
          ];
          for (const prop of colorProps) {
            const val = (computed as any)[prop];
            if (typeof val === 'string' && hasUnsupportedColor(val)) {
              (el.style as any)[prop] = convertSingleColor(val);
            }
          }
        } catch {}
      }
    }
  }
}

/**
 * Safely renders a DOM element to an HTML5 canvas using html2canvas.
 * Guarantees that modern CSS color formats (oklch, oklab, color) are converted
 * or sanitized before html2canvas parses the DOM or stylesheets.
 */
export async function renderElementToCanvas(
  element: HTMLElement,
  customOptions: any = {}
): Promise<HTMLCanvasElement> {
  const { onclone: userOnClone, ...restOptions } = customOptions;

  return await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    ...restOptions,
    onclone: (clonedDoc, clonedElement) => {
      // Run universal oklch/oklab/color sanitizer first
      sanitizeClonedDocColors(clonedDoc, clonedElement);

      // Run any caller-specified custom clone logic
      if (typeof userOnClone === 'function') {
        userOnClone(clonedDoc, clonedElement);
      }
    },
  });
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

  // Render DOM element to canvas with high resolution and oklch protection
  const canvas = await renderElementToCanvas(element, {
    scale: 2, // High resolution retina rendering
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth || 1200,
    onclone: (_clonedDoc: Document, clonedElement: HTMLElement) => {
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
