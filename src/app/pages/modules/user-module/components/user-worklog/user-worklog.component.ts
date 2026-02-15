import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, TrackByFunction } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { finalize, map, takeUntil } from 'rxjs/operators';
import { WorklogService } from '../../services/worklog.service';
import { Worklog, WorklogFilters, PaginationMeta } from '../../models/worklog.model';
import { UserService } from '../../services/user.service';
import { UserData } from '../../models/userData.model';
import { AlertService } from 'src/app/core/services/alert.service';

interface WorklogResponse {
  data: Worklog[];
  meta?: PaginationMeta;
}

@Component({
  selector: 'app-user-worklog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './user-worklog.component.html',
  styleUrls: ['./user-worklog.component.scss']
})
export class UserWorklogComponent implements OnInit, OnDestroy {
  filterForm!: FormGroup;
  logForm!: FormGroup;

  users: UserData[] = [];
  worklogs: Worklog[] = [];
  meta?: PaginationMeta;
  selectedLog: Worklog | null = null;

  loading = false;
  loadingUsers = false;
  loadingRegister = false;
  submitting = false;
  viewMode: 'table' | 'grid' = 'table';
  errorMessage: string | null = null;

  showLogModal = false;
  showDetailModal = false;
  isEditMode = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly worklogService: WorklogService,
    private readonly userService: UserService,
    private readonly alertService: AlertService
  ) {
    this.initForms();
  }

  private initForms(): void {
    this.filterForm = this.fb.group({
      userId: [null, Validators.required],
      date: [''],
      start_time: [''],
      end_time: [''],
      task_description: ['']
    });

    this.logForm = this.fb.group({
      id: [null],
      user_id: [null, Validators.required],
      date: ['', Validators.required],
      start_time: ['', Validators.required],
      end_time: ['', Validators.required],
      batch_id: [null],
      task_description: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  readonly trackByLogId: TrackByFunction<Worklog> = (_index, item) => item.id ?? _index;
  readonly trackByUserId: TrackByFunction<UserData> = (_index, item) => item.id;

  private loadUsers(): void {
    this.loadingUsers = true;
    this.userService.getUsers()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingUsers = false))
      )
      .subscribe({
        next: users => (this.users = users ?? []),
        error: () => (this.users = [])
      });
  }

  get hasRecords(): boolean {
    return this.worklogs.length > 0;
  }

  onFilterSubmit(): void {
    this.errorMessage = null;
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      this.errorMessage = 'Selecciona un usuario para consultar sus registros.';
      return;
    }

    const filters = this.buildFilters();
    this.loading = true;
    const request$: Observable<WorklogResponse> = this.shouldUseGlobalEndpoint(filters)
      ? this.worklogService.getWorklogs(filters)
      : this.worklogService.getWorklogsByUser(Number(filters.user_id)).pipe(map(data => ({ data, meta: undefined })));

    request$
      .pipe(takeUntil(this.destroy$), finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: WorklogResponse) => {
          this.worklogs = response?.data ?? [];
          this.meta = response?.meta;
          if (!this.worklogs.length) {
            this.errorMessage = 'No se encontraron registros con los filtros aplicados.';
          }
        },
        error: (err: unknown) => {
          this.worklogs = [];
          this.meta = undefined;
          this.errorMessage = this.getErrorMessage(err) ?? 'No se pudieron recuperar los registros.';
        }
      });
  }

  private buildFilters(): WorklogFilters {
    const { userId, date, start_time, end_time, task_description } = this.filterForm.value;
    return {
      user_id: userId ? Number(userId) : undefined,
      date: date?.trim() || undefined,
      start_time: start_time?.trim() || undefined,
      end_time: end_time?.trim() || undefined,
      task_description: task_description?.trim() || undefined
    };
  }

  private shouldUseGlobalEndpoint(filters: WorklogFilters): boolean {
    const hasAdvancedFilters = Boolean(filters.date || filters.start_time || filters.end_time || filters.task_description);
    return hasAdvancedFilters;
  }

  getTotalHours(): number {
    return this.worklogs.reduce((acc, log) => acc + this.resolveHours(log.total_hours, log.start_time, log.end_time), 0);
  }

  getOvertimeHours(): number {
    return this.worklogs.reduce((acc, log) => acc + this.resolveHours(log.overtime_hours), 0);
  }

  resolveHours(value?: number | string, start?: string, end?: string): number {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const hours = value.includes(':') ? this.convertClockToHours(value) : Number(value);
      if (!Number.isNaN(hours)) return hours;
    }
    if (start && end) {
      const startHours = this.convertClockToHours(start);
      const endHours = this.convertClockToHours(end);
      return Math.max(endHours - startHours, 0);
    }
    return 0;
  }

  private convertClockToHours(value: string): number {
    if (!value) return 0;
    const [hours, minutes] = value.split(':').map(Number);
    if (Number.isNaN(hours)) return 0;
    return hours + (Number.isNaN(minutes) ? 0 : minutes / 60);
  }

  private getErrorMessage(error: unknown): string | undefined {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    if (typeof error === 'string' && error) {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
      return (error as any).message;
    }
    return undefined;
  }

  openCreateModal(): void {
    const userId = this.filterForm.value.userId;
    this.isEditMode = false;
    this.logForm.reset({
      id: null,
      user_id: userId ? Number(userId) : null,
      date: this.getTodayDate(),
      start_time: '',
      end_time: '',
      batch_id: null,
      task_description: '',
      notes: ''
    });
    this.showLogModal = true;
  }

  openEditModal(log: Worklog): void {
    this.isEditMode = true;
    this.logForm.patchValue({
      id: log.id ?? null,
      user_id: log.user_id,
      date: log.date ?? '',
      start_time: log.start_time ?? '',
      end_time: log.end_time ?? '',
      batch_id: log.batch_id ?? null,
      task_description: log.task_description ?? '',
      notes: log.notes ?? ''
    });
    this.showLogModal = true;
  }

  openDetailModal(log: Worklog): void {
    this.selectedLog = log;
    this.showDetailModal = true;
  }

  closeModals(): void {
    this.showLogModal = false;
    this.showDetailModal = false;
    this.selectedLog = null;
  }

  submitLog(): void {
    if (this.logForm.invalid) {
      this.logForm.markAllAsTouched();
      return;
    }

    const formValue = this.logForm.getRawValue();
    const payload: Partial<Worklog> = {
      user_id: formValue.user_id,
      date: formValue.date,
      start_time: formValue.start_time,
      end_time: formValue.end_time,
      batch_id: formValue.batch_id || null,
      task_description: formValue.task_description?.trim() || null,
      notes: formValue.notes?.trim() || null
    };

    const id = formValue.id;
    this.submitting = true;

    const request$ = this.isEditMode && id
      ? this.worklogService.updateWorklog(id, payload)
      : this.worklogService.createWorklog(payload);

    request$
      .pipe(takeUntil(this.destroy$), finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => {
          this.alertService.success(this.isEditMode ? 'Work log actualizado' : 'Work log creado');
          this.closeModals();
          this.onFilterSubmit();
        },
        error: (err: unknown) => this.alertService.error('No se pudo guardar', this.getErrorMessage(err))
      });
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  deleteLog(log: Worklog): void {
    if (!log.id) return;

    this.alertService
      .confirm('Eliminar registro', 'Esta acción no se puede deshacer. ¿Deseas continuar?')
      .then(result => {
        if (result.isConfirmed) {
          this.worklogService.deleteWorklog(log.id!)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.alertService.success('Work log eliminado');
                this.worklogs = this.worklogs.filter(w => w.id !== log.id);
                if (!this.worklogs.length) {
                  this.onFilterSubmit();
                }
              },
              error: (err: unknown) => this.alertService.error('No se pudo eliminar', this.getErrorMessage(err))
            });
        }
      });
  }

  registerWorklog(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      this.errorMessage = 'Selecciona un usuario antes de registrar la marcación.';
      return;
    }

    const userId = Number(this.filterForm.value.userId);
    this.loadingRegister = true;

    this.worklogService
      .registerWorklog(userId)
      .pipe(takeUntil(this.destroy$), finalize(() => (this.loadingRegister = false)))
      .subscribe({
        next: () => {
          this.alertService.success('Registro actualizado correctamente');
          this.onFilterSubmit();
        },
        error: (err: unknown) => this.alertService.error('No se pudo registrar la marca', this.getErrorMessage(err))
      });
  }

  clearFilters(): void {
    this.filterForm.patchValue({
      date: '',
      start_time: '',
      end_time: '',
      task_description: ''
    });
  }

  getUserName(userId: number): string {
    const user = this.users.find(u => u.id === userId);
    return user ? user.name || `Usuario #${userId}` : `Usuario #${userId}`;
  }
}
