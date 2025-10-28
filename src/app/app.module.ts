import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// Page Route
import { AppRoutingModule } from './app-routing.module';
import { LayoutsModule } from './layouts/layouts.module';

// toaster
import { ToastrModule } from 'ngx-toastr';

// Language
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

// Auth
import { HttpClientModule, HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { environment } from '../environments/environment';
import { initFirebaseBackend } from './authUtils';
//import { FakeBackendInterceptor } from './core/helpers/fake-backend';
import { ErrorInterceptor } from './core/helpers/error.interceptor';
import { JwtInterceptor } from './core/helpers/jwt.interceptor';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
//import { AuthInterceptor } from './core/helpers/auth.interceptor';


// Store
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { rootReducer } from 'src/app/store/reducers';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { AuthenticationEffects } from './store/effects/authentication.effects';

// Component principal
import { AppComponent } from './app.component';

// Store Effects
import { InvoiceEffects } from './store/effects/invoce.effects';
import { ContactEffects } from './store/effects/contact.effect';
import { CalendarEffects } from './store/effects/calendar.effects';
import { FileEffects } from './store/effects/filemanager.effect';
import { ToDoEffects } from './store/effects/to-do.effect';

// Módulo del Kanban
import { AppsModule } from './pages/apps/apps.module';

// User Module Effects
import { UserEffects } from './pages/modules/user-module/store/effects/user.effects';
import { UserContactEffects } from './pages/modules/user-module/store/effects/userContact.effects';


//forms response effects
import { FormResponseEffects } from './pages/apps/kanbanboard/store/effects/formResponse.effects';


// Forms validation effects


// Función para traducciones
export function createTranslateLoader(http: HttpClient): any {
  return new TranslateHttpLoader(http, 'assets/i18n/', '.json');
}

// Firebase init
if (environment.defaultauth === 'firebase') {
  initFirebaseBackend(environment.firebaseConfig);
} else {
  //FakeBackendInterceptor;
}

@NgModule({
  declarations: [
    AppComponent, // ✅ Solo este componente aquí
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    LayoutsModule,
    ToastrModule.forRoot(),
    TranslateModule.forRoot({
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: (createTranslateLoader),
        deps: [HttpClient],
      },
    }),
    StoreModule.forRoot(rootReducer),
    StoreDevtoolsModule.instrument({
      maxAge: 25,
      logOnly: environment.production,
    }),
    EffectsModule.forRoot([
      AuthenticationEffects,
      InvoiceEffects,
      ContactEffects,
      CalendarEffects,
      FileEffects,
      ToDoEffects,
      UserEffects,
      UserContactEffects,
      FormResponseEffects,
    ]),
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFireAuthModule,
    AppsModule, // ✅ Aquí importas tu módulo de Kanban y apps
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
