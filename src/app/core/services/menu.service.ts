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


    'DEV': [
      /*{ id: 1, label: 'MENUITEMS.MENU.TEXT', isTitle: true },

       Dashboard 
      {
        id: 2,
        label: 'MENUITEMS.DASHBOARD.TEXT',
        icon: 'ti ti-brand-google-home',
        subItems: [
          { id: 3, label: 'MENUITEMS.DASHBOARD.LIST.ANALYTICS', link: '/', parentId: 2 }
        ]
      },
      { id: 4, label: 'MENUITEMS.APPS.TEXT', isTitle: true },

      { id: 5, label: 'MENUITEMS.APPS.LIST.CALENDAR', icon: 'ti ti-calendar', link: '/apps/calendar' },
      { id: 6, label: 'MENUITEMS.APPS.LIST.CHAT', icon: 'ti ti-messages', link: '/apps/chat' },
      { id: 7, label: 'MENUITEMS.APPS.LIST.EMAIL', icon: 'ti ti-mail', link: '/apps/email' },
      { id: 8, label: 'MENUITEMS.APPS.LIST.FILEMANAGER', icon: 'ti ti-folders', link: '/apps/file-manager' },
      { id: 9, label: 'MENUITEMS.APPS.LIST.TODO', icon: 'ti ti-list', link: '/apps/to-do' },
      { id: 10, label: 'MENUITEMS.APPS.LIST.CONTACTS', icon: 'ti ti-address-book', link: '/apps/contacts' },
      { id: 11, label: 'MENUITEMS.APPS.LIST.KANBANBOARD', icon: 'ti ti-subtask', link: '/apps/kanbanboard' },
*/
      /* Módulos */
      { id: 12, label: 'MENUITEMS.MODULES.TEXT', isTitle: true },

      /* Users */
      {
        id: 13,
        label: 'MENUITEMS.USERMANAGEMENT.TEXT',
        icon: 'ti ti-users-group',
        subItems: [
          { id: 14, label: 'MENUITEMS.USERMANAGEMENT.LIST.USERMANAGEMENT', link: '/modules/users', parentId: 13 },
          { id: 15, label: 'MENUITEMS.USERMANAGEMENT.LIST.WORKLOGUSERS', link: '/modules/users/worklog-users', parentId: 13 },
          { id: 16, label: 'MENUITEMS.USERMANAGEMENT.LIST.ANALYTICS', link: '/modules/users/analytics', parentId: 13 }
        ]
      },

      /* Forms */
      {
        id: 17,
        label: 'MENUITEMS.FORMMANAGER.TEXT',
        icon: 'ti ti-clipboard-list',
        subItems: [
          { id: 18, label: 'MENUITEMS.FORMMANAGER.LIST.FORMRESPONSES', link: '/modules/forms', parentId: 17 },
          { id: 19, label: 'MENUITEMS.FORMMANAGER.LIST.FORMMANAGER', link: '/modules/forms/forms-manager', parentId: 17 },
          { id: 20, label: 'MENUITEMS.FORMMANAGER.LIST.FORMSTRAZABILITY', link: '/modules/forms/forms-trazability', parentId: 17 },
          { id: 21, label: 'MENUITEMS.FORMMANAGER.LIST.FORMRESPONSESDETAIL', link: '/modules/forms/forms-responses', parentId: 17 }
        ]
      },

      /* Inventory */
      {
        id: 22,
        label: 'MENUITEMS.INVENTORY.TEXT',
        icon: 'ti ti-building-warehouse',
        subItems: [
          { id: 23, label: 'MENUITEMS.INVENTORY.LIST.GESTIONINVENTORY', link: '/modules/inventory', parentId: 22 },
          { id: 24, label: 'MENUITEMS.INVENTORY.LIST.INVENTORYMOVEMENT', link: '/modules/inventory/inventoryMovement', parentId: 22 },
          { id: 25, label: 'MENUITEMS.INVENTORY.LIST.RAWMATERIALS', link: '/modules/inventory/rawMaterial', parentId: 22 },
          { id: 26, label: 'MENUITEMS.INVENTORY.LIST.BATCHEMOVEMENT', link: '/modules/inventory/batchMovement', parentId: 22 }
        ]
      },

      /* Products */
      {
        id: 27,
        label: 'MENUITEMS.PRODUCT.TEXT',
        icon: 'ti ti-package',
        subItems: [
          { id: 28, label: 'MENUITEMS.PRODUCT.LIST.PRODUCTSANALYTICS', link: '/modules/product/analytics', parentId: 27 },
          { id: 29, label: 'MENUITEMS.PRODUCT.LIST.PRODUCTSLIST', link: '/modules/product', parentId: 27 }
        ]
      },

      /* Batches */
      {
        id: 30,
        label: 'MENUITEMS.BATCHES.TEXT',
        icon: 'ti ti-layers-intersect',
        subItems: [
          { id: 31, label: 'MENUITEMS.BATCHES.LIST.BATCHLIST', link: '/modules/batches', parentId: 30 },
          { id: 32, label: 'MENUITEMS.BATCHES.LIST.ANALYTICS', link: '/modules/batches/analytics', parentId: 30 },
          { id: 33, label: 'MENUITEMS.BATCHES.LIST.BATCHTRACKING', link: '/modules/batches/batch-tracking', parentId: 30 },
          { id: 34, label: 'MENUITEMS.BATCHES.LIST.BATCHREPORT', link: '/modules/batches/batch-report', parentId: 30 }
        ]
      }
    ],


    'GG': [
      /*
      { id: 101, label: 'MENUITEMS.MENU.TEXT', isTitle: true },

      {
        id: 102,
        label: 'MENUITEMS.DASHBOARD.TEXT',
        icon: 'ti ti-brand-google-home',
        subItems: [
          { id: 103, label: 'MENUITEMS.DASHBOARD.LIST.ANALYTICS', link: '/', parentId: 102 }
        ]
      },
 */
      /* Módulos completos */
      { id: 104, label: 'MENUITEMS.MODULES.TEXT', isTitle: true },

      /* Inventario */
      {
        id: 105,
        label: 'MENUITEMS.INVENTORY.TEXT',
        icon: 'ti ti-building-warehouse',
        subItems: [
          { id: 106, label: 'MENUITEMS.INVENTORY.LIST.GESTIONINVENTORY', link: '/modules/inventory', parentId: 105 },
          { id: 107, label: 'MENUITEMS.INVENTORY.LIST.INVENTORYMOVEMENT', link: '/modules/inventory/inventoryMovement', parentId: 105 },
          { id: 108, label: 'MENUITEMS.INVENTORY.LIST.RAWMATERIALS', link: '/modules/inventory/rawMaterial', parentId: 105 },
          { id: 109, label: 'MENUITEMS.INVENTORY.LIST.BATCHEMOVEMENT', link: '/modules/inventory/batchMovement', parentId: 105 }
        ]
      },

      /* Productos */
      {
        id: 110,
        label: 'MENUITEMS.PRODUCT.TEXT',
        icon: 'ti ti-package',
        subItems: [
          { id: 111, label: 'MENUITEMS.PRODUCT.LIST.PRODUCTSANALYTICS', link: '/modules/product/analytics', parentId: 110 },
          { id: 112, label: 'MENUITEMS.PRODUCT.LIST.PRODUCTSLIST', link: '/modules/product', parentId: 110 }
        ]
      },

      /* Batches */
      {
        id: 113,
        label: 'MENUITEMS.BATCHES.TEXT',
        icon: 'ti ti-layers-intersect',
        subItems: [
          { id: 114, label: 'MENUITEMS.BATCHES.LIST.BATCHLIST', link: '/modules/batches', parentId: 113 },
          { id: 115, label: 'MENUITEMS.BATCHES.LIST.ANALYTICS', link: '/modules/batches/analytics', parentId: 113 },
          { id: 116, label: 'MENUITEMS.BATCHES.LIST.BATCHTRACKING', link: '/modules/batches/batch-tracking', parentId: 113 }
        ]
      },

      /* Formularios */
      {
        id: 117,
        label: 'MENUITEMS.FORMMANAGER.TEXT',
        icon: 'ti ti-clipboard-list',
        subItems: [
          { id: 118, link: '/modules/forms', label: 'MENUITEMS.FORMMANAGER.LIST.FORMRESPONSES', parentId: 117 },
          { id: 119, link: '/modules/forms/forms-manager', label: 'MENUITEMS.FORMMANAGER.LIST.FORMMANAGER', parentId: 117 }
        ]
      },

      /* Usuarios */
      {
        id: 120,
        label: 'MENUITEMS.USERMANAGEMENT.TEXT',
        icon: 'ti ti-users-group',
        subItems: [
          { id: 121, label: 'MENUITEMS.USERMANAGEMENT.LIST.USERMANAGEMENT', link: '/modules/users', parentId: 120 },
          { id: 122, label: 'MENUITEMS.USERMANAGEMENT.LIST.ANALYTICS', link: '/modules/users/analytics', parentId: 120 }
        ]
      }
    ],


    'INGPL': [
      /* { id: 201, label: 'MENUITEMS.MENU.TEXT', isTitle: true },
 
       {
         id: 202,
         label: 'MENUITEMS.DASHBOARD.TEXT',
         icon: 'ti ti-brand-google-home',
         subItems: [{ id: 203, label: 'MENUITEMS.DASHBOARD.LIST.ANALYTICS', link: '/', parentId: 202 }]
       },
 */
      { id: 204, label: 'MENUITEMS.MODULES.TEXT', isTitle: true },

      /* Inventario */
      {
        id: 205,
        label: 'MENUITEMS.INVENTORY.TEXT',
        icon: 'ti ti-building-warehouse',
        subItems: [
          { id: 206, link: '/modules/inventory', label: 'MENUITEMS.INVENTORY.LIST.GESTIONINVENTORY', parentId: 205 },
          { id: 207, link: '/modules/inventory/inventoryMovement', label: 'MENUITEMS.INVENTORY.LIST.INVENTORYMOVEMENT', parentId: 205 }
        ]
      },

      /* Productos */
      {
        id: 208,
        label: 'MENUITEMS.PRODUCT.TEXT',
        icon: 'ti ti-package',
        subItems: [
          { id: 209, link: '/modules/product', label: 'MENUITEMS.PRODUCT.LIST.PRODUCTSLIST', parentId: 208 }
        ]
      },

      /* Batches */
      {
        id: 210,
        label: 'MENUITEMS.BATCHES.TEXT',
        icon: 'ti ti-layers-intersect',
        subItems: [
          { id: 211, link: '/modules/batches', label: 'MENUITEMS.BATCHES.LIST.BATCHLIST', parentId: 210 },
          { id: 212, link: '/modules/batches/batch-tracking', label: 'MENUITEMS.BATCHES.LIST.BATCHTRACKING', parentId: 210 }
        ]
      },

      /* Formularios */
      {
        id: 213,
        label: 'MENUITEMS.FORMMANAGER.TEXT',
        icon: 'ti ti-clipboard-list',
        subItems: [
          { id: 214, link: '/modules/forms', label: 'MENUITEMS.FORMMANAGER.LIST.FORMRESPONSES', parentId: 213 }
        ]
      },

      /* Trazabilidad */
      {
        id: 215,
        label: 'MENUITEMS.TRACEABILITY.TEXT',
        icon: 'ti ti-route',
        link: '/modules/traceability'
      }
    ],

    'INGPR': [

      /*
      { id: 301, label: 'MENUITEMS.MENU.TEXT', isTitle: true },

      {
        id: 302,
        label: 'MENUITEMS.DASHBOARD.TEXT',
        icon: 'ti ti-brand-google-home',
        subItems: [{ id: 303, label: 'MENUITEMS.DASHBOARD.LIST.ANALYTICS', link: '/', parentId: 302 }]
      },*/

      { id: 304, label: 'MENUITEMS.MODULES.TEXT', isTitle: true },

      /* Inventario */
      {
        id: 305,
        label: 'MENUITEMS.INVENTORY.TEXT',
        icon: 'ti ti-building-warehouse',
        subItems: [
          { id: 306, link: '/modules/inventory', label: 'MENUITEMS.INVENTORY.LIST.GESTIONINVENTORY', parentId: 305 },
          { id: 307, link: '/modules/inventory/inventoryMovement', label: 'MENUITEMS.INVENTORY.LIST.INVENTORYMOVEMENT', parentId: 305 }
        ]
      },

      /* Productos */
      {
        id: 308,
        label: 'MENUITEMS.PRODUCT.TEXT',
        icon: 'ti ti-package',
        subItems: [
          { id: 309, link: '/modules/product', label: 'MENUITEMS.PRODUCT.LIST.PRODUCTSLIST', parentId: 308 }
        ]
      },

      /* Batches */
      {
        id: 310,
        label: 'MENUITEMS.BATCHES.TEXT',
        icon: 'ti ti-layers-intersect',
        subItems: [
          { id: 311, link: '/modules/batches', label: 'MENUITEMS.BATCHES.LIST.BATCHLIST', parentId: 310 },
          { id: 312, link: '/modules/batches/batch-tracking', label: 'MENUITEMS.BATCHES.LIST.BATCHTRACKING', parentId: 310 }
        ]
      },

      /* Formularios */
      {
        id: 313,
        label: 'MENUITEMS.FORMMANAGER.TEXT',
        icon: 'ti ti-clipboard-list',
        subItems: [
          { id: 314, link: '/modules/forms', label: 'MENUITEMS.FORMMANAGER.LIST.FORMRESPONSES', parentId: 313 }
        ]
      },

      /* Trazabilidad */
      {
        id: 315,
        label: 'MENUITEMS.TRACEABILITY.TEXT',
        icon: 'ti ti-route',
        link: '/modules/traceability'
      }
    ],


    'TRZ': [
      {
        id: 403,
        label: 'MENUITEMS.BATCHES.TEXT',
        icon: 'ti ti-layers-intersect',
        subItems: [
          { id: 404, link: '/modules/batches', label: 'MENUITEMS.BATCHES.LIST.BATCHLIST', parentId: 403 },
          { id: 405, link: '/modules/batches/batch-tracking', label: 'MENUITEMS.BATCHES.LIST.BATCHTRACKING', parentId: 403 },
          { id: 406, label: 'MENUITEMS.BATCHES.LIST.BATCHREPORT', link: '/modules/batches/batch-report', parentId: 403 }
        ]
      },
      {
        id: 401,
        label: 'MENUITEMS.PRODUCT.TEXT',
        icon: 'ti ti-package',
        subItems: [
          { id: 402, link: '/modules/product', label: 'MENUITEMS.PRODUCT.LIST.PRODUCTSLIST', parentId: 401 }
        ]
      },
      {
        id: 407,
        label: 'MENUITEMS.INVENTORY.TEXT',
        icon: 'ti ti-building-warehouse',
        subItems: [
          { id: 407, link: '/modules/inventory', label: 'MENUITEMS.INVENTORY.LIST.GESTIONINVENTORY', parentId: 407 }
        ]
      },
      {
        id: 408,
        label: 'MENUITEMS.FORMMANAGER.TEXT',
        icon: 'ti ti-clipboard-list',
        subItems: [
          { id: 409, link: '/modules/forms/forms-trazability', label: 'MENUITEMS.FORMMANAGER.LIST.FORMSTRAZABILITY', parentId: 408 },
          { id: 410, label: 'MENUITEMS.FORMMANAGER.LIST.FORMRESPONSESDETAIL', link: '/modules/forms/forms-responses', parentId: 408 }
        ]
      }
    ],

    'OP': [
      {
        id: 1,
        label: 'MENUITEMS.MENU.TEXT',
        isTitle: true
      },
      {
        id: 200,
        label: 'MENUITEMS.INVENTORY.TEXT',
        icon: 'ti ti-building-warehouse',
        subItems: [
          {
            id: 201,
            label: 'MENUITEMS.INVENTORY.LIST.GESTIONINVENTORY',
            link: '/modules/inventory',
            parentId: 200
          },
          {
            id: 202,
            label: 'MENUITEMS.INVENTORY.LIST.INVENTORYMOVEMENT',
            link: '/modules/inventory/inventoryMovement',
            parentId: 200
          },
          {
            id: 203,
            label: 'MENUITEMS.INVENTORY.LIST.RAWMATERIALS',
            link: '/modules/inventory/rawMaterial',
            parentId: 200
          },
          {
            id: 204,
            label: 'MENUITEMS.INVENTORY.LIST.BATCHEMOVEMENT',
            link: '/modules/inventory/batchMovement',
            parentId: 200
          }
        ],
        parentId: 100
      },
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
    const normalizedRole = (role || '').trim().toUpperCase();
    const routeMap: { [key: string]: string } = {
      'DEV': '/modules/users/analytics', // Dashboard completo
      'GG': '/', // Dashboard gerencial  
      'INGPL': '/', // Dashboard de planta
      'INGPR': '/', // Dashboard de producción
      'TRZ': '/modules/batches', // Kanban para trazabilidad
      'OP': '/modules/inventory' // Solo Kanban para operadores
    };

    return routeMap[normalizedRole] || '/modules/inventory';
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