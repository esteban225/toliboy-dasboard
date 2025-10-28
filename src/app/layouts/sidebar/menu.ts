import { MenuItem } from "./menu.model";

export const MENU: MenuItem[] = [
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
            },
            /*{
                id: 5,
                label: 'MENUITEMS.DASHBOARD.LIST.ECOMMERCE',
                link: '/ecommerce',
                parentId: 2
            }*/
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
        id: 50,
        label: 'MENUITEMS.APPS.LIST.USERS',
        icon: 'ti ti-users',
        subItems: [
            {
                id: 51,
                label: 'MENUITEMS.APPS.LIST.USERS.LIST',
                link: '/pages/modules/users',
                parentId: 50
            },
            {
                id: 52,
                label: 'MENUITEMS.APPS.LIST.USERS.NEW',
                link: '/pages/modules/users/new',
                parentId: 50
            }
        ]
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
        id: 23,
        label: 'MENUITEMS.APPS.LIST.TODO',
        icon: 'ti ti-list',
        link: '/apps/to-do',
        parentId: 8,
    },
    {
        id: 23,
        label: 'MENUITEMS.APPS.LIST.CONTACTS',
        icon: 'ti ti-address-book',
        link: '/apps/contacts',
        parentId: 8,
    },
    {
        id: 23,
        label: 'MENUITEMS.APPS.LIST.KANBANBOARD',
        icon: 'ti ti-subtask',
        link: '/apps/kanbanboard',
        parentId: 8,
    },
   /* {
        id: 39,
        label: 'MENUITEMS.APPS.LIST.INVOICES',
        icon: 'ti ti-file-invoice',
        parentId: 8,
        subItems: [
            {
                id: 40,
                label: 'MENUITEMS.APPS.LIST.LISTVIEW',
                link: '/invoices/list',
                parentId: 39
            },
            {
                id: 41,
                label: 'MENUITEMS.APPS.LIST.OVERVIEW',
                link: '/invoices/overview',
                parentId: 39
            },
            {
                id: 42,
                label: 'MENUITEMS.APPS.LIST.CREATEINVOICE',
                link: '/invoices/create',
                parentId: 39
            }
        ]
    }
*/
    {
        id: 100,
        label: 'MENUITEMS.MODULES.TEXT',
        isTitle: true
    },

]