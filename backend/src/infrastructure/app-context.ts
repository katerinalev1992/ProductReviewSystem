import type { ProductDetail, ProductSummary } from '../types/domain.js';
import { InMemoryTtlCache } from './cache.js';
import { InMemoryEventBroker } from './event-broker.js';

const productsListCacheTtlMs = Number(process.env.PRODUCTS_LIST_CACHE_TTL_MS ?? 20_000);
const productDetailCacheTtlMs = Number(process.env.PRODUCT_DETAIL_CACHE_TTL_MS ?? 20_000);

export const appContext = {
  cache: {
    productsList: new InMemoryTtlCache<ProductSummary[]>(productsListCacheTtlMs),
    productDetail: new InMemoryTtlCache<ProductDetail>(productDetailCacheTtlMs)
  },
  eventBroker: new InMemoryEventBroker()
};
