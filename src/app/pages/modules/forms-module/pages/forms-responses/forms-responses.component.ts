import { Component, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AlertService } from 'src/app/core/services/alert.service';
import { FormResponseService } from '../../services/formResponse.service';
import { FormResponse, FormResponseFilters, PaginationMeta, ReviewFormResponsePayload } from '../../model/forms.model';
import * as FormResponseActions from '../../store/actions/formResponse.actions';
import * as FormResponseSelectors from '../../store/selectors/formResponse.selectors';

@Component({
  selector: 'app-forms-responses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forms-responses.component.html',
  styleUrls: ['./forms-responses.component.scss']
})
export class FormsResponsesComponent implements OnInit, OnDestroy {
  // Signals for state management
  responses = signal<FormResponse[]>([]);
  selectedResponse = signal<FormResponse | null>(null);
  loading = signal(false);
  loadingDetail = signal(false);
  reviewing = signal(false);
  error = signal<string | null>(null);
  page = signal(1);
  perPage = signal(10);
  meta = signal<PaginationMeta | null>(null);
  forms = signal<any[]>([]);
  
  // Modal states
  showDetailModal = signal(false);
  showReviewModal = signal(false);
  
  // Forms
  filterForm: FormGroup;
  reviewForm: FormGroup;
  
  // Stats
  stats = signal({
    pending: 0,
    in_progress: 0,
    completed: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private service: FormResponseService,
    private alert: AlertService
  ) {
    this.filterForm = this.buildFilterForm();
    this.reviewForm = this.buildReviewForm();

    // Load data when page/filters change
    effect(() => {
      const currentPage = this.page();
      const currentPerPage = this.perPage();
      this.loadResponses(currentPage, currentPerPage);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.loadForms();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildFilterForm(): FormGroup {
    return this.fb.group({
      form_id: [''],
      user_id: [''],
      batch_id: [''],
      status: ['']
    });
  }

  private buildReviewForm(): FormGroup {
    return this.fb.group({
      status: ['approved'],
      review_notes: ['']
    });
  }

  loadForms(): void {
    this.service.getForms().pipe(takeUntil(this.destroy$)).subscribe({
      next: (forms) => this.forms.set(forms),
      error: (err) => console.error('Error loading forms:', err)
    });
  }

  loadResponses(page: number = 1, perPage: number = 10): void {
    this.loading.set(true);
    this.error.set(null);

    const filters: FormResponseFilters = {
      ...this.getFiltersFromForm(),
      page,
      per_page: perPage
    };

    this.service.getFormResponses(filters).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.responses.set(response.data || []);
        this.meta.set(response.meta || null);
        this.calculateStats(response.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Error al cargar las respuestas');
        this.alert.error('Error', 'No se pudieron cargar las respuestas');
        this.loading.set(false);
      }
    });
  }

  private calculateStats(data: FormResponse[]): void {
    const stats = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      approved: 0,
      rejected: 0,
      total: data.length
    };

    data.forEach(r => {
      if (r.status === 'pending') stats.pending++;
      else if (r.status === 'in_progress') stats.in_progress++;
      else if (r.status === 'completed') stats.completed++;
      else if (r.status === 'approved') stats.approved++;
      else if (r.status === 'rejected') stats.rejected++;
    });

    this.stats.set(stats);
  }

  private getFiltersFromForm(): Partial<FormResponseFilters> {
    const raw = this.filterForm.value;
    const filters: Partial<FormResponseFilters> = {};
    
    if (raw.form_id) filters.form_id = +raw.form_id;
    if (raw.user_id) filters.user_id = +raw.user_id;
    if (raw.batch_id) filters.batch_id = +raw.batch_id;
    if (raw.status) filters.status = raw.status;
    
    return filters;
  }

  applyFilters(): void {
    this.page.set(1);
    this.loadResponses(1, this.perPage());
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.page.set(1);
    this.loadResponses(1, this.perPage());
  }

  // Pagination
  goToPage(newPage: number): void {
    if (newPage >= 1 && newPage <= (this.meta()?.last_page || 1)) {
      this.page.set(newPage);
    }
  }

  previousPage(): void {
    if (this.page() > 1) {
      this.page.set(this.page() - 1);
    }
  }

  nextPage(): void {
    const lastPage = this.meta()?.last_page || 1;
    if (this.page() < lastPage) {
      this.page.set(this.page() + 1);
    }
  }

  // View response detail - Fetch full response with values
  viewDetail(response: FormResponse): void {
    console.log('🔍 viewDetail called with response:', response);
    this.selectedResponse.set(response);
    this.showDetailModal.set(true);
    this.loadingDetail.set(true);

    // Fetch complete response with values from API
    if (response.id) {
      console.log('🔄 Fetching full response for ID:', response.id);
      this.service.getFormResponseById(response.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (fullResponse) => {
          console.log('✅ Full response loaded:', fullResponse);
          this.selectedResponse.set(fullResponse);
          this.loadingDetail.set(false);
        },
        error: (err) => {
          console.error('❌ Error loading response detail:', err);
          this.loadingDetail.set(false);
          // Keep the basic response data even if detail fetch fails
        }
      });
    } else {
      console.warn('⚠️ Response has no ID, skipping detail fetch');
      this.loadingDetail.set(false);
    }
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedResponse.set(null);
  }

  // Open review modal from detail modal - handles the transition properly
  openReviewFromDetail(): void {
    const response = this.selectedResponse();
    if (!response) return;
    
    this.showDetailModal.set(false);
    this.reviewForm.reset({ status: 'approved', review_notes: '' });
    this.showReviewModal.set(true);
    // Note: selectedResponse is already set, don't reset it
  }

  // Review response - Only completed responses can be reviewed (API restriction)
  openReviewModal(response: FormResponse): void {
    if (response.status !== 'completed') {
      this.alert.warning('Acción no permitida', 'Solo se pueden revisar respuestas con estado "Completado"');
      return;
    }
    this.selectedResponse.set(response);
    this.reviewForm.reset({ status: 'approved', review_notes: '' });
    this.showReviewModal.set(true);
  }

  // Check if response can be reviewed (only completed responses)
  canReview(response: FormResponse): boolean {
    return response.status === 'completed';
  }

  closeReviewModal(): void {
    this.showReviewModal.set(false);
    this.selectedResponse.set(null);
    this.reviewForm.reset();
  }

  submitReview(): void {
    const response = this.selectedResponse();
    if (!response || !response.id) return;

    this.reviewing.set(true);
    const payload: ReviewFormResponsePayload = {
      status: this.reviewForm.value.status,
      review_notes: this.reviewForm.value.review_notes || ''
    };

    this.service.reviewFormResponse(response.id, payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        this.alert.success('Revisión completada', `La respuesta ha sido ${payload.status === 'approved' ? 'aprobada' : 'rechazada'}`);
        this.closeReviewModal();
        this.reviewing.set(false);
        this.loadResponses(this.page(), this.perPage());
      },
      error: (err) => {
        this.alert.error('Error', err?.message || 'No se pudo completar la revisión');
        this.reviewing.set(false);
      }
    });
  }

  // Download PDF
  downloadReport(formId: number): void {
    this.service.downloadFormReportPdf(formId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-formulario-${formId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.alert.error('Error', 'No se pudo descargar el reporte');
      }
    });
  }

  // Status helpers
  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'pending': 'bg-warning-subtle text-warning',
      'in_progress': 'bg-info-subtle text-info',
      'completed': 'bg-primary-subtle text-primary',
      'approved': 'bg-success-subtle text-success',
      'rejected': 'bg-danger-subtle text-danger'
    };
    return classes[status] || 'bg-secondary-subtle text-secondary';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': 'Pendiente',
      'in_progress': 'En Progreso',
      'completed': 'Completado',
      'approved': 'Aprobado',
      'rejected': 'Rechazado'
    };
    return labels[status] || status;
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'pending': 'ti ti-clock',
      'in_progress': 'ti ti-progress',
      'completed': 'ti ti-check',
      'approved': 'ti ti-circle-check',
      'rejected': 'ti ti-circle-x'
    };
    return icons[status] || 'ti ti-help';
  }

  // TrackBy
  trackById(index: number, item: FormResponse): number {
    return item?.id ?? index;
  }

  // Format date
  formatDate(dateString: string | undefined | null): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
