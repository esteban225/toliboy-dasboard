export interface Batch {
  id?: number;
  name?: string;
  code?: string;
  product_id?: number;
  product_name?: string;
  start_date?: string;
  expected_end_date?: string;
  actual_end_date?: string | null;
  status?: string; // 'planned', 'in_progress', 'completed', etc.
  quantity?: number;
  defect_quantity?: number;
  notes?: string;
  created_by?: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
