import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MenuItem } from '../../layouts/sidebar/menu.model';
import { AuthenticationService } from './auth.service';
import { icon } from 'leaflet';

export interface MenuConfig {
  [key: string]: MenuItem[];
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private menuItemsSubject = new BehaviorSubject<MenuItem[]>([]);
  public menuItems$ = this.menuItemsSubject.asObservable();

  // 🎯 Configuración de menús por rol según tu backend
  private menuConfig: MenuConfig = {
    // DEV: Desarrollador - Acceso completo
    'DEV': [
      {
        id: 1,
        label: 'MENUITEMS.MENU.TEXT',
        isTitle: true
      },
      {
        id: 2,
        label: 'MENUITEMS.DASHBOARD.TEXT',
        icon: 'ti ti-brand-google-home',
        subItems: [
          {
            id: 3,
            label: 'MENUITEMS.DASHBOARD.LIST.ANALYTICS',
            link: '/',
            parentId: 2
          }
        ]
      },
      {
        id: 8,
        label: 'MENUITEMS.APPS.TEXT',
        isTitle: true
      },
      {
        id: 9,
        label: 'MENUITEMS.APPS.LIST.CALENDAR',
        icon: 'ti ti-calendar',
        link: '/apps/calendar',
        parentId: 8
      },
      {
        id: 10,
        label: 'MENUITEMS.APPS.LIST.CHAT',
        icon: 'ti ti-messages',
        link: '/apps/chat',
        parentId: 8
      },
      {
        id: 11,
        label: 'MENUITEMS.APPS.LIST.EMAIL',
        icon: 'ti ti-mail',
        link: '/apps/email',
        parentId: 8,
      },
      {
        id: 23,
        label: 'MENUITEMS.APPS.LIST.FILEMANAGER',
        icon: 'ti ti-folders',
        link: '/apps/file-manager',
        parentId: 8,
      },
      {
        id: 24,
        label: 'MENUITEMS.APPS.LIST.TODO',
        icon: 'ti ti-list',
        link: '/apps/to-do',
        parentId: 8,
      },
      {
        id: 25,
        label: 'MENUITEMS.APPS.LIST.CONTACTS',
        icon: 'ti ti-address-book',
        link: '/apps/contacts',
        parentId: 8,
      },
      {
        id: 26,
        label: 'MENUITEMS.APPS.LIST.KANBANBOARD',
        icon: 'ti ti-subtask',
        link: '/apps/kanbanboard',
        parentId: 8,
      },
      {
        id: 100,
        label: 'MENUITEMS.MODULES.TEXT',
        isTitle: true
      },
      {
        id: 101,
        label: 'MENUITEMS.USERMANAGEMENT.TEXT',
        icon: 'ti ti-user',
        subItems: [
          {
            id: 102,
            label: 'MENUITEMS.USERMANAGEMENT.LIST.USERMANAGEMENT',
            link: '/modules/users',
            parentId: 101
          },
          {
            id: 103,
            label: 'MENUITEMS.USERMANAGEMENT.LIST.WORKLOGUSERS',
            link: '/modules/worklog-users',
            parentId: 101
          }
        ],
        parentId: 100
      },
      {
        id: 103,
        label: 'MENUITEMS.FORMMANAGER.TEXT',
        icon: 'ti ti-box',
        subItems: [
          {
            id: 104,
            label: 'MENUITEMS.FORMMANAGER.LIST.FORMRESPONSES',
            link: '/modules/forms',
            parentId: 103
          },
          {
            id: 105,
            label: 'MENUITEMS.FORMMANAGER.LIST.FORMMANAGER',
            link: '/modules/forms/forms-manager',
            parentId: 103
          },
          {
            id: 106,
            label: 'MENUITEMS.FORMMANAGER.LIST.FORMSTRAZABILITY',
            link: '/modules/forms/forms-trazability',
            parentId: 103
          },
          {
            id: 107,
            label: 'MENUITEMS.FORMMANAGER.LIST.FORMRESPONSESDETAIL',
            link: '/modules/forms/forms-responses',
            parentId: 103
          }
        ],
        parentId: 100 
      },/*
      {INVENTORY
        id: 200,
        label: 'MENUITEMS.ADMIN.TEXT',
        isTitle: true
      },
      {
        id: 201,
        label: 'MENUITEMS.ADMIN.LIST.USERS',
        icon: 'ti ti-users',
        link: '/admin/users',
        parentId: 200
      },
      {
        id: 202,
        label: 'MENUITEMS.ADMIN.LIST.SETTINGS',
        icon: 'ti ti-settings',
        link: '/admin/settings',
        parentId: 200
      }*/
    ],

    // GG: Gerente General - Dashboard y aplicaciones principales
    'GG': [
      {
        id: 1,
        label: 'MENUITEMS.MENU.TEXT',
        isTitle: true
      },
      {
        id: 2,
        label: 'MENUITEMS.DASHBOARD.TEXT',
        icon: 'ti ti-brand-google-home',
        subItems: [
          {
            id: 3,
            label: 'MENUITEMS.DASHBOARD.LIST.ANALYTICS',
            link: '/',
            parentId: 2
          }
        ]
      },
      {
        id: 8,
        label: 'MENUITEMS.APPS.TEXT',
        isTitle: true
      },
      {
        id: 9,
        label: 'MENUITEMS.APPS.LIST.CALENDAR',
        icon: 'ti ti-calendar',
        link: '/apps/calendar',
        parentId: 8
      },
      {
        id: 11,
        label: 'MENUITEMS.APPS.LIST.EMAIL',
        icon: 'ti ti-mail',
        link: '/apps/email',
        parentId: 8,
      },
      {
        id: 26,
        label: 'MENUITEMS.APPS.LIST.KANBANBOARD',
        icon: 'ti ti-subtask',
        link: '/apps/kanbanboard',
        parentId: 8,
      },
      {
        id: 100,
        label: 'MENUITEMS.MODULES.TEXT',
        isTitle: true,
        subItems: [
          {
            id: 101,
            label: 'MENUITEMS.MODULES.LIST.USERMANAGEMENT',
            icon: 'ti ti-user',
            link: '/pages/modules/users',
            parentId: 100
          },
          {
            id: 102,
            label: 'MENUITEMS.MODULES.LIST.INVENTORY',
            icon: 'ti ti-box',
            link: '/pages/modules/inventory',
            parentId: 100
          },
          {
            id: 103,
            label: 'MENUITEMS.MODULES.LIST.FORMS',
            icon: 'ti ti-forms',
            link: '/pages/modules/forms',
            parentId: 100
          }
        ]
      }
    ],

    // INGPL: Ingeniero de Planta - Dashboard y herramientas de planta
    'INGPL': [
      {
        id: 1,
        label: 'MENUITEMS.MENU.TEXT',
        isTitle: true
      },
      {
        id: 2,
        label: 'MENUITEMS.DASHBOARD.TEXT',
        icon: 'ti ti-brand-google-home',
        subItems: [
          {
            id: 3,
            label: 'MENUITEMS.DASHBOARD.LIST.ANALYTICS',
            link: '/',
            parentId: 2
          }
        ]
      },
      {
        id: 8,
        label: 'MENUITEMS.APPS.TEXT',
        isTitle: true
      },
      {
        id: 26,
        label: 'MENUITEMS.APPS.LIST.KANBANBOARD',
        icon: 'ti ti-subtask',
        link: '/apps/kanbanboard',
        parentId: 8,
      },
      {
        id: 24,
        label: 'MENUITEMS.APPS.LIST.TODO',
        icon: 'ti ti-list',
        link: '/apps/to-do',
        parentId: 8,
      },
      {
        id: 100,
        label: 'MENUITEMS.MODULES.TEXT',
        isTitle: true
      }
    ],

    // INGPR: Ingeniero de Producción - Dashboard y herramientas de producción
    'INGPR': [
      {
        id: 1,
        label: 'MENUITEMS.MENU.TEXT',
        isTitle: true
      },
      {
        id: 2,
        label: 'MENUITEMS.DASHBOARD.TEXT',
        icon: 'ti ti-brand-google-home',
        subItems: [
          {
            id: 3,
            label: 'MENUITEMS.DASHBOARD.LIST.ANALYTICS',
            link: '/',
            parentId: 2
          }
        ]
      },
      {
        id: 8,
        label: 'MENUITEMS.APPS.TEXT',
        isTitle: true
      },
      {
        id: 26,
        label: 'MENUITEMS.APPS.LIST.KANBANBOARD',
        icon: 'ti ti-subtask',
        link: '/apps/kanbanboard',
        parentId: 8,
      },
      {
        id: 24,
        label: 'MENUITEMS.APPS.LIST.TODO',
        icon: 'ti ti-list',
        link: '/apps/to-do',
        parentId: 8,
      },
      {
        id: 100,
        label: 'MENUITEMS.MODULES.TEXT',
        isTitle: true
      }
    ],

    // TRZ: Trazabilidad - Aplicaciones específicas de trazabilidad
    'TRZ': [
      {
        id: 1,
        label: 'MENUITEMS.MENU.TEXT',
        isTitle: true
      },
      {
        id: 8,
        label: 'MENUITEMS.APPS.TEXT',
        isTitle: true
      },
      {
        id: 26,
        label: 'MENUITEMS.APPS.LIST.KANBANBOARD',
        icon: 'ti ti-subtask',
        link: '/apps/kanbanboard',
        parentId: 8,
      },
      {
        id: 24,
        label: 'MENUITEMS.APPS.LIST.TODO',
        icon: 'ti ti-list',
        link: '/apps/to-do',
        parentId: 8,
      },
      {
        id: 25,
        label: 'MENUITEMS.APPS.LIST.CONTACTS',
        icon: 'ti ti-address-book',
        link: '/apps/contacts',
        parentId: 8,
      }
    ],

    // OP: Operador - Solo Kanban y herramientas básicas
    'OP': [
      {
        id: 1,
        label: 'MENUITEMS.MENU.TEXT',
        isTitle: true
      },
      {
        id: 8,
        label: 'MENUITEMS.APPS.TEXT',
        isTitle: true
      },
      {
        id: 26,
        label: 'MENUITEMS.APPS.LIST.KANBANBOARD',
        icon: 'ti ti-subtask',
        link: '/apps/kanbanboard',
        parentId: 8,
      },
      {
        id: 24,
        label: 'MENUITEMS.APPS.LIST.TODO',
        icon: 'ti ti-list',
        link: '/apps/to-do',
        parentId: 8,
      }
    ]
  };

  constructor(private authService: AuthenticationService) { }

  /**
   * Obtener menús según el rol del usuario actual
   */
  getMenuByRole(userRole?: string): MenuItem[] {
    const role = userRole || this.getCurrentUserRole();
    return this.menuConfig[role] || [];
  }

  /**
   * Actualizar los menús según el usuario logueado
   */
  updateMenuItems(): void {
    const currentUser = this.authService.currentUserValue;
    const userRole = currentUser?.role || 'OP'; // Cambiar default a 'OP'
    const menuItems = this.getMenuByRole(userRole);

    //console.log('🔄 MENU SERVICE - updateMenuItems called');
    //console.log('👤 MENU SERVICE - Current user:', currentUser?.name || 'null');
    //console.log('🎭 MENU SERVICE - User role:', userRole);
    //console.log('📋 MENU SERVICE - Menu items count:', menuItems?.length || 0);

    this.menuItemsSubject.next(menuItems);

    // Emitir log cuando se actualicen los menús
    //console.log('✅ MENU SERVICE - Menu items updated and emitted');
  }

  /**
   * Forzar actualización de menús con un rol específico
   */
  forceUpdateMenuItems(role?: string): void {
    const currentUser = this.authService.currentUserValue;
    const userRole = role || currentUser?.role || 'OP';
    const menuItems = this.getMenuByRole(userRole);

    //console.log('🔧 MENU SERVICE - forceUpdateMenuItems called with role:', userRole);
    this.menuItemsSubject.next(menuItems);
  }

  /**
   * Obtener el rol del usuario actual
   */
  private getCurrentUserRole(): string {
    const currentUser = this.authService.currentUserValue;
    const role = currentUser?.role || 'OP'; // Por defecto OP (menor privilegio)
    //console.log('🎭 MENU SERVICE - getCurrentUserRole:', role, 'currentUser:', currentUser);
    return role;
  }

  /**
   * Obtener la ruta por defecto según el rol
   */
  getDefaultRouteByRole(role: string): string {
    const routeMap: { [key: string]: string } = {
      'DEV': '/', // Dashboard completo
      'GG': '/', // Dashboard gerencial  
      'INGPL': '/', // Dashboard de planta
      'INGPR': '/', // Dashboard de producción
      'TRZ': '/apps/kanbanboard', // Kanban para trazabilidad
      'OP': '/apps/kanbanboard' // Solo Kanban para operadores
    };

    return routeMap[role] || '/apps/kanbanboard';
  }

  /**
   * Verificar si el usuario tiene acceso a una ruta específica
   */
  hasAccessToRoute(route: string): boolean {
    const userRole = this.getCurrentUserRole();
    const userMenus = this.getMenuByRole(userRole);
    const hasAccess = this.findRouteInMenus(userMenus, route);

    //console.log('🔐 MENU SERVICE - hasAccessToRoute:', route, 'role:', userRole, 'hasAccess:', hasAccess);
    return hasAccess;
  }

  /**
   * Buscar una ruta específica en los menús
   */
  private findRouteInMenus(menus: MenuItem[], route: string): boolean {
    for (const menu of menus) {
      if (menu.link === route) {
        return true;
      }
      if (menu.subItems && this.findRouteInMenus(menu.subItems, route)) {
        return true;
      }
    }
    return false;
  }
}