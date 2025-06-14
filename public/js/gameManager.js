// ゲーム全体の管理クラス
class GameManager {
    constructor(domElements, uiManager, numberGuessGame, hitAndBlowGame, chatManager, socketManager) {
        this.dom = domElements;
        this.uiManager = uiManager;
        this.numberGuessGame = numberGuessGame;
        this.hitAndBlowGame = hitAndBlowGame;
        this.chatManager = chatManager;
        this.socketManager = socketManager;
    }

    startMatchmaking(gameType) {
        gameState.setGameType(gameType);
        this.socketManager.findMatch(gameType);
        this.dom.showScreen('matchmaking');
    }

    startGame(data) {
        console.log('ゲーム開始:', data);
        this.dom.showScreen('gameScreen');
        this.dom.showGameInterface(data.gameType);
        
        this.uiManager.updateGameStatus(data);
        this.uiManager.updateTurnDisplay(data.currentPlayer);
        
        // ゲーム固有の初期化
        if (data.gameType === 'numberguess') {
            this.numberGuessGame.initialize();
        } else if (data.gameType === 'hitandblow') {
            this.hitAndBlowGame.initialize();
        }
    }

    handleMoveResult(data) {
        // 試行履歴を更新
        this.uiManager.displayAttempt(data);
        
        // 次のプレイヤーの表示を更新
        if (data.nextPlayer) {
            this.dom.getElement('gameStatus').textContent = `現在のターン: ${data.nextPlayer}`;
            this.uiManager.updateTurnDisplay(data.nextPlayer);
        }
        
        // 入力をクリア
        this.clearGameInputs();
        
        // 試行回数の更新
        this.dom.getElement('attemptsInfo').textContent = `試行回数: ${data.attempts.length}/10`;
    }

    clearGameInputs() {
        if (gameState.currentGameType === 'numberguess') {
            this.numberGuessGame.clearInput();
        } else if (gameState.currentGameType === 'hitandblow') {
            this.hitAndBlowGame.initialize();
        }
    }

    endGame(data) {
        console.log('ゲーム終了:', data);
        this.uiManager.displayGameResult(data);
        
        setTimeout(() => {
            this.dom.showScreen('gameEnd');
        }, 3000);
    }

    playerReady() {
        this.socketManager.playerReady();
        this.dom.getElement('readyBtn').disabled = true;
        this.dom.getElement('readyBtn').textContent = '準備完了済み';
    }

    newGame() {
        this.socketManager.newGame();
    }

    backToGameSelection() {
        this.socketManager.backToGameSelection();
    }

    resetToGameSelection() {
        gameState.reset();
        gameState.setPlayerId(this.socketManager.socket.id);
        
        this.uiManager.resetInterface();
        this.chatManager.clearMessages();
        
        if (gameState.currentGameType === 'hitandblow') {
            this.hitAndBlowGame.initialize();
        }
        
        this.dom.showScreen('gameSelection');
    }

    handleDisconnect() {
        this.dom.getElement('disconnectNotice').classList.add('hidden');
        this.backToGameSelection();
    }

    setupEventListeners() {
        console.log('GameManager setupEventListeners開始');
        console.log('this.dom:', this.dom);
        console.log('this.dom methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.dom)));
        
        // ゲーム選択
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                const gameType = card.dataset.game;
                this.startMatchmaking(gameType);
            });
        });

        // マッチメイキング関連
        this.dom.getElement('cancelMatchBtn').addEventListener('click', () => {
            this.backToGameSelection();
        });

        this.dom.getElement('readyBtn').addEventListener('click', () => {
            this.playerReady();
        });

        // ゲーム終了画面
        this.dom.getElement('newGameBtn').addEventListener('click', () => {
            this.newGame();
        });

        this.dom.getElement('backToSelectionBtn').addEventListener('click', () => {
            this.backToGameSelection();
        });

        this.dom.getElement('backToSelectionFromDisconnect').addEventListener('click', () => {
            this.handleDisconnect();
        });
    }
}

// GameManagerクラスをエクスポート
window.GameManager = GameManager;
