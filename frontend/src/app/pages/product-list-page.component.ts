import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';
import { ProductSummary } from '../models/product.model';
import { RatingStarsComponent } from '../components/rating-stars.component';

@Component({
  selector: 'app-product-list-page',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink, CurrencyPipe, RatingStarsComponent],
  templateUrl: './product-list-page.component.html'
})
export class ProductListPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  products: ProductSummary[] = [];

  ngOnInit(): void {
    this.api.listProducts().subscribe((products) => {
      this.products = products;
    });
  }
}
