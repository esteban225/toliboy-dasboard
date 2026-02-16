import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subscription, BehaviorSubject, combineLatest } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { 
  trigger, 
  transition, 
  style, 
  animate, 
  stagger, 
  query 
} from '@angular/animations';
import * as FormResponseActions from '../../store/actions/formResponse.actions';
import * as FormResponseSelectors from '../../store/selectors/formResponse.selectors';
import { FormResponse, FormResponseStatus } from '../../model/forms.model';

interface TraceEvent {
  id: number;
  type: 'created' | 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'updated';
  formName: string;
  formCode: string;
  userName: string;
  batchCode?: string;
  status: FormResponseStatus;
  date: Date;
  notes?: string;
  reviewer?: string;
  response: FormResponse;
}

interface TraceFilters {
  formId: number | null;
  status: FormResponseStatus | null;
  dateFrom: string;
  dateTo: string;
  search: string;
}

@Component({
  selector: 'app-forms-trazability',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forms-trazability.component.html',
  styleUrl: './forms-trazability.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('listAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(-20px)' }),
          stagger(80, [
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class FormsTrazabilityComponent implements OnInit, OnDestroy {
  // Observables del store
  forms$: Observable<any[]>;
  responses$: Observable<FormResponse[]>;
  loading$: Observable<boolean>;
  
  // Estado local
  traceEvents: TraceEvent[] = [];
  filteredEvents: TraceEvent[] = [];
  selectedEvent: TraceEvent | null = null;
  
  // Filtros
  filters: TraceFilters = {
    formId: null,
    status: null,
    dateFrom: '',
    dateTo: '',
    search: ''
  };
  
  // UI State
  showFilters = true;
  showDetailModal = false;
  currentView: 'timeline' | 'table' = 'timeline';
  
  // Paginación
  currentPage = 1;
  itemsPerPage = 20;
  totalItems = 0;
  
  // Estadísticas
  stats = {
    totalEvents: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    todayCount: 0
  };
  
  private subscriptions: Subscription[] = [];
  private searchSubject = new BehaviorSubject<string>('');

  constructor(private store: Store) {
    this.forms$ = this.store.select(FormResponseSelectors.selectForms);
    this.responses$ = this.store.select(FormResponseSelectors.selectAllResponses);
    this.loading$ = this.store.select(FormResponseSelectors.selectResponsesLoading);
  }

  ngOnInit(): void {
    // Cargar datos iniciales
    this.store.dispatch(FormResponseActions.fetchAllForms());
    this.store.dispatch(FormResponseActions.loadFormResponses({ filters: { per_page: 100 } }));
    
    // Suscribirse a las respuestas y generar eventos de trazabilidad
    const responsesSub = this.responses$.subscribe(responses => {
      if (responses && responses.length > 0) {
        this.generateTraceEvents(responses);
        this.calculateStats();
        this.applyFilters();
      }
    });
    this.subscriptions.push(responsesSub);
    
    // Debounce para búsqueda
    const searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.applyFilters();
    });
    this.subscriptions.push(searchSub);
  }

  // Generar eventos de trazabilidad desde las respuestas
  generateTraceEvents(responses: FormResponse[]): void {
    this.traceEvents = responses.map(response => {
      let eventType: TraceEvent['type'] = 'created';
      
      if (response.status === 'approved') {
        eventType = 'approved';
      } else if (response.status === 'rejected') {
        eventType = 'rejected';
      } else if (response.reviewed_at) {
        eventType = 'reviewed';
      } else if (response.submitted_at) {
        eventType = 'submitted';
      }
      
      return {
        id: response.id || 0,
        type: eventType,
        formName: response.form?.name || 'Formulario',
        formCode: response.form?.code || 'N/A',
        userName: response.user?.name || 'Usuario',
        batchCode: response.batch?.code,
        status: response.status,
        date: new Date(response.updated_at || response.created_at || new Date()),
        notes: response.review_notes || undefined,
        reviewer: response.reviewer?.name,
        response: response
      };
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
    
    this.totalItems = this.traceEvents.length;
  }

  // Calcular estadísticas
  calculateStats(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    this.stats = {
      totalEvents: this.traceEvents.length,
      pendingCount: this.traceEvents.filter(e => e.status === 'pending' || e.status === 'in_progress').length,
      approvedCount: this.traceEvents.filter(e => e.status === 'approved').length,
      rejectedCount: this.traceEvents.filter(e => e.status === 'rejected').length,
      todayCount: this.traceEvents.filter(e => e.date >= today).length
    };
  }

  // Aplicar filtros
  applyFilters(): void {
    let filtered = [...this.traceEvents];
    
    // Filtro por formulario
    if (this.filters.formId) {
      filtered = filtered.filter(e => e.response.form_id === this.filters.formId);
    }
    
    // Filtro por estado
    if (this.filters.status) {
      filtered = filtered.filter(e => e.status === this.filters.status);
    }
    
    // Filtro por fecha desde
    if (this.filters.dateFrom) {
      const from = new Date(this.filters.dateFrom);
      filtered = filtered.filter(e => e.date >= from);
    }
    
    // Filtro por fecha hasta
    if (this.filters.dateTo) {
      const to = new Date(this.filters.dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => e.date <= to);
    }
    
    // Filtro por búsqueda
    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(e => 
        e.formName.toLowerCase().includes(search) ||
        e.userName.toLowerCase().includes(search) ||
        e.batchCode?.toLowerCase().includes(search) ||
        e.formCode.toLowerCase().includes(search)
      );
    }
    
    this.filteredEvents = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
  }

  // Búsqueda con debounce
  onSearchChange(value: string): void {
    this.filters.search = value;
    this.searchSubject.next(value);
  }

  // Resetear filtros
  resetFilters(): void {
    this.filters = {
      formId: null,
      status: null,
      dateFrom: '',
      dateTo: '',
      search: ''
    };
    this.applyFilters();
  }

  // Obtener eventos paginados
  get paginatedEvents(): TraceEvent[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredEvents.slice(start, end);
  }

  // Navegación de páginas
  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Abrir modal de detalle
  openDetail(event: TraceEvent): void {
    this.selectedEvent = event;
    this.showDetailModal = true;
  }

  closeDetail(): void {
    this.showDetailModal = false;
    this.selectedEvent = null;
  }

  // Helpers de UI
  getEventIcon(type: TraceEvent['type']): string {
    const icons: Record<TraceEvent['type'], string> = {
      created: 'ti ti-file-plus',
      submitted: 'ti ti-send',
      reviewed: 'ti ti-eye-check',
      approved: 'ti ti-circle-check',
      rejected: 'ti ti-circle-x',
      updated: 'ti ti-edit'
    };
    return icons[type];
  }

  getEventLabel(type: TraceEvent['type']): string {
    const labels: Record<TraceEvent['type'], string> = {
      created: 'Creado',
      submitted: 'Enviado',
      reviewed: 'Revisado',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      updated: 'Actualizado'
    };
    return labels[type];
  }

  getStatusClass(status: FormResponseStatus): string {
    const classes: Record<FormResponseStatus, string> = {
      pending: 'status-pending',
      in_progress: 'status-progress',
      completed: 'status-completed',
      approved: 'status-approved',
      rejected: 'status-rejected'
    };
    return classes[status];
  }

  getStatusLabel(status: FormResponseStatus): string {
    const labels: Record<FormResponseStatus, string> = {
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      completed: 'Completado',
      approved: 'Aprobado',
      rejected: 'Rechazado'
    };
    return labels[status];
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return this.formatDate(date);
  }

  // Exportar a CSV
  exportToCSV(): void {
    const headers = ['ID', 'Formulario', 'Usuario', 'Lote', 'Estado', 'Fecha', 'Hora', 'Notas'];
    const rows = this.filteredEvents.map(e => [
      e.id,
      e.formName,
      e.userName,
      e.batchCode || '-',
      this.getStatusLabel(e.status),
      this.formatDate(e.date),
      this.formatTime(e.date),
      e.notes || '-'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trazabilidad_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  // Toggle vista
  toggleView(view: 'timeline' | 'table'): void {
    this.currentView = view;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
