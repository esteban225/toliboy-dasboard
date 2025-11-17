import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface NotificationItem {
  id: string | number;
  type: 'info' | 'success' | 'warning' | 'danger' | 'primary';
  title?: string;
  message: string;
  avatar?: string;
  icon?: string;
  timestamp?: string;
  isRead: boolean;
  selected?: boolean; // Para la selección en el UI
  data?: any; // Datos adicionales específicos de cada notificación
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
}

export interface NotificationGroup {
  title: string;
  items: NotificationItem[];
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly STORAGE_KEY = 'app_notifications';
  private notificationsSubject = new BehaviorSubject<NotificationGroup[]>([]);
  
  public notifications$ = this.notificationsSubject.asObservable();

  constructor() {
    this.loadNotifications();
  }

  /**
   * Obtiene todas las notificaciones
   */
  getNotifications(): Observable<NotificationGroup[]> {
    return this.notifications$;
  }

  /**
   * Obtiene el conteo total de notificaciones
   */
  getTotalCount(): number {
    const notifications = this.notificationsSubject.value;
    return notifications.reduce((total, group) => total + group.items.length, 0);
  }

  /**
   * Obtiene el conteo de notificaciones no leídas
   */
  getUnreadCount(): number {
    const notifications = this.notificationsSubject.value;
    return notifications.reduce((total, group) => 
      total + group.items.filter(item => !item.isRead).length, 0
    );
  }

  /**
   * Obtiene el conteo de notificaciones leídas
   */
  getReadCount(): number {
    const notifications = this.notificationsSubject.value;
    return notifications.reduce((total, group) => 
      total + group.items.filter(item => item.isRead).length, 0
    );
  }

  /**
   * Agrega una nueva notificación
   */
  addNotification(notification: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead' | 'selected'>): void {
    const newNotification: NotificationItem = {
      ...notification,
      id: this.generateId(),
      timestamp: this.formatTimestamp(new Date()),
      isRead: false,
      selected: false
    };

    const currentNotifications = this.notificationsSubject.value;
    let newGroup = currentNotifications.find(group => group.title === 'Nuevas');
    
    if (!newGroup) {
      newGroup = { title: 'Nuevas', items: [] };
      currentNotifications.unshift(newGroup);
    }

    newGroup.items.unshift(newNotification);
    this.updateNotifications(currentNotifications);
  }

  /**
   * Marca una notificación como leída
   */
  markAsRead(notificationId: string | number): void {
    const currentNotifications = this.notificationsSubject.value;
    let notificationFound = false;

    for (const group of currentNotifications) {
      const notification = group.items.find(item => item.id === notificationId);
      if (notification) {
        notification.isRead = true;
        notificationFound = true;
        break;
      }
    }

    if (notificationFound) {
      this.reorganizeGroups(currentNotifications);
      this.updateNotifications(currentNotifications);
    }
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllAsRead(): void {
    const currentNotifications = this.notificationsSubject.value;
    
    for (const group of currentNotifications) {
      for (const notification of group.items) {
        notification.isRead = true;
      }
    }

    this.reorganizeGroups(currentNotifications);
    this.updateNotifications(currentNotifications);
  }

  /**
   * Elimina una notificación
   */
  removeNotification(notificationId: string | number): void {
    const currentNotifications = this.notificationsSubject.value;
    
    for (const group of currentNotifications) {
      const index = group.items.findIndex(item => item.id === notificationId);
      if (index !== -1) {
        group.items.splice(index, 1);
        break;
      }
    }

    // Eliminar grupos vacíos
    const filteredNotifications = currentNotifications.filter(group => group.items.length > 0);
    this.updateNotifications(filteredNotifications);
  }

  /**
   * Elimina múltiples notificaciones
   */
  removeNotifications(notificationIds: (string | number)[]): void {
    const currentNotifications = this.notificationsSubject.value;
    
    for (const group of currentNotifications) {
      group.items = group.items.filter(item => !notificationIds.includes(item.id));
    }

    // Eliminar grupos vacíos
    const filteredNotifications = currentNotifications.filter(group => group.items.length > 0);
    this.updateNotifications(filteredNotifications);
  }

  /**
   * Limpia todas las notificaciones
   */
  clearAll(): void {
    this.updateNotifications([]);
  }

  /**
   * Alterna la selección de una notificación
   */
  toggleNotificationSelection(notificationId: string | number): void {
    const currentNotifications = this.notificationsSubject.value;
    
    for (const group of currentNotifications) {
      const notification = group.items.find(item => item.id === notificationId);
      if (notification) {
        notification.selected = !notification.selected;
        break;
      }
    }

    this.updateNotifications(currentNotifications);
  }

  /**
   * Obtiene las notificaciones seleccionadas
   */
  getSelectedNotifications(): NotificationItem[] {
    const currentNotifications = this.notificationsSubject.value;
    const selected: NotificationItem[] = [];
    
    for (const group of currentNotifications) {
      selected.push(...group.items.filter(item => item.selected));
    }
    
    return selected;
  }

  /**
   * Deselecciona todas las notificaciones
   */
  clearAllSelections(): void {
    const currentNotifications = this.notificationsSubject.value;
    
    for (const group of currentNotifications) {
      for (const notification of group.items) {
        notification.selected = false;
      }
    }

    this.updateNotifications(currentNotifications);
  }

  /**
   * Elimina las notificaciones seleccionadas
   */
  removeSelectedNotifications(): void {
    const selectedIds = this.getSelectedNotifications().map(n => n.id);
    this.removeNotifications(selectedIds);
  }

  /**
   * Crea una notificación de éxito
   */
  success(message: string, title?: string, data?: any): void {
    this.addNotification({
      type: 'success',
      title,
      message,
      icon: 'ti ti-check-circle',
      data
    });
  }

  /**
   * Crea una notificación de error
   */
  error(message: string, title?: string, data?: any): void {
    this.addNotification({
      type: 'danger',
      title,
      message,
      icon: 'ti ti-alert-circle',
      data
    });
  }

  /**
   * Crea una notificación de advertencia
   */
  warning(message: string, title?: string, data?: any): void {
    this.addNotification({
      type: 'warning',
      title,
      message,
      icon: 'ti ti-alert-triangle',
      data
    });
  }

  /**
   * Crea una notificación de información
   */
  info(message: string, title?: string, data?: any): void {
    this.addNotification({
      type: 'info',
      title,
      message,
      icon: 'ti ti-info-circle',
      data
    });
  }

  /**
   * Carga las notificaciones desde localStorage
   */
  private loadNotifications(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const notifications = JSON.parse(stored);
        this.notificationsSubject.next(notifications);
      } else {
        // Cargar notificaciones por defecto si no hay datos guardados
        this.loadDefaultNotifications();
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.loadDefaultNotifications();
    }
  }

  /**
   * Carga notificaciones por defecto
   */
  private loadDefaultNotifications(): void {
    const defaultNotifications: NotificationGroup[] = [
      {
        title: 'Nuevas',
        items: [
          {
            id: '1',
            type: 'info',
            message: 'Tu recompensa de optimización gráfica de autor Elite está lista!',
            icon: 'ti ti-gift',
            timestamp: 'Hace 30 seg',
            isRead: false,
            selected: false
          },
          {
            id: '2',
            type: 'info',
            title: 'Angela Bernier',
            message: 'Respondió a tu comentario en el gráfico de pronóstico de flujo de efectivo 🔔.',
            avatar: 'assets/images/users/avatar-2.jpg',
            timestamp: 'Hace 48 min',
            isRead: false,
            selected: false
          },
          {
            id: '3',
            type: 'danger',
            message: 'Has recibido 20 mensajes nuevos en la conversación',
            icon: 'ti ti-message-2',
            timestamp: 'Hace 2 hrs',
            isRead: false,
            selected: false
          }
        ]
      },
      {
        title: 'Leídas Anteriormente',
        items: [
          {
            id: '4',
            type: 'info',
            title: 'Maureen Gibson',
            message: 'Hablamos sobre un proyecto en LinkedIn.',
            avatar: 'assets/images/users/avatar-8.jpg',
            timestamp: 'Hace 4 hrs',
            isRead: true,
            selected: false
          }
        ]
      }
    ];

    this.updateNotifications(defaultNotifications);
  }

  /**
   * Actualiza las notificaciones y las guarda
   */
  private updateNotifications(notifications: NotificationGroup[]): void {
    this.notificationsSubject.next(notifications);
    this.saveNotifications(notifications);
  }

  /**
   * Guarda las notificaciones en localStorage
   */
  private saveNotifications(notifications: NotificationGroup[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  /**
   * Reorganiza los grupos de notificaciones (nuevas vs leídas)
   */
  private reorganizeGroups(notifications: NotificationGroup[]): void {
    const allItems: NotificationItem[] = [];
    
    // Recolectar todas las notificaciones
    for (const group of notifications) {
      allItems.push(...group.items);
    }

    // Separar por estado de lectura
    const unreadItems = allItems.filter(item => !item.isRead);
    const readItems = allItems.filter(item => item.isRead);

    // Limpiar array original
    notifications.length = 0;

    // Agregar grupos si tienen elementos
    if (unreadItems.length > 0) {
      notifications.push({ title: 'Nuevas', items: unreadItems });
    }
    
    if (readItems.length > 0) {
      notifications.push({ title: 'Leídas Anteriormente', items: readItems });
    }
  }

  /**
   * Genera un ID único para las notificaciones
   */
  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Formatea el timestamp de la notificación
   */
  private formatTimestamp(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Ahora mismo';
    } else if (diffMins < 60) {
      return `Hace ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} hr${diffHours > 1 ? 's' : ''}`;
    } else {
      return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    }
  }
}