// メインファイル - アプリケーションの初期化とイベント設定
document.addEventListener('DOMContentLoaded', () => {
    console.log('アプリケーションを初期化中...');
    
    try {
        // DOM要素管理の初期化
        if (typeof window.createDOMElements !== 'function') {
            throw new Error('window.createDOMElements is not a function. DOMElements.js may not be loaded.');
        }
        const domElements = window.createDOMElements();
        console.log('DOM要素管理を初期化しました');
        
        // ゲーム状態管理の初期化
        if (!window.gameState) {
            throw new Error('window.gameState is not available. gameState.js may not be loaded.');
        }
        const gameState = window.gameState;
        console.log('ゲーム状態管理を初期化しました');
        
        // Socket管理の初期化
        if (!window.SocketManager) {
            throw new Error('window.SocketManager is not available. socketManager.js may not be loaded.');
        }
        const socketManager = new window.SocketManager();
        console.log('Socket管理を初期化しました');
        
        // UI管理の初期化
        if (!window.UIManager) {
            throw new Error('window.UIManager is not available. uiManager.js may not be loaded.');
        }
        const uiManager = new window.UIManager(domElements);
        console.log('UI管理を初期化しました');
        
        // ゲーム固有機能の初期化
        if (!window.NumberGuessGame) {
            throw new Error('window.NumberGuessGame is not available. numberGuess.js may not be loaded.');
        }
        if (!window.HitAndBlowGame) {
            throw new Error('window.HitAndBlowGame is not available. hitAndBlow.js may not be loaded.');
        }
        if (!window.cardGame) {
            throw new Error('window.cardGame is not available. cardGame.js may not be loaded.');
        }
        if (!window.ChatManager) {
            throw new Error('window.ChatManager is not available. chat.js may not be loaded.');
        }
        
        const numberGuessGame = new window.NumberGuessGame(domElements);
        const hitAndBlowGame = new window.HitAndBlowGame(domElements);
        const chatManager = new window.ChatManager(domElements);
        console.log('ゲーム固有機能を初期化しました');
        
        // ゲーム統括管理の初期化
        if (!window.GameManager) {
            throw new Error('window.GameManager is not available. gameManager.js may not be loaded.');
        }
        const gameManager = new window.GameManager(
            domElements, 
            uiManager, 
            numberGuessGame, 
            hitAndBlowGame, 
            window.cardGame,
            chatManager, 
            socketManager
        );
        console.log('ゲーム統括管理を初期化しました');
        
        // 各オブジェクトのメソッド確認
        console.log('domElements methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(domElements)));
        console.log('gameManager methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(gameManager)));
        
        // Socket管理に依存関係を設定
        socketManager.setDependencies(gameState, uiManager, gameManager, chatManager, domElements);
        console.log('依存関係を設定しました');
        
        // 初期画面の表示
        domElements.showScreen('passwordEntryScreen');
        
        // 初期状態でヘッダーを表示
        domElements.showHeader();
        
        // ヒットアンドブローの初期化
        hitAndBlowGame.initialize();
        
        // イベントリスナーの設定
        setupAllEventListeners(gameManager, numberGuessGame, hitAndBlowGame, chatManager);
        console.log('イベントリスナーを設定しました');
        
        // グローバルにアクセス可能にする（デバッグ用）
        window.app = {
            domElements,
            gameState,
            socketManager,
            uiManager,
            numberGuessGame,
            hitAndBlowGame,
            cardGame: window.cardGame,
            chatManager,
            gameManager
        };
        
        console.log('アプリケーションの初期化が完了しました');
        
    } catch (error) {
        console.error('アプリケーション初期化エラー:', error);
        alert('アプリケーションの初期化に失敗しました: ' + error.message);
    }
});

function setupAllEventListeners(gameManager, numberGuessGame, hitAndBlowGame, chatManager) {
    // ゲーム管理のイベントリスナー
    gameManager.setupEventListeners();
    
    // 数字当てゲームのイベントリスナー
    numberGuessGame.setupEventListeners();
    
    // ヒットアンドブローのイベントリスナー
    hitAndBlowGame.setupEventListeners();
    
    // チャットのイベントリスナー
    chatManager.setupEventListeners();
}

// グローバルエラーハンドリング
window.addEventListener('error', (event) => {
    console.error('アプリケーションエラー:', event.error);
});

// Socket.ioの接続エラーハンドリング
window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.app && window.app.socketManager && window.app.socketManager.socket) {
            window.app.socketManager.socket.on('connect_error', (error) => {
                console.error('Socket.io接続エラー:', error);
                if (window.app.domElements) {
                    window.app.domElements.getElement('connectionStatus').textContent = '接続エラー';
                    window.app.domElements.getElement('connectionStatus').className = 'status-bar disconnected';
                }
            });
        }
    }, 1000);
});
