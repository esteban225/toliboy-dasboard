export const GlobalComponent = {
  // 🌐 URL base de tu API
  API_URL: 'https://test.apitoliboy.lat/api/',

  // 🧾 Token para endpoints protegidos
  headerToken: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  },

  // 🔐 Endpoints de autenticación
  AUTH_API: 'https://test.apitoliboy.lat/api/',
  LOGIN_API: 'https://test.apitoliboy.lat/api/',
  REGISTER_API: 'https://test.apitoliboy.lat/api/',

  // Si después tienes más módulos, puedes agregarlos aquí
  PRODUCTION_API: 'https://test.apitoliboy.lat/api/forms'
};
