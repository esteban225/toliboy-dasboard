import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
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

  // 👇 Agrega esto justo aquí
  userViewModel$: Observable<{
    users: UserData[];
    loading: boolean;
    error: string | null;
  }>;

  private subscriptions: Subscription[] = [];


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
    role_id: 2,
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
    this.userViewModel$ = this.store.select(UserSelectors.selectUserViewModel);
  }

  ngOnInit(): void {
  this.store.dispatch(UserActions.fetchUsers());
  this.store.dispatch(UserContactActions.fetchUserContacts());
  this.handleErrors(); 
}


  // 🔹 Abrir modal para crear nuevo usuario
  openCreateModal(): void {
    this.isEditMode = false;
    this.newUser = {
      name: '',
      email: '',
      password: '',
      role_id: 6,
      position: '',
      is_active: true,
      last_login: new Date()
    };
    this.showFormModal = true;
  }

  // 🔹 Abrir modal para editar usuario existente
  editUser(user: UserData): void {
    this.isEditMode = true;
    this.newUser = { ...user };
    this.showFormModal = true;
  }

  // 🔹 Abrir modal para ver detalles del usuario
 viewUser(user: UserData): void {
  this.selectedUser = user;
  this.showDetailModal = true;

  // Obtener contacto asociado (suscripción rápida y auto-unsubscribe)
  const sub = this.userContacts$.subscribe(contacts => {
    this.selectedUserContact = contacts?.find(c => c.user_id === user.id) || null;
    sub.unsubscribe();
  });
}

  // 🔹 Cerrar modales
  closeFormModal(): void {
    this.showFormModal = false;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedUser = null;
  }

  // 🔹 Enviar formulario (crear o actualizar)
  onSubmit(): void {
    if (!this.newUser.name || !this.newUser.email) {
      this.alertService.warning('Campos incompletos', 'Por favor completa los campos obligatorios.');
      return;
    }

    if (this.isEditMode && this.newUser.id) {
      // Actualizar usuario existente
      this.store.dispatch(UserActions.updateUser({ id: this.newUser.id, user: this.newUser }));
      //Actualizar el contacto del usuario si es necesario
      const updateContact = {
        ...this.newUserContact,
        user_id: this.newUser.id
      }

      // Si el contacto no existe, lo creamos 
      this.store.dispatch(UserContactActions.updateUserContact({ id: updateContact.id!, userContact: updateContact }));

      // Alert de éxito
      this.alertService.success('Usuario y contacto actualizados con éxito');
      this.closeFormModal();
    } else {

      // Crear nuevo usuario
      this.store.dispatch(UserActions.createUser({ user: this.newUser }));

      // 🔹 Escuchar cuando el usuario se haya creado exitosamente
      const sub = this.store.select(UserSelectors.selectUserState).subscribe(state => {
        const lastUser = state.users[state.users.length - 1]; // último usuario en la lista

        if (lastUser && lastUser.id) {
          // Crear contacto con el user_id del nuevo usuario
          const contactToCreate = {
            ...this.newUserContact,
            user_id: lastUser.id
          };

          this.store.dispatch(UserContactActions.createUserContact({ userContact: contactToCreate }));
          this.alertService.success('Usuario y contacto creados con éxito');
          this.closeFormModal();

          // Muy importante: desuscribirse para no duplicar
          sub.unsubscribe();
        }
      });
      this.subscriptions.push(sub);
    }
  }

  // 🔹 Eliminar usuario
  deleteUser(id: number): void {
    this.alertService.confirm('Eliminar Usuario', '¿Seguro que deseas eliminar este usuario?')
      .then(result => {
        if (result.isConfirmed) {
          this.store.dispatch(UserActions.deleteUser({ id }));
          this.alertService.success('Usuario eliminado', 'El usuario se eliminó correctamente.');
        } else {
          this.alertService.info('Cancelado', 'El usuario no fue eliminado.');
        }
      });

  }

  // 🔹 Cargar usuarios manualmente
  loadUsers(): void {
    const token = localStorage.getItem('token');

    if (!token) {
      this.alertService.error(
        'Sesión no encontrada',
        'Por favor inicia sesión antes de continuar.'
      );
      return;
    }

    // Mostrar alerta de carga
    this.alertService.loading('Cargando usuarios...', 'Por favor espera.');

    try {
      this.store.dispatch(UserActions.fetchUsers());

      // Cerrar la alerta de carga y mostrar confirmación
            // en lugar de setTimeout, cerramos el loading cuando loading$ indique que terminó
      const loadingSub = this.loading$.subscribe(isLoading => {
        if (!isLoading) {
          this.alertService.close();
          this.alertService.success('Usuarios cargados', 'La lista de usuarios se actualizó correctamente.');
          loadingSub.unsubscribe();
        }
      });
      this.subscriptions.push(loadingSub);
    } catch (err: any) {
      this.alertService.close();
      this.alertService.error('Error inesperado', err.message || 'Ocurrió un error desconocido.');
    }
  }

  // 🔹 Manejo general de errores del componente
  private handleErrors(): void {
    const sub = this.error$.subscribe(error => {
      if (error) {
        this.alertService.error('Error detectado', error);
      }
    });
    this.subscriptions.push(sub);
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
      1: 'badge-developer',
      2: 'badge-manager',
      3: 'badge-plant-engineer',
      4: 'badge-production-engineer',
      5: 'badge-traceability',
      6: 'badge-operator'
    };
    return classes[roleId] || 'badge-user';
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

}