class BaseGameRoom {
  constructor(roomId, gameType) {
    this.roomId = roomId;
    this.gameType = gameType;
    this.players = [];
    this.gameState = 'waiting'; // waiting, playing, finished
    this.currentPlayerIndex = 0;
    this.chatMessages = [];
  }

  addPlayer(socket, customName = null) {
    if (this.players.length < 2) {
      const playerName = customName || `プレイヤー${this.players.length + 1}`;
      this.players.push({
        socket: socket,
        id: socket.id,
        name: playerName,
        ready: false
      });
      socket.join(this.roomId);
      return true;
    }
    return false;
  }

  removePlayer(socketId) {
    this.players = this.players.filter(player => player.id !== socketId);
    if (this.players.length === 0) {
      return true; // ルーム削除
    }
    return false;
  }

  startGame() {
    if (this.players.length === 2 && this.players.every(p => p.ready)) {
      this.gameState = 'playing';
      this.currentPlayerIndex = 0;
      this.initializeGame();
      return true;
    }
    return false;
  }

  resetGame() {
    // ゲーム状態をリセット
    this.gameState = 'waiting';
    this.currentPlayerIndex = 0;
    this.chatMessages = [];
    
    // プレイヤーの準備状態をリセット
    this.players.forEach(p => p.ready = false);
    
    // ゲーム固有の初期化
    if (typeof this.initializeGame === 'function') {
      // initializeGameを呼ばずに、ゲーム固有のリセット処理を行う
      this.resetGameSpecific();
    }
  }

  // 継承先でオーバーライドできるゲーム固有のリセット処理
  resetGameSpecific() {
    // 基底クラスでは何もしない
  }

  addChatMessage(playerId, message) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      const chatMessage = {
        player: player.name,
        message: message,
        timestamp: new Date().toLocaleTimeString()
      };
      this.chatMessages.push(chatMessage);
      return chatMessage;
    }
    return null;
  }

  // 継承先で実装する抽象メソッド
  initializeGame() { throw new Error('Must implement initializeGame'); }
  makeMove(playerId, moveData) { throw new Error('Must implement makeMove'); }
}

module.exports = BaseGameRoom;
