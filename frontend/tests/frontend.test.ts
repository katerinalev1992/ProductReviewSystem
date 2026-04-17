import '@angular/compiler';
import { HttpClient } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AppComponent } from '../src/app/app.component';
import { routes } from '../src/app/app.routes';
import { RatingStarsComponent } from '../src/app/components/rating-stars.component';
import { ReviewFormComponent } from '../src/app/components/review-form.component';
import { ReviewListComponent } from '../src/app/components/review-list.component';
import { ProductDetailPageComponent } from '../src/app/pages/product-detail-page.component';
import { ProductListPageComponent } from '../src/app/pages/product-list-page.component';
import { ApiService } from '../src/app/services/api.service';
import { environment } from '../src/environments/environment';

function instantiateWithInjector<T>(Ctor: new () => T, providers: Array<{ provide: any; useValue: any }>): T {
  const injector = Injector.create({ providers });
  return runInInjectionContext(injector, () => new Ctor());
}

describe('Frontend unit coverage suite', () => {
  it('covers route definitions', () => {
    expect(routes[0].path).toBe('');
    expect(routes[1].path).toBe('products/:id');
    expect(routes[2].redirectTo).toBe('');
  });

  it('covers simple app/rating/review-list component logic', () => {
    const app = new AppComponent();
    expect(app).toBeTruthy();

    const stars = new RatingStarsComponent();
    stars.rating = 3.4;
    expect(stars.fullStars).toBe(3);

    const list = new ReviewListComponent();
    const listener = vi.fn();
    list.helpfulClicked.subscribe(listener);
    list.helpfulClicked.emit(10);
    expect(listener).toHaveBeenCalledWith(10);
  });

  it('covers review form submit invalid and valid branches', () => {
    const form = instantiateWithInjector(ReviewFormComponent, [{ provide: FormBuilder, useValue: new FormBuilder() }]);

    const emitSpy = vi.spyOn(form.reviewCreated, 'emit');
    form.submit();
    expect(emitSpy).not.toHaveBeenCalled();
    expect(form.submitted).toBe(true);

    form.form.setValue({
      authorName: 'Alice',
      title: 'Great item',
      content: 'This is a valid and sufficiently long review body.',
      rating: 5
    });
    form.submit();
    expect(emitSpy).toHaveBeenCalledOnce();
    expect(form.submitted).toBe(false);
    expect(form.form.getRawValue().rating).toBe(5);
  });

  it('covers ApiService graphql success and error branches', async () => {
    const httpPost = vi.fn();
    const httpClientMock = { post: httpPost } as unknown as HttpClient;
    const api = instantiateWithInjector(ApiService, [{ provide: HttpClient, useValue: httpClientMock }]);

    const product = {
      id: 1,
      name: 'P',
      description: 'D',
      price: 1,
      image_url: null,
      created_at: 'now',
      reviewCount: 0,
      averageRating: null,
      ratingBreakdown: []
    };
    const review = {
      id: 1,
      product_id: 1,
      author_name: 'A',
      title: 'T',
      content: 'C',
      rating: 5,
      helpful_count: 0,
      created_at: 'now'
    };

    httpPost.mockReturnValueOnce(of({ data: { products: [product] } }));
    const products = await firstValueFrom(api.listProducts());
    expect(products).toHaveLength(1);
    expect(httpPost.mock.calls[0][0]).toBe(`${environment.apiBaseUrl}/graphql`);

    httpPost.mockReturnValueOnce(of({ data: { product } }));
    const detail = await firstValueFrom(api.getProduct(1));
    expect(detail.id).toBe(1);

    httpPost.mockReturnValueOnce(of({ data: { reviews: [review] } }));
    const reviews = await firstValueFrom(api.listReviews(1, 'newest', 'all'));
    expect(reviews[0].id).toBe(1);

    httpPost.mockReturnValueOnce(of({ data: { createReview: review } }));
    const created = await firstValueFrom(
      api.createReview(1, {
        authorName: 'A',
        title: 'T',
        content: '1234567890',
        rating: 5
      })
    );
    expect(created.product_id).toBe(1);

    httpPost.mockReturnValueOnce(of({ data: { markReviewHelpful: { ...review, helpful_count: 1 } } }));
    const helpful = await firstValueFrom(api.markHelpful(1));
    expect(helpful.helpful_count).toBe(1);

    httpPost.mockReturnValueOnce(of({ errors: [{ message: 'boom' }] }));
    await expect(firstValueFrom(api.listProducts())).rejects.toThrow('boom');

    httpPost.mockReturnValueOnce(of({}));
    await expect(firstValueFrom(api.listProducts())).rejects.toThrow('GraphQL response did not include data');
  });

  it('covers product list page ngOnInit data load', () => {
    const apiMock = {
      listProducts: vi.fn().mockReturnValue(
        of([
          {
            id: 1,
            name: 'P',
            description: 'D',
            price: 1,
            image_url: null,
            created_at: 'now',
            reviewCount: 0,
            averageRating: null
          }
        ])
      )
    };
    const page = instantiateWithInjector(ProductListPageComponent, [{ provide: ApiService, useValue: apiMock }]);

    page.ngOnInit();
    expect(apiMock.listProducts).toHaveBeenCalledOnce();
    expect(page.products).toHaveLength(1);
  });

  it('covers product detail page lifecycle and interaction branches', () => {
    const apiMock = {
      getProduct: vi.fn().mockReturnValue(
        of({
          id: 1,
          name: 'P',
          description: 'D',
          price: 1,
          image_url: null,
          created_at: 'now',
          reviewCount: 0,
          averageRating: null,
          ratingBreakdown: []
        })
      ),
      listReviews: vi.fn().mockReturnValue(of([])),
      createReview: vi.fn().mockReturnValue(of({ id: 1 })),
      markHelpful: vi.fn().mockReturnValue(of({ id: 1 }))
    };
    const routeMock = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue('1')
        }
      }
    };

    const page = instantiateWithInjector(ProductDetailPageComponent, [
      { provide: ApiService, useValue: apiMock },
      { provide: ActivatedRoute, useValue: routeMock }
    ]);

    page.ngOnInit();
    expect(page.productId).toBe(1);
    expect(apiMock.getProduct).toHaveBeenCalled();
    expect(apiMock.listReviews).toHaveBeenCalled();

    const loadReviewsSpy = vi.spyOn(page, 'loadReviews');
    page.onSortChange('highest');
    expect(page.sort).toBe('highest');
    expect(loadReviewsSpy).toHaveBeenCalled();

    page.onRatingChange('5');
    expect(page.ratingFilter).toBe('5');
    expect(loadReviewsSpy).toHaveBeenCalledTimes(2);

    const loadProductSpy = vi.spyOn(page, 'loadProduct');
    const loadReviewsSpy2 = vi.spyOn(page, 'loadReviews');
    page.createReview({
      authorName: 'A',
      title: 'T',
      content: '1234567890',
      rating: 5
    });
    expect(page.submitting).toBe(false);
    expect(loadProductSpy).toHaveBeenCalled();
    expect(loadReviewsSpy2).toHaveBeenCalled();

    apiMock.createReview.mockReturnValueOnce(throwError(() => new Error('fail')));
    page.createReview({
      authorName: 'A',
      title: 'T',
      content: '1234567890',
      rating: 5
    });
    expect(page.submitting).toBe(false);

    page.markHelpful(1);
    expect(apiMock.markHelpful).toHaveBeenCalledWith(1);
  });
});
