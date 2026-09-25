export type LogoEmbedMode =
  | 'adaptive_clean'   // Removes bg + adapts dark text for dark surfaces while keeping brand colors
  | 'natural_clean'    // Removes bg + keeps exact original colors with soft surface halo
  | 'gold_emboss'      // Removes bg + turns logo into metallic gold/white corporate emboss
  | 'original_nobox';  // Keeps original image without any container box

export interface ProcessLogoOptions {
  mode?: LogoEmbedMode;
  isDarkSurface?: boolean;
  tolerance?: number; // 0..100, default 42
}

/**
 * Loads an image from base64/URL, strips solid/white backgrounds smoothly with
 * edge color decontamination, auto-crops empty margins, and optionally adapts
 * dark text for dark page surfaces so the logo can be embedded directly onto
 * any page without a bounding box.
 */
export async function processLogoForPageEmbed(
  logoSrc: string,
  options: ProcessLogoOptions = {}
): Promise<HTMLCanvasElement | null> {
  const {
    mode = 'adaptive_clean',
    isDarkSurface = true,
    tolerance = 42,
  } = options;

  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => resolve(null);
    el.src = logoSrc;
  });

  if (!img || img.width === 0 || img.height === 0) return null;

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const workCanvas = document.createElement('canvas');
  workCanvas.width = w;
  workCanvas.height = h;
  const ctx = workCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, w, h);

  if (mode === 'original_nobox') {
    return autoCropCanvas(workCanvas, ctx);
  }

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. Sample perimeter pixels (corners + border midpoints) to detect solid background color
  const sampleCoords = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
    [Math.floor(w / 2), 0],
    [Math.floor(w / 2), h - 1],
    [0, Math.floor(h / 2)],
    [w - 1, Math.floor(h / 2)],
  ];

  let opaqueSamples = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  for (const [sx, sy] of sampleCoords) {
    const idx = (sy * w + sx) * 4;
    const a = data[idx + 3];
    if (a > 180) {
      opaqueSamples++;
      sumR += data[idx];
      sumG += data[idx + 1];
      sumB += data[idx + 2];
    }
  }

  // Default background reference is white (255, 255, 255), or detected perimeter color
  const hasOpaqueBorder = opaqueSamples >= 3;
  const bgR = hasOpaqueBorder ? Math.round(sumR / opaqueSamples) : 255;
  const bgG = hasOpaqueBorder ? Math.round(sumG / opaqueSamples) : 255;
  const bgB = hasOpaqueBorder ? Math.round(sumB / opaqueSamples) : 255;

  const innerThresh = Math.max(12, tolerance * 0.75);
  const outerThresh = innerThresh + 38;

  // 2. Process every pixel: remove background, decontaminate halo edges, and apply surface adaptation
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    let a = data[i + 3];

    if (a === 0) continue;

    // Distance to detected perimeter background color
    const dr = r - bgR;
    const dg = g - bgG;
    const db = b - bgB;
    const distToBg = Math.sqrt(dr * dr + dg * dg + db * db);

    // Distance to pure white (handles white boxes inside semi-transparent PNGs)
    const dwR = 255 - r;
    const dwG = 255 - g;
    const dwB = 255 - b;
    const distToWhite = Math.sqrt(dwR * dwR + dwG * dwG + dwB * dwB);

    const effectiveDist = hasOpaqueBorder
      ? Math.min(distToBg, distToWhite)
      : distToWhite;

    if (effectiveDist <= innerThresh) {
      data[i + 3] = 0;
      continue;
    } else if (effectiveDist < outerThresh) {
      // Smooth anti-aliased ramp
      const factor = (effectiveDist - innerThresh) / (outerThresh - innerThresh);
      a = Math.round(a * factor);

      // Color decontamination: remove background color bleed from semi-transparent edge pixels
      const safeAlpha = Math.max(0.15, factor);
      r = Math.min(255, Math.max(0, Math.round((r - (1 - safeAlpha) * bgR) / safeAlpha)));
      g = Math.min(255, Math.max(0, Math.round((g - (1 - safeAlpha) * bgG) / safeAlpha)));
      b = Math.min(255, Math.max(0, Math.round((b - (1 - safeAlpha) * bgB) / safeAlpha)));
    }

    // 3. Apply surface adaptation if requested
    if (mode === 'gold_emboss') {
      // Convert to luminous metallic gold / champagne based on original luminance
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const mix = Math.min(1, Math.max(0, lum * 0.55 + 0.35));
      r = Math.round(245 + (255 - 245) * mix);
      g = Math.round(190 + (235 - 190) * mix);
      b = Math.round(85 + (175 - 85) * mix);
    } else if (mode === 'adaptive_clean' && isDarkSurface) {
      // On dark page backgrounds, dark/black neutral text in the logo (low saturation, low luminance)
      // is smoothly lifted to crisp white/silver so it never disappears against a dark background,
      // while colorful brand elements (orange, red, gold, blue, green, etc.) keep their rich color!
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const delta = maxC - minC;
      const saturation = maxC === 0 ? 0 : delta / maxC;
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      if (saturation < 0.28 && luminance < 105) {
        // Dark neutral pixel (e.g., black/charcoal/dark-gray text or outline): lift to crisp light silver/white
        const lift = 1 - luminance / 105; // 1 for pure black, 0 for mid-gray
        r = Math.min(255, Math.round(r + (248 - r) * (0.78 + 0.22 * lift)));
        g = Math.min(255, Math.round(g + (250 - g) * (0.78 + 0.22 * lift)));
        b = Math.min(255, Math.round(b + (252 - b) * (0.78 + 0.22 * lift)));
      } else if (luminance < 65) {
        // Dark saturated color (e.g., very dark navy/maroon icon): boost brightness so it pops on dark page
        const boost = 1.65;
        r = Math.min(255, Math.round(r * boost + 28));
        g = Math.min(255, Math.round(g * boost + 28));
        b = Math.min(255, Math.round(b * boost + 28));
      }
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }

  ctx.putImageData(imgData, 0, 0);

  // 4. Auto-crop transparent whitespace around the logo so placement is tight and accurate
  return autoCropCanvas(workCanvas, ctx);
}

function autoCropCanvas(
  sourceCanvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): HTMLCanvasElement {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const { data } = ctx.getImageData(0, 0, w, h);

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let foundPixel = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 15) {
        foundPixel = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!foundPixel || maxX <= minX || maxY <= minY) {
    return sourceCanvas;
  }

  // Add a tiny 2px breathing margin
  const pad = 2;
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(w - cropX, maxX - minX + 1 + pad * 2);
  const cropH = Math.min(h - cropY, maxY - minY + 1 + pad * 2);

  const cropped = document.createElement('canvas');
  cropped.width = cropW;
  cropped.height = cropH;
  const croppedCtx = cropped.getContext('2d');
  if (!croppedCtx) return sourceCanvas;

  croppedCtx.drawImage(
    sourceCanvas,
    cropX,
    cropY,
    cropW,
    cropH,
    0,
    0,
    cropW,
    cropH
  );

  return cropped;
}
