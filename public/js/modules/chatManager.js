import { elements } from './config.js';

// チャット機能
export class ChatManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (elements.chatSendBtn) {
            elements.chatSendBtn.addEventListener('click', () => this.sendMessage());
        }
        if (elements.chatInput) {
            elements.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }
    }

    sendMessage() {
        if (!elements.chatInput) return;
        
        const message = elements.chatInput.value.trim();
        if (message) {
            // Socket.ioでメッセージを送信（socketは後でDIする）
            this.onSendMessage(message);
            elements.chatInput.value = '';
        }
    }

    addMessage(playerName, message, isOwn = false) {
        if (!elements.chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isOwn ? 'own' : 'other'}`;
        messageDiv.innerHTML = `
            <span class="message-sender">${playerName}:</span>
            <span class="message-text">${message}</span>
        `;
        elements.chatMessages.appendChild(messageDiv);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }

    clearMessages() {
        if (elements.chatMessages) {
            elements.chatMessages.innerHTML = '';
        }
    }

    // 外部から設定されるコールバック
    onSendMessage(message) {
        console.log('Send message callback not set:', message);
    }
}
