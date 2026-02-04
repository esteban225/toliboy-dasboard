import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { NotificationsApiService } from 'src/app/core/services/notifications-api.service';
import { NotificationService } from 'src/app/core/services/notification.service';

@Component({
  selector: 'app-dashboard-traceability',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard-traceability.component.html',
  styleUrls: ['./dashboard-traceability.component.scss']
})
export class DashboardTraceabilityComponent {
  form: FormGroup;
  types = ['info', 'warning', 'error', 'success'];
  scopes = ['individual', 'group', 'global', 'related_table'];
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private api: NotificationsApiService,
    private notify: NotificationService
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(255)]],
      message: ['', Validators.required],
      type: ['info', Validators.required],
      scope: ['individual', Validators.required],
      related_table: [''],
      related_id: [null],
      expires_at: [''],
      user_id: [null],
      role: ['']
    });

    this.form.get('scope')!.valueChanges.subscribe(v => this.onScopeChange(v));
    this.onScopeChange(this.form.get('scope')!.value);
  }

  onScopeChange(scope: string) {
    const userCtrl = this.form.get('user_id')!;
    const roleCtrl = this.form.get('role')!;
    if (scope === 'individual') {
      userCtrl.setValidators([Validators.required]);
      roleCtrl.clearValidators();
      roleCtrl.setValue('');
    } else if (scope === 'group') {
      roleCtrl.setValidators([Validators.required]);
      userCtrl.clearValidators();
      userCtrl.setValue(null);
    } else {
      userCtrl.clearValidators();
      roleCtrl.clearValidators();
      userCtrl.setValue(null);
      roleCtrl.setValue('');
    }
    userCtrl.updateValueAndValidity();
    roleCtrl.updateValueAndValidity();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    const raw = { ...this.form.value };
    const payload: any = { ...raw };

    // Asegurar user_id entero o null
    if (payload.user_id === null || payload.user_id === '' || payload.user_id === undefined) {
      delete payload.user_id;
    } else {
      const u = parseInt(payload.user_id, 10);
      if (isNaN(u)) delete payload.user_id; else payload.user_id = u;
    }

    // Asegurar role como string o eliminar
    if (!payload.role) {
      delete payload.role;
    } else {
      payload.role = String(payload.role);
    }

    // Normalizar related_id
    if (payload.related_id === null || payload.related_id === '' || payload.related_id === undefined) {
      delete payload.related_id;
    } else {
      const r = parseInt(payload.related_id, 10);
      if (isNaN(r)) delete payload.related_id; else payload.related_id = r;
    }

    // Formatear expires_at al formato Y-m-d H:i:s que exige el backend
    if (payload.expires_at) {
      payload.expires_at = this.formatToBackendDatetime(payload.expires_at);
    } else {
      delete payload.expires_at;
    }
    this.api.createNotification(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.notify.success('Notificación creada correctamente');
        this.form.reset({ type: 'info', scope: 'individual' });
      },
      error: (err) => {
        this.submitting = false;
        console.error('Error creating notification', err);
        // Mostrar errores de validación del backend si existen
        const apiErrors = err?.error?.errors;
        if (apiErrors) {
          const messages: string[] = [];
          Object.keys(apiErrors).forEach(k => {
            const arr = apiErrors[k];
            if (Array.isArray(arr)) messages.push(...arr.map((s:any) => String(s)));
            else messages.push(String(arr));
          });
          this.notify.error(messages.join(' | '));
        } else {
          this.notify.error('Error creando notificación');
        }
      }
    });
  }

  private pad(n: number) { return n < 10 ? '0' + n : String(n); }

  private formatToBackendDatetime(input: string | Date): string {
    // input puede ser 'YYYY-MM-DD' desde input[type=date] o un ISO string
    try {
      if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
        return `${input} 00:00:00`;
      }
      const d = new Date(input);
      if (isNaN(d.getTime())) return String(input);
      const Y = d.getFullYear();
      const M = this.pad(d.getMonth() + 1);
      const D = this.pad(d.getDate());
      const h = this.pad(d.getHours());
      const m = this.pad(d.getMinutes());
      const s = this.pad(d.getSeconds());
      return `${Y}-${M}-${D} ${h}:${m}:${s}`;
    } catch (e) {
      return String(input);
    }
  }
}
