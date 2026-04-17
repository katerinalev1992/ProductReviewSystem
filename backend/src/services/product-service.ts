import { db } from '../db/client.js';
import { appContext } from '../infrastructure/app-context.js';
import type { ProductDetail, ProductSummary, RatingBreakdown } from '../types/domain.js';

export function listProducts(): ProductSummary[] {
  const cached = appContext.cache.productsList.get('all');
  if (cached) {
    return cached;
  }

  const stmt = db.prepare(`
    SELECT
      p.id,
      p.name,
      p.description,
      p.price,
      p.image_url,
      p.created_at,
      COUNT(r.id) AS reviewCount,
      ROUND(AVG(r.rating), 2) AS averageRating
    FROM products p
    LEFT JOIN reviews r ON r.product_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `);

  const products = stmt.all().map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    image_url: row.image_url,
    created_at: row.created_at,
    reviewCount: Number(row.reviewCount),
    averageRating: row.averageRating === null ? null : Number(row.averageRating)
  }));

  appContext.cache.productsList.set('all', products);
  return products;
}

export function getProductById(productId: number): ProductDetail | null {
  const cacheKey = String(productId);
  const cached = appContext.cache.productDetail.get(cacheKey);
  if (cached) {
    return cached;
  }

  const productStmt = db.prepare(`
    SELECT
      p.id,
      p.name,
      p.description,
      p.price,
      p.image_url,
      p.created_at,
      COUNT(r.id) AS reviewCount,
      ROUND(AVG(r.rating), 2) AS averageRating
    FROM products p
    LEFT JOIN reviews r ON r.product_id = p.id
    WHERE p.id = ?
    GROUP BY p.id
  `);

  const product = productStmt.get(productId) as any;
  if (!product) {
    return null;
  }

  const breakdownStmt = db.prepare(`
    SELECT rating, COUNT(*) AS count
    FROM reviews
    WHERE product_id = ?
    GROUP BY rating
    ORDER BY rating DESC
  `);

  const breakdownRows = breakdownStmt.all(productId) as any[];
  const normalized: RatingBreakdown[] = [5, 4, 3, 2, 1].map((rating) => {
    const found = breakdownRows.find((row) => Number(row.rating) === rating);
    return { rating, count: found ? Number(found.count) : 0 };
  });

  const result = {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    image_url: product.image_url,
    created_at: product.created_at,
    reviewCount: Number(product.reviewCount),
    averageRating: product.averageRating === null ? null : Number(product.averageRating),
    ratingBreakdown: normalized
  };

  appContext.cache.productDetail.set(cacheKey, result);
  return result;
}

export function invalidateProductCaches(productId?: number): void {
  appContext.cache.productsList.delete('all');
  if (typeof productId === 'number') {
    appContext.cache.productDetail.delete(String(productId));
    return;
  }

  appContext.cache.productDetail.clear();
}
