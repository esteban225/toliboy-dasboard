# Servicio de Notificaciones - NotificationService

Un servicio genérico y reutilizable para manejar notificaciones en toda la aplicación Angular.

## Características

- ✅ **Persistencia automática** en localStorage
- ✅ **Tipos de notificación** predefinidos (info, success, warning, danger)
- ✅ **Agrupación automática** por estado (nuevas/leídas)
- ✅ **Gestión de selección** para acciones en lote
- ✅ **Métodos de conveniencia** para casos comunes
- ✅ **Timestamps automáticos** con formato localizado
- ✅ **Observable reactive** para actualizaciones en tiempo real

## Instalación y Configuración

El servicio está configurado como `providedIn: 'root'`, por lo que se puede inyectar directamente en cualquier componente.

```typescript
import { NotificationService } from 'src/app/core/services/notification.service';

constructor(private notificationService: NotificationService) {}
```

## Interfaz NotificationItem

```typescript
interface NotificationItem {
  id: string | number;
  type: 'info' | 'success' | 'warning' | 'danger' | 'primary';
  title?: string;
  message: string;
  avatar?: string;
  icon?: string;
  timestamp?: string;
  isRead: boolean;
  selected?: boolean;
  data?: any;
  actions?: NotificationAction[];
}
```

## Métodos Principales

### Crear Notificaciones

#### Métodos de Conveniencia
```typescript
// Notificación de éxito
this.notificationService.success('Operación completada exitosamente', 'Éxito');

// Notificación de error
this.notificationService.error('Ocurrió un error', 'Error');

// Notificación de advertencia
this.notificationService.warning('Cuidado con esta acción', 'Advertencia');

// Notificación de información
this.notificationService.info('Nueva información disponible', 'Info');
```

#### Método Genérico
```typescript
this.notificationService.addNotification({
  type: 'success',
  title: 'Usuario Creado',
  message: 'El usuario se creó correctamente',
  icon: 'ti ti-user-plus',
  data: { userId: 123 }
});
```

### Obtener Notificaciones

```typescript
// Suscribirse a cambios
this.notificationService.getNotifications().subscribe(notifications => {
  this.notificationList = notifications;
});

// Obtener contadores
const totalCount = this.notificationService.getTotalCount();
const unreadCount = this.notificationService.getUnreadCount();
const readCount = this.notificationService.getReadCount();
```

### Gestión de Estado

```typescript
// Marcar como leída
this.notificationService.markAsRead(notificationId);

// Marcar todas como leídas
this.notificationService.markAllAsRead();

// Eliminar notificación
this.notificationService.removeNotification(notificationId);

// Eliminar múltiples
this.notificationService.removeNotifications([id1, id2, id3]);

// Limpiar todas
this.notificationService.clearAll();
```

### Gestión de Selección

```typescript
// Alternar selección
this.notificationService.toggleNotificationSelection(notificationId);

// Obtener seleccionadas
const selected = this.notificationService.getSelectedNotifications();

// Limpiar selecciones
this.notificationService.clearAllSelections();

// Eliminar seleccionadas
this.notificationService.removeSelectedNotifications();
```

## Ejemplos de Uso Práctico

### En un Componente de Formulario

```typescript
// to-do.component.ts
export class ToDoComponent {
  constructor(private notificationService: NotificationService) {}

  saveTodo(): void {
    // ... lógica de guardado ...
    
    if (success) {
      this.notificationService.success(
        `Tarea "${todoName}" creada exitosamente`, 
        '📝 Tarea Creada'
      );
    } else {
      this.notificationService.error(
        'Error al crear la tarea', 
        '❌ Error'
      );
    }
  }

  completeTodo(todo: TodoItem): void {
    // ... lógica de completar ...
    
    this.notificationService.success(
      `Tarea "${todo.task}" completada`, 
      '✅ ¡Bien hecho!'
    );
  }
}
```

### En un Servicio HTTP

```typescript
// data.service.ts
export class DataService {
  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}

  saveData(data: any): Observable<any> {
    return this.http.post('/api/data', data).pipe(
      tap(() => {
        this.notificationService.success('Datos guardados correctamente');
      }),
      catchError(error => {
        this.notificationService.error('Error al guardar los datos');
        return throwError(error);
      })
    );
  }
}
```

### En el Template HTML

```html
<!-- topbar.component.html -->
<div class="notification-dropdown">
  <div class="notification-header">
    <h6>Notificaciones ({{totalNotify}})</h6>
    <div class="actions">
      <button (click)="markAllAsRead()">Marcar todo como leído</button>
      <button (click)="clearAll()">Limpiar todo</button>
    </div>
  </div>
  
  <div class="notification-list">
    <div *ngFor="let group of notificationList" class="notification-group">
      <h6 class="group-title">{{group.title}}</h6>
      
      <div *ngFor="let item of group.items" 
           class="notification-item"
           [class.unread]="!item.isRead">
        
        <!-- Avatar o Icono -->
        <div class="notification-icon">
          <img *ngIf="item.avatar" [src]="item.avatar" alt="Avatar">
          <i *ngIf="!item.avatar" [class]="item.icon"></i>
        </div>
        
        <!-- Contenido -->
        <div class="notification-content">
          <h6 *ngIf="item.title">{{item.title}}</h6>
          <p>{{item.message}}</p>
          <small>{{item.timestamp}}</small>
        </div>
        
        <!-- Checkbox de selección -->
        <div class="notification-checkbox">
          <input type="checkbox" 
                 [(ngModel)]="item.selected"
                 (change)="toggleNotificationSelection(item.id)">
        </div>
      </div>
    </div>
  </div>
  
  <!-- Acciones para seleccionadas -->
  <div *ngIf="checkedValGet.length > 0" class="batch-actions">
    <span>{{checkedValGet.length}} seleccionadas</span>
    <button (click)="removeSelectedNotifications()">Eliminar</button>
  </div>
</div>
```

## Configuración Avanzada

### Notificaciones con Acciones Personalizadas

```typescript
this.notificationService.addNotification({
  type: 'info',
  title: 'Nueva Actualización',
  message: 'Hay una nueva versión disponible',
  icon: 'ti ti-download',
  actions: [
    {
      label: 'Actualizar Ahora',
      action: () => this.updateApplication(),
      style: 'primary'
    },
    {
      label: 'Recordar Más Tarde',
      action: () => this.snoozeUpdate(),
      style: 'secondary'
    }
  ]
});
```

### Notificaciones con Datos Personalizados

```typescript
// Crear notificación con datos
this.notificationService.addNotification({
  type: 'info',
  message: 'Nueva mensaje recibido',
  data: {
    chatId: 'chat-123',
    senderId: 'user-456',
    messageType: 'text'
  }
});

// Recuperar datos en el handler
handleNotificationClick(notification: NotificationItem): void {
  if (notification.data?.chatId) {
    this.router.navigate(['/chat', notification.data.chatId]);
  }
}
```

## Características Técnicas

### Persistencia
- Las notificaciones se guardan automáticamente en localStorage
- Se cargan al inicializar el servicio
- Se mantienen entre sesiones del navegador

### Reactividad
- Usa BehaviorSubject para actualizaciones reactivas
- Los componentes se actualizan automáticamente
- Cambios se propagan a todos los suscriptores

### Gestión de Memoria
- IDs únicos generados automáticamente
- Limpieza automática de grupos vacíos
- Optimización para grandes cantidades de notificaciones

### Localización
- Timestamps en español
- Textos de la interfaz localizados
- Formato de fecha adaptable

## Migración desde Sistema Anterior

Si tienes notificaciones usando el array estático anterior:

```typescript
// ANTES (sistema anterior)
this.notificationList = notification;

// DESPUÉS (nuevo servicio)
this.notificationService.getNotifications().subscribe(notifications => {
  this.notificationList = notifications;
});
```

## Solución de Problemas

### Las notificaciones no se muestran
- Verificar que el servicio esté inyectado correctamente
- Comprobar la suscripción al observable
- Revisar la consola por errores de localStorage

### Los contadores no se actualizan
- Usar los métodos del servicio en lugar de cálculos manuales
- Verificar que se esté llamando `updateNotificationCounts()`

### Problemas de persistencia
- Verificar permisos de localStorage en el navegador
- Comprobar que no haya errores de serialización JSON

## Consideraciones de Rendimiento

- El servicio maneja eficientemente grandes cantidades de notificaciones
- La persistencia es asíncrona para no bloquear la UI
- Los observables se completan automáticamente al destruir componentes
- Usar `takeUntil(destroy$)` para evitar memory leaks

```typescript
// Patrón recomendado para suscripciones
private destroy$ = new Subject<void>();

ngOnInit() {
  this.notificationService.getNotifications()
    .pipe(takeUntil(this.destroy$))
    .subscribe(notifications => {
      // manejar notificaciones
    });
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
```

## Extensibilidad

El servicio está diseñado para ser extensible. Puedes:

- Agregar nuevos tipos de notificación
- Implementar filtros personalizados
- Añadir integración con servicios externos
- Crear notificaciones con templates personalizados
- Implementar notificaciones push del navegador

¡El servicio está listo para usar en toda tu aplicación!