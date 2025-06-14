// カードゲーム固有の処理
class CardGame {
  constructor() {
    this.gameState = null;
    this.selectedCard = null;
    this.selectedTarget = null;
    this.myIndex = null;
    
    this.initializeEventHandlers();
  }

  initializeEventHandlers() {
    // ターン終了ボタン
    const endTurnBtn = document.getElementById('endTurnBtn');
    if (endTurnBtn) {
      endTurnBtn.addEventListener('click', () => {
        this.endTurn();
      });
    }
  }

  startGame(gameData) {
    console.log('カードゲーム開始:', gameData);
    
    // 初期ゲーム状態を設定
    this.updateGameState(gameData);
    
    // UI表示
    this.showGameInterface();
  }

  showGameInterface() {
    // 他のゲームインターフェースを隠す
    document.getElementById('numberGuessGame').classList.add('hidden');
    document.getElementById('hitAndBlowGame').classList.add('hidden');
    
    // カードゲームインターフェースを表示
    document.getElementById('cardGame').classList.remove('hidden');
  }

  updateGameState(gameData) {
    this.gameState = gameData;
    this.myIndex = gameData.myIndex;
    
    if (gameData.players) {
      this.updatePlayerInfo(gameData.players);
    }
    
    if (gameData.myHand) {
      this.updateHand(gameData.myHand);
    }
    
    if (gameData.currentPlayer !== undefined) {
      this.updateTurnDisplay(gameData.currentPlayer);
    }
    
    if (gameData.deckCount !== undefined) {
      this.updateDeckCount(gameData.deckCount);
    }
  }

  updatePlayerInfo(players) {
    const myPlayer = players[this.myIndex];
    const opponent = players[1 - this.myIndex];
    
    // 自分の情報更新
    document.getElementById('playerHealth').textContent = myPlayer.health;
    document.getElementById('playerMana').textContent = myPlayer.mana;
    this.updateShield('player', myPlayer.shield);
    this.updateField('player', myPlayer.field);
    
    // 相手の情報更新
    document.getElementById('opponentName').textContent = opponent.name;
    document.getElementById('opponentHealth').textContent = opponent.health;
    document.getElementById('opponentHandCount').textContent = opponent.handCount;
    this.updateShield('opponent', opponent.shield);
    this.updateField('opponent', opponent.field);
  }

  updateShield(player, shield) {
    const shieldElement = document.getElementById(`${player}Shield`);
    if (shield > 0) {
      shieldElement.classList.remove('hidden');
      shieldElement.querySelector('span').textContent = shield;
    } else {
      shieldElement.classList.add('hidden');
    }
  }

  updateField(player, field) {
    const fieldElement = document.getElementById(`${player}Field`);
    fieldElement.innerHTML = '';
    
    field.forEach((card, index) => {
      const cardElement = this.createCardElement(card, player === 'player', index);
      fieldElement.appendChild(cardElement);
    });
  }

  updateHand(hand) {
    const handElement = document.getElementById('playerHand');
    handElement.innerHTML = '';
    
    hand.forEach((card, index) => {
      const cardElement = this.createHandCardElement(card, index);
      handElement.appendChild(cardElement);
    });
  }

  createCardElement(card, isPlayer, index) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card field-card';
    cardDiv.dataset.index = index;
    
    if (isPlayer && !this.isMyTurn()) {
      cardDiv.classList.add('inactive');
    }
    
    cardDiv.innerHTML = `
      <div class="card-header">
        <span class="card-name">${card.name}</span>
      </div>
      <div class="card-stats">
        <span class="attack">⚔️${card.attack}</span>
        <span class="health">❤️${card.currentHealth}</span>
      </div>
    `;
    
    if (isPlayer && this.isMyTurn()) {
      cardDiv.addEventListener('click', () => {
        this.selectFieldCard(index);
      });
    }
    
    return cardDiv;
  }

  createHandCardElement(card, index) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card hand-card';
    cardDiv.dataset.index = index;
    
    const canPlay = this.canPlayCard(card);
    if (!canPlay) {
      cardDiv.classList.add('unplayable');
    }
    
    cardDiv.innerHTML = `
      <div class="card-header">
        <span class="card-cost">💎${card.cost}</span>
        <span class="card-name">${card.name}</span>
      </div>
      <div class="card-content">
        ${this.getCardDescription(card)}
      </div>
      <div class="card-stats">
        ${card.attack !== undefined ? `<span class="attack">⚔️${card.attack}</span>` : ''}
        ${card.health !== undefined ? `<span class="health">❤️${card.health}</span>` : ''}
      </div>
    `;
    
    if (canPlay && this.isMyTurn()) {
      cardDiv.addEventListener('click', () => {
        this.selectHandCard(index);
      });
    }
    
    return cardDiv;
  }

  getCardDescription(card) {
    if (card.type === 'spell') {
      let desc = '';
      if (card.damage) desc += `${card.damage}ダメージ`;
      if (card.heal) desc += `${card.heal}回復`;
      if (card.shield) desc += `シールド${card.shield}`;
      if (card.attackBoost) desc += `攻撃力+${card.attackBoost}`;
      return desc;
    }
    return card.type === 'creature' ? 'クリーチャー' : '';
  }

  canPlayCard(card) {
    if (!this.gameState || !this.isMyTurn()) return false;
    const myPlayer = this.gameState.players[this.myIndex];
    return card.cost <= myPlayer.mana;
  }

  isMyTurn() {
    return this.gameState && this.gameState.currentPlayer === this.myIndex;
  }

  selectHandCard(index) {
    console.log('Hand card selected:', index);
    
    // 既に選択されている手札カードの選択を解除
    document.querySelectorAll('.hand-card.selected').forEach(card => {
      card.classList.remove('selected');
    });
    
    // 新しいカードを選択
    const cardElement = document.querySelector(`.hand-card[data-index="${index}"]`);
    cardElement.classList.add('selected');
    this.selectedCard = index;
    
    const card = this.gameState.myHand[index];
    console.log('Selected card:', card);
    
    if (card.type === 'spell') {
      if (card.damage) {
        console.log('Damage spell selected, showing enemy target selection');
        // ダメージ系スペルは敵をターゲット
        this.showTargetSelection('enemy');
      } else if (card.attackBoost) {
        console.log('Power-up spell selected, showing friendly target selection');
        // パワーアップ系スペルは自分のクリーチャーをターゲット
        this.showTargetSelection('friendly');
      } else {
        console.log('Non-target spell selected, playing immediately');
        // 回復やシールドは即座に発動
        this.playSelectedCard();
      }
    } else {
      console.log('Creature selected, playing immediately');
      // クリーチャーは即座に召喚
      this.playSelectedCard();
    }
  }

  selectFieldCard(index) {
    // 場のカードを選択（攻撃用）
    document.querySelectorAll('.field-card.selected').forEach(card => {
      card.classList.remove('selected');
    });
    
    const cardElement = document.querySelector(`#playerField .field-card[data-index="${index}"]`);
    cardElement.classList.add('selected');
    
    this.showAttackTargets(index);
  }

  showTargetSelection() {
    console.log('showTargetSelection called');
    
    // 既存のターゲット選択だけをクリア（カード選択は保持）
    document.querySelectorAll('.targetable').forEach(el => {
      el.classList.remove('targetable');
      el.style.cursor = '';
      el.title = '';
      delete el.dataset.attackHandler;
      delete el.dataset.spellHandler;
    });
    
    const card = this.gameState.myHand[this.selectedCard];
    
    if (card.attackBoost) {
      // パワーアップ系は自分のクリーチャーをターゲット
      const myCreatures = document.querySelectorAll('#playerField .field-card');
      console.log('Found my creatures for power up:', myCreatures.length);
      
      myCreatures.forEach(creatureCard => {
        creatureCard.classList.add('targetable');
        creatureCard.style.cursor = 'pointer';
        creatureCard.title = 'クリックしてパワーアップ';
        creatureCard.dataset.spellHandler = 'true';
        console.log('Added targetable class to my creature:', creatureCard);
      });
    } else {
      // ダメージ系は相手をターゲット
      const opponentHealthArea = document.getElementById('opponentHealth').closest('.health-bar');
      console.log('Found opponent health area:', opponentHealthArea);
      
      if (opponentHealthArea) {
        opponentHealthArea.classList.add('targetable');
        opponentHealthArea.style.cursor = 'pointer';
        opponentHealthArea.title = 'クリックして直接攻撃';
        opponentHealthArea.dataset.spellHandler = 'true';
        console.log('Added targetable class to health area');
      }
      
      // 相手のクリーチャーをターゲット可能に
      const opponentCreatures = document.querySelectorAll('#opponentField .field-card');
      console.log('Found opponent creatures:', opponentCreatures.length);
      
      opponentCreatures.forEach(card => {
        card.classList.add('targetable');
        card.style.cursor = 'pointer';
        card.title = 'クリックして攻撃';
        card.dataset.spellHandler = 'true';
        console.log('Added targetable class to creature:', card);
      });
    }
    
    // 一度だけイベントリスナーを設定
    this.setupSpellEventListeners();
  }

  setupSpellEventListeners() {
    console.log('setupSpellEventListeners called');
    
    // 少し待ってからイベントリスナーを設定
    setTimeout(() => {
      const card = this.gameState.myHand[this.selectedCard];
      
      if (card.attackBoost) {
        // パワーアップ系：自分のクリーチャーにイベントリスナー
        const targetableMyCreatures = document.querySelectorAll('#playerField .field-card.targetable[data-spell-handler="true"]');
        console.log('Targetable my creatures for power up:', targetableMyCreatures.length);
        
        targetableMyCreatures.forEach(creatureCard => {
          const powerUpHandler = (e) => {
            console.log('Power up creature clicked, index:', creatureCard.dataset.index);
            e.stopPropagation();
            this.selectSpellTarget('myCreature', parseInt(creatureCard.dataset.index));
          };
          creatureCard.addEventListener('click', powerUpHandler, { once: true });
          console.log('Added power up event listener to my creature:', creatureCard.dataset.index);
        });
      } else {
        // ダメージ系：相手をターゲット
        const opponentHealthArea = document.querySelector('.health-bar.targetable[data-spell-handler="true"]');
        console.log('Health area for spell:', opponentHealthArea);
        
        if (opponentHealthArea) {
          const spellPlayerHandler = (e) => {
            console.log('Spell player attack clicked');
            e.stopPropagation();
            this.selectSpellTarget('player', null);
          };
          opponentHealthArea.addEventListener('click', spellPlayerHandler, { once: true });
          console.log('Added spell player event listener');
        }
        
        // クリーチャー攻撃
        const targetableCreatures = document.querySelectorAll('#opponentField .field-card.targetable[data-spell-handler="true"]');
        console.log('Targetable creatures for spell:', targetableCreatures.length);
        
        targetableCreatures.forEach(card => {
          const spellCreatureHandler = (e) => {
            console.log('Spell creature attack clicked, index:', card.dataset.index);
            e.stopPropagation();
            this.selectSpellTarget('creature', parseInt(card.dataset.index));
          };
          card.addEventListener('click', spellCreatureHandler, { once: true });
          console.log('Added spell creature event listener to card:', card.dataset.index);
        });
      }
    }, 50); // 50ms後に設定
  }

  showAttackTargets(attackerIndex) {
    console.log('showAttackTargets called for index:', attackerIndex);
    
    // 既存のターゲット選択だけをクリア（カード選択は保持）
    document.querySelectorAll('.targetable').forEach(el => {
      el.classList.remove('targetable');
      el.style.cursor = '';
      el.title = '';
      delete el.dataset.attackHandler;
      delete el.dataset.spellHandler;
    });
    
    // 相手プレイヤーをターゲット可能に
    const opponentHealthArea = document.getElementById('opponentHealth').closest('.health-bar');
    
    if (opponentHealthArea) {
      opponentHealthArea.classList.add('targetable');
      opponentHealthArea.style.cursor = 'pointer';
      opponentHealthArea.title = 'クリックして直接攻撃';
      opponentHealthArea.dataset.attackHandler = 'true'; // マーク追加
    }
    
    // 相手のクリーチャーをターゲット可能に
    document.querySelectorAll('#opponentField .field-card').forEach(card => {
      card.classList.add('targetable');
      card.style.cursor = 'pointer';
      card.title = 'クリックして攻撃';
      card.dataset.attackHandler = 'true'; // マーク追加
    });
    
    // 一度だけイベントリスナーを設定
    this.setupAttackEventListeners(attackerIndex);
  }

  setupAttackEventListeners(attackerIndex) {
    console.log('setupAttackEventListeners called for index:', attackerIndex);
    
    // 少し待ってからイベントリスナーを設定
    setTimeout(() => {
      // プレイヤー攻撃
      const opponentHealthArea = document.querySelector('.health-bar.targetable[data-attack-handler="true"]');
      if (opponentHealthArea) {
        const attackPlayerHandler = (e) => {
          console.log('Attack player clicked');
          e.stopPropagation();
          this.attack(attackerIndex, 'player', null);
        };
        opponentHealthArea.addEventListener('click', attackPlayerHandler, { once: true });
        console.log('Added attack player event listener');
      }
      
      // クリーチャー攻撃
      document.querySelectorAll('#opponentField .field-card.targetable[data-attack-handler="true"]').forEach(card => {
        const attackCreatureHandler = (e) => {
          console.log('Attack creature clicked, index:', card.dataset.index);
          e.stopPropagation();
          this.attack(attackerIndex, 'creature', parseInt(card.dataset.index));
        };
        card.addEventListener('click', attackCreatureHandler, { once: true });
        console.log('Added attack creature event listener to card:', card.dataset.index);
      });
    }, 50); // 50ms後に設定
  }

  selectSpellTarget(type, index) {
    console.log('selectSpellTarget called:', type, index);
    let target = null;
    
    if (type === 'player') {
      target = null; // 相手プレイヤー
    } else if (type === 'creature') {
      target = { type: 'creature', player: 1 - this.myIndex, index: index }; // 相手のクリーチャー
    } else if (type === 'myCreature') {
      target = { type: 'creature', player: this.myIndex, index: index }; // 自分のクリーチャー
    }
    
    this.playSelectedCard(target);
  }

  playSelectedCard(target = null) {
    if (this.selectedCard === null) return;
    
    const moveData = {
      action: 'playCard',
      cardIndex: this.selectedCard,
      target: target
    };
    
    if (window.app && window.app.socketManager) {
      window.app.socketManager.sendMove(moveData);
    }
    this.clearSelections();
  }

  attack(attackerIndex, targetType, targetIndex) {
    const target = targetType === 'player' ? null : { type: 'creature', player: 1 - this.myIndex, index: targetIndex };
    
    const moveData = {
      action: 'attack',
      attackerIndex: attackerIndex,
      target: target
    };
    
    if (window.app && window.app.socketManager) {
      window.app.socketManager.sendMove(moveData);
    }
    this.clearSelections();
  }

  endTurn() {
    const moveData = {
      action: 'endTurn'
    };
    
    if (window.app && window.app.socketManager) {
      window.app.socketManager.sendMove(moveData);
    }
    this.clearSelections();
  }

  clearSelections() {
    this.selectedCard = null;
    this.selectedTarget = null;
    
    document.querySelectorAll('.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    document.querySelectorAll('.targetable').forEach(el => {
      el.classList.remove('targetable');
      el.style.cursor = '';
      el.title = '';
      // データ属性もクリア
      delete el.dataset.attackHandler;
      delete el.dataset.spellHandler;
    });
  }

  updateTurnDisplay(currentPlayer) {
    const turnElement = document.getElementById('currentTurnPlayer');
    const endTurnBtn = document.getElementById('endTurnBtn');
    
    if (currentPlayer === this.myIndex) {
      turnElement.textContent = 'あなたのターン';
      turnElement.className = 'current-turn my-turn';
      endTurnBtn.disabled = false;
    } else {
      turnElement.textContent = '相手のターン';
      turnElement.className = 'current-turn opponent-turn';
      endTurnBtn.disabled = true;
    }
  }

  updateDeckCount(count) {
    document.getElementById('deckCount').textContent = count;
  }

  handleMoveResult(result) {
    console.log('カードゲーム結果:', result);
    
    if (result.winner) {
      // 即座にゲーム終了
      this.showMessage(`${result.winner}の勝利！`, 'victory');
      setTimeout(() => {
        if (window.app && window.app.gameManager) {
          window.app.gameManager.endGame({ winner: result.winner });
        }
      }, 2000);
    } else if (result.action === 'endTurn') {
      this.showMessage(`${result.nextPlayer ? 'ターン交代' : 'ゲーム終了'}`);
    } else if (result.message) {
      this.showMessage(result.message);
    }
  }

  handleMoveError(error) {
    console.log('カードゲームエラー:', error);
    this.showMessage(error.error || 'エラーが発生しました', 'error');
  }

  showMessage(message, type = 'info') {
    // 簡易メッセージ表示
    const messageDiv = document.createElement('div');
    messageDiv.className = `game-message ${type}`;
    messageDiv.textContent = message;
    
    const gameArea = document.querySelector('.card-game-area');
    gameArea.appendChild(messageDiv);
    
    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }
}

// グローバル変数として設定
window.cardGame = new CardGame();