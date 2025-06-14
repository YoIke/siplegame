// Socket.io接続
const socket = io();

// DOM要素
const elements = {
    connectionStatus: document.getElementById('connectionStatus'),
    gameSelection: document.getElementById('gameSelection'),
    matchmaking: document.getElementById('matchmaking'),
    gameWaiting: document.getElementById('gameWaiting'),
    gameScreen: document.getElementById('gameScreen'),
    gameEnd: document.getElementById('gameEnd'),
    disconnectNotice: document.getElementById('disconnectNotice'),
    
    matchmakingTitle: document.getElementById('matchmakingTitle'),
    selectedGameInfo: document.getElementById('selectedGameInfo'),
    waitingMessage: document.getElementById('waitingMessage'),
    cancelMatchBtn: document.getElementById('cancelMatchBtn'),
    readyBtn: document.getElementById('readyBtn'),
    playersInfo: document.getElementById('playersInfo'),
    
    gameStatus: document.getElementById('gameStatus'),
    attemptsInfo: document.getElementById('attemptsInfo'),
    attemptsList: document.getElementById('attemptsList'),
    
    // 数字当てゲーム
    numberGuessGame: document.getElementById('numberGuessGame'),
    guessInput: document.getElementById('guessInput'),
    guessBtn: document.getElementById('guessBtn'),
    
    // ヒットアンドブロー
    hitAndBlowGame: document.getElementById('hitAndBlowGame'),
    submitColorsBtn: document.getElementById('submitColorsBtn'),
    
    chatMessages: document.getElementById('chatMessages'),
    chatInput: document.getElementById('chatInput'),
    chatSendBtn: document.getElementById('chatSendBtn'),
    
    gameResult: document.getElementById('gameResult'),
    newGameBtn: document.getElementById('newGameBtn'),
    backToSelectionBtn: document.getElementById('backToSelectionBtn'),
    backToSelectionFromDisconnect: document.getElementById('backToSelectionFromDisconnect')
};

// ゲーム状態
let gameState = {
    currentRoom: null,
    playerId: null,
    isMyTurn: false,
    players: [],
    currentGameType: null,
    selectedColors: [null, null, null, null],
    currentColorSlot: 0
};

// ゲーム情報
const gameInfo = {
    numberguess: {
        title: '数字当てゲーム',
        icon: '🎯',
        description: '1〜100の数字を当てよう！'
    },
    hitandblow: {
        title: 'ヒットアンドブロー',
        icon: '🌈',
        description: '4つの色の組み合わせを当てよう！'
    }
};

// 画面切り替え関数
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    elements[screenName].classList.remove('hidden');
}

// ゲームインターフェース切り替え
function showGameInterface(gameType) {
    document.querySelectorAll('.game-interface').forEach(interface => {
        interface.classList.add('hidden');
    });
    
    if (gameType === 'numberguess') {
        elements.numberGuessGame.classList.remove('hidden');
    } else if (gameType === 'hitandblow') {
        elements.hitAndBlowGame.classList.remove('hidden');
    }
}

// Socket.io イベントリスナー
socket.on('connect', () => {
    console.log('サーバーに接続しました');
    gameState.playerId = socket.id;
    elements.connectionStatus.textContent = '接続済み';
    elements.connectionStatus.className = 'status-bar connected';
});

socket.on('disconnect', () => {
    console.log('サーバーから切断されました');
    elements.connectionStatus.textContent = '切断されました';
    elements.connectionStatus.className = 'status-bar disconnected';
});

socket.on('waitingForOpponent', (data) => {
    const game = gameInfo[data.gameType];
    elements.matchmakingTitle.textContent = `${game.title} - 対戦相手を探しています`;
    elements.selectedGameInfo.innerHTML = `
        <div style="font-size: 3rem;">${game.icon}</div>
        <h3>${game.title}</h3>
        <p>${game.description}</p>
    `;
});

socket.on('matchFound', (data) => {
    console.log('マッチが見つかりました:', data);
    gameState.currentRoom = data.roomId;
    gameState.players = data.players;
    gameState.currentGameType = data.gameType;
    
    showScreen('gameWaiting');
    updatePlayersInfo();
});

socket.on('playerReadyUpdate', (data) => {
    gameState.players = data.players;
    updatePlayersInfo();
});

socket.on('gameStart', (data) => {
    console.log('ゲーム開始:', data);
    showScreen('gameScreen');
    showGameInterface(data.gameType);
    
    elements.gameStatus.textContent = `現在のターン: ${data.currentPlayer}`;
    
    if (data.gameType === 'numberguess') {
        elements.attemptsInfo.textContent = `範囲: ${data.targetRange} | 最大試行回数: ${data.maxAttempts}`;
    } else if (data.gameType === 'hitandblow') {
        elements.attemptsInfo.textContent = `色の組み合わせ: ${data.codeLength}色 | 最大試行回数: ${data.maxAttempts}`;
    }
    
    elements.attemptsList.innerHTML = '';
    resetColorSelection();
    
    // ターン表示の更新
    updateTurnDisplay(data.currentPlayer);
});

socket.on('moveResult', (data) => {
    console.log('移動結果:', data);
    
    // 試行履歴を更新
    displayAttempt(data);
    
    // 次のプレイヤーの表示を更新
    if (data.nextPlayer) {
        elements.gameStatus.textContent = `現在のターン: ${data.nextPlayer}`;
        updateTurnDisplay(data.nextPlayer);
    }
    
    // 入力をクリア
    if (gameState.currentGameType === 'numberguess') {
        elements.guessInput.value = '';
    } else if (gameState.currentGameType === 'hitandblow') {
        resetColorSelection();
    }
    
    // 試行回数の更新
    elements.attemptsInfo.textContent = `試行回数: ${data.attempts.length}/10`;
});

socket.on('gameEnd', (data) => {
    console.log('ゲーム終了:', data);
    
    let resultHtml = '';
    let resultClass = '';
    
    if (data.winner) {
        const isWinner = gameState.players.find(p => p.id === gameState.playerId && p.name === data.winner);
        if (isWinner) {
            resultHtml = `
                <div class="result-title">🎉 勝利！</div>
                <div class="result-details">
                    ${data.targetNumber ? `正解は ${data.targetNumber} でした！` : ''}
                    ${data.targetColors ? `正解は ${getColorDisplay(data.targetColors)} でした！` : ''}
                </div>
            `;
            resultClass = 'winner';
        } else {
            resultHtml = `
                <div class="result-title">😢 敗北</div>
                <div class="result-details">
                    ${data.winner} の勝利！
                    ${data.targetNumber ? `正解は ${data.targetNumber} でした。` : ''}
                    ${data.targetColors ? `正解は ${getColorDisplay(data.targetColors)} でした。` : ''}
                </div>
            `;
            resultClass = 'loser';
        }
    } else if (data.draw) {
        resultHtml = `
            <div class="result-title">📝 引き分け</div>
            <div class="result-details">
                誰も正解できませんでした。
                ${data.targetNumber ? `正解は ${data.targetNumber} でした。` : ''}
                ${data.targetColors ? `正解は ${getColorDisplay(data.targetColors)} でした。` : ''}
            </div>
        `;
        resultClass = 'draw';
    }
    
    elements.gameResult.innerHTML = resultHtml;
    elements.gameResult.className = `game-result ${resultClass}`;
    
    setTimeout(() => {
        showScreen('gameEnd');
    }, 3000);
});

socket.on('newChatMessage', (data) => {
    displayChatMessage(data);
});

socket.on('newGameReady', (data) => {
    gameState.players = data.players;
    showScreen('gameWaiting');
    updatePlayersInfo();
});

socket.on('opponentDisconnected', () => {
    elements.disconnectNotice.classList.remove('hidden');
});

socket.on('backToGameSelection', () => {
    resetToGameSelection();
});

// イベントリスナー
// ゲーム選択
document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => {
        const gameType = card.dataset.game;
        startMatchmaking(gameType);
    });
});

// マッチメイキング関連
elements.cancelMatchBtn.addEventListener('click', () => {
    socket.emit('backToGameSelection');
});

elements.readyBtn.addEventListener('click', () => {
    socket.emit('playerReady');
    elements.readyBtn.disabled = true;
    elements.readyBtn.textContent = '準備完了済み';
});

// 数字当てゲーム
elements.guessBtn.addEventListener('click', () => {
    makeNumberGuess();
});

elements.guessInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        makeNumberGuess();
    }
});

// ヒットアンドブロー
elements.submitColorsBtn.addEventListener('click', () => {
    submitColors();
});

// 色選択
document.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
        selectColor(option.dataset.color, option);
    });
});

// 色スロットクリック
document.querySelectorAll('.color-slot').forEach(slot => {
    slot.addEventListener('click', () => {
        const slotIndex = parseInt(slot.dataset.slot);
        gameState.currentColorSlot = slotIndex;
        updateColorSlotHighlight();
    });
});

// チャット
elements.chatSendBtn.addEventListener('click', () => {
    sendChatMessage();
});

elements.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendChatMessage();
    }
});

// ゲーム終了画面
elements.newGameBtn.addEventListener('click', () => {
    socket.emit('newGame');
});

elements.backToSelectionBtn.addEventListener('click', () => {
    socket.emit('backToGameSelection');
});

elements.backToSelectionFromDisconnect.addEventListener('click', () => {
    elements.disconnectNotice.classList.add('hidden');
    socket.emit('backToGameSelection');
});

// ヘルパー関数
function startMatchmaking(gameType) {
    gameState.currentGameType = gameType;
    socket.emit('findMatch', { gameType: gameType });
    showScreen('matchmaking');
}

function updatePlayersInfo() {
    let html = '';
    gameState.players.forEach(player => {
        const statusText = player.ready ? '準備完了' : '準備中';
        const statusClass = player.ready ? 'ready' : 'waiting';
        const isMe = player.id === gameState.playerId ? ' (あなた)' : '';
        
        html += `
            <div class="player-item">
                <span>${player.name}${isMe}</span>
                <span class="player-status ${statusClass}">${statusText}</span>
            </div>
        `;
    });
    elements.playersInfo.innerHTML = html;
}

function updateTurnDisplay(currentPlayerName) {
    const myPlayer = gameState.players.find(p => p.id === gameState.playerId);
    gameState.isMyTurn = myPlayer && myPlayer.name === currentPlayerName;
    
    if (gameState.isMyTurn) {
        elements.gameStatus.className = 'game-status your-turn';
        enableGameInterface();
    } else {
        elements.gameStatus.className = 'game-status opponent-turn';
        disableGameInterface();
    }
}

function enableGameInterface() {
    if (gameState.currentGameType === 'numberguess') {
        elements.guessInput.disabled = false;
        elements.guessBtn.disabled = false;
    } else if (gameState.currentGameType === 'hitandblow') {
        elements.submitColorsBtn.disabled = false;
        document.querySelectorAll('.color-option').forEach(opt => opt.style.pointerEvents = 'auto');
        document.querySelectorAll('.color-slot').forEach(slot => slot.style.pointerEvents = 'auto');
    }
}

function disableGameInterface() {
    if (gameState.currentGameType === 'numberguess') {
        elements.guessInput.disabled = true;
        elements.guessBtn.disabled = true;
    } else if (gameState.currentGameType === 'hitandblow') {
        elements.submitColorsBtn.disabled = true;
        document.querySelectorAll('.color-option').forEach(opt => opt.style.pointerEvents = 'none');
        document.querySelectorAll('.color-slot').forEach(slot => slot.style.pointerEvents = 'none');
    }
}

function makeNumberGuess() {
    if (!gameState.isMyTurn) return;
    
    const guess = parseInt(elements.guessInput.value);
    if (isNaN(guess) || guess < 1 || guess > 100) {
        alert('1〜100の数字を入力してください');
        return;
    }
    
    socket.emit('makeMove', { guess: guess });
}

// ヒットアンドブロー関連の関数
function selectColor(color, element) {
    if (!gameState.isMyTurn) return;
    
    // 選択された色をスロットに設定
    if (gameState.currentColorSlot < 4) {
        gameState.selectedColors[gameState.currentColorSlot] = color;
        updateColorSlots();
        
        // 次のスロットに移動
        gameState.currentColorSlot = Math.min(gameState.currentColorSlot + 1, 3);
        updateColorSlotHighlight();
    }
}

function updateColorSlots() {
    gameState.selectedColors.forEach((color, index) => {
        const slot = document.querySelector(`[data-slot="${index}"]`);
        if (color) {
            slot.style.backgroundColor = getColorCode(color);
            slot.classList.add('filled');
            // 白色の場合は境界線を追加
            if (color === 'white') {
                slot.style.border = '3px solid #999';
            } else {
                slot.style.border = '3px solid #333';
            }
        } else {
            slot.style.backgroundColor = 'transparent';
            slot.style.border = '3px dashed #ccc';
            slot.classList.remove('filled');
        }
    });
    
    // 4色全て選択されたらボタンを有効化
    const allSelected = gameState.selectedColors.every(color => color !== null);
    elements.submitColorsBtn.disabled = !allSelected;
}

function updateColorSlotHighlight() {
    document.querySelectorAll('.color-slot').forEach((slot, index) => {
        if (index === gameState.currentColorSlot) {
            slot.style.borderColor = '#333';
            slot.style.borderWidth = '4px';
        } else {
            slot.style.borderColor = gameState.selectedColors[index] ? '#333' : '#ccc';
            slot.style.borderWidth = '3px';
        }
    });
}

function submitColors() {
    if (!gameState.isMyTurn) return;
    
    const allSelected = gameState.selectedColors.every(color => color !== null);
    if (!allSelected) {
        alert('4つの色をすべて選択してください');
        return;
    }
    
    socket.emit('makeMove', { colors: [...gameState.selectedColors] });
}

function resetColorSelection() {
    gameState.selectedColors = [null, null, null, null];
    gameState.currentColorSlot = 0;
    updateColorSlots();
    updateColorSlotHighlight();
    elements.submitColorsBtn.disabled = true;
}

function getColorCode(colorName) {
    const colorMap = {
        red: '#ff4444',
        blue: '#4444ff',
        green: '#44ff44',
        yellow: '#ffff44',
        pink: '#ff44ff',
        white: '#ffffff'
    };
    return colorMap[colorName] || '#ccc';
}

function getColorDisplay(colors) {
    return colors.map(color => `<span style="color: ${getColorCode(color)};">●</span>`).join(' ');
}

function displayAttempt(data) {
    const attemptDiv = document.createElement('div');
    
    if (gameState.currentGameType === 'numberguess') {
        attemptDiv.className = 'attempt-item';
        
        let resultClass = '';
        if (data.result === '正解！') resultClass = 'correct';
        else if (data.result === '大きい') resultClass = 'high';
        else if (data.result === '小さい') resultClass = 'low';
        
        attemptDiv.innerHTML = `
            <div>
                <div class="attempt-player">${data.player}</div>
                <div class="attempt-guess">${data.guess}</div>
            </div>
            <div class="attempt-result ${resultClass}">${data.result}</div>
        `;
    } else if (gameState.currentGameType === 'hitandblow') {
        attemptDiv.className = 'hit-blow-attempt';
        
        const colorsHtml = data.guess.map(color => 
            `<div class="attempt-color" style="background-color: ${getColorCode(color)}; ${color === 'white' ? 'border: 2px solid #999;' : ''}"></div>`
        ).join('');
        
        attemptDiv.innerHTML = `
            <div>
                <div class="attempt-player">${data.player}</div>
                <div class="attempt-colors">${colorsHtml}</div>
            </div>
            <div class="attempt-result-hb">
                <div class="hit-count">Hit: ${data.hit}</div>
                <div class="blow-count">Blow: ${data.blow}</div>
            </div>
        `;
    }
    
    elements.attemptsList.appendChild(attemptDiv);
    elements.attemptsList.scrollTop = elements.attemptsList.scrollHeight;
}

function sendChatMessage() {
    const message = elements.chatInput.value.trim();
    if (message) {
        socket.emit('chatMessage', { message: message });
        elements.chatInput.value = '';
    }
}

function displayChatMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.innerHTML = `
        <div class="chat-message-header">${data.player} - ${data.timestamp}</div>
        <div class="chat-message-content">${data.message}</div>
    `;
    
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function resetToGameSelection() {
    gameState = {
        currentRoom: null,
        playerId: socket.id,
        isMyTurn: false,
        players: [],
        currentGameType: null,
        selectedColors: [null, null, null, null],
        currentColorSlot: 0
    };
    
    elements.readyBtn.disabled = false;
    elements.readyBtn.textContent = '準備完了';
    elements.chatMessages.innerHTML = '';
    resetColorSelection();
    
    showScreen('gameSelection');
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    showScreen('gameSelection');
    resetColorSelection();
});
