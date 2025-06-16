// デバッグ用の読み込み確認スクリプト
console.log('=== スクリプト読み込み状況確認 ===');

// 必要なクラスと関数の存在確認
const checkExports = () => {
    const checks = [
        { name: 'GAME_INFO', value: window.GAME_INFO },
        { name: 'ColorUtils', value: window.ColorUtils },
        { name: 'gameState', value: window.gameState },
        { name: 'DOMElements', value: window.DOMElements },
        { name: 'createDOMElements', value: window.createDOMElements },
        { name: 'UIManager', value: window.UIManager },
        { name: 'SocketManager', value: window.SocketManager },
        { name: 'NumberGuessGame', value: window.NumberGuessGame },
        { name: 'HitAndBlowGame', value: window.HitAndBlowGame },
        { name: 'ChatManager', value: window.ChatManager },
        { name: 'GameManager', value: window.GameManager }
    ];
    
    checks.forEach(check => {
        const status = check.value ? '✅' : '❌';
        console.log(`${status} ${check.name}:`, typeof check.value);
    });
    
    console.log('=== 読み込み確認完了 ===');
};

// フローティングチャット機能のテスト関数
window.testFloatingChat = () => {
    console.log('=== フローティングチャット機能テスト ===');
    
    const floatingIcon = document.getElementById('floatingChatIcon');
    const chatModal = document.getElementById('chatModal');
    const notification = document.getElementById('chatNotification');
    
    if (floatingIcon && chatModal && notification) {
        console.log('✅ フローティングチャット要素が見つかりました');
        
        // アイコンを表示
        floatingIcon.classList.remove('hidden');
        console.log('📱 フローティングアイコンを表示しました');
        
        // 通知バッジをテスト
        notification.classList.remove('hidden');
        console.log('🔔 通知バッジを表示しました');
        
        // 5秒後に通知バッジを非表示
        setTimeout(() => {
            notification.classList.add('hidden');
            console.log('🔕 通知バッジを非表示にしました');
        }, 5000);
        
    } else {
        console.log('❌ フローティングチャット要素が見つかりません');
        console.log('floatingIcon:', floatingIcon);
        console.log('chatModal:', chatModal);
        console.log('notification:', notification);
    }
};

// マッチング後のチャット機能をテストする関数
window.testPersistentChat = () => {
    console.log('=== 継続チャット機能テスト ===');
    
    if (window.app && window.app.chatManager) {
        const chatManager = window.app.chatManager;
        
        // フローティングアイコンを表示
        chatManager.showFloatingIcon();
        console.log('📱 フローティングアイコンを表示');
        
        // テストメッセージを追加
        const testMessages = [
            { player: 'テストユーザー1', message: 'マッチング成功！', timestamp: new Date().toLocaleTimeString() },
            { player: 'テストユーザー2', message: 'よろしくお願いします', timestamp: new Date().toLocaleTimeString() },
            { player: 'テストユーザー1', message: 'ゲーム選択画面でもチャットが使えます', timestamp: new Date().toLocaleTimeString() }
        ];
        
        testMessages.forEach((msg, index) => {
            setTimeout(() => {
                chatManager.displayMessage(msg);
                console.log(`💬 テストメッセージ ${index + 1} を追加`);
            }, index * 1000);
        });
        
        console.log('🔄 チャット履歴は画面遷移後も維持されます');
        
    } else {
        console.log('❌ ChatManagerが見つかりません');
    }
};

// チャット送信機能のデバッグ
window.debugChatSending = () => {
    console.log('=== チャット送信機能デバッグ ===');
    
    // アプリケーション状態確認
    console.log('window.app:', window.app);
    if (window.app) {
        console.log('app.socketManager:', window.app.socketManager);
        console.log('app.chatManager:', window.app.chatManager);
        console.log('app.domElements:', window.app.domElements);
    }
    
    // DOM要素確認
    const modalChatInput = document.getElementById('modalChatInput');
    const modalChatSendBtn = document.getElementById('modalChatSendBtn');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    
    console.log('Modal Chat Input:', modalChatInput);
    console.log('Modal Chat Send Button:', modalChatSendBtn);
    console.log('Regular Chat Input:', chatInput);
    console.log('Regular Chat Send Button:', chatSendBtn);
    
    // ソケット接続状態確認
    if (window.app && window.app.socketManager && window.app.socketManager.socket) {
        console.log('Socket connected:', window.app.socketManager.socket.connected);
        console.log('Socket ID:', window.app.socketManager.socket.id);
        console.log('Socket events:', window.app.socketManager.socket._callbacks);
    } else {
        console.log('❌ Socket not available');
    }
    
    // 手動送信テスト（モーダル）
    if (modalChatInput && window.app && window.app.chatManager) {
        console.log('=== モーダルチャット手動テスト ===');
        modalChatInput.value = 'デバッグテストメッセージ（モーダル）';
        console.log('Test message entered in modal:', modalChatInput.value);
        
        try {
            window.app.chatManager.sendModalMessage();
            console.log('Modal sendMessage called successfully');
        } catch (error) {
            console.error('Modal sendMessage error:', error);
        }
    }
    
    // 手動送信テスト（通常）
    if (chatInput && window.app && window.app.chatManager) {
        console.log('=== 通常チャット手動テスト ===');
        chatInput.value = 'デバッグテストメッセージ（通常）';
        console.log('Test message entered in regular chat:', chatInput.value);
        
        try {
            window.app.chatManager.sendMessage();
            console.log('Regular sendMessage called successfully');
        } catch (error) {
            console.error('Regular sendMessage error:', error);
        }
    }
    
    // ゲーム状態確認
    if (window.gameState) {
        console.log('Game State Room ID:', window.gameState.currentRoomId);
        console.log('Game State Players:', window.gameState.players);
        console.log('Game State Player ID:', window.gameState.playerId);
    }
};

// DOM読み込み完了時に確認
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkExports);
} else {
    checkExports();
}
