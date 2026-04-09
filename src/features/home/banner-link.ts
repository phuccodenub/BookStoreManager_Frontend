import type { Banner } from '@/lib/types';

export interface BannerViewModel {
  title: string;
  href: string;
  description: string;
  ctaLabel: string;
}

type BannerVariant = 'new' | 'bestSeller' | 'generic';

function hasTruthyFlag(params: URLSearchParams, keys: string[]) {
  return keys.some((key) => {
    const value = params.get(key)?.toLowerCase();
    return value === 'true' || value === '1';
  });
}

function inferBannerVariant(title: string, href: string): BannerVariant {
  if (href.includes('isNew=true')) {
    return 'new';
  }
  if (href.includes('isBestSeller=true')) {
    return 'bestSeller';
  }

  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle.includes('mới')) {
    return 'new';
  }
  if (normalizedTitle.includes('best-seller') || normalizedTitle.includes('bán chạy')) {
    return 'bestSeller';
  }

  return 'generic';
}

export function normalizeBannerHref(rawLink: string | null | undefined) {
  if (!rawLink) {
    return '/catalog';
  }

  try {
    const url = new URL(rawLink, 'https://mmt.local');
    if (url.pathname === '/books' || url.pathname === '/catalog') {
      const nextParams = new URLSearchParams();
      if (hasTruthyFlag(url.searchParams, ['isNew', 'is_new'])) {
        nextParams.set('isNew', 'true');
      }
      if (hasTruthyFlag(url.searchParams, ['isBestSeller', 'is_best_seller'])) {
        nextParams.set('isBestSeller', 'true');
      }

      const query = nextParams.toString();
      return `/catalog${query ? `?${query}` : ''}`;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/catalog';
  }
}

export function buildBannerViewModel(banner?: Banner | null): BannerViewModel {
  const title = banner?.title ?? 'Không gian sách dành cho bạn';
  const href = normalizeBannerHref(banner?.link);
  const variant = inferBannerVariant(title, href);

  switch (variant) {
    case 'new':
      return {
        title,
        href,
        description: 'Khám phá những đầu sách vừa cập nhật để chọn nhanh cuốn đọc tiếp theo của bạn.',
        ctaLabel: 'Xem sách mới',
      };
    case 'bestSeller':
      return {
        title,
        href,
        description: 'Theo dõi các tựa sách được bạn đọc chọn mua nhiều nhất trong thời gian gần đây.',
        ctaLabel: 'Xem sách bán chạy',
      };
    default:
      return {
        title,
        href,
        description: 'Khám phá bộ sưu tập sách nổi bật được tuyển chọn để bạn bắt đầu hành trình đọc mới.',
        ctaLabel: 'Khám phá ngay',
      };
  }
}
