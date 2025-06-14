// ゲーム状態管理
class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.currentRoom = null;
        this.playerId = null;
        this.isMyTurn = false;
        this.players = [];
        this.currentGameType = null;
        this.selectedColors = [null, null, null, null];
        this.currentColorSlot = 0;
    }

    setPlayerId(id) {
        this.playerId = id;
    }

    updateRoom(roomId) {
        this.currentRoom = roomId;
    }

    updatePlayers(players) {
        this.players = players;
    }

    setGameType(gameType) {
        this.currentGameType = gameType;
    }

    updateTurn(currentPlayerName) {
        const myPlayer = this.players.find(p => p.id === this.playerId);
        this.isMyTurn = myPlayer && myPlayer.name === currentPlayerName;
        return this.isMyTurn;
    }

    // ヒットアンドブロー専用メソッド
    selectColor(color, slotIndex = null) {
        const targetSlot = slotIndex !== null ? slotIndex : this.currentColorSlot;
        if (targetSlot < 4) {
            this.selectedColors[targetSlot] = color;
            if (slotIndex === null) {
                this.currentColorSlot = Math.min(this.currentColorSlot + 1, 3);
            }
        }
        return this.selectedColors;
    }

    resetColorSelection() {
        this.selectedColors = [null, null, null, null];
        this.currentColorSlot = 0;
    }

    setCurrentColorSlot(index) {
        this.currentColorSlot = Math.max(0, Math.min(index, 3));
    }

    areAllColorsSelected() {
        return this.selectedColors.every(color => color !== null);
    }

    getSelectedColors() {
        return [...this.selectedColors];
    }

    getCurrentPlayer() {
        return this.players.find(p => p.id === this.playerId);
    }
}

// グローバルなゲーム状態インスタンス
window.gameState = new GameState();
