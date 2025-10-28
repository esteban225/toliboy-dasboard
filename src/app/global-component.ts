export const GlobalComponent = {
  // 🌐 URL base de tu API
  API_URL: 'http://3.85.24.170/api/',

  // 🧾 Token para endpoints protegidos
  headerToken: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  },

  // 🔐 Endpoints de autenticación
  AUTH_API: 'http://3.85.24.170/api/',
  LOGIN_API: 'http://3.85.24.170/api/',
  REGISTER_API: 'http://3.85.24.170/api/',

  // Si después tienes más módulos, puedes agregarlos aquí
  PRODUCTION_API: 'http://3.85.24.170/api/forms'
};
