// チャット機能管理クラス
class ChatManager {
    constructor(domElements) {
        this.dom = domElements;
    }

    sendMessage() {
        const message = this.dom.getElement('chatInput').value.trim();
        if (message) {
            // socketManagerの参照はグローバルから取得
            if (window.app && window.app.socketManager) {
                window.app.socketManager.sendChatMessage(message);
            }
            this.dom.getElement('chatInput').value = '';
        }
    }

    displayMessage(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        messageDiv.innerHTML = `
            <div class="chat-message-header">${data.player} - ${data.timestamp}</div>
            <div class="chat-message-content">${data.message}</div>
        `;
        
        this.dom.getElement('chatMessages').appendChild(messageDiv);
        this.dom.getElement('chatMessages').scrollTop = this.dom.getElement('chatMessages').scrollHeight;
    }

    clearMessages() {
        this.dom.getElement('chatMessages').innerHTML = '';
    }

    setupEventListeners() {
        this.dom.getElement('chatSendBtn').addEventListener('click', () => {
            this.sendMessage();
        });

        this.dom.getElement('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }
}

// ChatManagerクラスをエクスポート
window.ChatManager = ChatManager;
