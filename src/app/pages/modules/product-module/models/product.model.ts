export interface Product {
  id?: number;
  name?: string;
  code?: string;
  description?: string;
  category?: string;
  /**
   * Especificaciones del producto que incluyen las materias primas requeridas.
   * 
   * Formato para liberación de materias primas:
   * - "CODIGO_MATERIA_PRIMA:cantidad_por_unidad"
   * - Ejemplo: ["RM001:0.5", "RM002:0.25", "HARINA:1.5"]
   * 
   * Donde:
   * - CODIGO_MATERIA_PRIMA: Código de la materia prima en raw_materials
   * - cantidad_por_unidad: Cantidad requerida de esa materia prima por cada unidad del producto
   * 
   * Al crear un lote de N unidades, se calcularán las cantidades totales:
   * cantidad_total = cantidad_por_unidad * N unidades del lote
   */
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
