export type ArticleCategory = 'market' | 'investment' | 'regulation' | 'development' | 'tourism' | 'guide' | 'lifestyle';
export type ArticleStatus = 'draft' | 'published';

export interface ArticleAuthor {
  _id: string;
  name: string;
  email?: string;
}

export interface ArticleListItem {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: ArticleCategory;
  tags: string[];
  country?: string;
  countryCode?: string;
  coverImageUrl?: string;
  coverImageFit?: 'cover' | 'contain' | 'fill';
  author: ArticleAuthor;
  publishedAt?: string;
  readTime?: number;
  isFeatured: boolean;
  viewCount: number;
}

export interface ArticleDetail extends ArticleListItem {
  content: string;
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ArticlesResponse {
  articles: ArticleListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ArticleFilters {
  category?: ArticleCategory;
  country?: string;
  tag?: string;
  featured?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}
