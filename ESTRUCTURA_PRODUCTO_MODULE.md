# Estructura del Módulo de Products

## Descripción
El módulo de Products ha sido creado tomando como referencia la estructura del módulo de Inventory. Proporciona una gestión completa del catálogo de productos con funcionalidades de CRUD, filtrado, paginación y análitica.

## Estructura de Directorios

```
product-module/
├── models/
│   └── product.model.ts           # Interfaces y tipos del producto
├── services/
│   └── products.service.ts        # Servicio HTTP para productos
├── pages/
│   ├── products-list/             # Página de listado y gestión
│   │   ├── products-list.component.ts
│   │   ├── products-list.component.html
│   │   └── products-list.component.scss
│   └── products-analytics/        # Página de análitica
│       ├── products-analytics.component.ts
│       ├── products-analytics.component.html
│       └── products-analytics.component.scss
├── store/                         # (Preparado para NgRx si es necesario)
├── components/                    # (Para componentes reutilizables futuros)
├── product-module.module.ts       # Módulo principal
└── product-module-routing.module.ts # Configuración de rutas
```

## Características Principales

### 1. **Modelo de Datos (Product)**
```typescript
interface Product {
  id?: number;
  name?: string;
  code?: string;
  description?: string;
  category?: string;
  sku?: string;
  price?: number;
  cost?: number;
  stock?: number;
  min_stock?: number;
  max_stock?: number;
  unit_of_measure?: string;
  is_active?: boolean;
  image_url?: string;
  supplier_id?: number;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}
```

### 2. **Servicio de Productos (ProductsService)**
Proporciona métodos HTTP para:
- `list()` - Listar productos con filtros y paginación
- `getById()` - Obtener un producto específico
- `create()` - Crear nuevo producto
- `update()` - Actualizar producto existente
- `delete()` - Eliminar producto

### 3. **Componente Products-List**
Página principal para gestión de productos con:
- **Tabla con paginación** - Visualización de todos los productos
- **Filtros avanzados** - Buscar por nombre, código, categoría
- **Modal de creación/edición** - Formulario reactivo completo
- **Acciones CRUD** - Botones para editar y eliminar
- **Gestión de estado con Signals** - Angular 17+ signals para reactividad
- **Validación de formularios** - Validadores Angular
- **Manejo de errores** - Alertas y notificaciones

**Campos del Formulario:**
- Nombre (requerido)
- Código (máx 100 caracteres)
- SKU
- Descripción
- Categoría
- Unidad de medida
- Precio de venta (requerido)
- Costo
- Stock actual (requerido)
- Stock mínimo
- Stock máximo
- URL de imagen
- Estado (activo/inactivo)

### 4. **Componente Products-Analytics**
Página de análitica con:
- **KPIs principales**:
  - Total de productos
  - Valor total del inventario
  - Productos con stock bajo
  - Productos inactivos
- **Top 5 productos por valor** - Tabla ordenada por valor de inventario
- **Distribución por categoría** - Gráfico de barras con productos por categoría
- **Alertas de stock crítico** - Listado de productos bajo stock mínimo

## Rutas

| Ruta | Componente | Descripción |
|------|-----------|------------|
| `/products` | ProductsListComponent | Listado y gestión de productos |
| `/products/analytics` | ProductsAnalyticsComponent | Análitica y estadísticas |

## Servicios Utilizados

- **ProductsService** - Gestión de datos de productos
- **AlertService** - Notificaciones y confirmaciones
- **HttpClient** - Llamadas HTTP

## Angular Features Utilizadas

- **Standalone Components** - Componentes sin necesidad de módulo wrapper
- **Reactive Forms** - FormBuilder para formularios reactivos
- **Signals** - Estado reactivo con Angular 17+
- **Effects** - Para manejar efectos secundarios
- **RxJS** - Observables y operadores (takeUntil, map, catchError)
- **CommonModule** - Directivas comunes (*ngIf, *ngFor, etc)

## Estilos

Ambos componentes incluyen estilos SCSS personalizados para:
- Tablas responsivas
- Modales accesibles
- Tarjetas de KPI
- Badges y botones
- Paginación
- Responsividad mobile (ocultamiento de columnas en pantallas pequeñas)

## Integración con Backend

El servicio espera un endpoint base en: `${GlobalComponent.API_URL}products`

**Respuestas esperadas:**
```json
{
  "data": [...],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 10,
    "total": 50
  }
}
```

## Próximos Pasos Sugeridos

1. Crear un interceptor para manejo global de errores HTTP
2. Implementar NgRx store si se requiere estado global
3. Agregar componentes reutilizables en la carpeta `components/`
4. Implementar caching en el servicio
5. Agregar validaciones más complejas en el formulario
6. Implementar gráficos reales en la página de análitica

## Archivos Creados/Modificados

✅ `/models/product.model.ts` - Nuevo
✅ `/services/products.service.ts` - Nuevo
✅ `/pages/products-list/products-list.component.ts` - Actualizado
✅ `/pages/products-list/products-list.component.html` - Actualizado
✅ `/pages/products-list/products-list.component.scss` - Nuevo
✅ `/pages/products-analytics/products-analytics.component.ts` - Actualizado
✅ `/pages/products-analytics/products-analytics.component.html` - Actualizado
✅ `/pages/products-analytics/products-analytics.component.scss` - Nuevo
✅ `product-module.module.ts` - Ya estaba configurado
✅ `product-module-routing.module.ts` - Ya estaba configurado
