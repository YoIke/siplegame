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

// DOM読み込み完了時に確認
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkExports);
} else {
    checkExports();
}
