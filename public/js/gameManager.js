// ゲーム全体の管理クラス
class GameManager {
    constructor(domElements, uiManager, numberGuessGame, hitAndBlowGame, cardGame, chatManager, socketManager) {
        this.dom = domElements;
        this.uiManager = uiManager;
        this.numberGuessGame = numberGuessGame;
        this.hitAndBlowGame = hitAndBlowGame;
        this.cardGame = cardGame;
        this.chatManager = chatManager;
        this.socketManager = socketManager;
    }

    // Renamed from startMatchmaking
    selectGameForMatch(gameType) {
        console.log('selectGameForMatch called with:', gameType, 'currentRoomId:', gameState.currentRoomId);
        console.log('Current players state:', gameState.players);
        
        if (!gameState.currentRoomId) {
            console.warn('Room ID not set, cannot select game.');
            // Optionally, display an error to the user
            this.uiManager.displayPasswordError('まず、あいことばを入力してマッチングしてください。');
            this.dom.showScreen('passwordEntryScreen');
            return;
        }
        
        console.log('Requesting game selection confirmation from opponent:', gameType);
        
        // 選択したゲームの確認をサーバーに送信（相手に確認を要求）
        this.socketManager.selectGame(gameType, gameState.currentRoomId);
        
        // ユーザーに選択したことを表示
        const gameInfo = GAME_INFO[gameType];
        this.uiManager.displayMessageAboveGameCards(`「${gameInfo.title}」を選択しました。相手の確認を待っています...`);
    }

    initiatePasswordMatch() {
        this.uiManager.clearPasswordError();
        const displayName = this.dom.getElement('displayNameInput').value.trim();
        const password = this.uiManager.getPasswordValue();
        
        if (!displayName || displayName === '') {
            this.uiManager.displayPasswordError('表示名を入力してください。');
            return;
        }
        
        if (!password || password.trim() === '') {
            this.uiManager.displayPasswordError('あいことばを入力してください。');
            return;
        }
        
        // ゲーム状態に表示名を保存
        gameState.setPlayerDisplayName(displayName);
        
        this.socketManager.matchByPassword(password, displayName);
        this.uiManager.showWaitingForPasswordMatch(password);
    }

    startGame(data) {
        console.log('ゲーム開始:', data);
        this.dom.showScreen('gameScreen');
        this.dom.showGameInterface(data.gameType);
        
        // フローティングチャットアイコンを表示
        this.uiManager.showFloatingChatIcon();
        
        this.uiManager.updateGameStatus(data);
        this.uiManager.updateTurnDisplay(data.currentPlayer);
        
        // ゲーム固有の初期化
        if (data.gameType === 'numberguess') {
            this.numberGuessGame.initialize();
        } else if (data.gameType === 'hitandblow') {
            this.hitAndBlowGame.initialize();
        } else if (data.gameType === 'cardgame') {
            this.cardGame.startGame(data);
        }
    }

    handleMoveResult(data) {
        if (gameState.currentGameType === 'cardgame') {
            this.cardGame.handleMoveResult(data);
            return;
        }
        
        // 既存ゲームの処理
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
        } else if (gameState.currentGameType === 'cardgame') {
            this.cardGame.clearSelections();
        }
    }

    endGame(data) {
        console.log('ゲーム終了:', data);
        this.uiManager.displayGameResult(data);
        
        // フローティングチャットアイコンを非表示
        this.uiManager.hideFloatingChatIcon();
        
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
        console.log('GameManager.newGame called');
        // クライアント側でも状態をリセット
        if (gameState.players && Array.isArray(gameState.players)) {
            gameState.players.forEach(p => p.ready = false);
        }
        this.socketManager.newGame();
    }

    backToGameSelection() {
        this.socketManager.backToGameSelection();
    }

    resetToGameSelection() {
        // This method is triggered by 'backToGameSelection' from server
        // or when a disconnect forces a return to selection/password screen.
        
        // フローティングチャットアイコンを非表示
        this.uiManager.hideFloatingChatIcon();
        
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
            this.dom.showHeader(); // ヘッダーを表示
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
        
        // Enterキーでパスワード送信
        this.dom.getElement('displayNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.initiatePasswordMatch();
            }
        });
        
        this.dom.getElement('passwordInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.initiatePasswordMatch();
            }
        });
        
        // ゲーム選択 (after password match)
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                console.log('Game card clicked:', card.dataset.game, 'currentRoomId:', gameState.currentRoomId);
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
            this.dom.showHeader(); // ヘッダーを表示
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
            console.log('backToSelectionBtn clicked');
            this.socketManager.backToGameSelection();
            // Client will wait, server will respond. UI might show a spinner or message.
            // For now, just stay on gameEnd screen until server event.
            // Optionally, disable buttons here to prevent multiple clicks.
            this.dom.getElement('newGameBtn').disabled = true;
            this.dom.getElement('backToSelectionBtn').disabled = true;
            this.dom.getElement('backToSelectionBtn').textContent = '処理中...';
        });

        this.dom.getElement('backToSelectionFromDisconnect').addEventListener('click', () => {
            this.handleDisconnect();
        });

        // ゲーム選択確認モーダルのイベント
        this.dom.getElement('acceptGameBtn').addEventListener('click', () => {
            this.handleGameSelectionResponse(true);
        });

        this.dom.getElement('rejectGameBtn').addEventListener('click', () => {
            this.handleGameSelectionResponse(false);
        });
    }

    // ゲーム選択確認の応答処理
    handleGameSelectionResponse(accepted) {
        const roomId = gameState.currentRoomId;
        // 確認モーダルから gameType を取得する必要があります
        // gameTypeをモーダル表示時に保存するか、DOMから取得します
        const gameTypeFromModal = this.getGameTypeFromConfirmModal();
        
        this.socketManager.respondToGameSelection(roomId, gameTypeFromModal, accepted);
        this.uiManager.hideGameSelectionConfirm();
        
        if (accepted) {
            this.uiManager.displayMessageAboveGameCards('ゲームを開始します...');
        } else {
            this.uiManager.displayMessageAboveGameCards('別のゲームを選択してください');
        }
    }

    // 確認モーダルからゲームタイプを取得
    getGameTypeFromConfirmModal() {
        // データ属性から直接取得
        const gameType = this.dom.getElement('gameSelectionConfirm').dataset.gameType;
        if (gameType) {
            return gameType;
        }
        
        // フォールバック: タイトルから逆引き
        const selectedGameName = this.dom.getElement('selectedGameName').textContent;
        for (const [gameType, info] of Object.entries(GAME_INFO)) {
            if (info.title === selectedGameName) {
                return gameType;
            }
        }
        return null;
    }
}

// GameManagerクラスをエクスポート
window.GameManager = GameManager;
