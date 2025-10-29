export interface Forms{
    id?: number;
    name: string;
    code: string;
    description: string;
    version: string;
    created_by: number;
    is_active: boolean;
    display_order: number;
}

export interface FormsFiles{
    id: number;
    label: string;
    field_code: string;
    type: string;
    required: boolean;
    options: string[];
    validation_rules: string[];
    field_order: number;
    is_active: boolean;
}


export interface FormsResponse{
    id: number;
    form_id: number;
    batch_id?: number;
    values: string[];
}
