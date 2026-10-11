/**
 * Turkish Construction Terminology & Spelling Sanitizer
 * Automatically detects and corrects common construction spelling errors
 * in client-facing notifications, proposals, and WhatsApp broadcasts.
 * 
 * Specifically fixes typos like 'imaalat' -> 'imalat'.
 */

export interface TextSanitizationResult {
  cleanedText: string;
  hasCorrections: boolean;
  correctionsCount: number;
}

/**
 * Sanitizes construction texts, specifically correcting "imaalat" typos to "imalat".
 * Preserves Turkish casing (İmaalat -> İmalat, İMAALAT -> İMALAT, imaalat -> imalat).
 */
export function sanitizeCustomerMessageText(rawText: string): string {
  if (!rawText) return '';

  let sanitized = rawText;

  // 1. All-caps Turkish
  sanitized = sanitized.replace(/\bİMAALAT([A-ZÇĞİÖŞÜ]*)\b/g, 'İMALAT$1');
  sanitized = sanitized.replace(/\bIMAALAT([A-ZÇĞİÖŞÜ]*)\b/g, 'İMALAT$1');

  // 2. Title-case Turkish
  sanitized = sanitized.replace(/\bİmaalat([a-zçğıöşü]*)\b/g, 'İmalat$1');
  sanitized = sanitized.replace(/\bImaalat([a-zçğıöşü]*)\b/g, 'İmalat$1');

  // 3. Lowercase Turkish
  sanitized = sanitized.replace(/\bimaalat([a-zçğıöşü]*)\b/g, 'imalat$1');

  // 4. Any leftover case-insensitive imaalat occurrences
  sanitized = sanitized.replace(/imaalat/gi, (match) => {
    if (match === match.toUpperCase()) return 'İMALAT';
    if (match[0] === 'İ' || match[0] === 'I' || match[0] === match[0].toUpperCase()) return 'İmalat';
    return 'imalat';
  });

  // 5. Common Turkish construction typo: "harfiyat" -> "hafriyat"
  sanitized = sanitized.replace(/\bHARFİYAT([A-ZÇĞİÖŞÜ]*)\b/g, 'HAFRİYAT$1');
  sanitized = sanitized.replace(/\bHarfiyat([a-zçğıöşü]*)\b/g, 'Hafriyat$1');
  sanitized = sanitized.replace(/\bharfiyat([a-zçğıöşü]*)\b/g, 'hafriyat$1');

  return sanitized;
}

/**
 * Checks if a text contains any "imaalat" or common typos
 */
export function countTypoOccurrences(text: string): number {
  if (!text) return 0;
  const imaalatMatches = text.match(/imaalat/gi) || [];
  const harfiyatMatches = text.match(/harfiyat/gi) || [];
  return imaalatMatches.length + harfiyatMatches.length;
}
