import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface TodoItem {
  id: string;
  task: string;
  // `subItem` queda opcional (ya no se usa en UI)
  subItem?: AssignedMember[];
  // Fecha para mostrar
  dueDate: string;
  // Fecha en formato ISO para comparaciones y notificaciones
  dueDateISO?: string;
  status: 'New' | 'Inprogress' | 'Pending' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  checked: boolean;
}

export interface AssignedMember {
  img: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class TodoStorageService {
  private readonly STORAGE_KEY = 'vixon_todo_items';
  private todosSubject = new BehaviorSubject<TodoItem[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public todos$ = this.todosSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();

  constructor() {
    this.loadTodosFromStorage();
  }

  /**
   * Cargar todos desde localStorage
   */
  private loadTodosFromStorage(): void {
    this.loadingSubject.next(true);
    
    try {
      const storedTodos = localStorage.getItem(this.STORAGE_KEY);
      let todos: TodoItem[] = [];
      
      if (storedTodos) {
        todos = JSON.parse(storedTodos);
        this.validateTodoStructure(todos);
      }
      
      this.todosSubject.next(todos);
    } catch (error) {
      console.error('Error loading todos from localStorage:', error);
      this.todosSubject.next([]);
    } finally {
      setTimeout(() => {
        this.loadingSubject.next(false);
      }, 300);
    }
  }

  /**
   * Validar estructura de los todos cargados
   */
  private validateTodoStructure(todos: any[]): TodoItem[] {
    return todos.filter(todo => 
      todo && 
      typeof todo.id === 'string' && 
      typeof todo.task === 'string' && 
      // subItem y dueDateISO son opcionales: no fallar si no existen
      (typeof todo.dueDate === 'string') &&
      typeof todo.status === 'string' &&
      typeof todo.priority === 'string' &&
      typeof todo.checked === 'boolean'
    ).map(t => {
      // Normalizar estructura: asegurar campos opcionales
      return {
        id: String(t.id),
        task: String(t.task),
        subItem: Array.isArray(t.subItem) ? t.subItem : [],
        dueDate: String(t.dueDate),
  dueDateISO: t.dueDateISO || undefined,
        status: String(t.status) as TodoItem['status'],
        priority: String(t.priority) as TodoItem['priority'],
        checked: Boolean(t.checked)
      } as TodoItem;
    });
  }

  /**
   * Guardar todos en localStorage
   */
  private saveTodosToStorage(todos: TodoItem[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(todos));
    } catch (error) {
      console.error('Error saving todos to localStorage:', error);
      // Intentar limpiar localStorage si está lleno
      if (error instanceof DOMException && error.code === 22) {
        console.warn('localStorage is full, clearing old data...');
        this.clearStorage();
      }
    }
  }

  /**
   * Obtener todos los todos
   */
  getTodos(): Observable<TodoItem[]> {
    return this.todos$;
  }

  /**
   * Obtener estado de carga
   */
  getLoadingState(): Observable<boolean> {
    return this.loading$;
  }

  /**
   * Obtener todos como array sincronamente
   */
  getTodosSync(): TodoItem[] {
    return this.todosSubject.value;
  }

  /**
   * Verificar si hay todos guardados
   */
  hasTodos(): boolean {
    return this.todosSubject.value.length > 0;
  }

  /**
   * Agregar nuevo todo
   */
  addTodo(newTodo: Omit<TodoItem, 'id'>): string {
    const currentTodos = this.todosSubject.value;
    const id = this.generateNewId(currentTodos);
    
    const todoWithId: TodoItem = {
      ...newTodo,
      id: id.toString()
    };
    
    const updatedTodos = [...currentTodos, todoWithId];
    this.todosSubject.next(updatedTodos);
    this.saveTodosToStorage(updatedTodos);
    
    return todoWithId.id;
  }

  /**
   * Actualizar todo existente
   */
  updateTodo(updatedTodo: TodoItem): boolean {
    const currentTodos = this.todosSubject.value;
    const index = currentTodos.findIndex(todo => todo.id === updatedTodo.id);
    
    if (index !== -1) {
      const updatedTodos = [...currentTodos];
      updatedTodos[index] = { ...updatedTodo };
      this.todosSubject.next(updatedTodos);
      this.saveTodosToStorage(updatedTodos);
      return true;
    }
    
    return false;
  }

  /**
   * Eliminar todo
   */
  deleteTodo(id: string): boolean {
    const currentTodos = this.todosSubject.value;
    const initialLength = currentTodos.length;
    const updatedTodos = currentTodos.filter(todo => todo.id !== id);
    
    if (updatedTodos.length !== initialLength) {
      this.todosSubject.next(updatedTodos);
      this.saveTodosToStorage(updatedTodos);
      return true;
    }
    
    return false;
  }

  /**
   * Obtener todo por ID
   */
  getTodoById(id: string): TodoItem | undefined {
    const currentTodos = this.todosSubject.value;
    return currentTodos.find(todo => todo.id === id);
  }

  /**
   * Actualizar orden de todos (para drag & drop)
   */
  updateTodosOrder(todos: TodoItem[]): void {
    this.todosSubject.next([...todos]);
    this.saveTodosToStorage(todos);
  }

  /**
   * Alternar estado checked de un todo
   */
  toggleTodoStatus(id: string): boolean {
    const todo = this.getTodoById(id);
    if (todo) {
      const updatedTodo = {
        ...todo,
        checked: !todo.checked,
        status: (!todo.checked ? 'Completed' : 'Inprogress') as TodoItem['status']
      };
      return this.updateTodo(updatedTodo);
    }
    return false;
  }

  /**
   * Filtrar todos por estado
   */
  filterTodosByStatus(status: string): TodoItem[] {
    const currentTodos = this.todosSubject.value;
    if (!status) return currentTodos;
    return currentTodos.filter(todo => todo.status === status);
  }

  /**
   * Buscar todos por texto
   */
  searchTodos(searchTerm: string): TodoItem[] {
    const currentTodos = this.todosSubject.value;
    if (!searchTerm) return currentTodos;
    
    const term = searchTerm.toLowerCase();
    return currentTodos.filter(todo => 
      todo.task.toLowerCase().includes(term) ||
      todo.status.toLowerCase().includes(term) ||
      todo.priority.toLowerCase().includes(term)
    );
  }

  /**
   * Generar nuevo ID único
   */
  private generateNewId(todos: TodoItem[]): number {
    if (todos.length === 0) return 1;
    const maxId = Math.max(...todos.map(todo => parseInt(todo.id, 10) || 0));
    return maxId + 1;
  }

  /**
   * Limpiar localStorage completamente
   */
  clearStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      this.todosSubject.next([]);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  /**
   * Exportar todos como JSON
   */
  exportTodos(): string {
    return JSON.stringify(this.todosSubject.value, null, 2);
  }

  /**
   * Importar todos desde JSON
   */
  importTodos(jsonData: string): boolean {
    try {
      const importedTodos = JSON.parse(jsonData);
      if (Array.isArray(importedTodos)) {
        const validTodos = this.validateTodoStructure(importedTodos);
        this.todosSubject.next(validTodos);
        this.saveTodosToStorage(validTodos);
        return true;
      }
    } catch (error) {
      console.error('Error importing todos:', error);
    }
    return false;
  }

  /**
   * Obtener tareas cuya fecha límite sea hoy o anterior y que no estén completadas
   */
  getDueTasks(): TodoItem[] {
    const todos = this.todosSubject.value;
    const today = new Date();
    // Normalizar hora para comparar solo fecha
    today.setHours(0,0,0,0);

    return todos.filter(t => {
      if (!t.dueDateISO && !t.dueDate) return false;
      const dateToCheck = t.dueDateISO ? new Date(t.dueDateISO) : new Date(t.dueDate);
      if (isNaN(dateToCheck.getTime())) return false;
      dateToCheck.setHours(0,0,0,0);
      return dateToCheck.getTime() <= today.getTime() && t.status !== 'Completed';
    });
  }

  /**
   * Obtener estadísticas de todos
   */
  getTodoStats(): {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    new: number;
  } {
    const todos = this.todosSubject.value;
    return {
      total: todos.length,
      completed: todos.filter(t => t.status === 'Completed').length,
      pending: todos.filter(t => t.status === 'Pending').length,
      inProgress: todos.filter(t => t.status === 'Inprogress').length,
      new: todos.filter(t => t.status === 'New').length
    };
  }
}