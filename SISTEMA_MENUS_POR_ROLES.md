# 🔐 Sistema de Menús por Roles - Dashboard TOLIBOY

## 📋 Resumen del Sistema

He implementado un sistema completo de menús dinámicos basados en roles de usuario. El sistema permite mostrar diferentes opciones de menú según el rol del usuario autenticado (`DEV` o `USER`).

## 🏗️ Arquitectura Implementada

### 1. **MenuService** (`/core/services/menu.service.ts`)
- **Propósito**: Servicio centralizado que gestiona los menús según roles
- **Características**:
  - Configuración de menús por rol en un objeto `menuConfig`
  - Método `getMenuByRole()` para obtener menús específicos
  - Método `updateMenuItems()` para actualizar menús cuando cambia el usuario
  - Método `hasAccessToRoute()` para validar acceso a rutas

### 2. **RoleGuard** (`/core/guards/role.guard.ts`)
- **Propósito**: Guard para proteger rutas según el rol del usuario
- **Funcionalidad**: Verifica si el usuario tiene acceso a una ruta específica basándose en su menú asignado

### 3. **Sidebar Component Actualizado**
- **Cambios**: Ahora se suscribe a los cambios de menú del `MenuService`
- **Funcionalidad**: Actualiza automáticamente el menú cuando cambia el rol del usuario

### 4. **RoleSwitcherComponent** (Para Testing)
- **Propósito**: Componente para simular cambios de rol durante desarrollo
- **Ubicación**: Agregado al dropdown del usuario en el topbar

## 📊 Configuración de Menús por Rol

### DEV (Rol Desarrollador)
```typescript
'DEV': [
  // Dashboard completo
  { Dashboard Analytics }
  
  // Todas las aplicaciones
  { Calendar, Chat, Email, File Manager, Todo, Contacts, Kanban }
  
  // Sección exclusiva de administración
  { Gestión de Usuarios, Configuraciones del Sistema }
]
```

### USER (Rol Usuario)
```typescript
'USER': [
  // Solo aplicaciones específicas
  { Kanban Board, Todo, Contacts }
  
  // Sin acceso a Dashboard ni funciones de admin
]
```

## 🛠️ Archivos Modificados

### Nuevos Archivos Creados:
1. `src/app/core/services/menu.service.ts` - Servicio de menús
2. `src/app/core/guards/role.guard.ts` - Guard de roles
3. `src/app/shared/role-switcher/role-switcher.component.ts` - Componente de testing
4. `src/app/pages/admin/admin.module.ts` - Módulo admin
5. `src/app/pages/admin/admin-routing.module.ts` - Rutas admin
6. `src/app/pages/admin/users/users.component.*` - Componente gestión usuarios
7. `src/app/pages/admin/settings/settings.component.*` - Componente configuraciones

### Archivos Modificados:
1. `src/app/layouts/sidebar/sidebar.component.ts` - Integración con MenuService
2. `src/app/layouts/topbar/topbar.component.html` - Agregar RoleSwitcher
3. `src/app/layouts/layouts.module.ts` - Importar SharedModule
4. `src/app/shared/shared.module.ts` - Exportar RoleSwitcher
5. `src/app/pages/pages-routing.module.ts` - Agregar rutas admin
6. `src/assets/i18n/es.json` - Traducciones para menús admin

## 🚀 Cómo Usar el Sistema

### 1. **Configurar Roles en el Backend**
```typescript
// El backend debe retornar el rol en la respuesta de login
{
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "first_name": "Admin",
    "role": "DEV" // <- Este campo es clave
  },
  "token": "..."
}
```

### 2. **Agregar Nuevos Menús por Rol**
Edita el archivo `menu.service.ts`:

```typescript
private menuConfig: MenuConfig = {
  'ADMIN': [
    // Menús para admin...
    {
      id: 300,
      label: 'MENUITEMS.NUEVOMENU.TEXT',
      icon: 'ti ti-icon',
      link: '/nuevo-menu',
      parentId: 100
    }
  ],
  'USER': [
    // Menús para user...
  ]
}
```

### 3. **Proteger Rutas con RoleGuard**
```typescript
// En tu routing module
{
  path: 'ruta-protegida',
  component: MiComponente,
  canActivate: [RoleGuard] // <- Esto valida acceso por rol
}
```

### 4. **Testing de Roles**
- Usa el botón "Cambiar Rol" en el dropdown del usuario (topbar)
- Solo visible durante desarrollo (`isDevelopment: true`)
- Cambia a `false` en producción

## 🎯 Funcionalidades del Sistema

### ✅ Implementadas:
- [x] Menús dinámicos por rol
- [x] Guard de protección por roles  
- [x] Redirección automática según rol después del login
- [x] Componente de testing para cambio de roles
- [x] Rutas de administración protegidas
- [x] Internacionalización de menús
- [x] Integración completa con sistema de autenticación existente

### 📝 Posibles Mejoras Futuras:
- [ ] Roles más granulares (SUPER_ADMIN, MODERATOR, etc.)
- [ ] Permisos específicos por funcionalidad
- [ ] Menús dinámicos desde backend
- [ ] Cache de menús para mejor rendimiento
- [ ] Logging de accesos por rol

## 🔍 Testing del Sistema

### Modo Desarrollo:
1. Inicia la aplicación: `ng serve`
2. Haz login con cualquier usuario
3. Usa el botón "Cambiar Rol" en el dropdown del usuario
4. Observa cómo cambian los menús automáticamente
5. Intenta acceder a rutas protegidas

### Modo Producción:
1. Cambia `isDevelopment: false` en `role-switcher.component.ts`
2. Los menús se cargarán según el rol real del usuario desde el backend

## 🚨 Consideraciones de Seguridad

⚠️ **IMPORTANTE**: Este sistema es principalmente para UX. La seguridad real debe implementarse en:

1. **Backend**: Validar permisos en cada endpoint
2. **Guards**: Usar guards adicionales para rutas críticas
3. **Tokens**: Incluir roles/permisos en JWT tokens
4. **API**: Nunca confiar solo en el frontend para seguridad

## 📞 Soporte

Si necesitas ayuda para:
- Agregar nuevos roles
- Configurar menús específicos
- Integrar con tu backend
- Personalizar el comportamiento

No dudes en preguntar. El sistema está diseñado para ser fácilmente extensible y mantenible.