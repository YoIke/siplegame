const BaseGameRoom = require('./baseGameRoom');

class NumberGuessRoom extends BaseGameRoom {
  constructor(roomId) {
    super(roomId, 'numberguess');
    this.targetNumber = Math.floor(Math.random() * 100) + 1;
    this.attempts = [];
    this.maxAttempts = 10;
  }

  initializeGame() {
    this.targetNumber = Math.floor(Math.random() * 100) + 1;
    this.attempts = [];
  }

  makeMove(playerId, moveData) {
    if (this.gameState !== 'playing') return null;

    const currentPlayer = this.players[this.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return null;

    const guess = parseInt(moveData.guess);
    const attempt = {
      player: currentPlayer.name,
      guess: guess,
      result: this.getHint(guess)
    };

    this.attempts.push(attempt);

    // 正解チェック
    if (guess === this.targetNumber) {
      this.gameState = 'finished';
      return { ...attempt, winner: currentPlayer.name, targetNumber: this.targetNumber };
    }

    // 最大試行回数チェック
    if (this.attempts.length >= this.maxAttempts) {
      this.gameState = 'finished';
      return { ...attempt, draw: true, targetNumber: this.targetNumber };
    }

    // ターン切り替え
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 2;
    return attempt;
  }

  getHint(guess) {
    if (guess === this.targetNumber) return '正解！';
    if (guess < this.targetNumber) return '小さい';
    return '大きい';
  }
}

module.exports = NumberGuessRoom;
