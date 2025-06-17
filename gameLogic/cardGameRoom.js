const BaseGameRoom = require('./baseGameRoom');

class CardGameRoom extends BaseGameRoom {
  constructor(roomId) {
    super(roomId, 'cardgame');
    this.initializeCards();
    this.resetGameSpecific();
  }

  initializeCards() {
    // カードデッキの定義
    this.cardTemplates = [
      // 低コストクリーチャー
      { id: 1, name: 'ゴブリン', attack: 2, health: 1, cost: 1, type: 'creature' },
      { id: 2, name: 'オーク', attack: 3, health: 2, cost: 2, type: 'creature' },
      { id: 3, name: 'ナイト', attack: 2, health: 3, cost: 2, type: 'creature' },
      { id: 4, name: 'ウィザード', attack: 4, health: 2, cost: 3, type: 'creature' },
      { id: 5, name: 'ドラゴン', attack: 5, health: 4, cost: 5, type: 'creature' },
      
      // スペルあ
      { id: 6, name: 'ファイアボール', damage: 3, cost: 2, type: 'spell' },
      { id: 7, name: 'ヒール', heal: 4, cost: 2, type: 'spell' },
      { id: 8, name: 'ライトニング', damage: 2, cost: 1, type: 'spell' },
      { id: 9, name: 'シールド', shield: 3, cost: 1, type: 'spell' },
      { id: 10, name: 'パワーアップ', attackBoost: 2, cost: 2, type: 'spell' }
    ];
  }

  initializeGame() {
    this.resetGameSpecific();
    
    // ゲーム開始時の手札配布
    this.drawCards(0, 3); // プレイヤー1に3枚
    this.drawCards(1, 3); // プレイヤー2に3枚
  }

  resetGameSpecific() {
    // プレイヤー状態初期化
    this.playerStates = [
      {
        health: 15,
        shield: 0,
        hand: [],
        field: [], // 場のクリーチャー
        mana: 1,
        attackedThisTurn: [] // このターンに攻撃したクリーチャーのID
      },
      {
        health: 15,
        shield: 0,
        hand: [],
        field: [],
        mana: 1,
        attackedThisTurn: []
      }
    ];
    
    // 共有デッキ作成（各カードを3枚ずつ）
    this.deck = [];
    this.cardIdCounter = 0; // ユニークIDカウンター
    this.cardTemplates.forEach(template => {
      for (let i = 0; i < 3; i++) {
        this.deck.push({
          ...template,
          uniqueId: ++this.cardIdCounter, // 数値でユニークIDを生成
          currentHealth: template.health || 0 // クリーチャーの現在体力
        });
      }
    });
    
    // デッキをシャッフル
    this.shuffleDeck();
    this.turnCount = 0;
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  drawCards(playerIndex, count) {
    const maxHandSize = 5;
    for (let i = 0; i < count; i++) {
      if (this.playerStates[playerIndex].hand.length >= maxHandSize) break;
      if (this.deck.length === 0) break;
      
      const card = this.deck.pop();
      this.playerStates[playerIndex].hand.push(card);
    }
  }

  makeMove(playerId, moveData) {
    if (this.gameState !== 'playing') return null;

    const currentPlayer = this.players[this.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return null;

    const playerIndex = this.currentPlayerIndex;
    const opponentIndex = 1 - playerIndex;

    switch (moveData.action) {
      case 'playCard':
        return this.playCard(playerIndex, moveData.cardIndex, moveData.target);
      
      case 'attack':
        return this.attack(playerIndex, moveData.attackerIndex, moveData.target);
      
      case 'endTurn':
        return this.endTurn();
      
      default:
        return null;
    }
  }

  playCard(playerIndex, cardIndex, target) {
    const player = this.playerStates[playerIndex];
    const opponent = this.playerStates[1 - playerIndex];
    
    if (cardIndex < 0 || cardIndex >= player.hand.length) return null;
    
    const card = player.hand[cardIndex];
    
    // マナチェック
    if (card.cost > player.mana) {
      return { error: 'マナが足りません' };
    }
    
    // マナ消費
    player.mana -= card.cost;
    
    // カードを手札から削除
    player.hand.splice(cardIndex, 1);
    
    let result = { action: 'playCard', card: card };
    
    if (card.type === 'creature') {
      // クリーチャーを場に出す
      if (player.field.length < 3) { // 場の制限
        player.field.push(card);
        result.message = `${card.name}を召喚しました`;
      } else {
        return { error: '場がいっぱいです' };
      }
    } else if (card.type === 'spell') {
      // スペル効果を適用
      result = this.applySpellEffect(card, playerIndex, target);
    }
    
    return result;
  }

  applySpellEffect(card, playerIndex, target) {
    const player = this.playerStates[playerIndex];
    const opponent = this.playerStates[1 - playerIndex];
    let result = { action: 'spell', card: card };
    
    if (card.damage) {
      // ダメージスペル
      if (target && target.type === 'creature' && target.player !== undefined) {
        // クリーチャーへのダメージ
        const targetPlayer = this.playerStates[target.player];
        if (target.index < targetPlayer.field.length) {
          const targetCreature = targetPlayer.field[target.index];
          targetCreature.currentHealth -= card.damage;
          result.message = `${targetCreature.name}に${card.damage}ダメージ`;
          
          // クリーチャー破壊チェック
          if (targetCreature.currentHealth <= 0) {
            targetPlayer.field.splice(target.index, 1);
            result.message += `、${targetCreature.name}は破壊されました`;
          }
        }
      } else {
        // プレイヤーへの直接ダメージ
        const damage = Math.max(0, card.damage - opponent.shield);
        opponent.shield = Math.max(0, opponent.shield - card.damage);
        opponent.health = Math.max(0, opponent.health - damage);
        result.message = `相手に${card.damage}ダメージ`;
      }
    }
    
    if (card.heal) {
      player.health = Math.min(15, player.health + card.heal);
      result.message = `${card.heal}回復しました`;
    }
    
    if (card.shield) {
      player.shield += card.shield;
      result.message = `シールド${card.shield}を獲得`;
    }
    
    if (card.attackBoost) {
      // パワーアップ系スペル
      if (target && target.type === 'creature' && target.player === playerIndex) {
        // 自分のクリーチャーにパワーアップ
        if (target.index < player.field.length) {
          const targetCreature = player.field[target.index];
          targetCreature.attack += card.attackBoost;
          result.message = `${targetCreature.name}の攻撃力が${card.attackBoost}上昇`;
        }
      } else {
        return { error: 'パワーアップは自分のクリーチャーにのみ使用できます' };
      }
    }
    
    // スペル使用後の勝利判定
    const winner = this.checkWinner();
    if (winner) {
      this.gameState = 'finished';
      result.winner = winner;
    }
    
    return result;
  }

  attack(playerIndex, attackerIndex, target) {
    const player = this.playerStates[playerIndex];
    const opponent = this.playerStates[1 - playerIndex];
    
    if (attackerIndex < 0 || attackerIndex >= player.field.length) {
      return { error: 'クリーチャーが見つかりません' };
    }
    
    const attacker = player.field[attackerIndex];
    
    // 既に攻撃済みチェック
    if (player.attackedThisTurn.includes(attacker.uniqueId)) {
      return { error: 'そのクリーチャーは既に攻撃しています' };
    }
    
    let result = { action: 'attack', attacker: attacker };
    
    if (target && target.type === 'creature') {
      // クリーチャー同士の戦闘
      if (target.index >= opponent.field.length) {
        return { error: 'ターゲットクリーチャーが見つかりません' };
      }
      
      const defender = opponent.field[target.index];
      
      // 相互ダメージ
      attacker.currentHealth -= defender.attack;
      defender.currentHealth -= attacker.attack;
      
      result.message = `${attacker.name} vs ${defender.name}`;
      
      // 破壊チェック
      if (attacker.currentHealth <= 0) {
        player.field.splice(attackerIndex, 1);
        result.message += `、${attacker.name}は破壊されました`;
      }
      if (defender.currentHealth <= 0) {
        opponent.field.splice(target.index, 1);
        result.message += `、${defender.name}は破壊されました`;
      }
    } else {
      // プレイヤーへの直接攻撃
      const damage = Math.max(0, attacker.attack - opponent.shield);
      opponent.shield = Math.max(0, opponent.shield - attacker.attack);
      opponent.health = Math.max(0, opponent.health - damage);
      result.message = `${attacker.name}が相手に${attacker.attack}ダメージ`;
    }
    
    // 攻撃済みリストに追加（クリーチャーが破壊されていない場合のみ）
    if (attacker.currentHealth > 0) {
      player.attackedThisTurn.push(attacker.uniqueId);
    }
    
    // 即座に勝利判定
    const winner = this.checkWinner();
    if (winner) {
      this.gameState = 'finished';
      result.winner = winner;
    }
    
    return result;
  }

  endTurn() {
    // ターン終了処理
    this.turnCount++;
    this.currentPlayerIndex = 1 - this.currentPlayerIndex;
    
    const newPlayer = this.playerStates[this.currentPlayerIndex];
    
    // 攻撃済みリストをクリア
    this.playerStates[0].attackedThisTurn = [];
    this.playerStates[1].attackedThisTurn = [];
    
    // マナ回復（最大10）
    newPlayer.mana = Math.min(10, Math.floor(this.turnCount / 2) + 1);
    
    // カード1枚ドロー
    this.drawCards(this.currentPlayerIndex, 1);
    
    // 勝利判定
    const winner = this.checkWinner();
    if (winner) {
      this.gameState = 'finished';
      return { action: 'endTurn', winner: winner };
    }
    
    return { 
      action: 'endTurn', 
      nextPlayer: this.players[this.currentPlayerIndex].name,
      gameState: this.getGameState()
    };
  }

  checkWinner() {
    if (this.playerStates[0].health <= 0) {
      return this.players[1].name;
    }
    if (this.playerStates[1].health <= 0) {
      return this.players[0].name;
    }
    return null;
  }

  getGameState() {
    return {
      players: this.playerStates.map((state, index) => ({
        name: this.players[index].name,
        health: state.health,
        shield: state.shield,
        handCount: state.hand.length,
        field: state.field,
        mana: state.mana,
        attackedThisTurn: state.attackedThisTurn // 攻撃済みリストを追加
      })),
      currentPlayer: this.currentPlayerIndex,
      deckCount: this.deck.length
    };
  }

  // プレイヤー固有の情報（手札含む）を取得
  getPlayerGameState(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return null;
    
    const gameState = this.getGameState();
    gameState.myHand = this.playerStates[playerIndex].hand;
    gameState.myIndex = playerIndex;
    
    return gameState;
  }
}

module.exports = CardGameRoom;