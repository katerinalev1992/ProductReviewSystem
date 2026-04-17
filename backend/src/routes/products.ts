import { Router } from 'express';
import { z } from 'zod';
import { getProductById, listProducts } from '../services/product-service.js';
import { createReview, listReviews } from '../services/review-service.js';

export const productRouter = Router();

productRouter.get('/', (_req, res) => {
  res.json(listProducts());
});

productRouter.get('/:id', (req, res) => {
  const productId = Number(req.params.id);
  const product = getProductById(productId);

  if (!product) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }

  res.json(product);
});

productRouter.get('/:id/reviews', (req, res) => {
  const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
  const querySchema = z.object({
    sort: z.enum(['newest', 'highest', 'lowest', 'helpful']).optional().default('newest'),
    rating: z.coerce.number().int().min(1).max(5).optional()
  });

  const { id } = paramsSchema.parse(req.params);
  const { sort, rating } = querySchema.parse(req.query);
  res.json(listReviews(id, sort, rating));
});

productRouter.post('/:id/reviews', (req, res, next) => {
  try {
    const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
    const bodySchema = z.object({
      authorName: z.string().trim().min(2).max(80),
      title: z.string().trim().min(3).max(120),
      content: z.string().trim().min(10).max(2000),
      rating: z.number().int().min(1).max(5)
    });

    const { id } = paramsSchema.parse(req.params);
    const body = bodySchema.parse(req.body);
    const review = createReview({ productId: id, ...body });
    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
});
