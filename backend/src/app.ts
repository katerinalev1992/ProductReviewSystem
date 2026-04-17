import cors from 'cors';
import express from 'express';
import { createHandler } from 'graphql-http/lib/use/express';
import { initializeDatabase } from './db/client.js';
import { rootValue, schema } from './graphql/schema.js';
import { appContext } from './infrastructure/app-context.js';
import { errorHandler } from './middleware/error-handler.js';
import { productRouter } from './routes/products.js';
import { reviewRouter } from './routes/reviews.js';

export function createApp() {
  initializeDatabase();

  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.all(
    '/graphql',
    createHandler({
      schema,
      rootValue
    })
  );

  app.use('/api/products', productRouter);
  app.use('/api/reviews', reviewRouter);
  app.use(errorHandler);

  appContext.eventBroker.subscribe('review.created', (event) => {
    console.log('[event]', event.type, event.payload);
  });

  appContext.eventBroker.subscribe('review.helpful_marked', (event) => {
    console.log('[event]', event.type, event.payload);
  });

  return app;
}
