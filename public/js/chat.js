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
        const message = this.dom.getElement('modalChatInput').value.trim();
        if (message) {
            if (window.app && window.app.socketManager) {
                window.app.socketManager.sendChatMessage(message);
            }
            this.dom.getElement('modalChatInput').value = '';
        }
    }

    // 従来のメッセージ送信（旧チャットエリア用）
    sendMessage() {
        const message = this.dom.getElement('chatInput').value.trim();
        if (message) {
            if (window.app && window.app.socketManager) {
                window.app.socketManager.sendChatMessage(message);
            }
            this.dom.getElement('chatInput').value = '';
        }
    }

    // メッセージを表示
    displayMessage(data) {
        this.lastMessageId++;
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        messageDiv.innerHTML = `
            <div class="chat-message-header">${data.player} - ${data.timestamp}</div>
            <div class="chat-message-content">${data.message}</div>
        `;
        
        // 旧チャットエリアに追加
        this.dom.getElement('chatMessages').appendChild(messageDiv);
        this.dom.getElement('chatMessages').scrollTop = this.dom.getElement('chatMessages').scrollHeight;
        
        // モーダルが開いていない場合は未読カウントを増やす
        if (!this.isModalOpen) {
            this.addUnreadCount();
        }
        
        // モーダルにもメッセージを追加
        this.addMessageToModal(data);
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
        this.dom.getElement('chatMessages').innerHTML = '';
        this.dom.getElement('modalChatMessages').innerHTML = '';
        this.clearUnreadCount();
    }

    // イベントリスナーをセットアップ
    setupEventListeners() {
        // 旧チャット送信ボタン
        this.dom.getElement('chatSendBtn').addEventListener('click', () => {
            this.sendMessage();
        });

        // 旧チャット入力フィールド
        this.dom.getElement('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // フローティングアイコンクリック
        this.dom.getElement('floatingChatIcon').addEventListener('click', () => {
            this.openChatModal();
        });

        // モーダル閉じるボタン
        this.dom.getElement('closeChatModal').addEventListener('click', () => {
            this.closeChatModal();
        });

        // モーダル送信ボタン
        this.dom.getElement('modalChatSendBtn').addEventListener('click', () => {
            this.sendModalMessage();
        });

        // モーダル入力フィールド
        this.dom.getElement('modalChatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendModalMessage();
            }
        });

        // モーダル背景クリックで閉じる
        this.dom.getElement('chatModal').addEventListener('click', (e) => {
            if (e.target === this.dom.getElement('chatModal')) {
                this.closeChatModal();
            }
        });
    }
}

// ChatManagerクラスをエクスポート
window.ChatManager = ChatManager;
