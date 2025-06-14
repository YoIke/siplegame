// ゲーム状態管理
export class GameState {
    constructor() {
        this.currentRoom = null;
        this.playerId = null;
        this.isMyTurn = false;
        this.players = [];
        this.currentGameType = null;
        this.selectedColors = [null, null, null, null];
        this.currentColorSlot = 0;
        this.attempts = [];
    }

    reset() {
        this.currentRoom = null;
        this.isMyTurn = false;
        this.players = [];
        this.currentGameType = null;
        this.selectedColors = [null, null, null, null];
        this.currentColorSlot = 0;
        this.attempts = [];
    }

    setGameType(gameType) {
        this.currentGameType = gameType;
    }

    setRoom(roomId) {
        this.currentRoom = roomId;
    }

    setPlayerId(playerId) {
        this.playerId = playerId;
    }

    setPlayers(players) {
        this.players = players;
    }

    setTurn(isMyTurn) {
        this.isMyTurn = isMyTurn;
    }
}

export const gameState = new GameState();
