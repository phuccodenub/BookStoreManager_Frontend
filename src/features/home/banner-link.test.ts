import { describe, expect, it } from 'vitest';

import { buildBannerViewModel, normalizeBannerHref } from './banner-link';

describe('normalizeBannerHref', () => {
  it('maps legacy is_new banner links to catalog filters', () => {
    expect(normalizeBannerHref('/books?is_new=true')).toBe('/catalog?isNew=true');
  });

  it('maps legacy best-seller banner links to catalog filters', () => {
    expect(normalizeBannerHref('/books?is_best_seller=true')).toBe('/catalog?isBestSeller=true');
  });

  it('falls back to catalog when no link is provided', () => {
    expect(normalizeBannerHref(null)).toBe('/catalog');
  });
});

describe('buildBannerViewModel', () => {
  it('builds a user-facing CTA for new books', () => {
    expect(buildBannerViewModel({
      id: 'banner-1',
      title: 'Sách mới tháng 3',
      image: 'banner-1.jpg',
      link: '/books?is_new=true',
    })).toMatchObject({
      href: '/catalog?isNew=true',
      ctaLabel: 'Xem sách mới',
    });
  });
});
