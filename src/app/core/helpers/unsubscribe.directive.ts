import { Directive, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * 🧹 Directiva para automáticamente desuscribirse
 * 
 * Uso en componentes:
 * @Component({...})
 * export class MyComponent extends UnsubscribeBase {
 *   ngOnInit() {
 *     this.service.data$
 *       .pipe(takeUntil(this.destroy$))
 *       .subscribe(data => {...});
 *   }
 * }
 */
@Directive()
export class UnsubscribeBase implements OnDestroy {
  protected destroy$ = new Subject<void>();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
