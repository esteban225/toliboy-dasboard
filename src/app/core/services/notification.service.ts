import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import Pusher, { Channel } from 'pusher-js';
import { environment } from '../../../environments/environment';
import { AuthenticationService } from './auth.service';

export interface NotificationItem {
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

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
}

export interface NotificationGroup {
  title: string;
  items: NotificationItem[];
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly STORAGE_KEY = 'app_notifications';
  private notificationsSubject = new BehaviorSubject<NotificationGroup[]>([]);
  private pusher?: Pusher;
  private subscribedChannels = new Set<string>();
  private bindings: Array<{ channel: Channel; event: string; handler: (...args: any[]) => void }> = [];

  public notifications$ = this.notificationsSubject.asObservable();
  private incomingSubject = new Subject<NotificationItem>();
  public incoming$ = this.incomingSubject.asObservable();

  constructor(private authService: AuthenticationService, private http: HttpClient) {
    this.loadNotifications();
  }

  /* ----------------------------- PUBLIC API ----------------------------- */

  getNotifications(): Observable<NotificationGroup[]> {
    return this.notifications$;
  }

  getTotalCount(): number {
    return this.notificationsSubject.value.reduce((t, g) => t + g.items.length, 0);
  }

  getUnreadCount(): number {
    return this.notificationsSubject.value.reduce((t, g) => t + g.items.filter(i => !i.isRead).length, 0);
  }

  getReadCount(): number {
    return this.notificationsSubject.value.reduce((t, g) => t + g.items.filter(i => i.isRead).length, 0);
  }

  addNotification(
    notification: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead' | 'selected'> &
      Partial<Pick<NotificationItem, 'id' | 'timestamp' | 'isRead' | 'selected'>>
  ): void {
    const newNotification: NotificationItem = {
      ...notification,
      id: notification.id ?? this.generateId(),
      timestamp: notification.timestamp ?? this.formatTimestamp(new Date()),
      isRead: notification.isRead ?? false,
      selected: notification.selected ?? false
    };

    const exists = this.notificationsSubject.value.some(g =>
      g.items.some(i => i.id === newNotification.id)
    );
    if (exists) return;

    const current = [...this.notificationsSubject.value];
    let group = current.find(g => g.title === 'Nuevas');
    if (!group) {
      group = { title: 'Nuevas', items: [] };
      current.unshift(group);
    }
    group.items.unshift(newNotification);
    this.updateNotifications(current);
  }

  markAsRead(notificationId: string | number): void {
    const current = [...this.notificationsSubject.value];
    for (const group of current) {
      const n = group.items.find(i => i.id === notificationId);
      if (n) {
        n.isRead = true;
        break;
      }
    }
    this.reorganizeGroups(current);
    this.updateNotifications(current);
  }

  markAllAsRead(): void {
    const current = [...this.notificationsSubject.value];
    for (const g of current) for (const n of g.items) n.isRead = true;
    this.reorganizeGroups(current);
    this.updateNotifications(current);
  }

  removeNotification(notificationId: string | number): void {
    const current = this.notificationsSubject.value
      .map(g => ({ ...g, items: g.items.filter(i => i.id !== notificationId) }))
      .filter(g => g.items.length > 0);
    this.updateNotifications(current);
  }

  removeNotifications(notificationIds: (string | number)[]): void {
    const set = new Set(notificationIds);
    const current = this.notificationsSubject.value
      .map(g => ({ ...g, items: g.items.filter(i => !set.has(i.id)) }))
      .filter(g => g.items.length > 0);
    this.updateNotifications(current);
  }

  clearAll(): void {
    this.updateNotifications([]);
  }

  toggleNotificationSelection(notificationId: string | number): void {
    const current = [...this.notificationsSubject.value];
    for (const g of current) {
      const n = g.items.find(i => i.id === notificationId);
      if (n) {
        n.selected = !n.selected;
        break;
      }
    }
    this.updateNotifications(current);
  }

  getSelectedNotifications(): NotificationItem[] {
    return this.notificationsSubject.value.flatMap(g => g.items.filter(i => i.selected));
  }

  clearAllSelections(): void {
    const current = [...this.notificationsSubject.value];
    for (const g of current) for (const n of g.items) n.selected = false;
    this.updateNotifications(current);
  }

  removeSelectedNotifications(): void {
    this.removeNotifications(this.getSelectedNotifications().map(n => n.id));
  }

  success(message: string, title?: string, data?: any): void {
    this.addNotification({ type: 'success', title, message, icon: 'ti ti-check-circle', data });
  }

  error(message: string, title?: string, data?: any): void {
    this.addNotification({ type: 'danger', title, message, icon: 'ti ti-alert-circle', data });
  }

  warning(message: string, title?: string, data?: any): void {
    this.addNotification({ type: 'warning', title, message, icon: 'ti ti-alert-triangle', data });
  }

  info(message: string, title?: string, data?: any): void {
    this.addNotification({ type: 'info', title, message, icon: 'ti ti-info-circle', data });
  }

  /* --------------------------- PUSHER / REALTIME -------------------------- */

  initPusher(userId?: string | number): void {
    const config = (environment as any).pusher;
    if (!config?.key || !config?.cluster) {
      console.warn('[Pusher] No configurado en environment.');
      return;
    }
    console.debug('[Pusher] initPusher config:', config);

    this.disconnectPusher();

    if (!environment.production && config.logToConsole) {
      Pusher.logToConsole = true;
    }

    const token = this.authService.getToken ? this.authService.getToken() : null;
    if (!token) {
      console.warn('[Pusher] No JWT token disponible desde AuthenticationService.');
      return;
    }

    console.debug('[Pusher] Using token available:', !!token);

    this.pusher = new Pusher(config.key, {
      cluster: config.cluster,
      forceTLS: true,
      authEndpoint:environment.authEndpoint,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      },
      enabledTransports: ['ws', 'wss'],
      disabledTransports: ['xhr_streaming', 'xhr_polling']
    });

    this.pusher.connection.bind('error', (err: any) => {
      console.error('[Pusher] connection error:', err);
    });

    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const sessionUser = this.authService.getCurrentUser?.() || this.authService.currentUserValue;
      resolvedUserId = sessionUser?.id;
    }

    const channelPrefix = config.channelPrefix ?? 'notifications';
    const globalChannelName = config.globalChannel ?? `${channelPrefix}.global`;

    const globalChannel = this.subscribeChannel(globalChannelName);
    this.bindNotificationChannel(globalChannel, globalChannelName);
    console.debug(`[Pusher] Subscribed to global channel: ${globalChannelName}`);

    if (resolvedUserId) {
      const privateChannelName = `private-${channelPrefix}.${resolvedUserId}`;
      const userChannel = this.subscribeChannel(privateChannelName);
      this.bindNotificationChannel(userChannel, privateChannelName);
      console.debug(`[Pusher] Subscribed to private channel: ${privateChannelName}`);
    } else {
      console.warn('[Pusher] No userId disponible, no se suscribe al canal privado.');
    }
  }

  disconnectPusher(): void {
    this.unbindAll();
    if (this.pusher) {
      this.subscribedChannels.forEach(name => this.pusher!.unsubscribe(name));
      this.subscribedChannels.clear();
      this.pusher.disconnect();
      this.pusher = undefined;
    }
  }

  /**
   * Debug helper: return current pusher status and subscribed channels
   */
  public getPusherStatus(): { initialized: boolean; connectionState?: string; channels: string[] } {
    const initialized = !!this.pusher;
    const connectionState = initialized ? (this.pusher as any).connection?.state : undefined;
    return { initialized, connectionState, channels: Array.from(this.subscribedChannels) };
  }

  /**
   * Forzar re-inicialización de Pusher (útil en debugging después del login)
   */
  public reinitPusher(userId?: string | number): void {
    console.debug('[Pusher] reinitPusher called with userId:', userId);
    this.initPusher(userId);
  }

  /**
   * Marca una notificación como leída en el backend y actualiza el estado local
   */
  public markAsReadOnServer(notificationId: string | number): Observable<any> {
    const base = (environment as any).AUTH_API || '';
    const url = `${base.replace(/\/$/, '')}/notifications/${notificationId}/read`;
    const token = this.authService.getToken ? this.authService.getToken() : null;
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    console.debug('[NotificationService] markAsReadOnServer url:', url, 'id:', notificationId);

    return this.http.post(url, {}, { headers }).pipe(
      tap(() => {
        try {
          this.markAsRead(notificationId);
          console.debug('[NotificationService] markAsReadOnServer: marked locally', notificationId);
        } catch (err) {
          console.error('[NotificationService] markAsReadOnServer local update error:', err);
        }
      }),
      catchError(err => {
        console.error('[NotificationService] markAsReadOnServer error:', err);
        return of(null);
      })
    );
  }

  /**
   * Elimina una notificación en el backend y la quita del estado local
   */
  public deleteNotificationOnServer(notificationId: string | number): Observable<boolean> {
    const base = (environment as any).AUTH_API || '';
    const url = `${base.replace(/\/$/, '')}/notifications/${notificationId}`;
    const token = this.authService.getToken ? this.authService.getToken() : null;
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    console.debug('[NotificationService] deleteNotificationOnServer url:', url, 'id:', notificationId);

    return this.http.delete(url, { headers }).pipe(
      tap(() => {
        try {
          this.removeNotification(notificationId);
          console.debug('[NotificationService] deleteNotificationOnServer: removed locally', notificationId);
        } catch (err) {
          console.error('[NotificationService] deleteNotificationOnServer local update error:', err);
        }
      }),
      map(() => true),
      catchError(err => {
        console.error('[NotificationService] deleteNotificationOnServer error:', err);
        return of(false);
      })
    );
  }

  /**
   * Limpia notificaciones expiradas en el backend y actualiza el estado local
   */
  public cleanExpiredOnServer(): Observable<any> {
    const base = (environment as any).AUTH_API || '';
    const url = `${base.replace(/\/$/, '')}/notifications/actions/clean-expired`;
    const token = this.authService.getToken ? this.authService.getToken() : null;
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    console.debug('[NotificationService] cleanExpiredOnServer url:', url);

    return this.http.post<any>(url, {}, { headers }).pipe(
      tap((res) => {
        try {
          // Si el backend devuelve una lista de ids eliminados, limpiarlas localmente
          const removedIds: (string | number)[] = res?.removedIds || res?.deleted || [];
          if (Array.isArray(removedIds) && removedIds.length > 0) {
            this.removeNotifications(removedIds);
            console.debug('[NotificationService] cleanExpiredOnServer removedIds:', removedIds.length);
            return;
          }

          // Si no devuelve ids, refrescar la lista desde API
          this.fetchNotificationsFromApi().subscribe();
        } catch (err) {
          console.error('[NotificationService] cleanExpiredOnServer local update error:', err);
        }
      }),
      catchError(err => {
        console.error('[NotificationService] cleanExpiredOnServer error:', err);
        return of(null);
      })
    );
  }

  /**
   * Obtiene una notificación por id desde el backend, actualiza el estado local y la retorna
   */
  public getNotificationByIdFromApi(notificationId: string | number): Observable<NotificationItem | null> {
    const base = (environment as any).AUTH_API || '';
    const url = `${base.replace(/\/$/, '')}/notifications/${notificationId}`;
    const token = this.authService.getToken ? this.authService.getToken() : null;
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    console.debug('[NotificationService] getNotificationByIdFromApi url:', url);

    return this.http.get<any>(url, { headers }).pipe(
      map((res: any) => {
        const data = res?.data ?? res;
        const mapped = this.mapIncomingNotification(data, 'api');
        const full: NotificationItem = {
          ...mapped,
          id: mapped.id ?? this.generateId(),
          timestamp: mapped.timestamp ?? this.formatTimestamp(new Date()),
          isRead: mapped.isRead ?? false,
          selected: false
        } as NotificationItem;

        // Update local notifications: replace if exists, otherwise add to Nuevas
        const current = [...this.notificationsSubject.value];
        let updated = false;
        for (const g of current) {
          const idx = g.items.findIndex(i => i.id === full.id);
          if (idx >= 0) {
            g.items[idx] = full;
            updated = true;
            break;
          }
        }
        if (!updated) {
          let group = current.find(g => g.title === 'Nuevas');
          if (!group) {
            group = { title: 'Nuevas', items: [] };
            current.unshift(group);
          }
          group.items.unshift(full);
        }
        this.reorganizeGroups(current);
        this.updateNotifications(current);

        return full;
      }),
      catchError(err => {
        console.error('[NotificationService] getNotificationByIdFromApi error:', err);
        return of(null);
      })
    );
  }

  private bindNotificationChannel(channel: Channel, origin: string): void {
    this.bindEvent(channel, 'pusher:subscription_succeeded', () => {
      if (!environment.production) console.log(`[Pusher] Suscrito: ${origin}`);
    });

    this.bindEvent(channel, 'pusher:subscription_error', (status: any) => {
      console.error(`[Pusher] Error suscripción ${origin}:`, status);
    });

    this.bindEvent(channel, 'NotificationCreated', (data: any) => {
      this.handleIncomingNotification(data, origin);
    });
  }

  private subscribeChannel(name: string): Channel {
    if (!this.pusher) throw new Error('Pusher no inicializado');
    if (this.subscribedChannels.has(name)) {
      return this.pusher.channel(name) as Channel;
    }
    const channel = this.pusher.subscribe(name);
    this.subscribedChannels.add(name);
    return channel;
  }

  private bindEvent(channel: Channel, event: string, handler: (...args: any[]) => void): void {
    channel.bind(event, handler);
    this.bindings.push({ channel, event, handler });
  }

  private unbindAll(): void {
    this.bindings.forEach(b => b.channel.unbind(b.event, b.handler));
    this.bindings = [];
  }

  private handleIncomingNotification(data: any, origin: string): void {
    const notification = this.mapIncomingNotification(data, origin);
    this.addNotification(notification);

    const fullNotification: NotificationItem = {
      ...notification,
      id: notification.id ?? this.generateId(),
      timestamp: notification.timestamp ?? this.formatTimestamp(new Date()),
      isRead: notification.isRead ?? false,
      selected: notification.selected ?? false
    };

    try {
      this.incomingSubject.next(fullNotification);
    } catch {}
  }

  /**
   * Obtiene las notificaciones desde el backend y actualiza el estado local
   */
  public fetchNotificationsFromApi(): Observable<any> {
    const base = (environment as any).AUTH_API || '';
    const url = `${base.replace(/\/$/, '')}/notifications`;
    const token = this.authService.getToken ? this.authService.getToken() : null;
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    console.debug('[NotificationService] fetchNotificationsFromApi url:', url);

    return this.http.get<any>(url, { headers }).pipe(
      tap((res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && Array.isArray(res.data)) {
          list = res.data;
        } else if (res && Array.isArray(res.notifications)) {
          list = res.notifications;
        }

        if (!list.length) {
          console.debug('[NotificationService] No notifications returned from API');
          return;
        }

        const items = list.map(item => {
          const mapped = this.mapIncomingNotification(item, 'api');
          const full: NotificationItem = {
            ...mapped,
            id: mapped.id ?? this.generateId(),
            timestamp: mapped.timestamp ?? this.formatTimestamp(new Date()),
            isRead: mapped.isRead ?? false,
            selected: false
          } as NotificationItem;
          return full;
        });

        const group = { title: 'Nuevas', items } as NotificationGroup;
        this.updateNotifications([group]);
        console.debug('[NotificationService] Loaded notifications from API, count:', items.length);
      }),
      catchError(err => {
        console.error('[NotificationService] fetchNotificationsFromApi error:', err);
        return of(null);
      })
    );
  }

  private mapIncomingNotification(
    data: any,
    origin: string
  ): Omit<NotificationItem, 'id' | 'timestamp' | 'isRead' | 'selected'> &
    Partial<Pick<NotificationItem, 'id' | 'timestamp' | 'isRead' | 'selected'>> {
    return {
      id: data?.id ?? data?.uuid,
      timestamp: data?.timestamp ?? data?.created_at,
      isRead: data?.isRead ?? false,
      selected: false,
      type: data?.type ?? 'info',
      title: data?.title,
      message: data?.message ?? `Nueva notificación desde ${origin}`,
      avatar: data?.avatar,
      icon: data?.icon,
      data: data?.data ?? data
    };
  }

  /* ------------------------------ STORAGE ------------------------------- */

  private loadNotifications(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.notificationsSubject.next(JSON.parse(stored));
      } else {
        this.loadDefaultNotifications();
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.loadDefaultNotifications();
    }
  }

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

  private updateNotifications(notifications: NotificationGroup[]): void {
    this.notificationsSubject.next(notifications);
    this.saveNotifications(notifications);
  }

  private saveNotifications(notifications: NotificationGroup[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  private reorganizeGroups(notifications: NotificationGroup[]): void {
    const allItems = notifications.flatMap(g => g.items);
    const unreadItems = allItems.filter(i => !i.isRead);
    const readItems = allItems.filter(i => i.isRead);

    notifications.length = 0;
    if (unreadItems.length) notifications.push({ title: 'Nuevas', items: unreadItems });
    if (readItems.length) notifications.push({ title: 'Leídas Anteriormente', items: readItems });
  }

  private generateId(): string {
    return `${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
  }

  private formatTimestamp(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} hr${diffHours > 1 ? 's' : ''}`;
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  }

  deleteNotification(id: string | number): void {
    this.removeNotification(id);
  }
}

