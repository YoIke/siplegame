// ゲーム状態管理
class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.currentRoom = null;
        this.currentRoomId = null; // 追加: gameManager.jsで使用されているプロパティ
        this.playerId = null;
        this.playerDisplayName = null; // 追加: プレイヤーの表示名
        this.isMyTurn = false;
        this.players = [];
        this.currentGameType = null;
        this.selectedColors = [null, null, null, null];
        this.currentColorSlot = 0;
        this.isAwaitingGameSelectionResponse = false; // 追加: ゲーム選択応答待ちフラグ
    }

    setPlayerId(id) {
        this.playerId = id;
    }

    setPlayerDisplayName(displayName) {
        this.playerDisplayName = displayName;
    }

    updateRoom(roomId) {
        this.currentRoom = roomId;
        this.currentRoomId = roomId; // 追加: 両方のプロパティを同期
    }

    updatePlayers(players) {
        this.players = players;
    }

    setGameType(gameType) {
        this.currentGameType = gameType;
    }

    setAwaitingGameSelectionResponse(isAwaiting) { // 追加: フラグのセッター
        this.isAwaitingGameSelectionResponse = isAwaiting;
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

    getMyPlayerName() {
        const myPlayer = this.getCurrentPlayer();
        return myPlayer ? myPlayer.name : this.playerDisplayName;
    }
}

// グローバルなゲーム状態インスタンス
window.gameState = new GameState();
