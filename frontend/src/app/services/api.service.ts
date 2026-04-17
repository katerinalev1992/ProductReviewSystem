import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ProductDetail, ProductSummary } from '../models/product.model';
import { CreateReviewRequest, Review } from '../models/review.model';
import { environment } from '../../environments/environment';

interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly graphqlUrl = `${environment.apiBaseUrl}/graphql`;

  private executeGraphql<T>(query: string, variables?: Record<string, unknown>): Observable<T> {
    return this.http.post<GraphqlResponse<T>>(this.graphqlUrl, { query, variables }).pipe(
      map((response) => {
        if (response.errors?.length) {
          throw new Error(response.errors[0].message);
        }

        if (!response.data) {
          throw new Error('GraphQL response did not include data');
        }

        return response.data;
      })
    );
  }

  listProducts(): Observable<ProductSummary[]> {
    const query = `
      query ListProducts {
        products {
          id
          name
          description
          price
          image_url
          created_at
          reviewCount
          averageRating
        }
      }
    `;

    return this.executeGraphql<{ products: ProductSummary[] }>(query).pipe(map((result) => result.products));
  }

  getProduct(productId: number): Observable<ProductDetail> {
    const query = `
      query GetProduct($id: Int!) {
        product(id: $id) {
          id
          name
          description
          price
          image_url
          created_at
          reviewCount
          averageRating
          ratingBreakdown {
            rating
            count
          }
        }
      }
    `;

    return this.executeGraphql<{ product: ProductDetail }>(query, { id: productId }).pipe(map((result) => result.product));
  }

  listReviews(productId: number, sort: string, rating?: string): Observable<Review[]> {
    const query = `
      query ListReviews($productId: Int!, $sort: ReviewSort!, $rating: Int) {
        reviews(productId: $productId, sort: $sort, rating: $rating) {
          id
          product_id
          author_name
          title
          content
          rating
          helpful_count
          created_at
        }
      }
    `;

    const ratingNumber = rating && rating !== 'all' ? Number(rating) : null;
    return this.executeGraphql<{ reviews: Review[] }>(query, {
      productId,
      sort,
      rating: ratingNumber
    }).pipe(map((result) => result.reviews));
  }

  createReview(productId: number, payload: CreateReviewRequest): Observable<Review> {
    const mutation = `
      mutation CreateReview($productId: Int!, $input: CreateReviewInput!) {
        createReview(productId: $productId, input: $input) {
          id
          product_id
          author_name
          title
          content
          rating
          helpful_count
          created_at
        }
      }
    `;

    return this.executeGraphql<{ createReview: Review }>(mutation, { productId, input: payload }).pipe(
      map((result) => result.createReview)
    );
  }

  markHelpful(reviewId: number): Observable<Review> {
    const mutation = `
      mutation MarkReviewHelpful($reviewId: Int!) {
        markReviewHelpful(reviewId: $reviewId) {
          id
          product_id
          author_name
          title
          content
          rating
          helpful_count
          created_at
        }
      }
    `;

    return this.executeGraphql<{ markReviewHelpful: Review }>(mutation, { reviewId }).pipe(
      map((result) => result.markReviewHelpful)
    );
  }
}
