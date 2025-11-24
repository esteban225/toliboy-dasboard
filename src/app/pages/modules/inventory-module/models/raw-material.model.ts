export interface RawMaterial {
  id?: number;
  name?: string;
  code?: string;
  description?: string;
  unit_of_measure?: string;
  stock: number;
  min_stock: number;
  is_active?: boolean;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
