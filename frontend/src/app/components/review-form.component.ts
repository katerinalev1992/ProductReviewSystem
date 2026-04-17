import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { CreateReviewRequest } from '../models/review.model';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, NgFor],
  templateUrl: './review-form.component.html'
})
export class ReviewFormComponent {
  private readonly fb = inject(FormBuilder);

  @Input() loading = false;
  @Output() reviewCreated = new EventEmitter<CreateReviewRequest>();

  submitted = false;
  ratings = [5, 4, 3, 2, 1];

  form = this.fb.nonNullable.group({
    authorName: ['', [Validators.required, Validators.minLength(2)]],
    title: ['', [Validators.required, Validators.minLength(3)]],
    content: ['', [Validators.required, Validators.minLength(10)]],
    rating: [5, [Validators.required]]
  });

  submit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      return;
    }

    this.reviewCreated.emit(this.form.getRawValue());
    this.form.reset({ authorName: '', title: '', content: '', rating: 5 });
    this.submitted = false;
  }
}
