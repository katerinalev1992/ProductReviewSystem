import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Review } from '../models/review.model';
import { RatingStarsComponent } from './rating-stars.component';

@Component({
  selector: 'app-review-list',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe, RatingStarsComponent],
  templateUrl: './review-list.component.html'
})
export class ReviewListComponent {
  @Input() reviews: Review[] = [];
  @Output() helpfulClicked = new EventEmitter<number>();
}
