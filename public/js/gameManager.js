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

    // Renamed from startMatchmaking
    selectGameForMatch(gameType) {
        if (!gameState.currentRoomId) {
            console.warn('Room ID not set, cannot select game.');
            // Optionally, display an error to the user
            this.uiManager.displayPasswordError('最初に有効なあいことばでマッチングしてください。');
            this.dom.showScreen('passwordEntryScreen'); // Redirect to password screen
            return;
        }
        gameState.setGameType(gameType); // Set game type locally first
        this.socketManager.selectGame(gameType, gameState.currentRoomId);
        // Server will eventually respond with 'gameStart' or similar
        // For now, we can show a generic waiting message or update UI
        this.uiManager.displayMessageAboveGameCards(""); // Clear any previous messages
        this.uiManager.updateMatchmakingDisplay({ gameType }); // Show selected game
        this.dom.showScreen('matchmaking'); // Show matchmaking/waiting screen
        this.dom.getElement('matchmakingTitle').textContent = `${GAME_INFO[gameType].title} - 相手の準備を待っています`;
        this.dom.getElement('waitingMessage').textContent = '相手がゲームを開始するのを待っています...';
    }

    initiatePasswordMatch() {
        this.uiManager.clearPasswordError();
        const password = this.uiManager.getPasswordValue();
        if (!password || password.trim() === '') {
            this.uiManager.displayPasswordError('あいことばを入力してください。');
            return;
        }
        this.socketManager.matchByPassword(password);
        this.uiManager.showWaitingForPasswordMatch(password);
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
        // This method is triggered by 'backToGameSelection' from server
        // or when a disconnect forces a return to selection/password screen.
        if (gameState.currentRoomId) { // Persistent match, returning to select a new game
            console.log('Resetting for new game selection in room:', gameState.currentRoomId);
            gameState.setGameType(null);
            if (gameState.players && Array.isArray(gameState.players)) {
                gameState.players.forEach(p => p.ready = false);
            }
            this.uiManager.resetInterface(); // Resets ready buttons etc.
            this.chatManager.clearMessages(); // Clear chat from previous game

            // Reset specific game UIs if necessary (e.g. HitAndBlow colors)
            if (this.hitAndBlowGame && typeof this.hitAndBlowGame.resetSelectedColors === 'function') {
                 this.hitAndBlowGame.resetSelectedColors();
            }
            if (this.numberGuessGame && typeof this.numberGuessGame.clearInput === 'function') {
                this.numberGuessGame.clearInput();
            }

            this.dom.showScreen('gameSelection');
            this.uiManager.updatePlayersInfo(); // Update player display (e.g. show not ready)
            // Message will be set by 'readyForNewGameSelection' or 'opponentReturnedToSelection' event handlers

            // Re-enable buttons on gameEnd screen if they were disabled
            const newGameBtn = this.dom.getElement('newGameBtn');
            if (newGameBtn) newGameBtn.disabled = false;
            const backToSelectionBtn = this.dom.getElement('backToSelectionBtn');
            if (backToSelectionBtn) backToSelectionBtn.disabled = false;

        } else { // Not in a persistent match, or match ended. Full reset.
            console.log('Full reset to password entry screen.');
            const lastPlayerId = gameState.playerId; // Preserve player ID before full reset
            gameState.reset();
            if (lastPlayerId) gameState.setPlayerId(lastPlayerId); // Restore player ID

            this.uiManager.resetInterface();
            this.chatManager.clearMessages();
            if (this.hitAndBlowGame && typeof this.hitAndBlowGame.resetSelectedColors === 'function') {
                 this.hitAndBlowGame.resetSelectedColors();
            }
             if (this.numberGuessGame && typeof this.numberGuessGame.clearInput === 'function') {
                this.numberGuessGame.clearInput();
            }
            this.dom.showScreen('passwordEntryScreen');
            this.uiManager.clearPasswordError();
            this.uiManager.displayMessageAboveGameCards(""); // Clear game selection message
        }
    }

    handleDisconnect() {
        this.dom.getElement('disconnectNotice').classList.add('hidden');
        this.backToGameSelection();
    }

    setupEventListeners() {
        console.log('GameManager setupEventListeners開始');
        console.log('this.dom:', this.dom);
        console.log('this.dom methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.dom)));

        // Password submission
        this.dom.getElement('submitPasswordBtn').addEventListener('click', () => {
            this.initiatePasswordMatch();
        });
        
        // ゲーム選択 (after password match)
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                if (gameState.currentRoomId) {
                    const gameType = card.dataset.game;
                    this.selectGameForMatch(gameType);
                } else {
                    // This case should ideally not happen if UI flow is correct
                    console.warn('Game card clicked but no room ID. Redirecting to password entry.');
                    this.uiManager.displayPasswordError('まず、あいことばを入力してマッチングしてください。');
                    this.dom.showScreen('passwordEntryScreen');
                }
            });
        });

        // マッチメイキング関連
        this.dom.getElement('cancelMatchBtn').addEventListener('click', () => {
            // If cancelling a password match search, or game selection wait
            if (gameState.currentRoomId) {
                 // TODO: Inform server about cancelling the room/match if necessary
                console.log('Cancelling match for room:', gameState.currentRoomId);
                 // For now, just go back to password screen
            }
            gameState.reset(); // Reset local state
            this.dom.showScreen('passwordEntryScreen');
            this.uiManager.clearPasswordError();

        });

        this.dom.getElement('readyBtn').addEventListener('click', () => {
            this.playerReady();
        });

        // ゲーム終了画面
        this.dom.getElement('newGameBtn').addEventListener('click', () => {
            // "Play Same Game Again"
            this.newGame();
        });

        this.dom.getElement('backToSelectionBtn').addEventListener('click', () => {
            // "Return to Game Selection" (for a different game)
            this.socketManager.backToGameSelection();
            // Client will wait, server will respond. UI might show a spinner or message.
            // For now, just stay on gameEnd screen until server event.
            // Optionally, disable buttons here to prevent multiple clicks.
            this.dom.getElement('newGameBtn').disabled = true;
            this.dom.getElement('backToSelectionBtn').disabled = true;
        });

        this.dom.getElement('backToSelectionFromDisconnect').addEventListener('click', () => {
            this.handleDisconnect();
        });
    }
}

// GameManagerクラスをエクスポート
window.GameManager = GameManager;
