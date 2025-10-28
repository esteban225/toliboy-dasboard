export interface ProductionForm {
  category: string;
  id: number;
  name: string;
  code: string;
  version?: string;
  created_by?: number;
  is_active?: boolean;
  form_fields?: FormField[];
}

export interface FormField {
  id: number;
  label: string;
  field_code: string;
  type: string;
  required: boolean;
  field_order: number;
  validation_rules?: any;
}
