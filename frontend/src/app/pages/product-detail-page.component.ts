import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';
import { ProductDetail } from '../models/product.model';
import { CreateReviewRequest, Review } from '../models/review.model';
import { RatingStarsComponent } from '../components/rating-stars.component';
import { ReviewFormComponent } from '../components/review-form.component';
import { ReviewListComponent } from '../components/review-list.component';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink, CurrencyPipe, DecimalPipe, RatingStarsComponent, ReviewFormComponent, ReviewListComponent],
  templateUrl: './product-detail-page.component.html'
})
export class ProductDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);

  product: ProductDetail | null = null;
  reviews: Review[] = [];
  sort = 'newest';
  ratingFilter = 'all';
  submitting = false;
  productId = 0;

  ngOnInit(): void {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProduct();
    this.loadReviews();
  }

  loadProduct(): void {
    this.api.getProduct(this.productId).subscribe((product) => {
      this.product = product;
    });
  }

  loadReviews(): void {
    this.api.listReviews(this.productId, this.sort, this.ratingFilter).subscribe((reviews) => {
      this.reviews = reviews;
    });
  }

  onSortChange(sort: string): void {
    this.sort = sort;
    this.loadReviews();
  }

  onRatingChange(rating: string): void {
    this.ratingFilter = rating;
    this.loadReviews();
  }

  createReview(payload: CreateReviewRequest): void {
    this.submitting = true;
    this.api.createReview(this.productId, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.loadProduct();
        this.loadReviews();
      },
      error: () => {
        this.submitting = false;
      }
    });
  }

  markHelpful(reviewId: number): void {
    this.api.markHelpful(reviewId).subscribe(() => {
      this.loadReviews();
      this.loadProduct();
    });
  }
}
