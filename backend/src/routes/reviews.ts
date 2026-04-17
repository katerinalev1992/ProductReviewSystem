import { Router } from 'express';
import { z } from 'zod';
import { markReviewHelpful } from '../services/review-service.js';

export const reviewRouter = Router();

reviewRouter.post('/:id/helpful', (req, res, next) => {
  try {
    const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
    const { id } = paramsSchema.parse(req.params);
    const review = markReviewHelpful(id);

    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    res.json(review);
  } catch (error) {
    next(error);
  }
});
