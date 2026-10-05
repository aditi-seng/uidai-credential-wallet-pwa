import { formatIdentifier, maskValue, visibleTail } from './mask';

describe('mask utils', () => {
  it('masks a hyphenated Aadhaar-style number keeping the last 4 digits', () => {
    expect(maskValue('9876-5432-1234')).toBe('XXXX-XXXX-1234');
  });

  it('formats and masks a bare 12-digit number', () => {
    expect(formatIdentifier('987654321234')).toBe('9876-5432-1234');
    expect(maskValue('987654321234')).toBe('XXXX-XXXX-1234');
  });

  it('keeps separators for other identifier shapes', () => {
    expect(maskValue('ABCDE1234F')).toBe('XXXXXX234F');
    expect(maskValue('KA01-2016-0012345')).toBe('XXXX-XXXX-XXX2345');
  });

  it('handles edge cases', () => {
    expect(maskValue('')).toBe('');
    expect(maskValue('123', 4)).toBe('123');
    expect(maskValue('123456', 0)).toBe('XXXXXX');
    expect(visibleTail('9876-5432-1234')).toBe('1234');
    expect(visibleTail('9876-5432-1234', 0)).toBe('');
  });
});
