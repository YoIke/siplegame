// カードゲーム固有の処理
class CardGame {
  constructor() {
    this.gameState = null;
    this.selectedCard = null;
    this.selectedTarget = null;
    this.myIndex = null;
    this.isProcessing = false; // 処理中フラグを追加
    
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
    
    console.log(`Updating ${player} field with ${field.length} creatures`);
    
    field.forEach((card, index) => {
      const cardElement = this.createCardElement(card, player === 'player', index);
      fieldElement.appendChild(cardElement);
      console.log(`Added ${player} creature:`, card.name, 'index:', index, 'isPlayer:', player === 'player', 'isMyTurn:', this.isMyTurn());
    });
    
    // フィールド更新後、自分のクリーチャーのクリック可能状態を再確認
    if (player === 'player') {
      console.log('Updated my field, checking clickable state...');
      document.querySelectorAll('#playerField .field-card').forEach((cardEl, idx) => {
        const isClickable = cardEl.style.cursor === 'pointer';
        console.log(`Creature ${idx}: clickable=${isClickable}, hasEventListener=${cardEl.onclick !== null}`);
      });
    }
  }

  updateHand(hand) {
    const handElement = document.getElementById('playerHand');
    handElement.innerHTML = '';
    
    console.log(`Updating hand with ${hand.length} cards`);
    
    hand.forEach((card, index) => {
      const cardElement = this.createHandCardElement(card, index);
      handElement.appendChild(cardElement);
      console.log(`Added hand card:`, card.name, 'index:', index, 'playable:', this.canPlayCard(card));
    });
  }

  createCardElement(card, isPlayer, index) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card field-card';
    cardDiv.dataset.index = index;
    cardDiv.dataset.uniqueId = card.uniqueId; // ユニークIDを保存
    
    if (isPlayer && !this.isMyTurn()) {
      cardDiv.classList.add('inactive');
    }
    
    // 攻撃済みかどうかチェック
    const hasAttacked = this.hasCreatureAttacked(card.uniqueId);
    if (hasAttacked) {
      cardDiv.classList.add('attacked');
      cardDiv.title = 'このクリーチャーは既に攻撃済みです';
    }
    
    // クリーチャーの絵文字を取得
    const creatureEmoji = this.getCreatureEmoji(card.name);
    
    cardDiv.innerHTML = `
      <div class="card-header">
        <span class="attack">⚔️${card.attack}</span>
        <span class="health">❤️${card.currentHealth}</span>
      </div>
      <div class="card-content">
        <div class="creature-emoji">${creatureEmoji}</div>
        <div class="card-type-indicator">🧬</div>
      </div>
      <div class="card-footer">
        <span class="card-cost">💎${card.cost}</span>
      </div>
    `;
    
    // 自分のクリーチャーで自分のターンで未攻撃の場合のみクリック可能
    if (isPlayer && this.isMyTurn() && !hasAttacked) {
      cardDiv.style.cursor = 'pointer';
      cardDiv.title = 'クリックして攻撃';
      
      cardDiv.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('My creature clicked for attack, index:', index, 'uniqueId:', card.uniqueId);
        this.selectFieldCard(index);
      });
    } else if (hasAttacked) {
      cardDiv.style.cursor = 'not-allowed';
    }
    
    return cardDiv;
  }

  // 攻撃済みかどうかチェック
  hasCreatureAttacked(uniqueId) {
    if (!this.gameState || !this.gameState.players) return false;
    const myPlayer = this.gameState.players[this.myIndex];
    // サーバーから攻撃済みリストが送られてくる場合
    return myPlayer.attackedThisTurn && myPlayer.attackedThisTurn.includes(uniqueId);
  }

  createHandCardElement(card, index) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card hand-card';
    cardDiv.dataset.index = index;
    
    const canPlay = this.canPlayCard(card);
    if (!canPlay) {
      cardDiv.classList.add('unplayable');
    }
    
    // カードの絵文字と種別アイコンを取得
    let contentEmoji = '';
    let typeIcon = '';
    let statsHtml = '';
    
    if (card.type === 'creature') {
      contentEmoji = this.getCreatureEmoji(card.name);
      typeIcon = '🧬'; // クリーチャー
      statsHtml = `
        <span class="attack">⚔️${card.attack}</span>
        <span class="health">❤️${card.health}</span>
      `;
    } else if (card.type === 'spell') {
      contentEmoji = this.getSpellEmoji(card);
      typeIcon = '✨'; // 魔法
      statsHtml = '';
    }
    
    cardDiv.innerHTML = `
      <div class="card-header">
        ${statsHtml}
      </div>
      <div class="card-content">
        <div class="card-emoji">${contentEmoji}</div>
        <div class="card-type-indicator">${typeIcon}</div>
        <div class="card-description">${this.getCardDescription(card)}</div>
      </div>
      <div class="card-footer">
        <span class="card-cost">💎${card.cost}</span>
      </div>
    `;
    
    // プレイ可能で自分のターンの場合のみクリック可能
    if (canPlay && this.isMyTurn()) {
      cardDiv.style.cursor = 'pointer';
      cardDiv.title = 'クリックしてプレイ';
      
      cardDiv.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Hand card clicked:', card.name, 'index:', index);
        this.selectHandCard(index);
      });
    }
    
    return cardDiv;
  }

  getCreatureEmoji(creatureName) {
    const emojiMap = {
      'ゴブリン': '👹',
      'オーク': '🧌',
      'ナイト': '🛡️',
      'ウィザード': '🧙‍♂️',
      'ドラゴン': '🐉'
    };
    return emojiMap[creatureName] || '🦄';
  }

  getSpellEmoji(card) {
    if (card.damage) return '🔥'; // ダメージ系
    if (card.heal) return '💚'; // 回復系
    if (card.shield) return '🛡️'; // シールド系
    if (card.attackBoost) return '⚡'; // パワーアップ系
    return '✨'; // その他の魔法
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
    return ''; // クリーチャーの場合は説明文なし（絵文字で表現）
  }

  canPlayCard(card) {
    if (!this.gameState || !this.isMyTurn()) return false;
    const myPlayer = this.gameState.players[this.myIndex];
    return card.cost <= myPlayer.mana;
  }

  isMyTurn() {
    const result = this.gameState && this.gameState.currentPlayer === this.myIndex;
    console.log('isMyTurn check:', {
      hasGameState: !!this.gameState,
      currentPlayer: this.gameState?.currentPlayer,
      myIndex: this.myIndex,
      result: result
    });
    return result;
  }

  selectHandCard(index) {
    console.log('Hand card selected:', index);
    
    // 既に選択されている手札カードの選択を解除
    document.querySelectorAll('.hand-card.selected').forEach(card => {
      card.classList.remove('selected');
    });
    
    // 新しいカードを選択
    const cardElement = document.querySelector(`.hand-card[data-index="${index}"]`);
    if (cardElement) {
      cardElement.classList.add('selected');
      this.selectedCard = index;
    } else {
      console.error('Could not find card element with index:', index);
      return;
    }
    
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
        this.executePlayCard();
      }
    } else {
      console.log('Creature selected, playing immediately');
      // クリーチャーは即座に召喚
      this.executePlayCard();
    }
  }

  selectFieldCard(index) {
    console.log('selectFieldCard called with index:', index);
    
    // クリーチャー選択時は処理中フラグをチェックしない（ターゲット選択の準備段階）
    
    if (!this.gameState || !this.gameState.players) {
      console.error('Game state not available');
      return;
    }
    
    const myPlayer = this.gameState.players[this.myIndex];
    if (index >= myPlayer.field.length) {
      console.error('Invalid creature index:', index);
      return;
    }
    
    const creature = myPlayer.field[index];
    
    // 攻撃済みチェック
    if (this.hasCreatureAttacked(creature.uniqueId)) {
      console.log('Creature already attacked this turn:', creature.name);
      this.showMessage('そのクリーチャーは既に攻撃済みです', 'error');
      return;
    }
    
    // 既に別のクリーチャーが選択されている場合は選択解除
    document.querySelectorAll('.field-card.selected').forEach(card => {
      card.classList.remove('selected');
    });
    
    // 新しいクリーチャーを選択
    const cardElement = document.querySelector(`#playerField .field-card[data-index="${index}"]`);
    if (cardElement) {
      cardElement.classList.add('selected');
      console.log('Selected creature for attack:', creature.name, 'index:', index);
      this.showAttackTargets(index);
    }
  }

  showTargetSelection(targetType = 'enemy') {
    console.log('showTargetSelection called with type:', targetType);
    
    // 既存のターゲット選択だけをクリア（カード選択は保持）
    document.querySelectorAll('.targetable').forEach(el => {
      el.classList.remove('targetable');
      el.style.cursor = '';
      el.title = '';
      delete el.dataset.attackHandler;
      delete el.dataset.spellHandler;
    });
    
    const card = this.gameState.myHand[this.selectedCard];
    
    if (targetType === 'friendly' && card.attackBoost) {
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
    this.setupSpellEventListeners(targetType);
  }

  setupSpellEventListeners(targetType = 'enemy') {
    console.log('setupSpellEventListeners called with type:', targetType);
    
    // 少し待ってからイベントリスナーを設定
    setTimeout(() => {
      const card = this.gameState.myHand[this.selectedCard];
      
      if (targetType === 'friendly' && card.attackBoost) {
        // パワーアップ系：自分のクリーチャーにイベントリスナー
        const targetableMyCreatures = document.querySelectorAll('#playerField .field-card.targetable[data-spell-handler="true"]');
        console.log('Targetable my creatures for power up:', targetableMyCreatures.length);
        
        targetableMyCreatures.forEach(creatureCard => {
          const powerUpHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            if (this.isProcessing) {
              console.log('Spell already processing, ignoring');
              return;
            }
            
            console.log('Power up creature clicked, index:', creatureCard.dataset.index);
            this.isProcessing = true;
            this.executeSpellTarget('myCreature', parseInt(creatureCard.dataset.index));
          };
          creatureCard.addEventListener('click', powerUpHandler, { 
            once: true,
            capture: true
          });
          console.log('Added power up event listener to my creature:', creatureCard.dataset.index);
        });
      } else {
        // ダメージ系：相手をターゲット
        const opponentHealthArea = document.querySelector('.health-bar.targetable[data-spell-handler="true"]');
        console.log('Health area for spell:', opponentHealthArea);
        
        if (opponentHealthArea) {
          const spellPlayerHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            if (this.isProcessing) {
              console.log('Spell already processing, ignoring');
              return;
            }
            
            console.log('Spell player attack clicked');
            this.isProcessing = true;
            this.executeSpellTarget('player', null);
          };
          opponentHealthArea.addEventListener('click', spellPlayerHandler, { 
            once: true,
            capture: true
          });
          console.log('Added spell player event listener');
        }
        
        // クリーチャー攻撃
        const targetableCreatures = document.querySelectorAll('#opponentField .field-card.targetable[data-spell-handler="true"]');
        console.log('Targetable creatures for spell:', targetableCreatures.length);
        
        targetableCreatures.forEach(card => {
          const spellCreatureHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            if (this.isProcessing) {
              console.log('Spell already processing, ignoring');
              return;
            }
            
            console.log('Spell creature attack clicked, index:', card.dataset.index);
            this.isProcessing = true;
            this.executeSpellTarget('creature', parseInt(card.dataset.index));
          };
          card.addEventListener('click', spellCreatureHandler, { 
            once: true,
            capture: true
          });
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
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation(); // 他のイベントリスナーも停止
          
          if (this.isProcessing) {
            console.log('Attack already processing, ignoring');
            return;
          }
          
          console.log('Attack player clicked');
          this.isProcessing = true; // 処理開始
          this.executeAttack(attackerIndex, 'player', null);
        };
        opponentHealthArea.addEventListener('click', attackPlayerHandler, { 
          once: true,
          capture: true // キャプチャフェーズで処理
        });
        console.log('Added attack player event listener');
      }
      
      // クリーチャー攻撃
      document.querySelectorAll('#opponentField .field-card.targetable[data-attack-handler="true"]').forEach(card => {
        const attackCreatureHandler = (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          if (this.isProcessing) {
            console.log('Attack already processing, ignoring');
            return;
          }
          
          console.log('Attack creature clicked, index:', card.dataset.index);
          this.isProcessing = true; // 処理開始
          this.executeAttack(attackerIndex, 'creature', parseInt(card.dataset.index));
        };
        card.addEventListener('click', attackCreatureHandler, { 
          once: true,
          capture: true
        });
        console.log('Added attack creature event listener to card:', card.dataset.index);
      });
    }, 50); // 50ms後に設定
  }

  executeSpellTarget(type, index) {
    console.log('executeSpellTarget called:', type, index);
    let target = null;
    
    if (type === 'player') {
      target = null; // 相手プレイヤー
    } else if (type === 'creature') {
      target = { type: 'creature', player: 1 - this.myIndex, index: index }; // 相手のクリーチャー
    } else if (type === 'myCreature') {
      target = { type: 'creature', player: this.myIndex, index: index }; // 自分のクリーチャー
    }
    
    this.executePlayCard(target);
  }

  executePlayCard(target = null) {
    if (this.selectedCard === null) {
      console.error('No card selected');
      return;
    }
    
    console.log('executePlayCard called with target:', target);
    
    const moveData = {
      action: 'playCard',
      cardIndex: this.selectedCard,
      target: target
    };
    
    console.log('Sending play card move:', moveData);
    
    if (window.app && window.app.socketManager) {
      window.app.socketManager.sendMove(moveData);
    }
    this.clearSelections();
  }

  // 後方互換性のため残しておく
  selectSpellTarget(type, index) {
    this.executeSpellTarget(type, index);
  }

  playSelectedCard(target = null) {
    // 処理中フラグチェック（互換性のため）
    if (this.isProcessing) {
      console.log('Already processing, ignoring playSelectedCard');
      return;
    }
    
    this.isProcessing = true;
    this.executePlayCard(target);
  }

  executeAttack(attackerIndex, targetType, targetIndex) {
    console.log('executeAttack called:', attackerIndex, targetType, targetIndex);
    
    const target = targetType === 'player' ? null : { type: 'creature', player: 1 - this.myIndex, index: targetIndex };
    
    const moveData = {
      action: 'attack',
      attackerIndex: attackerIndex,
      target: target
    };
    
    console.log('Sending attack move:', moveData);
    
    if (window.app && window.app.socketManager) {
      window.app.socketManager.sendMove(moveData);
    }
    this.clearSelections();
  }

  attack(attackerIndex, targetType, targetIndex) {
    // 後方互換性のため残しておく
    this.executeAttack(attackerIndex, targetType, targetIndex);
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
    this.isProcessing = false; // 処理フラグをリセット
    
    // 手札の選択状態をクリア
    document.querySelectorAll('.hand-card.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    // 場のクリーチャーの選択状態もクリア（攻撃後）
    document.querySelectorAll('.field-card.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    // ターゲット選択状態のみクリア
    document.querySelectorAll('.targetable').forEach(el => {
      el.classList.remove('targetable');
      el.style.cursor = el.classList.contains('field-card') && el.closest('#playerField') && this.isMyTurn() ? 'pointer' : '';
      el.title = el.classList.contains('field-card') && el.closest('#playerField') && this.isMyTurn() ? 'クリックして攻撃' : '';
      // データ属性をクリア
      delete el.dataset.attackHandler;
      delete el.dataset.spellHandler;
    });
    
    console.log('Cleared selections, restored creature clickability');
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
    this.isProcessing = false; // 処理完了
    
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
    this.isProcessing = false; // エラー時も処理完了
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