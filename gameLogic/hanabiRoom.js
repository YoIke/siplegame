const BaseGameRoom = require('./baseGameRoom');

class HanabiRoom extends BaseGameRoom {
  constructor(roomId) {
    super(roomId, 'hanabi');
    this.resetGameSpecific();
  }

  // BaseGameRoomを拡張して2-5人対応
  addPlayer(socket, customName = null) {
    if (this.players.length < 5) {
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

  startGame() {
    if (this.players.length >= 2 && this.players.every(p => p.ready)) {
      this.gameState = 'playing';
      this.currentPlayerIndex = 0;
      this.initializeGame();
      return true;
    }
    return false;
  }

  initializeGame() {
    this.resetGameSpecific();
    
    // プレイヤー人数に応じた手札枚数
    const handSize = this.players.length <= 3 ? 5 : 4;
    
    // 各プレイヤーに手札を配る
    for (let i = 0; i < this.players.length; i++) {
      this.dealCards(i, handSize);
    }
  }

  resetGameSpecific() {
    // カード構成：各色1(3枚)、2-4(2枚)、5(1枚)
    this.colors = ['white', 'red', 'blue', 'yellow', 'green'];
    this.deck = [];
    
    // デッキ作成
    this.colors.forEach(color => {
      // 1のカード（3枚）
      for (let i = 0; i < 3; i++) {
        this.deck.push({ color, number: 1 });
      }
      // 2,3,4のカード（各2枚）
      for (let num = 2; num <= 4; num++) {
        for (let i = 0; i < 2; i++) {
          this.deck.push({ color, number: num });
        }
      }
      // 5のカード（1枚）
      this.deck.push({ color, number: 5 });
    });
    
    // デッキをシャッフル
    this.shuffleDeck();
    
    // ゲーム状態初期化
    this.playerHands = Array(this.players.length).fill(null).map(() => []);
    this.fireworks = {
      white: 0,
      red: 0,
      blue: 0,
      yellow: 0,
      green: 0
    };
    this.discardPile = [];
    this.hintTokens = 8;
    this.errorTokens = 0;
    this.maxErrors = 3;
    this.gameOver = false;
    this.finalRound = false;
    this.finalRoundTurns = 0;
    this.score = 0;
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  dealCards(playerIndex, count) {
    for (let i = 0; i < count; i++) {
      if (this.deck.length > 0) {
        this.playerHands[playerIndex].push(this.deck.pop());
      }
    }
  }

  drawCard(playerIndex) {
    if (this.deck.length > 0) {
      this.playerHands[playerIndex].push(this.deck.pop());
      
      // 最後のカードが引かれた場合、最終ラウンド開始
      if (this.deck.length === 0 && !this.finalRound) {
        this.finalRound = true;
        this.finalRoundTurns = 0;
      }
    }
  }

  makeMove(playerId, moveData) {
    if (this.gameState !== 'playing' || this.gameOver) return null;

    const currentPlayer = this.players[this.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return null;

    const playerIndex = this.currentPlayerIndex;
    let result = null;

    switch (moveData.action) {
      case 'giveHint':
        result = this.giveHint(playerIndex, moveData.targetPlayer, moveData.hintType, moveData.hintValue);
        break;
      
      case 'discardCard':
        result = this.discardCard(playerIndex, moveData.cardIndex);
        break;
      
      case 'playCard':
        result = this.playCard(playerIndex, moveData.cardIndex);
        break;
      
      default:
        return null;
    }

    if (result && !result.error) {
      this.nextTurn();
      
      // 勝利・敗北条件チェック
      const gameResult = this.checkGameEnd();
      if (gameResult) {
        result.gameEnd = gameResult;
      }
    }

    return result;
  }

  giveHint(playerIndex, targetPlayerIndex, hintType, hintValue) {
    // ヒントトークンチェック
    if (this.hintTokens <= 0) {
      return { error: 'ヒントトークンがありません' };
    }

    // ターゲットプレイヤーチェック
    if (targetPlayerIndex < 0 || targetPlayerIndex >= this.players.length || targetPlayerIndex === playerIndex) {
      return { error: '無効なターゲットプレイヤーです' };
    }

    const targetHand = this.playerHands[targetPlayerIndex];
    const matchingCards = [];

    // ヒントに該当するカードを探す
    targetHand.forEach((card, index) => {
      if ((hintType === 'color' && card.color === hintValue) ||
          (hintType === 'number' && card.number === hintValue)) {
        matchingCards.push(index);
      }
    });

    // 該当するカードが0枚の場合はエラー
    if (matchingCards.length === 0) {
      return { error: 'そのヒントに該当するカードがありません' };
    }

    this.hintTokens--;

    return {
      action: 'giveHint',
      player: this.players[playerIndex].name,
      targetPlayer: this.players[targetPlayerIndex].name,
      hintType: hintType,
      hintValue: hintValue,
      matchingCards: matchingCards,
      hintTokens: this.hintTokens
    };
  }

  discardCard(playerIndex, cardIndex) {
    const hand = this.playerHands[playerIndex];
    
    if (cardIndex < 0 || cardIndex >= hand.length) {
      return { error: '無効なカードインデックスです' };
    }

    // ヒントトークンが最大の場合は捨てられない
    if (this.hintTokens >= 8) {
      return { error: 'ヒントトークンが最大です' };
    }

    const discardedCard = hand.splice(cardIndex, 1)[0];
    this.discardPile.push(discardedCard);
    this.hintTokens++;
    
    // カードを1枚引く
    this.drawCard(playerIndex);

    return {
      action: 'discardCard',
      player: this.players[playerIndex].name,
      discardedCard: discardedCard,
      hintTokens: this.hintTokens
    };
  }

  playCard(playerIndex, cardIndex) {
    const hand = this.playerHands[playerIndex];
    
    if (cardIndex < 0 || cardIndex >= hand.length) {
      return { error: '無効なカードインデックスです' };
    }

    const playedCard = hand.splice(cardIndex, 1)[0];
    const currentFirework = this.fireworks[playedCard.color];

    // 正しい順番でプレイできるかチェック
    if (playedCard.number === currentFirework + 1) {
      // 成功
      this.fireworks[playedCard.color]++;
      
      // 5を完成させた場合、ヒントトークンを1つ回復
      if (playedCard.number === 5 && this.hintTokens < 8) {
        this.hintTokens++;
      }
      
      // カードを1枚引く
      this.drawCard(playerIndex);
      
      return {
        action: 'playCard',
        success: true,
        player: this.players[playerIndex].name,
        playedCard: playedCard,
        fireworks: this.fireworks,
        hintTokens: this.hintTokens
      };
    } else {
      // 失敗
      this.discardPile.push(playedCard);
      this.errorTokens++;
      
      // カードを1枚引く
      this.drawCard(playerIndex);
      
      return {
        action: 'playCard',
        success: false,
        player: this.players[playerIndex].name,
        playedCard: playedCard,
        errorTokens: this.errorTokens,
        maxErrors: this.maxErrors
      };
    }
  }

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    
    // 最終ラウンド中の場合
    if (this.finalRound) {
      this.finalRoundTurns++;
    }
  }

  checkGameEnd() {
    // 即座敗北：3回失敗
    if (this.errorTokens >= this.maxErrors) {
      this.gameOver = true;
      this.score = 0;
      return {
        type: 'defeat',
        reason: '3回失敗しました',
        score: this.score
      };
    }

    // 完全勝利：全ての花火完成
    const totalScore = Object.values(this.fireworks).reduce((sum, value) => sum + value, 0);
    if (totalScore === 25) {
      this.gameOver = true;
      this.score = 25;
      return {
        type: 'perfect',
        reason: '全ての花火を完成させました！',
        score: this.score
      };
    }

    // 最終ラウンド終了
    if (this.finalRound && this.finalRoundTurns >= this.players.length) {
      this.gameOver = true;
      this.score = totalScore;
      return {
        type: 'normal',
        reason: 'ゲーム終了',
        score: this.score
      };
    }

    return null;
  }

  getGameState() {
    return {
      players: this.players.map(p => p.name),
      currentPlayer: this.currentPlayerIndex,
      fireworks: this.fireworks,
      hintTokens: this.hintTokens,
      errorTokens: this.errorTokens,
      maxErrors: this.maxErrors,
      deckCount: this.deck.length,
      discardPile: this.discardPile,
      gameOver: this.gameOver,
      finalRound: this.finalRound,
      score: Object.values(this.fireworks).reduce((sum, value) => sum + value, 0)
    };
  }

  // プレイヤー固有の情報を取得（自分の手札は見えない）
  getPlayerGameState(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return null;
    
    const gameState = this.getGameState();
    
    // 他のプレイヤーの手札は見える
    gameState.otherPlayersHands = {};
    for (let i = 0; i < this.players.length; i++) {
      if (i !== playerIndex) {
        gameState.otherPlayersHands[i] = this.playerHands[i];
      }
    }
    
    // 自分の手札枚数のみ
    gameState.myHandCount = this.playerHands[playerIndex].length;
    gameState.myIndex = playerIndex;
    
    return gameState;
  }
}

module.exports = HanabiRoom;