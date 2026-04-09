export interface CatalogFilterState {
  search: string;
  categoryId: string;
  authorId: string;
  publisherId: string;
  sortBy: string;
  isNew: boolean;
  isBestSeller: boolean;
}

export const DEFAULT_SORT_BY = 'newest';

export const DEFAULT_CATALOG_FILTERS: CatalogFilterState = {
  search: '',
  categoryId: '',
  authorId: '',
  publisherId: '',
  sortBy: DEFAULT_SORT_BY,
  isNew: false,
  isBestSeller: false,
};

function parseBooleanParam(params: URLSearchParams, keys: string[]) {
  return keys.some((key) => {
    const value = params.get(key)?.toLowerCase();
    return value === 'true' || value === '1';
  });
}

export function readCatalogFilters(params: URLSearchParams): CatalogFilterState {
  return {
    search: params.get('search') ?? '',
    categoryId: params.get('categoryId') ?? '',
    authorId: params.get('authorId') ?? '',
    publisherId: params.get('publisherId') ?? '',
    sortBy: params.get('sortBy') ?? DEFAULT_SORT_BY,
    isNew: parseBooleanParam(params, ['isNew', 'is_new']),
    isBestSeller: parseBooleanParam(params, ['isBestSeller', 'is_best_seller']),
  };
}

export function buildCatalogSearchParams(filters: CatalogFilterState) {
  const nextParams = new URLSearchParams();
  const normalizedSearch = filters.search.trim();

  if (normalizedSearch) {
    nextParams.set('search', normalizedSearch);
  }
  if (filters.categoryId) {
    nextParams.set('categoryId', filters.categoryId);
  }
  if (filters.authorId) {
    nextParams.set('authorId', filters.authorId);
  }
  if (filters.publisherId) {
    nextParams.set('publisherId', filters.publisherId);
  }
  if (filters.sortBy && filters.sortBy !== DEFAULT_SORT_BY) {
    nextParams.set('sortBy', filters.sortBy);
  }
  if (filters.isNew) {
    nextParams.set('isNew', 'true');
  }
  if (filters.isBestSeller) {
    nextParams.set('isBestSeller', 'true');
  }

  return nextParams;
}
