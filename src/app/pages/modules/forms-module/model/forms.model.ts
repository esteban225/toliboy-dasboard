export interface Forms {
    id?: number;
    name: string;
    code: string;
    description: string;
    version: string;
    created_by: number;
    is_active: boolean;
    display_order: number;
    created_at?: string;
    updated_at?: string;
}

export interface FormsFiles {
    id?: number;
    form_id?: number;
    label: string;
    field_code: string;
    type: string;
    required: boolean;
    options: string[];
    validation_rules: string[];
    field_order: number;
    is_active: boolean;
}

// Form Response Value - Valor individual de un campo
export interface FormResponseValue {
    id?: number;
    form_response_id?: number;
    form_field_id: number;
    field_code?: string;
    field_label?: string;
    value: string | number | boolean | null;
    field_type?: string;
}

// Form Response - Respuesta completa de un formulario
export interface FormResponse {
    id?: number;
    form_id: number;
    user_id?: number;
    batch_id?: number | null;
    status: FormResponseStatus;
    submitted_at?: string | null;
    reviewed_at?: string | null;
    reviewed_by?: number | null;
    review_notes?: string | null;
    created_at?: string;
    updated_at?: string;
    // Relaciones
    form?: Forms;
    user?: {
        id: number;
        name: string;
        email?: string;
    };
    batch?: {
        id: number;
        code?: string;
        name?: string;
    };
    values?: FormResponseValue[];
    reviewer?: {
        id: number;
        name: string;
    };
}

// Estados posibles de una respuesta
export type FormResponseStatus = 'pending' | 'in_progress' | 'completed' | 'approved' | 'rejected';

// Filtros para listar respuestas
export interface FormResponseFilters {
    form_id?: number;
    user_id?: number;
    batch_id?: number;
    status?: FormResponseStatus;
    page?: number;
    per_page?: number;
}

// Payload para crear una respuesta
export interface CreateFormResponsePayload {
    form_id: number;
    batch_id?: number | null;
    status?: 'pending' | 'in_progress' | 'completed';
    values: { field_id: number; value: any }[];
}

// Payload para actualizar una respuesta
export interface UpdateFormResponsePayload {
    batch_id?: number | null;
    values: { field_id: number; value: any }[];
    status?: 'pending' | 'in_progress' | 'completed';
}

// Payload para revisar una respuesta
export interface ReviewFormResponsePayload {
    status: 'approved' | 'rejected';
    review_notes?: string;
}

// Meta de paginación
export interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

// Respuesta paginada genérica
export interface PaginatedResponse<T> {
    success: boolean;
    message: string;
    data: T[];
    meta: PaginationMeta;
}
