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

// DOM読み込み完了時に確認
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkExports);
} else {
    checkExports();
}
