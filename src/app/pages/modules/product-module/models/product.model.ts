export interface Product {
  id?: number;
  name?: string;
  code?: string;
  description?: string;
  category?: string;
  specifications?: string[];
  unit_price?: number;
  is_active?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
