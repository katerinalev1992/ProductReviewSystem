export interface Review {
  id: number;
  product_id: number;
  author_name: string;
  title: string;
  content: string;
  rating: number;
  helpful_count: number;
  created_at: string;
}

export interface CreateReviewRequest {
  authorName: string;
  title: string;
  content: string;
  rating: number;
}
