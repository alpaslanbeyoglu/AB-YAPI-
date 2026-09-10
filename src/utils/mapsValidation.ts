/**
 * Validates whether a provided string matches the expected Google Maps Platform API key format.
 * Valid Google Cloud / Google Maps keys:
 *  - Always start with "AIza" (standard GCP API key prefix).
 *  - Have a length of at least 30 characters (typically 39 characters).
 *
 * Notice: Keys starting with "AQ." are Google AI Studio / Gemini API keys, NOT Google Maps keys.
 * Passing an AI Studio key to the Google Maps JS SDK triggers "InvalidKeyMapError".
 */
export function isValidGoogleMapsApiKey(key?: string | null): boolean {
  if (!key) return false;
  const trimmed = key.trim();

  // Explicitly reject Gemini / Google AI Studio keys
  if (trimmed.startsWith('AQ.')) {
    return false;
  }

  // Google Maps Platform API keys start with "AIza"
  return trimmed.startsWith('AIza') && trimmed.length >= 30;
}
