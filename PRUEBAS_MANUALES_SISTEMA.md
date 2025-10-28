# 🧪 Pruebas Manuales - Sistema de Logout y Roles

## 🔍 **Pruebas de Logout:**

### ✅ **Prueba 1: Logout Básico**
1. Hacer login con cualquier usuario
2. Una vez en el dashboard, abrir DevTools (F12) → pestaña Console
3. Hacer clic en "Cerrar sesión" en el menú del avatar (topbar)
4. **Verificar:**
   - Console muestra: "Logout process completed successfully"
   - Console muestra: "Redirecting to login after logout..."
   - Redirige automáticamente a `/auth/signin`
   - LocalStorage vacío (DevTools → Application → Local Storage)

### ✅ **Prueba 2: Logout con Error de Backend**
1. Desconectar internet o cambiar API endpoint temporalmente
2. Hacer logout
3. **Verificar:**
   - Aún limpia localStorage y redirige (funciona offline)

---

## 🎭 **Pruebas de Roles:**

### ✅ **Prueba 3: Login con DEV (Desarrollador)**
```json
{
  "user": { "role": "DEV", "name": "Developer" }
}
```
- **Debe redirigir a:** `/` (Dashboard)
- **Menús visibles:** Dashboard, Apps completo, Admin
- **Acceso a:** Todas las secciones

### ✅ **Prueba 4: Login con GG (Gerente General)**
```json  
{
  "user": { "role": "GG", "name": "Gerente" }
}
```
- **Debe redirigir a:** `/` (Dashboard)  
- **Menús visibles:** Dashboard, Apps principales (Calendar, Email, Kanban)
- **Sin acceso a:** Admin, algunas apps

### ✅ **Prueba 5: Login con OP (Operador)**
```json
{
  "user": { "role": "OP", "name": "Operador" }  
}
```
- **Debe redirigir a:** `/apps/kanbanboard` (Kanban)
- **Menús visibles:** Solo Kanban y TODO
- **Sin acceso a:** Dashboard, Admin, otras apps

### ✅ **Prueba 6: Intento de Acceso No Autorizado**
1. Login como `OP` (operador)
2. Intentar acceder manualmente a `/admin/users` en la URL
3. **Verificar:**
   - Console: "Access denied for role: OP to route: /admin/users"  
   - Redirige automáticamente a `/apps/kanbanboard`

---

## 🔧 **Debugs Útiles:**

### **Verificar Role en LocalStorage:**
```javascript
// En DevTools Console:
const user = JSON.parse(localStorage.getItem('currentUser'));
console.log('User role:', user?.role);
```

### **Verificar Estado Redux:**
```javascript  
// Si tienes Redux DevTools extension:
// Ve al estado → authentication → user → role
```

### **Verificar Menús Cargados:**
```javascript
// En Console después del login:
console.log('Current menu items:', /* ver en sidebar */);
```

---

## 🚨 **Problemas Comunes y Soluciones:**

### **🔴 Problema: Logout no redirige**
```bash
# Verificar en Console:
"Logout process completed successfully" ← debe aparecer
"Redirecting to login after logout..." ← debe aparecer

# Si no aparece, revisar:
1. Redux DevTools → Actions → buscar "logout" y "logoutSuccess"
2. Network tab → verificar llamada al backend /api/logout
```

### **🔴 Problema: Roles no redirigen correctamente**
```javascript
// Verificar en Console al login:
"Redirecting user with role: DEV" ← debe mostrar rol correcto

// Si role es undefined o incorrecto:
1. Verificar response del backend en Network tab
2. Asegurar que backend devuelve user.role
3. Verificar AuthenticationService.loginWithApi mapea correctamente
```

### **🔴 Problema: RoleGuard bloquea acceso correcto** 
```javascript
// En Console al navegar:
"Access denied for role: X to route: Y" ← revisar si es correcto

// Si bloquea incorrectamente:
1. Verificar MenuService.menuConfig tiene la ruta
2. Asegurar que el rol tiene acceso en la configuración
```

---

## 📋 **Checklist Final:**

- [ ] Logout limpia localStorage completamente
- [ ] Logout redirige a `/auth/signin`  
- [ ] DEV va a dashboard `/` después del login
- [ ] GG va a dashboard `/` después del login
- [ ] OP va a kanban `/apps/kanbanboard` después del login
- [ ] Menús se muestran según rol correctamente
- [ ] RoleGuard bloquea rutas no autorizadas
- [ ] Redirección automática cuando no hay acceso
- [ ] Console no muestra errores críticos
- [ ] Redux state se actualiza correctamente

---

## 🎯 **Próximos Pasos Sugeridos:**

1. **Añadir más permisos granulares:**
   - Permisos específicos por componente
   - Botones/acciones condicionalmente visibles

2. **Mejorar UX:**
   - Loading spinner durante logout
   - Mensajes toast de confirmación  
   - Breadcrumbs que respeten roles

3. **Seguridad:**
   - Interceptor HTTP para token expirado
   - Refresh token automático
   - Validación adicional en guards