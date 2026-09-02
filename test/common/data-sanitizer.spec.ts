import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';

describe('DataSanitizer.stringifyResponseScalars', () => {
  it('converts nested response scalars to strings without flattening structure', () => {
    const result = DataSanitizer.stringifyResponseScalars({
      id: 42,
      active: true,
      missing: null,
      createdAt: new Date('2026-08-31T00:00:00.000Z'),
      items: [{ amount: 10.5, tags: ['new', 2] }],
    });

    expect(result).toEqual({
      id: '42',
      active: 'true',
      missing: '',
      createdAt: '2026-08-31T00:00:00.000Z',
      items: [{ amount: '10.5', tags: ['new', '2'] }],
    });
  });
});
