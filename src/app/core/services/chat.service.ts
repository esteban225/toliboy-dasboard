import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ChatMessage {
  id: number;
  isSender: boolean;
  sender: string;
  message: string;
  createdAt: string;
  replayName?: string;
  replaymsg?: string;
  type?: 'text' | 'image' | 'file';
  attachments?: any[];
}

export interface ChatUser {
  id: number;
  name: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  profile: string;
  lastMessage?: string;
  unreadCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private activeUserSubject = new BehaviorSubject<ChatUser | null>(null);
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private onlineUsersSubject = new BehaviorSubject<ChatUser[]>([]);

  public activeUser$ = this.activeUserSubject.asObservable();
  public messages$ = this.messagesSubject.asObservable();
  public onlineUsers$ = this.onlineUsersSubject.asObservable();

  constructor() {
    this.initializeMockData();
  }

  /**
   * Inicializa datos mock para testing
   */
  private initializeMockData(): void {
    const mockUsers: ChatUser[] = [
      {
        id: 1,
        name: 'Lisa Parker',
        status: 'online',
        profile: 'assets/images/users/avatar-2.jpg',
        lastMessage: 'Hola, ¿cómo estás?',
        unreadCount: 2
      },
      {
        id: 2,
        name: 'Frank Thomas',
        status: 'online',
        profile: 'assets/images/users/avatar-3.jpg',
        lastMessage: 'Nos vemos mañana',
        unreadCount: 0
      },
      {
        id: 3,
        name: 'Sarah Beattie',
        status: 'away',
        profile: 'assets/images/users/avatar-5.jpg',
        lastMessage: 'Estoy ocupada ahora',
        unreadCount: 1
      }
    ];

    this.onlineUsersSubject.next(mockUsers);
  }

  /**
   * Selecciona un usuario para chatear
   */
  selectUser(user: ChatUser): void {
    this.activeUserSubject.next(user);
    this.loadMessagesForUser(user.id);
  }

  /**
   * Carga mensajes para un usuario específico
   */
  private loadMessagesForUser(userId: number): void {
    // Simular carga de mensajes desde una base de datos
    const mockMessages: ChatMessage[] = [
      {
        id: 1,
        isSender: false,
        sender: this.activeUserSubject.value?.name || 'Usuario',
        message: '¡Hola! ¿Cómo estás?',
        createdAt: new Date(Date.now() - 300000).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      },
      {
        id: 2,
        isSender: true,
        sender: 'Tú',
        message: '¡Hola! Todo bien, gracias. ¿Y tú?',
        createdAt: new Date(Date.now() - 240000).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      },
      {
        id: 3,
        isSender: false,
        sender: this.activeUserSubject.value?.name || 'Usuario',
        message: 'Perfecto, trabajando en algunos proyectos.',
        createdAt: new Date(Date.now() - 180000).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }
    ];

    this.messagesSubject.next(mockMessages);
  }

  /**
   * Envía un nuevo mensaje
   */
  sendMessage(message: string, replyTo?: ChatMessage): void {
    const currentMessages = this.messagesSubject.value;
    const activeUser = this.activeUserSubject.value;

    if (!activeUser) return;

    const newMessage: ChatMessage = {
      id: currentMessages.length + 1,
      isSender: true,
      sender: 'Tú',
      message: message.trim(),
      createdAt: new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      replayName: replyTo?.sender,
      replaymsg: replyTo?.message
    };

    const updatedMessages = [...currentMessages, newMessage];
    this.messagesSubject.next(updatedMessages);

    // Simular respuesta automática
    this.simulateReply(activeUser);
  }

  /**
   * Simula una respuesta automática
   */
  private simulateReply(user: ChatUser): void {
    const responses = [
      '¡Entendido!',
      'Perfecto, gracias.',
      '¿Algo más?',
      'Ok, hablamos luego.',
      'Me parece bien.',
      '¡Excelente!',
      'Gracias por la info.',
      'Dale, nos vemos.'
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    const delay = Math.random() * 3000 + 1000; // 1-4 segundos

    setTimeout(() => {
      const currentMessages = this.messagesSubject.value;
      
      const replyMessage: ChatMessage = {
        id: currentMessages.length + 1,
        isSender: false,
        sender: user.name,
        message: randomResponse,
        createdAt: new Date().toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };

      const updatedMessages = [...currentMessages, replyMessage];
      this.messagesSubject.next(updatedMessages);
    }, delay);
  }

  /**
   * Elimina un mensaje
   */
  deleteMessage(messageId: number): void {
    const currentMessages = this.messagesSubject.value;
    const updatedMessages = currentMessages.filter(msg => msg.id !== messageId);
    this.messagesSubject.next(updatedMessages);
  }

  /**
   * Marca mensajes como leídos
   */
  markAsRead(userId: number): void {
    const users = this.onlineUsersSubject.value;
    const updatedUsers = users.map(user => 
      user.id === userId ? { ...user, unreadCount: 0 } : user
    );
    this.onlineUsersSubject.next(updatedUsers);
  }

  /**
   * Actualiza el estado de un usuario
   */
  updateUserStatus(userId: number, status: ChatUser['status']): void {
    const users = this.onlineUsersSubject.value;
    const updatedUsers = users.map(user => 
      user.id === userId ? { ...user, status } : user
    );
    this.onlineUsersSubject.next(updatedUsers);
  }

  /**
   * Busca usuarios por nombre
   */
  searchUsers(query: string): Observable<ChatUser[]> {
    return new Observable(observer => {
      const users = this.onlineUsersSubject.value;
      const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(query.toLowerCase())
      );
      observer.next(filteredUsers);
      observer.complete();
    });
  }

  /**
   * Busca mensajes por contenido
   */
  searchMessages(query: string): Observable<ChatMessage[]> {
    return new Observable(observer => {
      const messages = this.messagesSubject.value;
      const filteredMessages = messages.filter(message => 
        message.message.toLowerCase().includes(query.toLowerCase())
      );
      observer.next(filteredMessages);
      observer.complete();
    });
  }
}