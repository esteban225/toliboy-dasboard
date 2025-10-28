# 📋 Guía Completa: Crear Componente en `app/pages/apps`

Esta guía te mostrará paso a paso cómo crear un nuevo componente en la sección de **Apps** del Dashboard TOLIBOY.

## 📁 Estructura Actual del Proyecto

```
src/app/pages/apps/
├── apps-routing.module.ts    # Rutas de las apps
├── apps.module.ts           # Módulo principal de apps
├── calendar/               # Componente de calendario
├── chat/                  # Componente de chat
├── contacts/              # Componente de contactos
├── email/                 # Componente de email
├── file-manager/          # Gestor de archivos
├── kanbanboard/           # Tablero Kanban
├── to-do/                 # Lista de tareas
└── widgets/               # Widgets
```

## 🚀 Pasos Detallados

### Paso 1: Preparar el Entorno

Asegúrate de estar en el directorio raíz del proyecto:

```bash
cd /home/tebandev/Dashboard-TOLIBOY
```

### Paso 2: Crear la Carpeta del Componente

Reemplaza `mi-componente` con el nombre de tu componente (ej: `project-manager`, `inventory`, `reports`):

```bash
mkdir src/app/pages/apps/mi-componente
```

**Ejemplo concreto:**
```bash
mkdir src/app/pages/apps/project-manager
```

### Paso 3: Generar Archivos del Componente

#### Opción A: Usar Angular CLI (Recomendado)

```bash
ng generate component pages/apps/mi-componente --skip-tests=false
```

**Ejemplo concreto:**
```bash
ng generate component pages/apps/project-manager --skip-tests=false
```

#### Opción B: Crear Archivos Manualmente

Si prefieres crear los archivos manualmente:

```bash
# Navegar a la carpeta del componente
cd src/app/pages/apps/mi-componente

# Crear archivos básicos
touch mi-componente.component.ts
touch mi-componente.component.html  
touch mi-componente.component.scss
touch mi-componente.component.spec.ts
touch mi-componente.model.ts  # (Opcional)
```

### Paso 4: Crear el Modelo de Datos (Opcional)

Si tu componente maneja datos específicos, crea un archivo de modelo:

```typescript
// mi-componente.model.ts
export interface MiModelo {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  createdAt: string;
}
```

**Ejemplo para Project Manager:**
```typescript
// project-manager.model.ts
export interface Project {
  id: number;
  name: string;
  description: string;
  status: 'planning' | 'in-progress' | 'completed' | 'on-hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  endDate: string;
  progress: number;
  teamMembers: string[];
  budget: number;
  tags: string[];
}
```

### Paso 5: Implementar el Componente TypeScript

Edita el archivo `mi-componente.component.ts`:

```typescript
import { Component, OnInit } from '@angular/core';
// Importar modelo si lo tienes
// import { MiModelo } from './mi-componente.model';

@Component({
  selector: 'app-mi-componente',
  templateUrl: './mi-componente.component.html',
  styleUrls: ['./mi-componente.component.scss']
})
export class MiComponenteComponent implements OnInit {
  // Propiedades del componente
  data: any[] = [];
  selectedItem: any = null;
  loading = false;

  constructor() { }

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    // Implementar lógica para cargar datos
    this.data = [
      // Datos de ejemplo
    ];
  }

  // Métodos adicionales del componente
  onItemSelect(item: any): void {
    this.selectedItem = item;
  }
}
```

### Paso 6: Crear el Template HTML

Edita el archivo `mi-componente.component.html`:

```html
<!-- Page Title -->
<div class="row">
  <div class="col-12">
    <div class="page-title-box d-sm-flex align-items-center justify-content-between">
      <h4 class="mb-sm-0">Mi Componente</h4>
      <div class="page-title-right">
        <ol class="breadcrumb m-0">
          <li class="breadcrumb-item"><a href="javascript: void(0);">Apps</a></li>
          <li class="breadcrumb-item active">Mi Componente</li>
        </ol>
      </div>
    </div>
  </div>
</div>

<!-- Content -->
<div class="row">
  <div class="col-12">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="ri-folder-line me-2"></i>Título de tu Contenido
        </h5>
        <button class="btn btn-primary btn-sm">
          <i class="ri-add-line me-1"></i>Nuevo Item
        </button>
      </div>
      <div class="card-body">
        <!-- Tu contenido aquí -->
        <p>¡Tu componente está funcionando!</p>
      </div>
    </div>
  </div>
</div>
```

### Paso 7: Agregar Estilos (Opcional)

Edita el archivo `mi-componente.component.scss`:

```scss
// Estilos específicos para tu componente
.mi-componente-card {
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

.custom-badge {
  font-size: 0.75rem;
  font-weight: 500;
}
```

### Paso 8: Agregar al Módulo de Apps

Edita el archivo `src/app/pages/apps/apps.module.ts`:

#### 8.1: Agregar Import
```typescript
// En la sección de imports de componentes
import { MiComponenteComponent } from './mi-componente/mi-componente.component';
```

#### 8.2: Agregar a Declarations
```typescript
@NgModule({
  declarations: [
    CalendarComponent,
    ChatComponent,
    EmailComponent,
    FileManagerComponent,
    ToDoComponent,
    ContactsComponent,
    KanbanboardComponent,
    WidgetsComponent,
    MiComponenteComponent, // ← Agregar aquí
  ],
```

**Ubicación exacta en el archivo:**
- Busca la línea que dice `import { WidgetsComponent } from './widgets/widgets.component';`
- Agrega tu import justo después
- Busca el array `declarations` y agrega tu componente al final

### Paso 9: Agregar Routing

Edita el archivo `src/app/pages/apps/apps-routing.module.ts`:

#### 9.1: Agregar Import
```typescript
// En la sección de imports
import { MiComponenteComponent } from './mi-componente/mi-componente.component';
```

#### 9.2: Agregar Ruta
```typescript
const routes: Routes = [
  {
    path: "calendar",
    component: CalendarComponent
  },
  // ... otras rutas existentes
  {
    path: "mi-componente",
    component: MiComponenteComponent
  },
  {
    path: "widgets",
    component: WidgetsComponent
  }
];
```

**Ubicación exacta:**
- Busca la línea `import { KanbanboardComponent } from './kanbanboard/kanbanboard.component';`
- Agrega tu import después
- En el array `routes`, agrega tu ruta antes de la ruta de `widgets`

### Paso 10: Probar el Componente

#### 10.1: Compilar el Proyecto
```bash
ng build --configuration development
```

#### 10.2: Ejecutar el Servidor de Desarrollo
```bash
ng serve
```

#### 10.3: Acceder al Componente
Navega a: `http://localhost:4200/apps/mi-componente`

## ✅ Checklist de Verificación

Antes de considerar completo tu componente, verifica:

- [ ] ✅ Carpeta creada en `src/app/pages/apps/mi-componente/`
- [ ] ✅ Archivos del componente creados:
  - [ ] `mi-componente.component.ts`
  - [ ] `mi-componente.component.html`
  - [ ] `mi-componente.component.scss`
  - [ ] `mi-componente.component.spec.ts`
- [ ] ✅ Import agregado en `apps.module.ts`
- [ ] ✅ Componente agregado a `declarations` en `apps.module.ts`
- [ ] ✅ Import agregado en `apps-routing.module.ts`
- [ ] ✅ Ruta agregada en array `routes` de `apps-routing.module.ts`
- [ ] ✅ Proyecto compila sin errores
- [ ] ✅ Componente accesible desde el navegador

## 🛠️ Comandos de Terminal Resumidos

Para crear un componente completo de una vez:

```bash
# 1. Navegar al proyecto
cd /home/tebandev/Dashboard-TOLIBOY

# 2. Generar componente (reemplaza 'mi-componente' con tu nombre)
ng generate component pages/apps/mi-componente --skip-tests=false

# 3. Compilar para verificar
ng build --configuration development

# 4. Ejecutar servidor de desarrollo
ng serve
```

## 📝 Ejemplo Completo: Project Manager

Para ver un ejemplo completo y funcional, revisa los archivos en:
```
src/app/pages/apps/project-manager/
```

Este ejemplo incluye:
- Modelo de datos completo
- Componente con funcionalidad real
- Template con diseño profesional
- Estilos personalizados
- Integración completa en el módulo

## 🎯 Consejos Adicionales

1. **Nomenclatura**: Usa kebab-case para nombres de carpetas y archivos
2. **Consistencia**: Mantén el mismo estilo que los componentes existentes
3. **Breadcrumbs**: Siempre incluye breadcrumbs en tu template
4. **Iconos**: Usa iconos de Remix Icon (ri-) para consistencia
5. **Responsive**: Asegúrate de que tu componente sea responsive
6. **Accesibilidad**: Incluye atributos ARIA cuando sea necesario

## 🐛 Solución de Problemas

### Error: "Component is not declared in any NgModule"
- Verifica que agregaste el import en `apps.module.ts`
- Verifica que agregaste el componente a `declarations`

### Error: "Cannot match any routes"
- Verifica que agregaste el import en `apps-routing.module.ts`
- Verifica que agregaste la ruta en el array `routes`

### Error de Compilación
- Ejecuta `ng build --configuration development` para ver errores específicos
- Verifica que no hay errores de sintaxis en TypeScript

### Componente no se muestra
- Verifica la URL: `http://localhost:4200/apps/tu-componente`
- Verifica que el servidor está ejecutándose: `ng serve`
- Revisa la consola del navegador para errores

---

**Autor**: Dashboard TOLIBOY Team  
**Fecha**: Octubre 2025  
**Versión**: 1.0