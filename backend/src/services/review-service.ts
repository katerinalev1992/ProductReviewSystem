import { db } from '../db/client.js';
import { appContext } from '../infrastructure/app-context.js';
import { invalidateProductCaches } from './product-service.js';
import type { ReviewSummary } from '../types/domain.js';

const sortMap: Record<string, string> = {
  newest: 'created_at DESC',
  highest: 'rating DESC, created_at DESC',
  lowest: 'rating ASC, created_at DESC',
  helpful: 'helpful_count DESC, created_at DESC'
};

export function listReviews(productId: number, sort: string, rating?: number): ReviewSummary[] {
  const orderBy = sortMap[sort] ?? sortMap.newest;
  const filters: string[] = ['product_id = @productId'];
  const params: Record<string, number> = { productId };

  if (rating) {
    filters.push('rating = @rating');
    params.rating = rating;
  }

  const stmt = db.prepare(`
    SELECT id, product_id, author_name, title, content, rating, helpful_count, created_at
    FROM reviews
    WHERE ${filters.join(' AND ')}
    ORDER BY ${orderBy}
  `);

  return stmt.all(params) as ReviewSummary[];
}

export interface CreateReviewInput {
  productId: number;
  authorName: string;
  title: string;
  content: string;
  rating: number;
}

export function createReview(input: CreateReviewInput): ReviewSummary {
  const exists = db.prepare('SELECT id FROM products WHERE id = ?').get(input.productId);
  if (!exists) {
    throw new Error('Product not found');
  }

  const stmt = db.prepare(`
    INSERT INTO reviews (product_id, author_name, title, content, rating)
    VALUES (@productId, @authorName, @title, @content, @rating)
  `);

  const result = stmt.run(input);
  const inserted = db.prepare(`
    SELECT id, product_id, author_name, title, content, rating, helpful_count, created_at
    FROM reviews
    WHERE id = ?
  `).get(result.lastInsertRowid) as ReviewSummary;

  invalidateProductCaches(input.productId);
  appContext.eventBroker.publish({
    type: 'review.created',
    payload: {
      reviewId: inserted.id,
      productId: inserted.product_id,
      rating: inserted.rating
    },
    occurredAt: new Date().toISOString()
  });

  return inserted;
}

export function markReviewHelpful(reviewId: number): ReviewSummary | null {
  const update = db.prepare(`
    UPDATE reviews
    SET helpful_count = helpful_count + 1
    WHERE id = ?
  `);

  const result = update.run(reviewId);
  if (result.changes === 0) {
    return null;
  }

  const review = db.prepare(`
    SELECT id, product_id, author_name, title, content, rating, helpful_count, created_at
    FROM reviews
    WHERE id = ?
  `).get(reviewId) as ReviewSummary;

  invalidateProductCaches(review.product_id);
  appContext.eventBroker.publish({
    type: 'review.helpful_marked',
    payload: {
      reviewId: review.id,
      productId: review.product_id,
      helpfulCount: review.helpful_count
    },
    occurredAt: new Date().toISOString()
  });

  return review;
}
