const MASK_CHAR = 'X';
const MASKABLE = /[A-Za-z0-9]/;

/**
 * Formats a bare 12-digit Aadhaar-style number as `1234-5678-9012`.
 * Any other value is returned unchanged.
 */
export function formatIdentifier(value: string): string {
  const compact = value.replace(/[\s-]/g, '');
  return /^\d{12}$/.test(compact) ? compact.replace(/(\d{4})(?=\d)/g, '$1-') : value;
}

/**
 * Masks every alphanumeric character except the last `visibleChars`,
 * keeping separators so the shape of the identifier stays recognisable.
 *
 *   maskValue('987654321234')   -> 'XXXX-XXXX-1234'
 *   maskValue('ABCDE1234F')     -> 'XXXXXX234F'
 */
export function maskValue(value: string, visibleChars = 4): string {
  const formatted = formatIdentifier(value);
  const totalMaskable = [...formatted].filter((c) => MASKABLE.test(c)).length;
  const keep = Math.max(0, Math.min(visibleChars, totalMaskable));
  let seen = 0;

  return [...formatted]
    .map((char) => {
      if (!MASKABLE.test(char)) return char;
      seen += 1;
      return seen > totalMaskable - keep ? char : MASK_CHAR;
    })
    .join('');
}

/** The trailing characters left visible by `maskValue`, for screen-reader hints. */
export function visibleTail(value: string, visibleChars = 4): string {
  const chars = [...value].filter((c) => MASKABLE.test(c));
  return visibleChars > 0 ? chars.slice(-visibleChars).join('') : '';
}
