import { Component, ViewChild } from '@angular/core';
import { UntypedFormBuilder, Validators, UntypedFormGroup } from '@angular/forms';
import { DatePipe } from '@angular/common';

// Get Data
import { ChatModel, ContactModel, CallsModel, BookmarkModel, AttachmentModel, ChatMessage } from './chat.model';
import { messages, attachementsData, chatContactData, chatData, callsData, bookmarkData } from '../../../core/data/chat';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent {
  currentTab = 'chats';

  chatData!: ChatModel[];
  contactData!: ContactModel[];
  callsData!: CallsModel[];
  bookmarkData!: BookmarkModel[];
  attachementsData!: AttachmentModel[];
  messageData: any;

  searchText: any;
  searchMsgText: any;
  formData!: UntypedFormGroup;
  usermessage!: string;
  isFlag: boolean = false;
  submitted = false;
  isStatus: string = 'online';
  isProfile: string = 'assets/images/users/avatar-2.jpg';
  username: any = 'Lisa Parker';

  images: { src: string; thumb: string; caption: string }[] = [];
  isreplyMessage = false;
  emoji = '';

  showChatContent = true;
  showVideoContent = false;

  running = true;
  chatTime = 0;
  formattedTime = '00:00:00';
  timerId: any;

  @ViewChild('scrollRef') scrollRef: any;

  constructor(public formBuilder: UntypedFormBuilder, private datePipe: DatePipe) { }

  ngOnInit(): void {
    // Inicializar usuario desde localStorage
    this.initializeUser();
    
    // Chat Data Get Function
    this._fetchData();

    // Validation
    this.formData = this.formBuilder.group({
      message: ['', [Validators.required]],
    });

    this.onListScroll();
  }

  /**
   * Inicializa el usuario de forma segura
   */
  private initializeUser(): void {
    try {
      const userString = localStorage.getItem('currentUser');
      if (userString) {
        const user = JSON.parse(userString);
        this.username = user.name || 'Usuario';
        this.isProfile = user.avatar || 'assets/images/users/avatar-1.jpg';
        console.log('✅ Chat user loaded:', this.username);
      } else {
        // Usuario por defecto
        this.username = 'Usuario';
        this.isProfile = 'assets/images/users/avatar-1.jpg';
        console.log('ℹ️ Using default chat user');
      }
    } catch (error) {
      console.error('❌ Error loading chat user:', error);
      this.username = 'Usuario';
      this.isProfile = 'assets/images/users/avatar-1.jpg';
    }
  }

  ngAfterViewInit() {
    this.scrollRef.SimpleBar.getScrollElement().scrollTop = 300;
    this.onListScroll();
  }

  // Change Tab Content
  changeTab(tab: string) {
    this.currentTab = tab;
  }

  /**
 * Returns form
 */
  get form() {
    return this.formData.controls;
  }

  // Chat Data Fetch
  private _fetchData() {

    // Fetch Data
    setTimeout(() => {
      this.messageData = messages;
      document.getElementById('elmLoader')?.classList.add('d-none')
    }, 1200)

    this.chatData = chatData;
    this.contactData = chatContactData;
    this.callsData = callsData;
    this.bookmarkData = bookmarkData;
    this.attachementsData = attachementsData;
  }

  onListScroll() {
    if (this.scrollRef !== undefined) {
      setTimeout(() => {
        this.scrollRef.SimpleBar.getScrollElement().scrollTop = this.scrollRef.SimpleBar.getScrollElement().scrollHeight;
      }, 500);
    }
  }

  /**
   * Save the message in chat
   */
  messageSave() {
    const message = this.formData.get('message')!.value;
    
    if (!message || !message.trim()) {
      return; // No enviar mensajes vacíos
    }

    const currentTime = this.datePipe.transform(new Date(), "h:mm a");

    if (this.isreplyMessage == true) {
      var itemReplyList: any = document.getElementById("users-chat")?.querySelector(".chat-conversation-list");
      var chatReplyUser = (document.querySelector(".replyCard .replymessage-block .flex-grow-1 .conversation-name") as HTMLAreaElement)?.innerHTML || 'Usuario';
      var chatReplyMessage = (document.querySelector(".replyCard .replymessage-block .flex-grow-1 .mb-0") as HTMLAreaElement)?.innerText || '';

      this.messageData.push({
        id: this.messageData.length + 1,
        isSender: true,
        sender: this.username,
        replayName: chatReplyUser,
        replaymsg: chatReplyMessage,
        message: message.trim(),
        createdAt: currentTime,
      });
    } else {
      // Mensaje normal
      this.messageData.push({
        id: this.messageData.length + 1,
        isSender: true,
        sender: this.username,
        message: message.trim(),
        createdAt: currentTime,
      });
    }

    // Simular respuesta automática después de 1-3 segundos
    this.simulateAutoReply();

    this.onListScroll();

    // Reset form
    this.formData.patchValue({ message: '' });
    this.isreplyMessage = false;
    this.emoji = '';

    document.querySelector('.replyCard')?.classList.remove('show');
    this.submitted = true;
  }

  /**
   * Simula respuesta automática del contacto
   */
  private simulateAutoReply(): void {
    // Solo simular respuesta si hay un chat activo
    if (!this.isFlag) return;

    const responses = [
      "¡Hola! ¿Cómo estás?",
      "Entendido, gracias por el mensaje.",
      "Te respondo en un momento.",
      "Perfecto, hablamos luego.",
      "¡Excelente! Me parece bien.",
      "Ok, nos vemos pronto.",
      "Gracias por la información.",
      "¿Necesitas algo más?",
    ];

    const randomDelay = Math.random() * 3000 + 1000; // 1-4 segundos
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    setTimeout(() => {
      this.messageData.push({
        id: this.messageData.length + 1,
        isSender: false,
        sender: this.username, // El contacto activo
        message: randomResponse,
        createdAt: this.datePipe.transform(new Date(), "h:mm a"),
      });
      this.onListScroll();
    }, randomDelay);
  }

  // Emoji Picker
  showEmojiPicker = false;
  sets: any = [
    'native',
    'google',
    'twitter',
    'facebook',
    'emojione',
    'apple',
    'messenger'
  ]
  set: any = 'twitter';
  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(event: any) {
    const currentMessage = this.formData.get('message')?.value || '';
    const newMessage = currentMessage + event.emoji.native;
    
    this.formData.patchValue({ message: newMessage });
    this.showEmojiPicker = false;
    
    // Enfocar el input después de agregar emoji
    setTimeout(() => {
      const messageInput = document.querySelector('#messageInput') as HTMLInputElement;
      if (messageInput) {
        messageInput.focus();
      }
    }, 100);
  }

  /***
  * OnClick User Chat show
  */
  chatUsername(name: string, profile: any, status: string, event: any) {
    // Remover clase active de todos los elementos
    const li = document.querySelectorAll('#userList li');
    li.forEach((item: any) => {
      item.classList.remove('active');
    });
    
    // Agregar active al elemento clickeado
    const clickedElement = event.target.closest('li');
    if (clickedElement) {
      clickedElement.classList.add('active');
    }
    
    // Configurar chat activo
    this.isFlag = true;
    this.username = name;
    this.isStatus = status;
    this.isProfile = profile ? profile : 'assets/images/users/user-dummy-img.jpg';
    
    // Cargar mensajes para este usuario (simulados)
    this.loadMessagesForUser(name);
    
    // Mostrar el chat
    const userChatShow = document.querySelector('.user-chat');
    if (userChatShow != null) {
      userChatShow.classList.add('user-chat-show');
    }
    
    console.log(`💬 Chat opened with: ${name}`);
  }

  /**
   * Carga mensajes simulados para el usuario seleccionado
   */
  private loadMessagesForUser(userName: string): void {
    // Limpiar mensajes anteriores
    this.messageData = [];
    
    // Agregar algunos mensajes de ejemplo
    const sampleMessages = [
      {
        id: 1,
        isSender: false,
        sender: userName,
        message: `¡Hola! Soy ${userName}`,
        createdAt: "10:00 AM",
      },
      {
        id: 2,
        isSender: false,
        sender: userName,
        message: "¿Cómo estás hoy?",
        createdAt: "10:01 AM",
      }
    ];
    
    this.messageData = sampleMessages;
    setTimeout(() => this.onListScroll(), 100);
  }

  // Copy Message
  copyMessage(event: any) {
    navigator.clipboard.writeText(event.target.closest('.chat-list').querySelector('.ctext-content').innerHTML);
    (document.getElementById("copyClipBoard") as HTMLElement).style.display = "block";
    setTimeout(() => {
      (document.getElementById("copyClipBoard") as HTMLElement).style.display = "none";
    }, 1000);
  }

  // Delete Message
  deleteMessage(event: any) {
    event.target.closest('.chat-list').remove();
  }

  // Replay Message
  replyMessage(event: any, align: any) {
    this.isreplyMessage = true;
    document.querySelector('.replyCard')?.classList.add('show');
    var copyText = event.target.closest('.chat-list').querySelector('.ctext-content').innerHTML;
    (document.querySelector(".replyCard .replymessage-block .flex-grow-1 .mb-0") as HTMLAreaElement).innerHTML = copyText;
    var msgOwnerName: any = event.target.closest(".chat-list").classList.contains("right") == true ? 'You' : document.querySelector('.username')?.innerHTML;
    (document.querySelector(".replyCard .replymessage-block .flex-grow-1 .conversation-name") as HTMLAreaElement).innerHTML = msgOwnerName;
  }

  closeReplay() {
    document.querySelector('.replyCard')?.classList.remove('show');
  }

  // Delete All Message
  deleteAllMessage(event: any) {
    var allMsgDelete: any = document.getElementById('users-conversation')?.querySelectorAll('.chat-list');
    allMsgDelete.forEach((item: any) => {
      item.remove();
    })
  }

  // Contact Search
  ContactSearch() {
    var input: any, filter: any, ul: any, li: any, a: any | undefined, i: any, txtValue: any;
    input = document.getElementById("searchContact") as HTMLAreaElement;
    filter = input.value.toUpperCase();
    ul = document.querySelectorAll(".chat-user-list");
    ul.forEach((item: any) => {
      li = item.getElementsByTagName("li");
      for (i = 0; i < li.length; i++) {
        a = li[i].getElementsByTagName("p")[0];
        txtValue = a?.innerText;
        if (txtValue?.toUpperCase().indexOf(filter) > -1) {
          li[i].style.display = "";
        } else {
          li[i].style.display = "none";
        }
      }
    })

  }

  // Message Search
  MessageSearch() {
    var input: any, filter: any, ul: any, li: any, a: any | undefined, i: any, txtValue: any;
    input = document.getElementById("searchMessage") as HTMLAreaElement;
    filter = input.value.toUpperCase();
    ul = document.getElementById("users-conversation");
    li = ul.getElementsByTagName("li");
    for (i = 0; i < li.length; i++) {
      a = li[i].getElementsByTagName("p")[0];
      txtValue = a?.innerText;
      if (txtValue?.toUpperCase().indexOf(filter) > -1) {
        li[i].style.display = "";
      } else {
        li[i].style.display = "none";
      }
    }
  }

  onFocus() {
    this.showEmojiPicker = false;
  }
  onBlur() {
  }

  /**
   * Delete Chat Contact Data 
   */
  delete(event: any) {
    event.target.closest('li')?.remove();
  }

  hideChat() {
    const userChatShow = document.querySelector('.user-chat');
    if (userChatShow != null) {
      userChatShow.classList.remove('user-chat-show');
    }
  }


  // Open Profile Detail
  openProfile() {
    (document.querySelector(".chat-rightsidebar") as HTMLElement).style.display = "block";
  }

  closeProfile() {
    (document.querySelector(".chat-rightsidebar") as HTMLElement).style.display = "none";
  }

  startVideocall() {
    this.showChatContent = false;
    this.showVideoContent = true;
    this.running = true;
    this.increment();
  }

  disconnectCall() {
    this.showChatContent = true;
    this.showVideoContent = false;
    this.running = false;
    this.chatTime = 0;
    this.formattedTime = '00:00:00';
    clearTimeout(this.timerId);
  }

  
  increment() {
    if (this.running) {
      this.timerId = setTimeout(() => {
        this.chatTime++;
        let hours = Math.floor(this.chatTime / 10 / 3600);
        let mins = Math.floor((this.chatTime / 10 / 60) % 60);
        let secs = Math.floor((this.chatTime / 10) % 60);
        this.formattedTime = `${this.padZero(hours)}:${this.padZero(mins)}:${this.padZero(secs)}`;
        this.increment();
        return `${this.padZero(hours)}:${this.padZero(mins)}:${this.padZero(secs)}`
      }, 100);
    }
  }

  
  padZero(num: number): string {
    return num <= 9 ? '0' + num : num.toString();
  }
}
