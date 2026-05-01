import { describe, expect, it } from 'vitest';

import { parseUrl, buildPath } from '@/client/hooks/useUrlState';
import type { UrlState } from '@/client/hooks/useUrlState';

function state(overrides: Partial<UrlState> = {}): UrlState {
  return {
    library: '',
    score: null,
    page: undefined,
    setlist: null,
    setlistIndex: undefined,
    ...overrides,
  };
}

describe('parseUrl', () => {
  it('parses / as empty library, null score', () => {
    const result = parseUrl('/');
    expect(result.library).toBe('');
    expect(result.score).toBeNull();
    expect(result.page).toBeUndefined();
    expect(result.setlist).toBeNull();
  });

  it('parses /my-lib as library only', () => {
    const result = parseUrl('/my-lib');
    expect(result.library).toBe('my-lib');
    expect(result.score).toBeNull();
  });

  it('parses /my-lib/score.pdf as library + score', () => {
    const result = parseUrl('/my-lib/score.pdf');
    expect(result.library).toBe('my-lib');
    expect(result.score).toBe('score.pdf');
    expect(result.page).toBeUndefined();
  });

  it('parses /my-lib/score.pdf/5 as library + score + page 5', () => {
    const result = parseUrl('/my-lib/score.pdf/5');
    expect(result.library).toBe('my-lib');
    expect(result.score).toBe('score.pdf');
    expect(result.page).toBe(5);
  });

  it('treats page 0 as undefined', () => {
    const result = parseUrl('/my-lib/score.pdf/0');
    expect(result.page).toBeUndefined();
  });

  it('treats negative page as undefined', () => {
    const result = parseUrl('/my-lib/score.pdf/-3');
    expect(result.page).toBeUndefined();
  });

  it('treats non-numeric page as undefined', () => {
    const result = parseUrl('/my-lib/score.pdf/abc');
    expect(result.page).toBeUndefined();
  });

  it('parses /my-lib/setlist/Recital as setlist with index 0', () => {
    const result = parseUrl('/my-lib/setlist/Recital');
    expect(result.library).toBe('my-lib');
    expect(result.setlist).toBe('Recital');
    expect(result.setlistIndex).toBe(0);
    expect(result.score).toBeNull();
  });

  it('parses /my-lib/setlist/Recital/3 as setlist with 0-based index 2', () => {
    const result = parseUrl('/my-lib/setlist/Recital/3');
    expect(result.setlist).toBe('Recital');
    expect(result.setlistIndex).toBe(2);
  });

  it('treats setlist index 0 or negative as 0', () => {
    expect(parseUrl('/my-lib/setlist/Recital/0').setlistIndex).toBe(0);
    expect(parseUrl('/my-lib/setlist/Recital/-1').setlistIndex).toBe(0);
  });

  it('decodes URI-encoded path components', () => {
    const result = parseUrl('/my%20lib/score%20file.pdf');
    expect(result.library).toBe('my lib');
    expect(result.score).toBe('score file.pdf');
  });
});

describe('buildPath', () => {
  it('returns / for empty library', () => {
    expect(buildPath(state())).toBe('/');
  });

  it('returns /library for library only', () => {
    expect(buildPath(state({ library: 'my-lib' }))).toBe('/my-lib');
  });

  it('returns /library/score for library + score', () => {
    expect(buildPath(state({ library: 'my-lib', score: 'test.pdf' }))).toBe('/my-lib/test.pdf');
  });

  it('omits page when page is 1 or undefined', () => {
    expect(buildPath(state({ library: 'lib', score: 's.pdf', page: 1 }))).toBe('/lib/s.pdf');
    expect(buildPath(state({ library: 'lib', score: 's.pdf', page: undefined }))).toBe('/lib/s.pdf');
  });

  it('appends page when > 1', () => {
    expect(buildPath(state({ library: 'lib', score: 's.pdf', page: 3 }))).toBe('/lib/s.pdf/3');
  });

  it('returns /library/setlist/name for setlist', () => {
    expect(buildPath(state({ library: 'lib', setlist: 'Recital' }))).toBe('/lib/setlist/Recital');
  });

  it('appends 1-based index when setlistIndex > 0', () => {
    expect(buildPath(state({ library: 'lib', setlist: 'Recital', setlistIndex: 2 }))).toBe(
      '/lib/setlist/Recital/3',
    );
  });

  it('omits index when setlistIndex is 0', () => {
    expect(buildPath(state({ library: 'lib', setlist: 'Recital', setlistIndex: 0 }))).toBe(
      '/lib/setlist/Recital',
    );
  });

  it('encodes special characters in library and score names', () => {
    const path = buildPath(state({ library: 'my lib', score: 'score file.pdf' }));
    expect(path).toBe('/my%20lib/score%20file.pdf');
  });

  it('encodes special characters in setlist names', () => {
    const path = buildPath(state({ library: 'lib', setlist: 'My Setlist' }));
    expect(path).toBe('/lib/setlist/My%20Setlist');
  });
});

describe('parseUrl <-> buildPath round-trip', () => {
  it('preserves score state through round-trip', () => {
    const original = state({ library: 'my-lib', score: 'test.pdf', page: 5 });
    const path = buildPath(original);
    const parsed = parseUrl(path);
    expect(parsed.library).toBe(original.library);
    expect(parsed.score).toBe(original.score);
    expect(parsed.page).toBe(original.page);
  });

  it('preserves setlist state through round-trip', () => {
    const original = state({ library: 'my-lib', setlist: 'Recital', setlistIndex: 3 });
    const path = buildPath(original);
    const parsed = parseUrl(path);
    expect(parsed.library).toBe(original.library);
    expect(parsed.setlist).toBe(original.setlist);
    expect(parsed.setlistIndex).toBe(original.setlistIndex);
  });
});
