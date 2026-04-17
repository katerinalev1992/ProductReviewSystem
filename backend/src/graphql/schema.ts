import { buildSchema, GraphQLError } from 'graphql';
import { getProductById, listProducts } from '../services/product-service.js';
import { createReview, listReviews, markReviewHelpful } from '../services/review-service.js';

export const schema = buildSchema(`
  type ProductSummary {
    id: Int!
    name: String!
    description: String!
    price: Float!
    image_url: String
    created_at: String!
    reviewCount: Int!
    averageRating: Float
  }

  type RatingBreakdown {
    rating: Int!
    count: Int!
  }

  type ProductDetail {
    id: Int!
    name: String!
    description: String!
    price: Float!
    image_url: String
    created_at: String!
    reviewCount: Int!
    averageRating: Float
    ratingBreakdown: [RatingBreakdown!]!
  }

  type Review {
    id: Int!
    product_id: Int!
    author_name: String!
    title: String!
    content: String!
    rating: Int!
    helpful_count: Int!
    created_at: String!
  }

  enum ReviewSort {
    newest
    highest
    lowest
    helpful
  }

  input CreateReviewInput {
    authorName: String!
    title: String!
    content: String!
    rating: Int!
  }

  type Query {
    products: [ProductSummary!]!
    product(id: Int!): ProductDetail
    reviews(productId: Int!, sort: ReviewSort = newest, rating: Int): [Review!]!
  }

  type Mutation {
    createReview(productId: Int!, input: CreateReviewInput!): Review!
    markReviewHelpful(reviewId: Int!): Review!
  }
`);

interface CreateReviewArgs {
  productId: number;
  input: {
    authorName: string;
    title: string;
    content: string;
    rating: number;
  };
}

interface MarkReviewHelpfulArgs {
  reviewId: number;
}

interface ReviewsArgs {
  productId: number;
  sort?: 'newest' | 'highest' | 'lowest' | 'helpful';
  rating?: number;
}

export const rootValue = {
  products: () => listProducts(),
  product: ({ id }: { id: number }) => getProductById(id),
  reviews: ({ productId, sort = 'newest', rating }: ReviewsArgs) => listReviews(productId, sort, rating),
  createReview: ({ productId, input }: CreateReviewArgs) => {
    try {
      return createReview({ productId, ...input });
    } catch (error) {
      throw new GraphQLError(error instanceof Error ? error.message : 'Failed to create review');
    }
  },
  markReviewHelpful: ({ reviewId }: MarkReviewHelpfulArgs) => {
    const review = markReviewHelpful(reviewId);
    if (!review) {
      throw new GraphQLError('Review not found');
    }
    return review;
  }
};
