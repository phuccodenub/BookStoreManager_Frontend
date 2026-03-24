import { describe, expect, it } from 'vitest';

import { buildCatalogSearchParams, readCatalogFilters } from './catalog-filters';

describe('catalog filters', () => {
  it('reads both legacy and normalized boolean flags', () => {
    const filters = readCatalogFilters(new URLSearchParams('is_new=true&isBestSeller=true&search=clean'));

    expect(filters.isNew).toBe(true);
    expect(filters.isBestSeller).toBe(true);
    expect(filters.search).toBe('clean');
  });

  it('builds normalized catalog search params', () => {
    const params = buildCatalogSearchParams({
      search: 'clean code',
      categoryId: '',
      authorId: '',
      publisherId: '',
      sortBy: 'newest',
      isNew: true,
      isBestSeller: false,
    });

    expect(params.toString()).toBe('search=clean+code&isNew=true');
  });
});
