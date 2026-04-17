import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

let createApp: () => unknown;
let initializeDatabase: () => void;
let db: any;
let errorHandler: (...args: any[]) => void;
let productRouter: any;
let reviewRouter: any;
let getProductById: (id: number) => any;
let invalidateProductCaches: (id?: number) => void;
let listProducts: () => any[];
let createReview: (input: any) => any;
let listReviews: (productId: number, sort: string, rating?: number) => any[];
let markReviewHelpful: (reviewId: number) => any;
let rootValue: any;
let InMemoryTtlCache: new <T>(ttl?: number) => {
  get: (key: string) => T | undefined;
  set: (key: string, value: T, ttlMs?: number) => void;
  delete: (key: string) => void;
  clear: () => void;
};
let InMemoryEventBroker: new () => {
  publish: (event: { type: string; payload: Record<string, unknown>; occurredAt: string }) => void;
  subscribe: (eventType: string, handler: (event: any) => void) => () => void;
};

function seedTestData() {
  const insertProduct = db.prepare(`
    INSERT INTO products (name, description, price, image_url)
    VALUES (@name, @description, @price, @image_url)
  `);

  const insertReview = db.prepare(`
    INSERT INTO reviews (product_id, author_name, title, content, rating, helpful_count)
    VALUES (@product_id, @author_name, @title, @content, @rating, @helpful_count)
  `);

  const productId = Number(
    insertProduct.run({
      name: 'Test Product',
      description: 'Test Description',
      price: 99.99,
      image_url: null
    }).lastInsertRowid
  );

  const reviewId = Number(
    insertReview.run({
      product_id: productId,
      author_name: 'Alice',
      title: 'Great product',
      content: 'Very solid and reliable for everyday usage.',
      rating: 5,
      helpful_count: 1
    }).lastInsertRowid
  );

  return { productId, reviewId };
}

function getRouteHandler(router: any, method: 'get' | 'post', routePath: string) {
  const layer = router.stack.find((entry: any) => entry.route?.path === routePath && entry.route.methods[method]);
  if (!layer) {
    throw new Error(`Route not found: ${method.toUpperCase()} ${routePath}`);
  }
  return layer.route.stack[0].handle as (...args: any[]) => any;
}

function createMockRes() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    }
  };
}

describe('Backend coverage suite', () => {
  beforeAll(async () => {
    process.env.DB_PATH = './data/reviews.test.db';
    ({ createApp } = await import('../src/app.js'));
    ({ initializeDatabase, db } = await import('../src/db/client.js'));
    ({ errorHandler } = await import('../src/middleware/error-handler.js'));
    ({ productRouter } = await import('../src/routes/products.js'));
    ({ reviewRouter } = await import('../src/routes/reviews.js'));
    ({ getProductById, invalidateProductCaches, listProducts } = await import('../src/services/product-service.js'));
    ({ createReview, listReviews, markReviewHelpful } = await import('../src/services/review-service.js'));
    ({ rootValue } = await import('../src/graphql/schema.js'));
    ({ InMemoryTtlCache } = await import('../src/infrastructure/cache.js'));
    ({ InMemoryEventBroker } = await import('../src/infrastructure/event-broker.js'));

    initializeDatabase();
    createApp();
  });

  beforeEach(() => {
    db.exec('DELETE FROM reviews; DELETE FROM products;');
    invalidateProductCaches();
  });

  afterAll(() => {
    if (db.open) {
      db.close();
    }

    const dbPath = path.resolve(process.cwd(), 'data', 'reviews.test.db');
    const shmPath = `${dbPath}-shm`;
    const walPath = `${dbPath}-wal`;

    for (const file of [dbPath, shmPath, walPath]) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
  });

  it('covers product service aggregate reads and cache invalidation', () => {
    const { productId } = seedTestData();

    const first = listProducts();
    const second = listProducts();
    expect(first).toHaveLength(1);
    expect(second[0].id).toBe(productId);

    const detail = getProductById(productId);
    expect(detail?.ratingBreakdown).toHaveLength(5);

    invalidateProductCaches(productId);
    const refreshed = getProductById(productId);
    expect(refreshed?.id).toBe(productId);
  });

  it('covers review service create/list/helpful paths and errors', () => {
    const { productId, reviewId } = seedTestData();

    const created = createReview({
      productId,
      authorName: 'Bob',
      title: 'Solid value',
      content: 'Works as expected and has been stable so far.',
      rating: 4
    });
    expect(created.product_id).toBe(productId);

    expect(listReviews(productId, 'newest').length).toBe(2);
    expect(listReviews(productId, 'highest')[0].rating).toBe(5);
    expect(listReviews(productId, 'lowest')[0].rating).toBe(4);
    expect(listReviews(productId, 'helpful')[0].id).toBe(reviewId);
    expect(listReviews(productId, 'newest', 5).every((row) => row.rating === 5)).toBe(true);

    const updated = markReviewHelpful(reviewId);
    expect(updated?.helpful_count).toBe(2);
    expect(markReviewHelpful(9999)).toBeNull();

    expect(() =>
      createReview({
        productId: 9999,
        authorName: 'Nope',
        title: 'Missing product',
        content: 'This should fail because product does not exist.',
        rating: 3
      })
    ).toThrow('Product not found');
  });

  it('covers GraphQL root resolvers including error branches', async () => {
    const { productId, reviewId } = seedTestData();

    expect(rootValue.products().length).toBe(1);
    expect(rootValue.product({ id: productId })?.id).toBe(productId);
    expect(rootValue.reviews({ productId, sort: 'newest' }).length).toBeGreaterThan(0);

    const created = rootValue.createReview({
      productId,
      input: {
        authorName: 'Zara',
        title: 'GraphQL path',
        content: 'Created via root resolver mutation path.',
        rating: 5
      }
    });
    expect(created.product_id).toBe(productId);

    const helpful = rootValue.markReviewHelpful({ reviewId });
    expect(helpful.helpful_count).toBe(2);

    expect(() =>
      rootValue.createReview({
        productId: 9999,
        input: {
          authorName: 'Bad',
          title: 'Bad',
          content: 'No product found in storage for mutation.',
          rating: 3
        }
      })
    ).toThrow();

    expect(() => rootValue.markReviewHelpful({ reviewId: 9999 })).toThrow();
  });

  it('covers product routes including validation and not-found behavior', () => {
    const { productId } = seedTestData();
    const getProducts = getRouteHandler(productRouter, 'get', '/');
    const getById = getRouteHandler(productRouter, 'get', '/:id');
    const getReviews = getRouteHandler(productRouter, 'get', '/:id/reviews');
    const postReview = getRouteHandler(productRouter, 'post', '/:id/reviews');

    const resList = createMockRes();
    getProducts({}, resList);
    expect(resList.statusCode).toBe(200);
    expect((resList.body as any[]).length).toBe(1);

    const resDetail = createMockRes();
    getById({ params: { id: String(productId) } }, resDetail);
    expect(resDetail.statusCode).toBe(200);

    const resMissing = createMockRes();
    getById({ params: { id: '9999' } }, resMissing);
    expect(resMissing.statusCode).toBe(404);

    const resReviews = createMockRes();
    getReviews({ params: { id: String(productId) }, query: { sort: 'newest' } }, resReviews);
    expect((resReviews.body as any[]).length).toBeGreaterThan(0);

    expect(() => getReviews({ params: { id: 'bad' }, query: {} }, createMockRes())).toThrow();

    const next = vi.fn();
    const createdRes = createMockRes();
    postReview(
      {
        params: { id: String(productId) },
        body: {
          authorName: 'Kate',
          title: 'Route test',
          content: 'Created through route unit test coverage path.',
          rating: 5
        }
      },
      createdRes,
      next
    );
    expect(createdRes.statusCode).toBe(201);
    expect(next).not.toHaveBeenCalled();

    const badNext = vi.fn();
    postReview(
      {
        params: { id: String(productId) },
        body: { authorName: 'x', title: 'x', content: 'short', rating: 10 }
      },
      createMockRes(),
      badNext
    );
    expect(badNext).toHaveBeenCalled();
  });

  it('covers review route success, not found and validation errors', () => {
    const { reviewId } = seedTestData();
    const postHelpful = getRouteHandler(reviewRouter, 'post', '/:id/helpful');

    const okRes = createMockRes();
    const okNext = vi.fn();
    postHelpful({ params: { id: String(reviewId) } }, okRes, okNext);
    expect(okRes.statusCode).toBe(200);
    expect(okNext).not.toHaveBeenCalled();

    const missingRes = createMockRes();
    postHelpful({ params: { id: '9999' } }, missingRes, vi.fn());
    expect(missingRes.statusCode).toBe(404);

    const validationNext = vi.fn();
    postHelpful({ params: { id: 'bad' } }, createMockRes(), validationNext);
    expect(validationNext).toHaveBeenCalled();
  });

  it('covers error middleware branches', () => {
    const zodResult = z.object({ id: z.number() }).safeParse({ id: 'x' });
    const zodErr = zodResult.success ? null : zodResult.error;
    expect(zodErr).toBeTruthy();

    const zodRes = createMockRes();
    errorHandler(zodErr, {} as any, zodRes as any, vi.fn());
    expect(zodRes.statusCode).toBe(400);

    const errRes = createMockRes();
    errorHandler(new Error('boom'), {} as any, errRes as any, vi.fn());
    expect(errRes.statusCode).toBe(400);
    expect((errRes.body as any).message).toBe('boom');

    const unknownRes = createMockRes();
    errorHandler({ nope: true }, {} as any, unknownRes as any, vi.fn());
    expect(unknownRes.statusCode).toBe(500);
  });

  it('covers cache and event broker infrastructure utilities', async () => {
    const cache = new InMemoryTtlCache<number>(5);
    expect(cache.get('a')).toBeUndefined();

    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);

    cache.delete('a');
    expect(cache.get('a')).toBeUndefined();

    cache.set('b', 2, 1);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(cache.get('b')).toBeUndefined();

    cache.set('c', 3);
    cache.clear();
    expect(cache.get('c')).toBeUndefined();

    const broker = new InMemoryEventBroker();
    const seen: string[] = [];

    broker.publish({ type: 'noop', payload: {}, occurredAt: new Date().toISOString() });

    const unsubscribe = broker.subscribe('event.x', (event) => {
      seen.push(event.type);
    });

    broker.publish({ type: 'event.x', payload: { a: 1 }, occurredAt: new Date().toISOString() });
    unsubscribe();
    broker.publish({ type: 'event.x', payload: { b: 2 }, occurredAt: new Date().toISOString() });
    expect(seen).toEqual(['event.x']);
  });

  it('covers seed script execution path', async () => {
    await import('../src/db/seed.ts');
    const row = db.prepare('SELECT COUNT(*) AS count FROM products').get() as { count: number };
    expect(row.count).toBeGreaterThan(0);
  });
});
