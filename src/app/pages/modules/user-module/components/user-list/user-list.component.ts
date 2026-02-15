import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import * as UserActions from '../../store/actions/user.actions';
import * as UserSelectors from '../../store/selectors/user.selectors';
import * as UserContactActions from '../../store/actions/userContact.actions';
import * as UserContactSelector from '../../store/selectors/userContact.selectors';
import { DataUser, UserData } from '../../models/userData.model';
import { AlertService } from 'src/app/core/services/alert.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit, OnDestroy {
  users$: Observable<UserData[]>;
  userContacts$: Observable<DataUser[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;

  private subscriptions: Subscription[] = [];

  readonly roleOptions = [
    { id: 1, label: 'Desarrollador' },
    { id: 2, label: 'Gerente General' },
    { id: 3, label: 'Ingeniero de planta' },
    { id: 4, label: 'Ingeniero de producción' },
    { id: 5, label: 'Trazabilidad' },
    { id: 6, label: 'Operador' }
  ];

  searchTerm = '';
  roleFilter: number | 'all' = 'all';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  viewMode: 'grid' | 'list' = 'grid';

  // Estado de modales
  showFormModal = false;
  showDetailModal = false;
  isEditMode = false;

  // Usuario en edición o creación
  newUser: UserData = {
    id: undefined,
    name: '',
    email: '',
    password: '',
    role_id: 6,
    position: '',
    is_active: true,
    last_login: new Date()
  };

  newUserContact: DataUser = {
    id: undefined,
    user_id: 0,
    num_phone: '',
    num_phone_alt: '',
    identification_type: '',
    num_identification: '',
    address: '',
    emergency_contact: '',
    emergency_phone: ''
  };

  // Usuario seleccionado para detalles
  selectedUser: UserData | null = null;
  selectedUserContact: DataUser | null = null;

  constructor(
    private store: Store,
    private alertService: AlertService
  ) {
    this.users$ = this.store.select(UserSelectors.selectAllUsers);
    this.userContacts$ = this.store.select(UserContactSelector.selectAllUserContacts);
    this.loading$ = this.store.select(UserSelectors.selectUsersLoading);
    this.error$ = this.store.select(UserSelectors.selectUsersError);
  }

  ngOnInit(): void {
    this.store.dispatch(UserActions.fetchUsers());
    this.store.dispatch(UserContactActions.fetchUserContacts());
  }

  // 🔹 Abrir modal para crear nuevo usuario
  openCreateModal(): void {
    this.resetFormState();
    this.showFormModal = true;
  }

  // 🔹 Abrir modal para editar usuario existente
  editUser(user: UserData, userContact: DataUser | null): void {
    this.isEditMode = true;
    this.newUser = { ...user };
    this.newUserContact = userContact ? { ...userContact } : this.createEmptyContact(user.id || 0);
    this.showFormModal = true;
  }

  // 🔹 Abrir modal para ver detalles del usuario
  viewUser(user: UserData): void {
    this.selectedUser = user;
    this.showDetailModal = true;
    const sub = this.userContacts$
      .pipe(take(1))
      .subscribe(contacts => {
        this.selectedUserContact = contacts.find(contact => contact.user_id === user.id) || null;
      });
    this.subscriptions.push(sub);
  }

  // 🔹 Cerrar modales
  closeFormModal(): void {
    this.showFormModal = false;
    this.resetFormState();
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedUser = null;
    this.selectedUserContact = null;
  }

  // 🔹 Enviar formulario (crear o actualizar)
  onSubmit(): void {
    if (!this.newUser.name || !this.newUser.email) {
      alert('Por favor, completa los campos obligatorios.');
      return;
    }

    if (this.isEditMode && this.newUser.id) {
      // Actualizar usuario existente
      this.store.dispatch(UserActions.updateUser({ id: this.newUser.id, user: this.newUser }));
      const contactPayload = { ...this.newUserContact, user_id: this.newUser.id };

      if (this.hasContactInformation(contactPayload)) {
        if (contactPayload.id) {
          this.store.dispatch(
            UserContactActions.updateUserContact({ id: contactPayload.id, userContact: contactPayload })
          );
        } else {
          this.store.dispatch(UserContactActions.createUserContact({ userContact: contactPayload }));
        }
      }

      this.alertService.success('Usuario actualizado con éxito');
      this.closeFormModal();
    } else {
      // Crear nuevo usuario
      this.store.dispatch(UserActions.createUser({ user: this.newUser }));

      const sub = this.store.select(UserSelectors.selectUserState).subscribe(state => {
        const lastUser = state.users[state.users.length - 1];
        if (lastUser && lastUser.id) {
          const contactToCreate = { ...this.newUserContact, user_id: lastUser.id };
          if (this.hasContactInformation(contactToCreate)) {
            this.store.dispatch(UserContactActions.createUserContact({ userContact: contactToCreate }));
          }
          this.alertService.success('Usuario creado con éxito');
          this.closeFormModal();
          sub.unsubscribe();
        }
      });
      this.subscriptions.push(sub);
    }
  }

  // 🔹 Eliminar usuario
  deleteUser(id: number): void {
    if (!id) return;
    this.alertService.confirm('Eliminar Usuario', '¿Seguro que deseas eliminar este usuario?').then(confirmed => {
      if (confirmed) {
        this.store.dispatch(UserActions.deleteUser({ id }));
      }
    });
  }

  refreshUsers(): void {
    this.store.dispatch(UserActions.fetchUsers());
    this.store.dispatch(UserContactActions.fetchUserContacts());
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.roleFilter = 'all';
    this.statusFilter = 'all';
  }

  filterUsers(users: UserData[]): UserData[] {
    return users.filter(user => {
      const matchesSearch = this.matchesSearch(user, this.searchTerm);
      const matchesRole = this.roleFilter === 'all' ? true : user.role_id === this.roleFilter;
      const matchesStatus =
        this.statusFilter === 'all'
          ? true
          : this.statusFilter === 'active'
            ? user.is_active
            : !user.is_active;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }

  hasActiveFilters(): boolean {
    return this.searchTerm.trim().length > 0 || this.roleFilter !== 'all' || this.statusFilter !== 'all';
  }

  getActiveCount(users: UserData[]): number {
    return users.filter(user => user.is_active).length;
  }

  getInactiveCount(users: UserData[]): number {
    return users.filter(user => !user.is_active).length;
  }

  getInitials(name?: string | null): string {
    if (!name) {
      return '?';
    }
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    const first = parts[0].charAt(0);
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return `${first}${last}`.toUpperCase();
  }

  trackByUserId(_: number, user: UserData): number | undefined {
    return user.id;
  }

  // 🔹 Buscar contacto por user_id
  getUserContact(userId: number, contacts: DataUser[]): DataUser | null {
    return contacts.find(contact => contact.user_id === userId) || null;
  }

  // 🔹 Obtener nombre del rol
  getRoleName(roleId: number): string {
    const roles: Record<number, string> = {
      1: 'Desarrollador',
      2: 'Gerente General',
      3: 'Ingeniero de planta',
      4: 'Ingeniero de producción',
      5: 'Trazabilidad',
      6: 'Operador'
    };
    return roles[roleId] || 'Sin rol';
  }

  // 🔹 Clase visual para badges de roles
  getRoleBadgeClass(roleId: number): string {
    const classes: Record<number, string> = {
      1: 'badge bg-info text-dark',        // Desarrollador
      2: 'badge bg-primary',               // Gerente General
      3: 'badge bg-success',               // Ingeniero de planta
      4: 'badge bg-warning text-dark',     // Ingeniero de producción
      5: 'badge bg-secondary',             // Trazabilidad
      6: 'badge bg-dark'                   // Operador
    };
    return classes[roleId] || 'badge bg-secondary';
  }

  getRoleLabel(filter: number | 'all'): string {
    return filter === 'all' ? 'Todos' : this.getRoleName(filter);
  }

  private resetFormState(): void {
    this.isEditMode = false;
    this.newUser = {
      id: undefined,
      name: '',
      email: '',
      password: '',
      role_id: 6,
      position: '',
      is_active: true,
      last_login: new Date()
    };
    this.newUserContact = this.createEmptyContact();
  }

  private createEmptyContact(userId = 0): DataUser {
    return {
      id: undefined,
      user_id: userId,
      num_phone: '',
      num_phone_alt: '',
      identification_type: '',
      num_identification: '',
      address: '',
      emergency_contact: '',
      emergency_phone: ''
    };
  }

  private matchesSearch(user: UserData, term: string): boolean {
    if (!term) {
      return true;
    }
    const normalized = term.toLowerCase().trim();
    return (
      (user.name || '').toLowerCase().includes(normalized) ||
      (user.email || '').toLowerCase().includes(normalized) ||
      (user.position || '').toLowerCase().includes(normalized)
    );
  }

  private hasContactInformation(contact: DataUser): boolean {
    return !!(
      contact.num_phone?.trim() ||
      contact.num_phone_alt?.trim() ||
      contact.identification_type?.trim() ||
      contact.num_identification?.trim() ||
      contact.address?.trim() ||
      contact.emergency_contact?.trim() ||
      contact.emergency_phone?.trim()
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}