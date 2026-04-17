# Product Review System

A full-stack product reviews application inspired by marketplaces like Amazon or Alza.

This repository contains:
- **backend/** – Node.js + Express + TypeScript API (REST + GraphQL) backed by SQLite
- **frontend/** – Angular standalone SPA for browsing products and managing reviews

## Functional scope

### Implemented
- List products
- View product details
- List reviews for a product
- Filter reviews by rating
- Sort reviews by newest / highest / lowest / most helpful
- Create review
- Vote a review as helpful
- Compute aggregated rating stats per product
- Seeded demo data
- Angular UI with forms, cards, rating stars, summary widgets, and review list

### Not implemented but prepared for
- authentication / author attribution from real users
- review moderation queue
- pagination and full-text search
- image uploads
- verified purchase flag from order service
- event-driven notifications / denormalized read models

## Architecture summary

### Backend
- **Express** for REST API transport
- **GraphQL** via `graphql-http` on `/graphql`
- **TypeScript** for safety and maintainability
- **SQLite** via `better-sqlite3` for zero-config persistence
- **Zod** for request validation
- **In-memory TTL cache** for product read models
- **In-memory event broker** for review domain events

The backend follows a lightweight layered structure:
- `routes` – HTTP endpoints
- `services` – business logic
- `db` – database init and seed
- `types` – shared backend types

### Frontend
- **Angular standalone components**
- **Reactive forms**
- **HttpClient** calling GraphQL operations against `/graphql`

## Thought process behind implementation

- Build an end-to-end vertical slice first (list products -> product detail -> reviews) before adding optional features, so the base user flow is always demonstrable.
- Keep boundaries clear between transport (`routes`/GraphQL), business logic (`services`), and persistence (`db`) to make future swaps (for example SQLite -> PostgreSQL) low-risk.
- Use pragmatic infrastructure defaults (SQLite, in-memory cache, in-memory broker) to optimize for local setup speed and assignment reviewability.
- Favor explicit validation and typed contracts to reduce runtime ambiguity and make frontend/backend integration predictable.

## Design decisions and trade-offs

### SQLite over PostgreSQL
SQLite makes the project extremely easy to run and evaluate locally. For production or horizontal scaling, I would switch to PostgreSQL and keep the service interfaces similar.

### Hybrid REST + GraphQL
REST endpoints remain for simple integration and frontend compatibility. GraphQL is added for flexible query shapes and reducing over-fetching for product detail/review-heavy screens.

### In-memory infrastructure over external Redis/Broker
For assignment simplicity, caching and messaging are implemented in-process. In production, this can be swapped for Redis (cache) and RabbitMQ/Kafka (broker) without changing service-level business logic.

## API overview

### Products
- `GET /api/products`
- `GET /api/products/:id`

### Reviews
- `GET /api/products/:id/reviews?sort=newest&rating=5`
- `POST /api/products/:id/reviews`
- `POST /api/reviews/:id/helpful`

### Health
- `GET /health`

### GraphQL
- `POST /graphql`

Example query:
```graphql
query ProductDetail($id: Int!) {
  product(id: $id) {
    id
    name
    averageRating
    ratingBreakdown {
      rating
      count
    }
  }
}
```

## Quick start

### Prerequisites
- Node.js `22` (see `.nvmrc`)
- Yarn `1.22.x`

### 1) Backend

```bash
cd backend
yarn install
yarn seed
yarn dev
```

Backend runs on `http://localhost:3000`

### 2) Frontend

```bash
cd frontend
yarn install
yarn start
```

Frontend runs on `http://localhost:4200`

## Example review payload

```json
{
  "authorName": "Jane Doe",
  "title": "Excellent keyboard for daily work",
  "content": "Solid typing experience, nice build quality and quiet enough for office use.",
  "rating": 5
}
```

## Data model

### products
- id
- name
- description
- price
- image_url
- created_at

### reviews
- id
- product_id
- author_name
- title
- content
- rating
- helpful_count
- created_at

## Future improvements
- add users and verified-purchase logic
- replace in-memory cache with Redis
- replace in-memory event broker with RabbitMQ/Kafka
- implement pagination and cursor-based APIs
- containerize with Docker Compose
- expand end-to-end browser tests

## Developer scripts

### Backend
- `yarn dev`
- `yarn seed`
- `yarn typecheck`
- `yarn lint`
- `yarn test`
- `yarn coverage`
- `yarn build`

### Frontend
- `yarn start`
- `yarn typecheck`
- `yarn lint`
- `yarn test`
- `yarn coverage`
- `yarn build`

## Test coverage

- Backend tests are implemented with Vitest and coverage thresholds enforced at **85%** (lines/statements/functions/branches).
- Frontend tests are implemented with Vitest and coverage thresholds enforced at **85%** (lines/statements/functions/branches).
- Current coverage runs are above threshold for both apps.

## Repository walkthrough

```text
product-review-system/
├── backend/
│   ├── src/
│   │   ├── db/                    # SQLite client and seed script
│   │   ├── graphql/               # GraphQL schema and resolvers
│   │   ├── infrastructure/         # In-memory cache and event broker
│   │   ├── middleware/             # Express error handling
│   │   ├── routes/                 # REST endpoints (/products, /reviews)
│   │   ├── services/               # Business logic layer
│   │   ├── types/                  # Shared domain types
│   │   ├── app.ts                  # App factory wiring routes + context
│   │   └── index.ts                # Runtime entrypoint
│   ├── tests/backend.test.ts       # Backend integration tests (Vitest + Supertest)
│   ├── data/reviews.db             # Local SQLite database file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/         # Reusable UI blocks (form/list/stars)
│   │   │   ├── models/             # Product/review TypeScript models
│   │   │   ├── pages/              # Product list and detail pages
│   │   │   ├── services/           # API client service
│   │   │   ├── app.component.*     # Root component
│   │   │   └── app.routes.ts       # Angular router configuration
│   │   ├── environments/           # API base URL config
│   │   ├── main.ts
│   │   └── styles.css
│   ├── tests/frontend.test.ts      # Frontend tests (Vitest)
│   └── package.json
├── .github/workflows/ci.yml        # CI checks for backend + frontend
├── .oca/custom_code_review_guidelines.txt
└── README.md
```
