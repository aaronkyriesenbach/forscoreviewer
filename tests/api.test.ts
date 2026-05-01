import { describe, expect, it } from 'vitest';

import { getDocumentUrl, getAnnotationUrl } from '@/client/lib/api';

describe('getDocumentUrl', () => {
  it('returns correct path for simple names', () => {
    expect(getDocumentUrl('my-lib', 'score.pdf')).toBe('/data/my-lib/documents/score.pdf');
  });

  it('encodes special characters in library and filename', () => {
    const url = getDocumentUrl('my library', '11 Bagatelles, Op.119.pdf');
    expect(url).toBe('/data/my%20library/documents/11%20Bagatelles%2C%20Op.119.pdf');
  });
});

describe('getAnnotationUrl', () => {
  it('returns correct path with page number', () => {
    expect(getAnnotationUrl('my-lib', 'score.pdf', 3)).toBe(
      '/data/my-lib/aux/score.pdf_3.png',
    );
  });

  it('encodes filename with special characters', () => {
    const url = getAnnotationUrl('lib', '11 Bagatelles, Op.119.pdf', 1);
    expect(url).toBe('/data/lib/aux/11%20Bagatelles%2C%20Op.119.pdf_1.png');
  });
});
