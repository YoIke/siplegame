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

        this.socket.on('waitingForPasswordMatch', (data) => {
            console.log('パスワードマッチング待機中:', data);
            if (this.gameState) {
                this.gameState.updateRoom(data.roomId);
            }
            if (this.uiManager) {
                this.uiManager.showWaitingForPasswordMatch(data.password);
            }
        });

        this.socket.on('matchFound', (data) => {
            console.log('マッチが見つかりました:', data);
            if (this.gameState) {
                this.gameState.updateRoom(data.roomId);
                this.gameState.updatePlayers(data.players);
                // gameType might not be set yet if matching by password
                if (data.gameType) {
                    this.gameState.setGameType(data.gameType);
                    if (this.domElements) {
                        this.domElements.showScreen('gameWaiting');
                    }
                    // ゲーム待機画面に遷移する際は準備完了ボタンをリセット
                    if (this.uiManager) {
                        this.uiManager.resetInterface(true); // チャット履歴を保持
                    }
                } else {
                    // Matched by password, waiting for game selection
                    console.log('マッチング成功、ゲーム選択画面へ移動');
                    if (this.domElements) {
                        this.domElements.showScreen('gameSelection');
                    }
                }
            }
            
            // マッチング成功時にフローティングチャットアイコンを表示
            if (this.uiManager) {
                this.uiManager.updatePlayersInfo(); // Useful for showing matched players
                this.uiManager.showFloatingChatIcon(); // チャット機能を有効化
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
        // ゲーム選択確認関連のイベント
        this.socket.on('gameSelectionRequest', (data) => {
            console.log('相手からゲーム選択のリクエスト:', data);
            if (this.uiManager && this.domElements) {
                this.uiManager.showGameSelectionConfirm(data);
            }
        });

        this.socket.on('gameSelectionRejected', (data) => {
            console.log('相手がゲーム選択を拒否:', data);
            if (this.uiManager && this.domElements) {
                this.uiManager.showGameSelectionRejected(data);
            }
        });

        // ゲームイベント
        this.socket.on('gameStart', (data) => {
            console.log('ゲーム開始:', data);
            if (this.gameState) {
                this.gameState.setAwaitingGameSelectionResponse(false);
            }
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

        // カードゲーム専用イベント
        this.socket.on('gameStateUpdate', (data) => {
            console.log('ゲーム状態更新:', data);
            if (this.gameState && this.gameState.currentGameType === 'cardgame') {
                if (window.cardGame) {
                    window.cardGame.updateGameState(data);
                }
            }
        });

        this.socket.on('moveError', (data) => {
            console.log('移動エラー:', data);
            if (this.gameState && this.gameState.currentGameType === 'cardgame') {
                if (window.cardGame) {
                    window.cardGame.handleMoveError(data);
                }
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
            console.log('newChatMessage received:', data);
            if (this.chatManager) {
                this.chatManager.displayMessage(data);
                console.log('Message passed to chatManager.displayMessage');
            } else {
                console.error('ChatManager not available for displaying message');
            }
        });

        // チャット履歴同期イベント
        this.socket.on('chatHistorySync', (data) => {
            console.log('chatHistorySync received:', data);
            if (this.chatManager && data.messages) {
                console.log(`Syncing ${data.messages.length} chat messages`);
                // 既存のメッセージをクリアして、履歴を再構築
                this.chatManager.clearMessages();
                data.messages.forEach((message, index) => {
                    console.log(`Restoring message ${index + 1}:`, message);
                    this.chatManager.displayMessage(message);
                });
                console.log('Chat history synchronized');
            } else {
                console.warn('ChatManager not available or no messages in chatHistorySync');
            }
        });

        // その他のゲームイベント
        this.socket.on('newGameReady', (data) => {
            console.log('新しいゲーム準備:', data);
            if (this.gameState) {
                this.gameState.updatePlayers(data.players);
            }
            if (this.domElements) {
                this.domElements.showScreen('gameWaiting');
            }
            if (this.uiManager) {
                this.uiManager.resetInterface(true); // 準備完了ボタンをリセット、チャット履歴保持
                this.uiManager.updatePlayersInfo();
                // ゲーム待機画面でもフローティングアイコンを維持
                this.uiManager.showFloatingChatIcon();
            }
        });

        this.socket.on('opponentDisconnected', () => {
            if (this.domElements) {
                this.domElements.getElement('disconnectNotice').classList.remove('hidden');
            }
        });

        this.socket.on('backToGameSelection', () => {
            if (this.gameManager) {
                this.gameManager.resetToGameSelection(); // This will be updated to handle persistent rooms
            }
        });

        this.socket.on('opponentReturnedToSelection', (data) => {
            console.log('Opponent wants to return to game selection:', data);
            if (this.domElements && this.uiManager && this.gameState) {
                this.gameState.updatePlayers(data.players);
                this.domElements.showScreen('gameSelection');
                this.uiManager.resetInterface(true); // 準備完了ボタンをリセット、チャット履歴保持
                this.uiManager.updatePlayersInfo(data.players || this.gameState.players); // Update with fresh player data if sent
                this.uiManager.displayMessageAboveGameCards("対戦相手が新しいゲームを選んでいます...");
                // ゲーム選択画面でもフローティングアイコンを維持
                this.uiManager.showFloatingChatIcon();
                
                // ゲーム終了画面のボタンを再有効化
                const newGameBtn = this.domElements.getElement('newGameBtn');
                const backToSelectionBtn = this.domElements.getElement('backToSelectionBtn');
                if (newGameBtn) {
                    newGameBtn.disabled = false;
                }
                if (backToSelectionBtn) {
                    backToSelectionBtn.disabled = false;
                    backToSelectionBtn.textContent = 'ゲーム選択に戻る';
                }
            }
        });

        this.socket.on('readyForNewGameSelection', (data) => {
            console.log('Both players ready for new game selection:', data);
            if (this.gameState && this.domElements && this.uiManager) {
                this.gameState.setGameType(null); // Clear old game type
                this.gameState.updatePlayers(data.players); // Update with fresh player data
                this.domElements.showScreen('gameSelection');
                this.uiManager.resetInterface(true); // 準備完了ボタンをリセット、チャット履歴保持
                this.uiManager.updatePlayersInfo(); // Uses updated gameState
                this.uiManager.displayMessageAboveGameCards("新しいゲームを選んでください");
                // ゲーム選択画面でもフローティングアイコンを維持
                this.uiManager.showFloatingChatIcon();
                
                // ゲーム終了画面のボタンを再有効化
                const newGameBtn = this.domElements.getElement('newGameBtn');
                const backToSelectionBtn = this.domElements.getElement('backToSelectionBtn');
                if (newGameBtn) {
                    newGameBtn.disabled = false;
                }
                if (backToSelectionBtn) {
                    backToSelectionBtn.disabled = false;
                    backToSelectionBtn.textContent = 'ゲーム選択に戻る';
                }
            }
        });

        this.socket.on('waitingForOpponentToReturnToSelection', (data) => {
            console.log('Waiting for opponent to return to selection:', data);
            if (this.gameState && this.domElements && this.uiManager) {
                this.gameState.updatePlayers(data.players);
                this.domElements.showScreen('gameSelection');
                this.uiManager.resetInterface(true); // 準備完了ボタンをリセット、チャット履歴保持
                this.uiManager.updatePlayersInfo();
                this.uiManager.displayMessageAboveGameCards("相手がゲーム選択に戻るのを待っています...");
                // ゲーム選択画面でもフローティングアイコンを維持
                this.uiManager.showFloatingChatIcon();
                
                // ゲーム終了画面のボタンを再有効化
                const newGameBtn = this.domElements.getElement('newGameBtn');
                const backToSelectionBtn = this.domElements.getElement('backToSelectionBtn');
                if (newGameBtn) {
                    newGameBtn.disabled = false;
                }
                if (backToSelectionBtn) {
                    backToSelectionBtn.disabled = false;
                    backToSelectionBtn.textContent = 'ゲーム選択に戻る';
                }
            }
        });

        this.socket.on('opponentDisconnectedEndMatch', (data) => {
            console.log('Opponent disconnected, match ended:', data);
            if (this.gameState && this.gameState.isAwaitingGameSelectionResponse) {
                console.log('ゲーム選択応答待ちのため、opponentDisconnectedEndMatchをスキップ');
                // 重要: この場合、相手の切断をユーザーに通知する別の方法が必要になる可能性があります。
                // 例えば、一定時間応答がない場合にタイムアウト処理を入れるなど。
                // しかし、今回のバグ修正の範囲では、まず意図しない画面遷移を防ぐことを優先します。
                // もし本当に相手が切断していて gameStart が来ない場合、ユーザーは操作不能になる可能性がある。
                // そのため、UI上での通知や、タイムアウトで gameSelection に戻すなどのフォールバックを検討する必要がある。
                // 今回は、まず passwordEntryScreen への即時遷移を防ぐ。
                // 代わりに gameSelection に戻すことを検討しても良いかもしれない。
                // this.domElements.showScreen('gameSelection');
                // this.uiManager.displayMessageAboveGameCards("対戦相手との接続に問題が発生しました。再度ゲームを選択してください。");
                // this.gameState.setAwaitingGameSelectionResponse(false); // フラグをリセット
                return;
            }
            if (this.domElements && this.uiManager && this.gameState && this.chatManager) {
                this.gameState.reset(); // Full reset as the match is over
                this.uiManager.hideFloatingChatIcon(); // フローティングアイコンを非表示
                this.chatManager.clearMessages(); // チャット履歴をクリア
                this.domElements.showScreen('passwordEntryScreen');
                this.domElements.showHeader(); // ヘッダーを表示
                this.uiManager.displayPasswordError('対戦相手の接続が切れました。あいことば入力に戻ります。');
                // Consider also showing a modal like 'disconnectNotice' but more specific
            }
        });
    }

    // 送信メソッド
    findMatch(gameType) {
        this.socket.emit('findMatch', { gameType: gameType });
    }

    matchByPassword(password, displayName) {
        this.socket.emit('matchByPassword', { password: password, displayName: displayName });
    }

    selectGame(gameType, roomId) {
        console.log('SocketManager.selectGame called:', { gameType, roomId });
        if (this.gameState) {
            this.gameState.setAwaitingGameSelectionResponse(true);
            console.log('Set awaiting game selection response to true');
        }
        this.socket.emit('selectGame', { gameType: gameType, roomId: roomId });
        console.log('selectGame event emitted to server');
    }

    playerReady() {
        this.socket.emit('playerReady');
    }

    makeMove(moveData) {
        this.socket.emit('makeMove', moveData);
    }

    sendMove(moveData) {
        // カードゲーム用の統一された送信メソッド
        this.makeMove(moveData);
    }

    sendChatMessage(message) {
        console.log('SocketManager.sendChatMessage called with:', message);
        console.log('Socket connected:', this.socket?.connected);
        console.log('Socket ID:', this.socket?.id);
        
        if (!this.socket) {
            console.error('Socket is not initialized');
            return;
        }
        
        if (!this.socket.connected) {
            console.error('Socket is not connected');
            return;
        }
        
        console.log('Emitting chatMessage event...');
        this.socket.emit('chatMessage', { message: message });
        console.log('chatMessage event emitted successfully');
    }

    newGame() {
        this.socket.emit('newGame');
    }

    backToGameSelection() {
        this.socket.emit('backToGameSelection');
    }

    // ゲーム選択確認の応答
    respondToGameSelection(roomId, gameType, accepted) {
        this.socket.emit('gameSelectionResponse', { 
            roomId: roomId, 
            gameType: gameType, 
            accepted: accepted 
        });
    }
}

// SocketManagerクラスをエクスポート
window.SocketManager = SocketManager;
