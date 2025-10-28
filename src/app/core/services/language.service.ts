import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';

@Injectable({ providedIn: 'root' })
export class LanguageService {

  public languages: string[] = ['es']; // Solo español disponible

  constructor(public translate: TranslateService, private cookieService: CookieService) {

    let browserLang: any = 'es'; // Por defecto español
    /***
     * Cookie Language Get - Siempre español
    */
    this.translate.addLangs(this.languages);
    if (this.cookieService.check('lang')) {
      browserLang = this.cookieService.get('lang');
      // Si no es español, forzar español
      if (browserLang !== 'es') {
        browserLang = 'es';
        this.cookieService.set('lang', 'es');
      }
    }
    else {
      browserLang = 'es'; // Siempre español por defecto
      this.cookieService.set('lang', 'es');
    }
    translate.use('es'); // Siempre usar español
  }

  /***
   * Cookie Language set
   */
  public setLanguage(lang: any) {
    this.translate.use(lang);
    this.cookieService.set('lang', lang);
  }

}
