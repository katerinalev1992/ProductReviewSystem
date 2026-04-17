export interface ProductSummary {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  created_at: string;
  reviewCount: number;
  averageRating: number | null;
}

export interface RatingBreakdown {
  rating: number;
  count: number;
}

export interface ProductDetail extends ProductSummary {
  ratingBreakdown: RatingBreakdown[];
}
