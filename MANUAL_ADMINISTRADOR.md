# Manual de Administrador: Toliboy Dashboard

## 1. Portada

**Nombre del sistema:** Toliboy Dashboard  
**Versión:** 1.0.0  
**Equipo técnico:**
- Desarrollador principal: Esteban225
- Colaboradores: Equipo Toliboy

---

## 2. Introducción

### Objetivo
Este manual proporciona las directrices necesarias para la operación y mantenimiento del sistema Toliboy Dashboard.

### Responsabilidades del administrador
- Gestionar usuarios y roles.
- Supervisar el funcionamiento del sistema.
- Realizar tareas de mantenimiento y recuperación.

### Alcance del manual
Incluye arquitectura, requisitos, gestión de usuarios, configuración, base de datos, monitoreo, mantenimiento, recuperación y solución de problemas.

---

## 3. Arquitectura del Sistema (Vista General)

### Componentes principales
- Frontend Angular (SPA)
- Backend/API (integración externa, no incluido en este repositorio)

### Módulos
- Autenticación y cuentas
- Páginas administrativas
- Gestión de usuarios
- Módulos de reportes y dashboards

### Integraciones
- APIs externas (configurables en environments)
- Recursos estáticos (assets)

---

## 4. Requisitos del Servidor

### Hardware recomendado
- CPU: 2 núcleos o más
- RAM: 2 GB mínimo
- Almacenamiento: 10 GB libre

### Sistema operativo
- Linux (recomendado)
- Windows/MacOS (opcional para desarrollo)

### Dependencias
- Node.js >= 18.x
- npm >= 9.x
- Angular CLI >= 16.x

### Versiones necesarias
- Node.js: 18.x
- Angular: 16.x
- Base de datos: (No aplica, frontend)

---

## 5. Gestión de Usuarios

La gestión de usuarios se realiza desde el módulo de cuentas:
- Crear, editar y eliminar usuarios desde la interfaz de administración.
- Roles y permisos definidos en el backend (consultar documentación del API).
- Políticas de seguridad: contraseñas seguras, expiración y recuperación vía email.

---

## 6. Configuración del Sistema

### Archivos de configuración
- `src/environments/environment.ts` (desarrollo)
- `src/environments/environment.prod.ts` (producción)
- `proxy.conf.json` (proxy para desarrollo)

### Variables de entorno
- API_URL, entorno, claves de servicios externos (definidas en los archivos de environment)

### Ajustes por entorno
- Cambiar valores en los archivos de environment según el entorno (dev, QA, prod)

---

## 7. Administración de la Base de Datos

*Este proyecto es frontend. La administración de la base de datos corresponde al backend.*
- Configuración de endpoints en `environment.ts`.
- Para respaldos y restauración, consultar manual del backend.

---

## 8. Monitoreo del Sistema

### Logs y auditoría
- Revisar logs del navegador (F12) para errores de frontend.
- Logs de API: consultar backend.

### Métricas
- Uso de herramientas como Google Analytics (si está integrado).

### Alertas
- Configurar alertas en el backend o servicios externos.

### Herramientas recomendadas
- Sentry, Google Analytics, herramientas de monitoreo de API.

---

## 9. Mantenimiento

### Actualizaciones del sistema
- Ejecutar `npm install` para dependencias.
- Actualizar Angular con `ng update`.

### Gestión de parches
- Revisar y aplicar actualizaciones de dependencias.

### Limpieza y optimización
- Ejecutar `npm run build` para producción.
- Limpiar dependencias no usadas con `npm prune`.

---

## 10. Recuperación ante Fallos

### Estrategia de recuperación
- Restaurar versiones anteriores desde control de versiones (Git).
- Reinstalar dependencias si hay corrupción (`rm -rf node_modules && npm install`).

### Procedimientos paso a paso
1. Identificar el fallo.
2. Consultar logs.
3. Restaurar desde backup o Git.
4. Verificar funcionamiento.

### Escenarios de emergencia
- Fallo en despliegue: revertir a commit anterior.
- Corrupción de dependencias: reinstalar.

---

## 11. Solución de Problemas Técnicos

### Errores comunes
- Error de dependencias: ejecutar `npm install`.
- Error de compilación: revisar mensajes de Angular CLI.
- Problemas de conexión API: verificar configuración en `environment.ts`.

### Diagnóstico
- Usar consola del navegador y logs de API.

### Procedimientos de soporte
- Consultar documentación oficial de Angular.
- Contactar al equipo técnico.

---

**Fin del manual**
