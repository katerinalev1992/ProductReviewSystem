export interface ProductRow {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  created_at: string;
}

export interface ReviewRow {
  id: number;
  product_id: number;
  author_name: string;
  title: string;
  content: string;
  rating: number;
  helpful_count: number;
  created_at: string;
}

export interface ProductSummary extends ProductRow {
  reviewCount: number;
  averageRating: number | null;
}

export interface ReviewSummary extends ReviewRow {}

export interface RatingBreakdown {
  rating: number;
  count: number;
}

export interface ProductDetail extends ProductSummary {
  ratingBreakdown: RatingBreakdown[];
}
