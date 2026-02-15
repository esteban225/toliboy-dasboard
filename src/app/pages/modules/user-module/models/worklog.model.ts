export interface Worklog {
  id?: number;
  user_id: number;
  date?: string;
  start_time?: string;
  end_time?: string;
  total_hours?: number;
  overtime_hours?: number;
  batch_id?: number | null;
  task_description?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface WorklogFilters {
  user_id?: number;
  date?: string;
  start_time?: string;
  end_time?: string;
  task_description?: string;
  batch_id?: number;
  page?: number;
  per_page?: number;
}

export interface ApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
