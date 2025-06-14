// Socket.io通信管理
class SocketManager {
    constructor() {
        this.socket = io();
        this.gameState = null;
        this.uiManager = null;
        this.gameManager = null;
        this.chatManager = null;
        this.domElements = null;
        this.initializeSocketEvents();
    }

    setDependencies(gameState, uiManager, gameManager, chatManager, domElements) {
        this.gameState = gameState;
        this.uiManager = uiManager;
        this.gameManager = gameManager;
        this.chatManager = chatManager;
        this.domElements = domElements;
    }

    initializeSocketEvents() {
        // 接続イベント
        this.socket.on('connect', () => {
            console.log('サーバーに接続しました');
            if (this.gameState) {
                this.gameState.setPlayerId(this.socket.id);
            }
            if (this.domElements) {
                this.domElements.getElement('connectionStatus').textContent = '接続済み';
                this.domElements.getElement('connectionStatus').className = 'status-bar connected';
            }
        });

        this.socket.on('disconnect', () => {
            console.log('サーバーから切断されました');
            if (this.domElements) {
                this.domElements.getElement('connectionStatus').textContent = '切断されました';
                this.domElements.getElement('connectionStatus').className = 'status-bar disconnected';
            }
        });

        // マッチメイキングイベント
        this.socket.on('waitingForOpponent', (data) => {
            if (this.uiManager) {
                this.uiManager.updateMatchmakingDisplay(data);
            }
        });

        this.socket.on('matchFound', (data) => {
            console.log('マッチが見つかりました:', data);
            if (this.gameState) {
                this.gameState.updateRoom(data.roomId);
                this.gameState.updatePlayers(data.players);
                this.gameState.setGameType(data.gameType);
            }
            
            if (this.domElements) {
                this.domElements.showScreen('gameWaiting');
            }
            if (this.uiManager) {
                this.uiManager.updatePlayersInfo();
            }
        });

        this.socket.on('playerReadyUpdate', (data) => {
            if (this.gameState) {
                this.gameState.updatePlayers(data.players);
            }
            if (this.uiManager) {
                this.uiManager.updatePlayersInfo();
            }
        });
        // ゲームイベント
        this.socket.on('gameStart', (data) => {
            console.log('ゲーム開始:', data);
            if (this.gameManager) {
                this.gameManager.startGame(data);
            }
        });

        this.socket.on('moveResult', (data) => {
            console.log('移動結果:', data);
            if (this.gameManager) {
                this.gameManager.handleMoveResult(data);
            }
        });

        this.socket.on('gameEnd', (data) => {
            console.log('ゲーム終了:', data);
            if (this.gameManager) {
                this.gameManager.endGame(data);
            }
        });

        // チャットイベント
        this.socket.on('newChatMessage', (data) => {
            if (this.chatManager) {
                this.chatManager.displayMessage(data);
            }
        });

        // その他のゲームイベント
        this.socket.on('newGameReady', (data) => {
            if (this.gameState) {
                this.gameState.updatePlayers(data.players);
            }
            if (this.domElements) {
                this.domElements.showScreen('gameWaiting');
            }
            if (this.uiManager) {
                this.uiManager.updatePlayersInfo();
            }
        });

        this.socket.on('opponentDisconnected', () => {
            if (this.domElements) {
                this.domElements.getElement('disconnectNotice').classList.remove('hidden');
            }
        });

        this.socket.on('backToGameSelection', () => {
            if (this.gameManager) {
                this.gameManager.resetToGameSelection();
            }
        });
    }

    // 送信メソッド
    findMatch(gameType) {
        this.socket.emit('findMatch', { gameType: gameType });
    }

    playerReady() {
        this.socket.emit('playerReady');
    }

    makeMove(moveData) {
        this.socket.emit('makeMove', moveData);
    }

    sendChatMessage(message) {
        this.socket.emit('chatMessage', { message: message });
    }

    newGame() {
        this.socket.emit('newGame');
    }

    backToGameSelection() {
        this.socket.emit('backToGameSelection');
    }
}

// SocketManagerクラスをエクスポート
window.SocketManager = SocketManager;
