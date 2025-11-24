import { DOCUMENT } from '@angular/common';
import { Component, EventEmitter, Inject, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { EventService } from 'src/app/core/services/event.service';
import { LanguageService } from 'src/app/core/services/language.service';
import { NotificationService, NotificationGroup } from 'src/app/core/services/notification.service';
// Get Cart Data
import { cartList } from './data';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { RootReducerState, getLayoutMode } from 'src/app/store/reducers';
import { Store } from '@ngrx/store';
import { changeMode } from 'src/app/store/actions/layout-action';
import { logout, logoutSuccess } from 'src/app/store/actions/authentication.actions';
import { AlertService } from 'src/app/core/services/alert.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})

// Topbar Component
export class TopbarComponent {

  country: any;
  selectedItem!: any;

  flagvalue: any;
  valueset: any;
  countryName: any;
  cookieValue: any;
  userData: any;
  cartData: any;

  element: any;
  mode: string | undefined;

  total: any;
  subtotal: any = 0;
  totalsum: any;
  taxRate: any = 0.125;
  shippingRate: any = '65.00';
  discountRate: any = 0.15;
  discount: any;
  tax: any;
  fullscreenicon: any = 'arrows-maximize';

  notificationList: NotificationGroup[] = [];
  totalNotify: number = 0;
  newNotify: number = 0;
  readNotify: number = 0;

  @Output() mobileMenuButtonClicked = new EventEmitter();
  @ViewChild('removeNotificationModal', { static: false }) removeNotificationModal?: ModalDirective;
  @ViewChild('removeCartModal', { static: false }) removeCartModal?: ModalDirective;
  deleteid: any;

  constructor(@Inject(DOCUMENT) private document: any,
    private eventService: EventService,
    public languageService: LanguageService,
    private authService: AuthenticationService,
    private router: Router,
    private store: Store<RootReducerState>,
    public _cookiesService: CookieService,
    private alertService: AlertService,
    private notificationService: NotificationService) { }

  ngOnInit(): void {
    this.element = document.documentElement;
    this.cartData = cartList
    this.cartData.map((x: any) => {
      x['total'] = (x['qty'] * x['price']).toFixed(2)
      this.subtotal += parseFloat(x['total'])
    })
    this.subtotal = this.subtotal.toFixed(2)
    this.discount = (this.subtotal * this.discountRate).toFixed(2)
    this.tax = (this.subtotal * this.taxRate).toFixed(2);
    this.totalsum = (parseFloat(this.subtotal) + parseFloat(this.tax) + parseFloat(this.shippingRate) - parseFloat(this.discount)).toFixed(2)


    // Configurar idioma por defecto: Español
    this.cookieValue = this._cookiesService.get('lang') || 'es';
    
    // Si no hay cookie de idioma o no es español, establecer español por defecto
    if (this.cookieValue !== 'es') {
      this.cookieValue = 'es';
      this._cookiesService.set('lang', 'es');
      this.languageService.setLanguage('es');
    }
    
    // Establecer valores para español
    this.countryName = 'Español (Colombia)';
    this.flagvalue = 'assets/images/flags/co.svg';

    // Suscribirse a las notificaciones
    this.notificationService.getNotifications().subscribe(notifications => {
      this.notificationList = notifications;
      this.updateNotificationCounts();
    });
  }

  /**
   * Actualiza los contadores de notificaciones
   */
  updateNotificationCounts(): void {
    this.totalNotify = this.notificationService.getTotalCount();
    this.newNotify = this.notificationService.getUnreadCount();
    this.readNotify = this.notificationService.getReadCount();
  }

  /***
 * Language Listing - Solo Español
 */
  listLang = [
    { text: 'Español', flag: 'assets/images/flags/spain.svg', lang: 'es' }
  ];

  windowScroll() {
    if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
      (document.getElementById('back-to-top') as HTMLElement).style.display = "block";
      document.getElementById('page-topbar')?.classList.add('topbar-shadow')
    } else {
      (document.getElementById('back-to-top') as HTMLElement).style.display = "none";
      document.getElementById('page-topbar')?.classList.remove('topbar-shadow')
    }
  }

  /**
   * Fullscreen method
   */
  fullscreen() {
    document.body.classList.toggle('fullscreen-enable');
    if (
      !document.fullscreenElement && !this.element.mozFullScreenElement &&
      !this.element.webkitFullscreenElement) {
      if (this.element.requestFullscreen) {
        this.element.requestFullscreen();
      } else if (this.element.mozRequestFullScreen) {
        /* Firefox */
        this.element.mozRequestFullScreen();
      } else if (this.element.webkitRequestFullscreen) {
        /* Chrome, Safari and Opera */
        this.element.webkitRequestFullscreen();
      } else if (this.element.msRequestFullscreen) {
        /* IE/Edge */
        this.element.msRequestFullscreen();
      }
    } else {
      if (this.document.exitFullscreen) {
        this.document.exitFullscreen();
      } else if (this.document.mozCancelFullScreen) {
        /* Firefox */
        this.document.mozCancelFullScreen();
      } else if (this.document.webkitExitFullscreen) {
        /* Chrome, Safari and Opera */
        this.document.webkitExitFullscreen();
      } else if (this.document.msExitFullscreen) {
        /* IE/Edge */
        this.document.msExitFullscreen();
      }
    }
  }

  /***
* Language Value Set
*/
  setLanguage(text: string, lang: string, flag: string) {
    this.countryName = text;
    this.flagvalue = flag;
    this.cookieValue = lang;
    this.languageService.setLanguage(lang);
  }

  /**
 * Toggle the menu bar when having mobile screen
 */
  toggleMobileMenu(event: any) {
    document.querySelector('.hamburger-icon')?.classList.toggle('open')
    document.body.classList.contains("twocolumn-panel") ? document.body.classList.remove("twocolumn-panel") : document.body.classList.add("twocolumn-panel");
    event.preventDefault();
    this.mobileMenuButtonClicked.emit();
  }

  /**
* Topbar Light-Dark Mode Change
*/
  changeMode(mode: string) {
    this.mode = mode;
    this.store.dispatch(changeMode({ mode }));
    this.store.select(getLayoutMode).subscribe((mode) => {
      document.documentElement.setAttribute('data-bs-theme', mode)
      document.documentElement.classList.remove('mode-auto')
    })
    if (mode == 'auto') {
      this.store.select(getLayoutMode).subscribe((mode) => {
        document.documentElement.setAttribute('data-bs-theme', 'light')
        document.documentElement.classList.add('mode-auto')
      })
    }
  }

  // Search Topbar
  Search() {
    var searchOptions = document.getElementById("search-close-options") as HTMLAreaElement;
    var dropdown = document.getElementById("search-dropdown") as HTMLAreaElement;
    var input: any, filter: any, ul: any, li: any, a: any | undefined, i: any, txtValue: any;
    input = document.getElementById("search-options") as HTMLAreaElement;
    filter = input.value.toUpperCase();
    var inputLength = filter.length;

    if (inputLength > 0) {
      dropdown.classList.add("show");
      searchOptions.classList.remove("d-none");
      var inputVal = input.value.toUpperCase();
      var notifyItem = document.getElementsByClassName("notify-item");

      Array.from(notifyItem).forEach(function (element: any) {
        var notifiTxt = ''
        if (element.querySelector("h6")) {
          var spantext = element.getElementsByTagName("span")[0].innerText.toLowerCase()
          var name = element.querySelector("h6").innerText.toLowerCase()
          if (name.includes(inputVal)) {
            notifiTxt = name
          } else {
            notifiTxt = spantext
          }
        } else if (element.getElementsByTagName("span")) {
          notifiTxt = element.getElementsByTagName("span")[0].innerText.toLowerCase()
        }
        if (notifiTxt)
          element.style.display = notifiTxt.includes(inputVal) ? "block" : "none";

      });
    } else {
      dropdown.classList.remove("show");
      searchOptions.classList.add("d-none");
    }
  }

  /**
   * Search Close Btn
   */
  closeBtn() {
    var searchOptions = document.getElementById("search-close-options") as HTMLAreaElement;
    var dropdown = document.getElementById("search-dropdown") as HTMLAreaElement;
    var searchInputReponsive = document.getElementById("search-options") as HTMLInputElement;
    dropdown.classList.remove("show");
    searchOptions.classList.add("d-none");
    searchInputReponsive.value = "";
  }

  // Increment Decrement Quantity
  qty: number = 0;
  increment(qty: any, i: any, id: any) {
    this.subtotal = 0;
    if (id == '0' && qty > 1) {
      qty--;
      this.cartData[i].qty = qty
      this.cartData[i].total = (this.cartData[i].qty * this.cartData[i].price).toFixed(2)
    }
    if (id == '1') {
      qty++;
      this.cartData[i].qty = qty
      this.cartData[i].total = (this.cartData[i].qty * this.cartData[i].price).toFixed(2)
    }

    this.cartData.map((x: any) => {
      this.subtotal += parseFloat(x['total'])
    })

    this.subtotal = this.subtotal.toFixed(2)
    this.discount = (this.subtotal * this.discountRate).toFixed(2)
    this.tax = (this.subtotal * this.taxRate).toFixed(2);
    this.totalsum = (parseFloat(this.subtotal) + parseFloat(this.tax) + parseFloat(this.shippingRate) - parseFloat(this.discount)).toFixed(2)
  }

  removeCart(id: any) {
    this.removeCartModal?.show()
    this.deleteid = id;
  }

  confirmDelete() {
    this.removeCartModal?.hide()

    this.subtotal -= this.cartData[this.deleteid].total
    this.subtotal = this.subtotal.toFixed(2)
    this.discount = (this.subtotal * this.discountRate).toFixed(2)
    this.tax = (this.subtotal * this.taxRate).toFixed(2);
    this.totalsum = (parseFloat(this.subtotal) + parseFloat(this.tax) + parseFloat(this.shippingRate) - parseFloat(this.discount)).toFixed(2)
    this.cartData.splice(this.deleteid, 1)
  }

  // Remove Notification
  checkedValGet: any[] = [];
  onCheckboxChange(event: any, id: any) {
    // Usar el nuevo servicio para manejar la selección
    const selectedNotifications = this.notificationService.getSelectedNotifications();
    this.checkedValGet = selectedNotifications.map(n => n.id);
    
    const actionsElement = document.getElementById("notification-actions") as HTMLElement;
    if (actionsElement) {
      actionsElement.style.display = this.checkedValGet.length > 0 ? 'block' : 'none';
    }
  }

  notificationDelete() {
    this.notificationService.removeSelectedNotifications();
    this.checkedValGet = [];
    this.removeNotificationModal?.hide();
  }

  calculatenotification() {
    this.updateNotificationCounts();
    this.checkedValGet = [];
    
    const actionsElement = document.getElementById("notification-actions") as HTMLElement;
    if (actionsElement) {
      actionsElement.style.display = 'none';
    }
    
    if (this.totalNotify == 0) {
      document.querySelector('.empty-notification-elem')?.classList.remove('d-none');
    }
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  /**
   * Limpia todas las notificaciones
   */
  clearAll() {
    this.notificationService.clearAll();
  }

  /**
   * Maneja el toggle de selección de notificación
   */
  toggleNotificationSelection(notificationId: string | number) {
    this.notificationService.toggleNotificationSelection(notificationId);
    // Actualizar el array de seleccionados
    const selectedNotifications = this.notificationService.getSelectedNotifications();
    this.checkedValGet = selectedNotifications.map(n => n.id);
    
    const actionsElement = document.getElementById("notification-actions") as HTMLElement;
    if (actionsElement) {
      actionsElement.style.display = this.checkedValGet.length > 0 ? 'block' : 'none';
    }
  }

  /**
   * Logout del usuario
   */
  logoutUser() {
    this.store.dispatch(logout());
  }
}
