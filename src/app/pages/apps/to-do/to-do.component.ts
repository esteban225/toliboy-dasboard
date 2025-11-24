import { Component, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AssignedData, projectList } from '../../../core/data/to-do';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { TodoStorageService, TodoItem, AssignedMember } from '../../../core/services/todo-storage.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-to-do',
  templateUrl: './to-do.component.html',
  styleUrls: ['./to-do.component.scss']
})

// To Do Component
export class ToDoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  todoDatas: TodoItem[] = [];
  deleteId: string = '';
  // Ya no se usa asignación de personas
  todoForm!: UntypedFormGroup;
  submitted = false;
  projectData: any;
  term: string = '';
  isLoading = false;

  // Notificaciones de fechas límite
  dueTasks: TodoItem[] = [];
  showDueBanner = true;

  // ya no hay asignaciones de miembros

  @ViewChild('createProjectModal', { static: false }) createProjectModal?: ModalDirective;
  @ViewChild('createTask', { static: false }) createTask?: ModalDirective;
  @ViewChild('removeTaskItemModal', { static: false }) removeTaskItemModal?: ModalDirective;

  constructor(
    private formBuilder: UntypedFormBuilder, 
    private datePipe: DatePipe, 
    private todoStorageService: TodoStorageService,
    private notificationService: NotificationService
  ) { }


  ngOnInit(): void {
    this.initializeComponent();
    this.setupForm();
    this.subscribeToTodoUpdates();
  }

  private initializeComponent(): void {
    this.projectData = projectList;
  }

  private setupForm(): void {
    this.todoForm = this.formBuilder.group({
      id: [''],
      task: ['', [Validators.required]],
      status: ['New', [Validators.required]],
      priority: ['Medium', [Validators.required]],
      dueDate: ['', [Validators.required]],
      checked: [false],
    });
  }

  private subscribeToTodoUpdates(): void {
    // Suscribirse a los datos del servicio
    this.todoStorageService.getTodos()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: TodoItem[]) => {
        this.todoDatas = [...data]; // Crear copia simple
        // Actualizar tareas vencidas/hoy
        this.dueTasks = this.todoStorageService.getDueTasks();
        // Si no hay tareas vencidas, ocultar banner
        if (!this.dueTasks || this.dueTasks.length === 0) this.showDueBanner = false;
      });

    // Suscribirse al estado de carga
    this.todoStorageService.getLoadingState()
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading: boolean) => {
        this.isLoading = loading;
        const loader = document.getElementById('elmLoader');
        if (loader) {
          if (loading) {
            loader.classList.remove('d-none');
          } else {
            loader.classList.add('d-none');
          }
        }
      });
  }

  /**
   * Open create task modal
   */
  openCreateTask(): void {
    this.resetForm();
    this.createTask?.show();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Form data get
   */
  get form() {
    return this.todoForm.controls;
  }

  /**
   * Collapse sidebar sections
   */
  collapse(collapse: string): void {
    document.getElementById(collapse)?.classList.toggle('show');
  }

  /**
   * Handle drag and drop reordering
   */
  drop(event: CdkDragDrop<TodoItem[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      const updatedTodos = [...this.todoDatas];
      moveItemInArray(updatedTodos, event.previousIndex, event.currentIndex);
      this.todoStorageService.updateTodosOrder(updatedTodos);
    }
  }

  /**
   * Toggle todo completion status
   */
  checkUncheckAll(event: any, id: string, index: number): void {
    const isChecked = event.target.checked;
    const todo = this.todoDatas[index];
    
    if (todo) {
      const updatedTodo: TodoItem = {
        ...todo,
        checked: isChecked,
        status: isChecked ? 'Completed' : 'Inprogress'
      };
      
      this.todoStorageService.updateTodo(updatedTodo);
      
      // Enviar notificación de actualización
      if (isChecked) {
        this.notificationService.success(`Tarea "${todo.task}" completada`, '✅ ¡Bien hecho!');
      }
    }
  }

  // Ya no hay gestión de miembros asignados

  /**
   * Edit existing todo
   */
  editData(index: number): void {
    if (index >= 0 && index < this.todoDatas.length) {
      const todo = this.todoDatas[index];
      this.submitted = false;
      // Llenar formulario
      this.todoForm.patchValue({
        id: todo.id,
        task: todo.task,
        status: todo.status,
        priority: todo.priority,
        dueDate: todo.dueDate,
        checked: todo.checked
      });
      
      this.createTask?.show();
    }
  }

  /**
   * Save Todo data
   */
  saveTodo(): void {
    if (!this.todoForm.valid) {
      this.submitted = true;
      return;
    }

    const formValue = this.todoForm.value;
    const formattedDate = this.datePipe.transform(formValue.dueDate, 'dd MMM, yyyy') || formValue.dueDate;
    // intentar obtener ISO para comparaciones
    let dueIso: string | undefined = undefined;
    try {
      const d = new Date(formValue.dueDate);
      if (!isNaN(d.getTime())) dueIso = d.toISOString();
    } catch (err) {
      dueIso = undefined;
    }

    if (formValue.id) {
      // Actualizar todo existente
      const updatedTodo: TodoItem = {
        id: formValue.id,
        task: formValue.task,
        status: formValue.status,
        priority: formValue.priority,
        dueDate: formattedDate,
        checked: formValue.status === 'Completed',
        dueDateISO: dueIso
      };
      
      this.todoStorageService.updateTodo(updatedTodo);
    } else {
      // Crear nuevo todo
      const newTodo = {
        task: formValue.task,
        status: formValue.status || 'New',
        priority: formValue.priority || 'Medium',
        dueDate: formattedDate,
        checked: formValue.status === 'Completed',
        dueDateISO: dueIso
      };
      
      this.todoStorageService.addTodo(newTodo);
      
      // Enviar notificación de éxito
      this.notificationService.success(`Nueva tarea "${newTodo.task}" creada exitosamente`, '📝 Tarea Creada');
    }

    this.resetForm();
  }

  /**
   * Reset form and close modal
   */
  private resetForm(): void {
    this.todoForm.reset({
      status: 'New',
      priority: 'Medium',
      checked: false
    });
    this.submitted = false;
    this.createTask?.hide();
  }




  /**
   * Delete Model Open
   */
  removeData(id: string): void {
    this.deleteId = id;
    this.removeTaskItemModal?.show();
  }

  /**
   * Confirm delete action
   */
  confirmDelete(): void {
    if (this.deleteId) {
      // Obtener el nombre de la tarea antes de eliminarla
      const todoToDelete = this.todoDatas.find(todo => todo.id === this.deleteId);
      const taskName = todoToDelete?.task || 'Tarea';
      
      this.todoStorageService.deleteTodo(this.deleteId);
      this.removeTaskItemModal?.hide();
      this.deleteId = '';
      
      // Enviar notificación de eliminación
      this.notificationService.warning(`Tarea "${taskName}" eliminada`, '🗑️ Tarea Eliminada');
    }
  }

  /**
   * Filter todos by status
   */
  taskFilter(): void {
    const statusElement = document.getElementById("choices-select-status") as HTMLInputElement;
    const status = statusElement?.value || '';
    
    if (status) {
      this.todoDatas = this.todoStorageService.filterTodosByStatus(status);
    } else {
      this.todoDatas = [...this.todoStorageService.getTodosSync()];
    }
  }

  /**
   * Sort filter
   */
  direction: 'asc' | 'desc' = 'asc';
  
  SortFilter(event: any): void {
    this.direction = this.direction === 'asc' ? 'desc' : 'asc';
    const field = event.target.value;
    
    if (field) {
      this.todoDatas.sort((a: any, b: any) => {
        const res = this.compare(a[field], b[field]);
        return this.direction === 'asc' ? res : -res;
      });
    }
  }

  /**
   * Compare function for sorting
   */
  compare(v1: string | number, v2: string | number): number {
    return v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
  }

  /**
   * Search todos by term
   */
  searchTerm(): void {
    if (this.term?.trim()) {
      this.todoDatas = this.todoStorageService.searchTodos(this.term.trim());
    } else {
      this.todoDatas = [...this.todoStorageService.getTodosSync()];
    }
  }

  /**
   * Ocultar banner de tareas vencidas
   */
  dismissDueBanner(): void {
    this.showDueBanner = false;
  }
}
