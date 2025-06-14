const BaseGameRoom = require('./baseGameRoom');

class HitAndBlowRoom extends BaseGameRoom {
  constructor(roomId) {
    super(roomId, 'hitandblow');
    this.targetColors = this.generateTargetColors();
    this.attempts = [];
    this.maxAttempts = 10;
    this.colors = ['red', 'blue', 'green', 'yellow', 'pink', 'white'];
    this.codeLength = 4;
  }

  initializeGame() {
    this.targetColors = this.generateTargetColors();
    this.attempts = [];
  }

  resetGameSpecific() {
    // ヒットアンドブロー固有のリセット
    this.targetColors = this.generateTargetColors();
    this.attempts = [];
  }

  generateTargetColors() {
    const colors = ['red', 'blue', 'green', 'yellow', 'pink', 'white'];
    const target = [];
    const usedColors = new Set();

    while (target.length < 4) {
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      if (!usedColors.has(randomColor)) {
        target.push(randomColor);
        usedColors.add(randomColor);
      }
    }

    return target;
  }

  makeMove(playerId, moveData) {
    if (this.gameState !== 'playing') return null;

    const currentPlayer = this.players[this.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return null;

    const guess = moveData.colors;
    const result = this.calculateHitAndBlow(guess);

    const attempt = {
      player: currentPlayer.name,
      guess: guess,
      hit: result.hit,
      blow: result.blow
    };

    this.attempts.push(attempt);

    // 正解チェック（全部Hit）
    if (result.hit === this.codeLength) {
      this.gameState = 'finished';
      return { ...attempt, winner: currentPlayer.name, targetColors: this.targetColors };
    }

    // 最大試行回数チェック
    if (this.attempts.length >= this.maxAttempts) {
      this.gameState = 'finished';
      return { ...attempt, draw: true, targetColors: this.targetColors };
    }

    // ターン切り替え
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 2;
    return attempt;
  }

  calculateHitAndBlow(guess) {
    let hit = 0;
    let blow = 0;

    // Hit（位置と色が一致）をカウント
    const targetCopy = [...this.targetColors];
    const guessCopy = [...guess];

    for (let i = 0; i < this.codeLength; i++) {
      if (guess[i] === this.targetColors[i]) {
        hit++;
        targetCopy[i] = null;
        guessCopy[i] = null;
      }
    }

    // Blow（色は一致するが位置が違う）をカウント
    for (let i = 0; i < this.codeLength; i++) {
      if (guessCopy[i] !== null) {
        const index = targetCopy.indexOf(guessCopy[i]);
        if (index !== -1) {
          blow++;
          targetCopy[index] = null;
        }
      }
    }

    return { hit, blow };
  }
}

module.exports = HitAndBlowRoom;
