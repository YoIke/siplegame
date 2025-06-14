import { elements, gameConfig } from './modules/config.js';
import { gameState } from './modules/gameState.js';
import { ScreenManager } from './modules/screenManager.js';
import { ChatManager } from './modules/chatManager.js';
import { NumberGuessGame } from './games/numberGuess.js';
import { HitAndBlowGame } from './games/hitAndBlow.js';

// メインアプリケーションクラス
export class GameApp {
    constructor() {
        this.socket = io();
        this.chatManager = new ChatManager();
        this.numberGuessGame = new NumberGuessGame();
        this.hitAndBlowGame = new HitAndBlowGame();
        
        this.setupSocketEvents();
        this.setupUIEvents();
        this.setupGameCallbacks();
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('サーバーに接続しました');
            gameState.setPlayerId(this.socket.id);
            if (elements.connectionStatus) {
                elements.connectionStatus.textContent = '接続済み';
                elements.connectionStatus.className = 'status-bar connected';
            }
        });

        this.socket.on('disconnect', () => {
            console.log('サーバーから切断されました');
            if (elements.connectionStatus) {
                elements.connectionStatus.textContent = '切断されました';
                elements.connectionStatus.className = 'status-bar disconnected';
            }
        });

        this.socket.on('gameFound', (data) => {
            console.log('ゲームが見つかりました:', data);
            gameState.setRoom(data.roomId);
            gameState.setPlayers(data.players);
            this.updatePlayersInfo(data.players);
            ScreenManager.showScreen('gameWaiting');
        });

        this.socket.on('gameStart', (data) => {
            console.log('ゲーム開始:', data);
            gameState.setTurn(data.currentTurn === gameState.playerId);
            this.startGame(data);
        });

        // その他の必要なSocket.ioイベント
        this.socket.on('turnChange', (data) => {
            gameState.setTurn(data.currentTurn === gameState.playerId);
            this.updateGameStatus();
        });

        this.socket.on('chatMessage', (data) => {
            const isOwn = data.playerId === gameState.playerId;
            this.chatManager.addMessage(data.playerName, data.message, isOwn);
        });

        this.socket.on('playerDisconnected', () => {
            ScreenManager.showModal('disconnectNotice');
        });
    }
    setupUIEvents() {
        // ゲーム選択
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                const gameType = card.dataset.game;
                this.selectGame(gameType);
            });
        });

        // その他のUIイベント（nullチェック付き）
        if (elements.cancelMatchBtn) {
            elements.cancelMatchBtn.addEventListener('click', () => this.cancelMatch());
        }
        if (elements.readyBtn) {
            elements.readyBtn.addEventListener('click', () => this.sendReady());
        }
        if (elements.newGameBtn) {
            elements.newGameBtn.addEventListener('click', () => this.startNewGame());
        }
        if (elements.backToSelectionBtn) {
            elements.backToSelectionBtn.addEventListener('click', () => this.backToSelection());
        }
        if (elements.backToSelectionFromDisconnect) {
            elements.backToSelectionFromDisconnect.addEventListener('click', () => this.backToSelection());
        }
    }

    setupGameCallbacks() {
        // チャットコールバック
        this.chatManager.onSendMessage = (message) => {
            this.socket.emit('chatMessage', { message });
        };

        // ゲームコールバック
        this.numberGuessGame.onGuessSubmit = (guess) => {
            this.socket.emit('makeGuess', { guess });
        };

        this.hitAndBlowGame.onColorsSubmit = (colors) => {
            this.socket.emit('submitColors', { colors });
        };
    }

    selectGame(gameType) {
        gameState.setGameType(gameType);
        const gameInfo = gameConfig[gameType];
        
        if (elements.selectedGameInfo) {
            elements.selectedGameInfo.innerHTML = `
                <div class="game-icon">${gameInfo.icon}</div>
                <h3>${gameInfo.title}</h3>
                <p>${gameInfo.description}</p>
            `;
        }
        
        ScreenManager.showScreen('matchmaking');
        this.socket.emit('joinQueue', { gameType });
    }

    cancelMatch() {
        this.socket.emit('leaveQueue');
        ScreenManager.showScreen('gameSelection');
    }

    sendReady() {
        this.socket.emit('playerReady');
        if (elements.readyBtn) {
            elements.readyBtn.disabled = true;
            elements.readyBtn.textContent = '準備完了済み';
        }
    }

    startGame(data) {
        ScreenManager.showScreen('gameScreen');
        ScreenManager.showGameInterface(gameState.currentGameType);
        
        if (gameState.currentGameType === 'numberguess') {
            this.numberGuessGame.reset();
        } else if (gameState.currentGameType === 'hitandblow') {
            this.hitAndBlowGame.reset();
        }
        
        this.updateGameStatus();
        this.chatManager.clearMessages();
    }

    startNewGame() {
        gameState.reset();
        ScreenManager.showScreen('gameSelection');
    }

    backToSelection() {
        gameState.reset();
        ScreenManager.hideModal('disconnectNotice');
        ScreenManager.showScreen('gameSelection');
    }

    updatePlayersInfo(players) {
        if (elements.playersInfo) {
            elements.playersInfo.innerHTML = players.map(player => 
                `<div class="player-info">${player.name || 'プレイヤー'}</div>`
            ).join('');
        }
    }

    updateGameStatus() {
        const statusText = gameState.isMyTurn ? 'あなたのターンです' : '相手のターンを待っています';
        if (elements.gameStatus) {
            elements.gameStatus.textContent = statusText;
            elements.gameStatus.className = `game-status ${gameState.isMyTurn ? 'my-turn' : 'waiting'}`;
        }
        
        // ゲームのインプット状態を更新
        if (gameState.currentGameType === 'numberguess') {
            if (gameState.isMyTurn) {
                this.numberGuessGame.enableInput();
            } else {
                this.numberGuessGame.disableInput();
            }
        } else if (gameState.currentGameType === 'hitandblow') {
            if (gameState.isMyTurn) {
                this.hitAndBlowGame.enableInput();
            } else {
                this.hitAndBlowGame.disableInput();
            }
        }
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new GameApp();
});
