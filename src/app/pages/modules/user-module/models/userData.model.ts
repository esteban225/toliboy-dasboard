/// Modelo para datos de usuario
export interface UserData {
    id?: number;
    name: string;
    email: string;
    password?: string | '';
    role_id: number;
    position?: string;
    is_active: boolean;
    last_login: string | Date;
    // Otros campos relevantes
}

/// Modelo para roles de usuario
export interface UserRole {
    id: number;
    name: string;
    description: string;
    permissions: string[];
}


/// Modelo para datos adicionales del usuario
export interface DataUser {
    id?: number;
    user_id: number;
    num_phone: string;
    num_phone_alt: string;
    identification_type: string;
    address: string;
    emergency_contact: string;
    emergency_phone: string;
}

/*
{
  "user_id": 0,
  "num_phone": "string",
  "num_phone_alt": "string",
  "num_identification": "string",
  "identification_type": "string",
  "address": "string",
  "emergency_contact": "string",
  "emergency_phone": "string"
}
*/



/// Modelo para horas trabajadas asociado a un usuario
export interface Worklog {
    id: number;
    userId: number;
    description: string;
    hours: number;
    date: Date;
    // Otros campos relevantes
}