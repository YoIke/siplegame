// Socket.io接続
const socket = io();

// DOM要素
const elements = {
    connectionStatus: document.getElementById('connectionStatus'),
    matchmaking: document.getElementById('matchmaking'),
    gameWaiting: document.getElementById('gameWaiting'),
    gameScreen: document.getElementById('gameScreen'),
    gameEnd: document.getElementById('gameEnd'),
    disconnectNotice: document.getElementById('disconnectNotice'),
    
    findMatchBtn: document.getElementById('findMatchBtn'),
    waitingMessage: document.getElementById('waitingMessage'),
    readyBtn: document.getElementById('readyBtn'),
    playersInfo: document.getElementById('playersInfo'),
    
    gameStatus: document.getElementById('gameStatus'),
    attemptsInfo: document.getElementById('attemptsInfo'),
    guessForm: document.getElementById('guessForm'),
    guessInput: document.getElementById('guessInput'),
    guessBtn: document.getElementById('guessBtn'),
    attemptsList: document.getElementById('attemptsList'),
    
    chatMessages: document.getElementById('chatMessages'),
    chatInput: document.getElementById('chatInput'),
    chatSendBtn: document.getElementById('chatSendBtn'),
    
    gameResult: document.getElementById('gameResult'),
    newGameBtn: document.getElementById('newGameBtn'),
    backToMenuBtn: document.getElementById('backToMenuBtn'),
    backToMenuFromDisconnect: document.getElementById('backToMenuFromDisconnect')
};

// ゲーム状態
let gameState = {
    currentRoom: null,
    playerId: null,
    isMyTurn: false,
    players: []
};

// 画面切り替え関数
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    elements[screenName].classList.remove('hidden');
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

socket.on('waitingForOpponent', () => {
    elements.waitingMessage.classList.remove('hidden');
    elements.findMatchBtn.disabled = true;
    elements.findMatchBtn.textContent = '対戦相手を探しています...';
});

socket.on('matchFound', (data) => {
    console.log('マッチが見つかりました:', data);
    gameState.currentRoom = data.roomId;
    gameState.players = data.players;
    
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
    
    elements.gameStatus.textContent = `現在のターン: ${data.currentPlayer}`;
    elements.attemptsInfo.textContent = `範囲: ${data.targetRange} | 最大試行回数: ${data.maxAttempts}`;
    elements.attemptsList.innerHTML = '';
    
    // ターン表示の更新
    updateTurnDisplay(data.currentPlayer);
});

socket.on('guessResult', (data) => {
    console.log('予想結果:', data);
    
    // 試行履歴を更新
    displayAttempt(data);
    
    // 次のプレイヤーの表示を更新
    if (data.nextPlayer) {
        elements.gameStatus.textContent = `現在のターン: ${data.nextPlayer}`;
        updateTurnDisplay(data.nextPlayer);
    }
    
    // 入力をクリア
    elements.guessInput.value = '';
    
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
                <div class="result-details">正解は ${data.targetNumber} でした！</div>
            `;
            resultClass = 'winner';
        } else {
            resultHtml = `
                <div class="result-title">😢 敗北</div>
                <div class="result-details">${data.winner} の勝利！正解は ${data.targetNumber} でした。</div>
            `;
            resultClass = 'loser';
        }
    } else if (data.draw) {
        resultHtml = `
            <div class="result-title">📝 引き分け</div>
            <div class="result-details">誰も正解できませんでした。正解は ${data.targetNumber} でした。</div>
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

// ボタンイベントリスナー
elements.findMatchBtn.addEventListener('click', () => {
    socket.emit('findMatch');
});

elements.readyBtn.addEventListener('click', () => {
    socket.emit('playerReady');
    elements.readyBtn.disabled = true;
    elements.readyBtn.textContent = '準備完了済み';
});

elements.guessBtn.addEventListener('click', () => {
    makeGuess();
});

elements.guessInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        makeGuess();
    }
});

elements.chatSendBtn.addEventListener('click', () => {
    sendChatMessage();
});

elements.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendChatMessage();
    }
});

elements.newGameBtn.addEventListener('click', () => {
    socket.emit('newGame');
});

elements.backToMenuBtn.addEventListener('click', () => {
    resetToMenu();
});

elements.backToMenuFromDisconnect.addEventListener('click', () => {
    elements.disconnectNotice.classList.add('hidden');
    resetToMenu();
});

// ヘルパー関数
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
        elements.guessForm.classList.remove('disabled');
        elements.guessInput.disabled = false;
        elements.guessBtn.disabled = false;
    } else {
        elements.gameStatus.className = 'game-status opponent-turn';
        elements.guessForm.classList.add('disabled');
        elements.guessInput.disabled = true;
        elements.guessBtn.disabled = true;
    }
}

function makeGuess() {
    if (!gameState.isMyTurn) return;
    
    const guess = parseInt(elements.guessInput.value);
    if (isNaN(guess) || guess < 1 || guess > 100) {
        alert('1〜100の数字を入力してください');
        return;
    }
    
    socket.emit('makeGuess', { guess: guess });
}

function displayAttempt(data) {
    const attemptDiv = document.createElement('div');
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

function resetToMenu() {
    gameState = {
        currentRoom: null,
        playerId: socket.id,
        isMyTurn: false,
        players: []
    };
    
    elements.findMatchBtn.disabled = false;
    elements.findMatchBtn.textContent = '対戦相手を探す';
    elements.waitingMessage.classList.add('hidden');
    elements.readyBtn.disabled = false;
    elements.readyBtn.textContent = '準備完了';
    elements.chatMessages.innerHTML = '';
    
    showScreen('matchmaking');
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    showScreen('matchmaking');
});
