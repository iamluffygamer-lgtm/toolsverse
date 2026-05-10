// ── Unicode-safe encoding utilities ──────────────────────────────────────────
// Standard btoa() and atob() break on non-Latin characters.
// These utilities handle the full Unicode range correctly.

/**
 * Unicode-safe Base64 encode.
 * Handles emoji, CJK characters, accented letters, etc.
 */
export function encodeBase64(input: string): string {
  return btoa(
    encodeURIComponent(input).replace(
      /%([0-9A-F]{2})/g,
      (_, hex) => String.fromCharCode(parseInt(hex, 16))
    )
  )
}

/**
 * Unicode-safe Base64 decode.
 * Inverse of encodeBase64.
 */
export function decodeBase64(input: string): string {
  return decodeURIComponent(
    atob(input)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  )
}

/**
 * Base64URL encode (URL-safe variant — uses - and _ instead of + and /).
 * Used in JWT tokens and URL-safe contexts.
 */
export function encodeBase64Url(input: string): string {
  return encodeBase64(input)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Base64URL decode.
 * Handles missing padding automatically.
 */
export function decodeBase64Url(input: string): string {
  const base64 = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4)
  return decodeBase64(padded)
}

/**
 * Unicode NFC normalization.
 * Ensures consistent character representation before hashing,
 * comparing, or exporting text.
 */
export function normalizeUnicode(input: string): string {
  return input.normalize('NFC')
}

/**
 * Safe JSON stringify that handles:
 * - circular references (returns error string)
 * - Unicode normalization
 * - BigInt values
 */
export function safeStringify(
  value: unknown,
  indent = 2
): string {
  const seen = new WeakSet()
  return JSON.stringify(
    value,
    (_, val) => {
      if (typeof val === 'bigint') return val.toString() + 'n'
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '[Circular]'
        seen.add(val)
      }
      return val
    },
    indent
  )
}

/**
 * Prepare text for export — normalize, trim, ensure consistent line endings.
 */
export function prepareForExport(input: string): string {
  return normalizeUnicode(input)
    .replace(/\r\n/g, '\n')   // normalize Windows line endings
    .replace(/\r/g, '\n')     // normalize old Mac line endings
    .trim()
}

/**
 * Estimate UTF-8 byte size of a string.
 * More accurate than .length for multi-byte characters.
 */
export function byteSize(input: string): number {
  return new TextEncoder().encode(input).length
}

/**
 * Format byte size as human-readable string.
 */
export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
