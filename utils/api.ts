// API Base URL - can be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Types
export interface Product {
  id: string;
  productId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingPeriod?: string;
  trialPeriodDays?: number;
  features: string[];
  targetRole: 'buyer' | 'seller' | 'agent' | 'all';
  displayOrder: number;
  badge?: string;
  badgeColor?: string;
  highlighted: boolean;
  cardStyle?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
  };
  store?: {
    google?: string;
    apple?: string;
    stripe?: string;
  };
}

export interface ProductsResponse {
  success: boolean;
  count: number;
  products: Product[];
}

export interface ProductResponse {
  success: boolean;
  product: Product;
}

/**
 * Fetch all products, optionally filtered by role
 */
export async function fetchProducts(role?: 'buyer' | 'seller' | 'agent'): Promise<Product[]> {
  try {
    const url = role
      ? `${API_BASE_URL}/products?role=${role}`
      : `${API_BASE_URL}/products`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    const data: ProductsResponse = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch products');
    }

    return data.products;
  } catch (error) {
    console.error('Error fetching products:', error);
    // Return empty array as fallback
    return [];
  }
}

/**
 * Fetch a single product by productId
 */
export async function fetchProduct(productId: string): Promise<Product | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${productId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch product: ${response.statusText}`);
    }

    const data: ProductResponse = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch product');
    }

    return data.product;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

/**
 * Get products for sellers (private sellers and agents)
 */
export async function fetchSellerProducts(): Promise<Product[]> {
  const products = await fetchProducts('seller');
  return products;
}

/**
 * Get products for buyers
 */
export async function fetchBuyerProducts(): Promise<Product[]> {
  const products = await fetchProducts('buyer');
  return products;
}
