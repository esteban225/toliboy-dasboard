import { Component, ViewChild, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { EventService } from 'src/app/core/services/event.service';
import { LayoutPersistenceService } from 'src/app/core/services/layout-persistence.service';
import { RootReducerState, getLayoutTheme, getLayoutMode, getLayoutWith, getLayoutPosition, getTopbarColor, getSidebarSize, getSidebarView, getSidebarColor, getSidebarImage, getPreloader } from 'src/app/store/reducers';
import { Store } from '@ngrx/store';
import { changelayoutTheme, changeMode, changeLayoutWidth, changeLayoutPosition, changeTopbar, changeSidebarSize, changeSidebarView, changeSidebarColor, changeSidebarImage, changeDataPreloader } from 'src/app/store/actions/layout-action';
import { LayoutState } from 'src/app/store/reducers/layout-reducers';
import { initialState } from 'src/app/store/reducers/layout-reducers';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import * as ApexCharts from 'apexcharts';
@Component({
  selector: 'app-customizer',
  templateUrl: './customizer.component.html',
  styleUrls: ['./customizer.component.scss']
})

// Right Sidebar Component
export class CustomizerComponent implements OnDestroy {

  rightsidebar: any;
  layout: string | undefined;
  mode: string | undefined;
  width: string | undefined;
  position: string | undefined;
  topbar: string | undefined;
  size: string | undefined;
  sidebarView: string | undefined;
  sidebar: string | undefined;
  attribute: any;
  sidebarImage: any;
  sidebarVisibility: any;
  preLoader: any;
  grd: any;

  state: any;
  initialAppState!: LayoutState;
  
  // Para manejar las suscripciones
  private destroy$ = new Subject<void>();
  private saveSettings$ = new Subject<void>();

  constructor(
    private eventService: EventService, 
    private router: Router, 
    private store: Store<RootReducerState>,
    public layoutPersistence: LayoutPersistenceService
  ) {
    // Configurar guardado automático con debounce
    this.saveSettings$
      .pipe(
        debounceTime(1000), // Esperar 1 segundo después del último cambio
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.saveCurrentSettings();
      });
  }

  ngOnInit(): void {
    // Cargar configuración guardada al inicializar
    this.loadSavedSettings();

    // Subscribe to the state changes
    this.initialAppState = initialState;

    this.store.select('layout').pipe(
      takeUntil(this.destroy$)
    ).subscribe((data) => {
      this.layout = data.LAYOUT_THEME;
      this.mode = data.LAYOUT_MODE;
      this.width = data.LAYOUT_WIDTH;
      this.position = data.LAYOUT_POSITION;
      this.topbar = data.TOPBAR;
      this.size = data.SIDEBAR_SIZE;
      this.sidebarView = data.SIDEBAR_VIEW;
      this.sidebar = data.SIDEBAR_COLOR;
      this.sidebarImage = data.SIDEBAR_IMAGE;
      this.preLoader = data.DATA_PRELOADER;

      // Guardar configuración cada vez que cambie el estado
      this.saveSettings$.next();
    })
    
    this.attribute = '';
    this.openEnd();
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga la configuración guardada desde localStorage
   */
  private loadSavedSettings(): void {
    const savedSettings = this.layoutPersistence.loadLayoutSettings();
    
    if (savedSettings) {
      console.log('🔄 Loading saved layout settings...');
      
      // Aplicar cada configuración guardada
      if (savedSettings.LAYOUT_THEME) {
        this.store.dispatch(changelayoutTheme({ layout: savedSettings.LAYOUT_THEME }));
      }
      if (savedSettings.LAYOUT_MODE) {
        this.store.dispatch(changeMode({ mode: savedSettings.LAYOUT_MODE }));
      }
      if (savedSettings.LAYOUT_WIDTH) {
        this.store.dispatch(changeLayoutWidth({ layoutWidth: savedSettings.LAYOUT_WIDTH }));
      }
      if (savedSettings.LAYOUT_POSITION) {
        this.store.dispatch(changeLayoutPosition({ layoutPosition: savedSettings.LAYOUT_POSITION }));
      }
      if (savedSettings.TOPBAR) {
        this.store.dispatch(changeTopbar({ topbarColor: savedSettings.TOPBAR }));
      }
      if (savedSettings.SIDEBAR_SIZE) {
        this.store.dispatch(changeSidebarSize({ sidebarSize: savedSettings.SIDEBAR_SIZE }));
      }
      if (savedSettings.SIDEBAR_VIEW) {
        this.store.dispatch(changeSidebarView({ sidebarView: savedSettings.SIDEBAR_VIEW }));
      }
      if (savedSettings.SIDEBAR_COLOR) {
        this.store.dispatch(changeSidebarColor({ sidebarColor: savedSettings.SIDEBAR_COLOR }));
      }
      if (savedSettings.SIDEBAR_IMAGE) {
        this.store.dispatch(changeSidebarImage({ sidebarImage: savedSettings.SIDEBAR_IMAGE }));
      }
      if (savedSettings.DATA_PRELOADER) {
        this.store.dispatch(changeDataPreloader({ Preloader: savedSettings.DATA_PRELOADER }));
      }
      
      console.log('✅ Saved layout settings applied successfully');
    } else {
      console.log('ℹ️ No saved settings found, using defaults');
    }
  }

  /**
   * Guarda la configuración actual en localStorage
   */
  private saveCurrentSettings(): void {
    this.store.select('layout').pipe(
      takeUntil(this.destroy$)
    ).subscribe((layoutState) => {
      this.layoutPersistence.saveLayoutSettings(layoutState);
    }).unsubscribe();
  }

  /**
   * Resetea la configuración a los valores por defecto
   */
  resetToDefaults(): void {
    console.log('🔄 Resetting to default settings...');
    
    // Limpiar localStorage
    this.layoutPersistence.clearLayoutSettings();
    
    // Aplicar configuración por defecto
    this.store.dispatch(changelayoutTheme({ layout: this.initialAppState.LAYOUT_THEME }));
    this.store.dispatch(changeMode({ mode: this.initialAppState.LAYOUT_MODE }));
    this.store.dispatch(changeLayoutWidth({ layoutWidth: this.initialAppState.LAYOUT_WIDTH }));
    this.store.dispatch(changeLayoutPosition({ layoutPosition: this.initialAppState.LAYOUT_POSITION }));
    this.store.dispatch(changeTopbar({ topbarColor: this.initialAppState.TOPBAR }));
    this.store.dispatch(changeSidebarSize({ sidebarSize: this.initialAppState.SIDEBAR_SIZE }));
    this.store.dispatch(changeSidebarView({ sidebarView: this.initialAppState.SIDEBAR_VIEW }));
    this.store.dispatch(changeSidebarColor({ sidebarColor: this.initialAppState.SIDEBAR_COLOR }));
    this.store.dispatch(changeSidebarImage({ sidebarImage: this.initialAppState.SIDEBAR_IMAGE }));
    this.store.dispatch(changeDataPreloader({ Preloader: this.initialAppState.DATA_PRELOADER }));
    
    console.log('✅ Reset to defaults completed');
  }

  /**
   * Exporta la configuración actual como archivo JSON
   */
  exportSettings(): void {
    this.store.select('layout').pipe(
      takeUntil(this.destroy$)
    ).subscribe((layoutState) => {
      const settings = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        layout: layoutState
      };

      const blob = new Blob([JSON.stringify(settings, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `toliboy-layout-settings-${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Settings exported successfully');
    }).unsubscribe();
  }

  /**
   * Importa configuración desde archivo JSON
   */
  importSettings(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const settings = JSON.parse(result);
        
        if (settings.layout) {
          // Aplicar configuración importada
          const layout = settings.layout;
          
          if (layout.LAYOUT_THEME) {
            this.store.dispatch(changelayoutTheme({ layout: layout.LAYOUT_THEME }));
          }
          if (layout.LAYOUT_MODE) {
            this.store.dispatch(changeMode({ mode: layout.LAYOUT_MODE }));
          }
          if (layout.LAYOUT_WIDTH) {
            this.store.dispatch(changeLayoutWidth({ layoutWidth: layout.LAYOUT_WIDTH }));
          }
          if (layout.LAYOUT_POSITION) {
            this.store.dispatch(changeLayoutPosition({ layoutPosition: layout.LAYOUT_POSITION }));
          }
          if (layout.TOPBAR) {
            this.store.dispatch(changeTopbar({ topbarColor: layout.TOPBAR }));
          }
          if (layout.SIDEBAR_SIZE) {
            this.store.dispatch(changeSidebarSize({ sidebarSize: layout.SIDEBAR_SIZE }));
          }
          if (layout.SIDEBAR_VIEW) {
            this.store.dispatch(changeSidebarView({ sidebarView: layout.SIDEBAR_VIEW }));
          }
          if (layout.SIDEBAR_COLOR) {
            this.store.dispatch(changeSidebarColor({ sidebarColor: layout.SIDEBAR_COLOR }));
          }
          if (layout.SIDEBAR_IMAGE) {
            this.store.dispatch(changeSidebarImage({ sidebarImage: layout.SIDEBAR_IMAGE }));
          }
          if (layout.DATA_PRELOADER) {
            this.store.dispatch(changeDataPreloader({ Preloader: layout.DATA_PRELOADER }));
          }
          
          console.log('✅ Settings imported successfully');
          
          // Mostrar notificación
          this.showNotification('Configuración importada exitosamente', 'success');
        } else {
          throw new Error('Formato de archivo inválido');
        }
      } catch (error) {
        console.error('❌ Error importing settings:', error);
        this.showNotification('Error al importar configuración', 'error');
      }
      
      // Limpiar input file
      event.target.value = '';
    };
    
    reader.readAsText(file);
  }

  /**
   * Muestra notificación al usuario
   */
  private showNotification(message: string, type: 'success' | 'error'): void {
    // Aquí puedes implementar tu sistema de notificaciones preferido
    // Por ahora usamos console y alert simple
    if (type === 'success') {
      console.log('✅', message);
      // alert(message); // Opcional: mostrar alert
    } else {
      console.error('❌', message);
      // alert(message); // Opcional: mostrar alert
    }
  }

  // When the user clicks on the button, scroll to the top of the document
  topFunction() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }

  //  Filter Offcanvas Set
  openEnd() {
    document.querySelector('.custom-offcanvas')?.classList.add('show')
    document.getElementById('backdrop')?.classList.add('show')
    setTimeout(() => {
      this.attribute = document.documentElement.getAttribute('data-layout')
      if (this.attribute == 'vertical') {
        var vertical = document.getElementById('customizer-layout01') as HTMLInputElement;
        if (vertical != null) {
          vertical.setAttribute('checked', 'true');
        }
      }
      if (this.attribute == 'horizontal') {
        const horizontal = document.getElementById('customizer-layout02');
        if (horizontal != null) {
          horizontal.setAttribute('checked', 'true');
        }
      }
      if (this.attribute == 'twocolumn') {
        const Twocolumn = document.getElementById('customizer-layout03');
        if (Twocolumn != null) {
          Twocolumn.setAttribute('checked', 'true');
        }
      }
      if (this.attribute == 'semibox') {
        const Twocolumn = document.getElementById('customizer-layout04');
        if (Twocolumn != null) {
          Twocolumn.setAttribute('checked', 'true');
        }
      }
    }, 100);
  }

  closeoffcanvas() {
    document.querySelector('.custom-offcanvas')?.classList.remove('show')
    document.getElementById('backdrop')?.classList.remove('show')
  }

  /**
   * Change the layout onclick
   * @param layout Change the layout
   */
  changeLayout(layout: string) {
    this.attribute = layout;
    this.store.dispatch(changelayoutTheme({ layout }));
    this.store.select(getLayoutTheme).subscribe((data) => {
      document.documentElement.setAttribute('data-layout', data);
    })
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 0);
  }

  // Mode Change
  changeMode(mode: string) {
    this.mode = mode;
    this.store.dispatch(changeMode({ mode }));
    this.store.select(getLayoutMode).subscribe((mode) => {
      document.documentElement.setAttribute('data-bs-theme', mode)
    })
  }

  // Width Change
  changeWidth(layoutWidth: string, sidebarSize: string) {
    this.width = layoutWidth;
    this.store.dispatch(changeLayoutWidth({ layoutWidth }));
    this.store.select(getLayoutWith).subscribe((width) => {
      document.documentElement.setAttribute('data-layout-width', width);
    })
    document.documentElement.setAttribute('data-sidebar-size', sidebarSize);
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 0);
  }
  // Position Change
  changePosition(layoutPosition: string) {
    this.position = layoutPosition;
    this.store.dispatch(changeLayoutPosition({ layoutPosition }));
    this.store.select(getLayoutPosition).subscribe((position) => {
      document.documentElement.setAttribute('data-layout-position', position);
    })

  }

  // Topbar Change
  changeTopColor(topbarColor: string) {
    this.topbar = topbarColor;
    this.store.dispatch(changeTopbar({ topbarColor }));
    this.store.select(getTopbarColor).subscribe((color) => {
      document.documentElement.setAttribute('data-topbar', color);
    })

  }

  // Sidebar Size Change
  changeSidebarSize(sidebarSize: string) {
    this.size = sidebarSize;
    this.store.dispatch(changeSidebarSize({ sidebarSize }));
    this.store.select(getSidebarSize).subscribe((size) => {
      document.documentElement.setAttribute('data-sidebar-size', size);
    })
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 0);
  }

  // Sidebar Size Change
  changeSidebar(sidebarView: string) {
    this.sidebarView = sidebarView;
    this.store.dispatch(changeSidebarView({ sidebarView }));
    this.store.select(getSidebarView).subscribe((sidebar) => {
      document.documentElement.setAttribute('data-layout-style', sidebar);
    })
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 0);
  }

  // Sidebar Color Change
  changeSidebarColor(sidebarColor: string) {
    this.sidebar = sidebarColor;
    this.store.dispatch(changeSidebarColor({ sidebarColor }));
    this.store.select(getSidebarColor).subscribe((color) => {
      document.documentElement.setAttribute('data-sidebar', color);
    })
  }

  // Sidebar Image Change
  changeSidebarImage(sidebarImage: string) {
    this.sidebarImage = sidebarImage;
    this.store.dispatch(changeSidebarImage({ sidebarImage }));
    this.store.select(getSidebarImage).subscribe((img) => {
      document.documentElement.setAttribute('data-sidebar-image', img);
    })

  }

  // PreLoader Image Change
  changeLoader(Preloader: string) {
    this.preLoader = Preloader;
    this.store.dispatch(changeDataPreloader({ Preloader }));
    this.store.select(getPreloader).subscribe((loader) => {
      document.documentElement.setAttribute('data-preloader', loader);
      (document.getElementById("preloader") as HTMLElement).style.opacity = "1";
      (document.getElementById("preloader") as HTMLElement).style.visibility = "";

    })
    var preloader = document.getElementById("preloader");
    if (preloader) {
      setTimeout(function () {
        (document.getElementById("preloader") as HTMLElement).style.opacity = "0";
        (document.getElementById("preloader") as HTMLElement).style.visibility = "hidden";
      }, 1000);
    }


  }

  // Add Active Class
  addActive(sidebarColor: any) {
    this.grd = sidebarColor;
    this.store.dispatch(changeSidebarColor({ sidebarColor }));
    this.store.select(getSidebarColor).subscribe((grdSidebar) => {
      document.documentElement.setAttribute('data-sidebar', grdSidebar)
    })
    document.getElementById('collapseBgGradient')?.classList.toggle('show');
    document.getElementById('collapseBgGradient1')?.classList.add('active');
  }

  // Remove Active Class
  removeActive() {
    this.grd = '';
    document.getElementById('collapseBgGradient1')?.classList.remove('active');
    document.getElementById('collapseBgGradient')?.classList.remove('show');
  }

}
