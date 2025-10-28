export interface User {
  id?: string;
  name?: string;
  email?: string;
  position?: string;
  is_active?: number;
  last_login?: string;
  // cualquier otro campo que ya uses...
  role?: 'DEV' | 'USER';
  // campos añadidos para compatibilidad con las respuestas del backend
  token?: string; // token cuando la API lo retorne en root
}
/*
{
  "success": true,
  "message": "Ingreso exitoso",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0L2FwaS9sb2dpbiIsImlhdCI6MTc2MTE3MTI2MiwiZXhwIjoxNzYxMTc0ODYyLCJuYmYiOjE3NjExNzEyNjIsImp0aSI6IjJLSWxycEt4Mkl0c2pDamQiLCJzdWIiOiIxIiwicHJ2IjoiMjNiZDVjODk0OWY2MDBhZGIzOWU3MDFjNDAwODcyZGI3YTU5NzZmNyIsInJvbGUiOiJERVYifQ.Y6PIhAJPF6K2aS9wvYxZyEQQ_dRCu5VOeiAIsv_w6zA",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "name": "Developer",
    "email": "desarrollo@toliboy.com",
    "position": null,
    "is_active": 1,
    "last_login": "2025-10-22T22:10:22.000000Z",
    "role": "DEV"
  }
}*/