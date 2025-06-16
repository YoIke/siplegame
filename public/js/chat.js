// チャット機能管理クラス
class ChatManager {
    constructor(domElements) {
        this.dom = domElements;
        this.unreadCount = 0;
        this.isModalOpen = false;
        this.lastMessageId = 0;
    }

    // フローティングアイコンを表示
    showFloatingIcon() {
        this.dom.getElement('floatingChatIcon').classList.remove('hidden');
    }

    // フローティングアイコンを非表示
    hideFloatingIcon() {
        this.dom.getElement('floatingChatIcon').classList.add('hidden');
    }

    // チャットモーダルを開く
    openChatModal() {
        this.isModalOpen = true;
        this.dom.getElement('chatModal').classList.remove('hidden');
        this.clearUnreadCount();
        this.dom.getElement('modalChatInput').focus();
        
        // 既存のメッセージをモーダルにコピー
        this.syncMessagesToModal();
    }

    // チャットモーダルを閉じる
    closeChatModal() {
        this.isModalOpen = false;
        this.dom.getElement('chatModal').classList.add('hidden');
    }

    // 未読カウントを増やす
    addUnreadCount() {
        if (!this.isModalOpen) {
            this.unreadCount++;
            this.updateNotificationBadge();
        }
    }

    // 未読カウントをクリア
    clearUnreadCount() {
        this.unreadCount = 0;
        this.updateNotificationBadge();
    }

    // 通知バッジの更新
    updateNotificationBadge() {
        const notification = this.dom.getElement('chatNotification');
        if (this.unreadCount > 0) {
            notification.classList.remove('hidden');
        } else {
            notification.classList.add('hidden');
        }
    }

    // モーダルからメッセージを送信
    sendModalMessage() {
        console.log('sendModalMessage called');
        const messageInput = this.dom.getElement('modalChatInput');
        if (!messageInput) {
            console.error('Modal chat input element not found');
            return;
        }
        
        const message = messageInput.value.trim();
        console.log('Message to send:', message);
        
        if (message) {
            if (window.app && window.app.socketManager) {
                console.log('Sending message via socketManager');
                console.log('Socket connected:', window.app.socketManager.socket?.connected);
                window.app.socketManager.sendChatMessage(message);
                messageInput.value = '';
                console.log('Message sent and input cleared');
            } else {
                console.error('SocketManager not available', { 
                    windowApp: window.app,
                    socketManager: window.app?.socketManager
                });
            }
        } else {
            console.log('Empty message, not sending');
        }
    }

    // 従来のメッセージ送信（旧チャットエリア用）
    sendMessage() {
        console.log('sendMessage called');
        const messageInput = this.dom.getElement('chatInput');
        if (!messageInput) {
            console.error('Chat input element not found');
            return;
        }
        
        const message = messageInput.value.trim();
        console.log('Message to send:', message);
        
        if (message) {
            if (window.app && window.app.socketManager) {
                console.log('Sending message via socketManager');
                console.log('Socket connected:', window.app.socketManager.socket?.connected);
                window.app.socketManager.sendChatMessage(message);
                messageInput.value = '';
                console.log('Message sent and input cleared');
            } else {
                console.error('SocketManager not available', {
                    windowApp: window.app,
                    socketManager: window.app?.socketManager
                });
            }
        } else {
            console.log('Empty message, not sending');
        }
    }

    // メッセージを表示
    displayMessage(data) {
        console.log('ChatManager.displayMessage called with:', data);
        this.lastMessageId++;
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        messageDiv.innerHTML = `
            <div class="chat-message-header">${data.player} - ${data.timestamp}</div>
            <div class="chat-message-content">${data.message}</div>
        `;
        
        // 旧チャットエリアに追加
        const chatMessages = this.dom.getElement('chatMessages');
        if (chatMessages) {
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            console.log('Message added to regular chat area');
        } else {
            console.warn('Regular chat messages element not found');
        }
        
        // モーダルが開いていない場合は未読カウントを増やす
        if (!this.isModalOpen) {
            this.addUnreadCount();
        }
        
        // モーダルにもメッセージを追加
        this.addMessageToModal(data);
        
        console.log(`Total messages in regular chat: ${chatMessages ? chatMessages.children.length : 0}`);
    }

    // モーダルにメッセージを追加
    addMessageToModal(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        messageDiv.innerHTML = `
            <div class="chat-message-header">${data.player} - ${data.timestamp}</div>
            <div class="chat-message-content">${data.message}</div>
        `;
        
        this.dom.getElement('modalChatMessages').appendChild(messageDiv);
        this.dom.getElement('modalChatMessages').scrollTop = this.dom.getElement('modalChatMessages').scrollHeight;
    }

    // 既存のメッセージをモーダルに同期
    syncMessagesToModal() {
        const existingMessages = this.dom.getElement('chatMessages').innerHTML;
        this.dom.getElement('modalChatMessages').innerHTML = existingMessages;
        this.dom.getElement('modalChatMessages').scrollTop = this.dom.getElement('modalChatMessages').scrollHeight;
    }

    // メッセージをクリア
    clearMessages() {
        console.log('ChatManager.clearMessages called');
        console.trace('clearMessages call stack');
        this.dom.getElement('chatMessages').innerHTML = '';
        this.dom.getElement('modalChatMessages').innerHTML = '';
        this.clearUnreadCount();
        this.lastMessageId = 0; // メッセージIDもリセット
        console.log('All chat messages cleared');
    }

    // イベントリスナーをセットアップ
    setupEventListeners() {
        console.log('ChatManager.setupEventListeners called');
        
        // 旧チャット送信ボタン
        const chatSendBtn = this.dom.getElement('chatSendBtn');
        if (chatSendBtn) {
            chatSendBtn.addEventListener('click', () => {
                console.log('Old chat send button clicked');
                this.sendMessage();
            });
            console.log('Old chat send button listener added');
        } else {
            console.warn('Old chat send button not found');
        }

        // 旧チャット入力フィールド
        const chatInput = this.dom.getElement('chatInput');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('Old chat input Enter pressed');
                    this.sendMessage();
                }
            });
            console.log('Old chat input listener added');
        } else {
            console.warn('Old chat input not found');
        }

        // フローティングアイコンクリック
        const floatingChatIcon = this.dom.getElement('floatingChatIcon');
        if (floatingChatIcon) {
            floatingChatIcon.addEventListener('click', () => {
                console.log('Floating chat icon clicked');
                this.openChatModal();
            });
            console.log('Floating chat icon listener added');
        } else {
            console.warn('Floating chat icon not found');
        }

        // モーダル閉じるボタン
        const closeChatModal = this.dom.getElement('closeChatModal');
        if (closeChatModal) {
            closeChatModal.addEventListener('click', () => {
                console.log('Close chat modal button clicked');
                this.closeChatModal();
            });
            console.log('Close chat modal button listener added');
        } else {
            console.warn('Close chat modal button not found');
        }

        // モーダル送信ボタン
        const modalChatSendBtn = this.dom.getElement('modalChatSendBtn');
        if (modalChatSendBtn) {
            modalChatSendBtn.addEventListener('click', () => {
                console.log('Modal chat send button clicked');
                this.sendModalMessage();
            });
            console.log('Modal chat send button listener added');
        } else {
            console.warn('Modal chat send button not found');
        }

        // モーダル入力フィールド
        const modalChatInput = this.dom.getElement('modalChatInput');
        if (modalChatInput) {
            modalChatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('Modal chat input Enter pressed');
                    this.sendModalMessage();
                }
            });
            console.log('Modal chat input listener added');
        } else {
            console.warn('Modal chat input not found');
        }

        // モーダル背景クリックで閉じる
        const chatModal = this.dom.getElement('chatModal');
        if (chatModal) {
            chatModal.addEventListener('click', (e) => {
                if (e.target === chatModal) {
                    console.log('Chat modal background clicked');
                    this.closeChatModal();
                }
            });
            console.log('Chat modal background listener added');
        } else {
            console.warn('Chat modal not found');
        }

        console.log('ChatManager.setupEventListeners completed');
    }
}

// ChatManagerクラスをエクスポート
window.ChatManager = ChatManager;
