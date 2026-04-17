import { Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-rating-stars',
  standalone: true,
  imports: [NgFor],
  templateUrl: './rating-stars.component.html'
})
export class RatingStarsComponent {
  @Input({ required: true }) rating = 0;
  stars = Array.from({ length: 5 });

  get fullStars(): number {
    return Math.round(this.rating);
  }
}
