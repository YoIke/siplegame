// Make this global
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

// Socket.io接続
const socket = io();

// DOM要素
const elements = {
    // Retain elements for screens managed by showScreen and vital global elements
    connectionStatus: document.getElementById('connectionStatus'),
    gameSelection: document.getElementById('gameSelection'),
    matchmaking: document.getElementById('matchmaking'),
    gameWaiting: document.getElementById('gameWaiting'),
    gameScreen: document.getElementById('gameScreen'),
    gameEnd: document.getElementById('gameEnd'),
    // disconnectNotice: document.getElementById('disconnectNotice'), // Now fully managed by Alpine x-show and store

    // Retain elements used by Alpine effects for now, or if other non-Alpine JS needs them
    attemptsList: document.getElementById('attemptsList'), // Used by Alpine effects for scrolling
    chatMessages: document.getElementById('chatMessages'), // Used by Alpine effects for scrolling

    // Removed elements that are now fully managed by Alpine.js:
    // matchmakingTitle, selectedGameInfo, waitingMessage, cancelMatchBtn,
    // readyBtn, playersInfo, gameStatus, attemptsInfo,
    // numberGuessGame, guessInput, guessBtn,
    // hitAndBlowGame, submitColorsBtn,
    // chatInput, chatSendBtn,
    // gameResult, newGameBtn, backToSelectionBtn, backToSelectionFromDisconnect
};

// ゲーム状態
let gameState = { // Properties managed by Alpine stores are commented out or removed
    currentRoom: null,
    playerId: null, // Still essential for identifying the client
    // isMyTurn: false, // Managed by Alpine.store('gameScreen').isMyTurn
    players: [], // Holds authoritative player list from server, used to derive Alpine store values
    // currentGameType: null, // Managed by Alpine.store('gameScreen').currentGameType
    // selectedColors: [null, null, null, null], // Managed by Alpine.store('hitAndBlow').selectedColors
    // currentColorSlot: 0 // Managed by Alpine.store('hitAndBlow').currentColorSlot
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
// function showGameInterface(gameType) { // Replaced by Alpine.js x-show directives
//     document.querySelectorAll('.game-interface').forEach(interface => {
//         interface.classList.add('hidden');
//     });

//     if (gameType === 'numberguess') {
//         elements.numberGuessGame.classList.remove('hidden');
//     } else if (gameType === 'hitandblow') {
//         elements.hitAndBlowGame.classList.remove('hidden');
//     }
// }

// Socket.io イベントリスナー
socket.on('connect', () => {
    console.log('サーバーに接続しました');
    gameState.playerId = socket.id;
    if (Alpine.store('gameWaiting')) {
        Alpine.store('gameWaiting').playerId = socket.id;
    }
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
    Alpine.store('matchmaking').title = `${game.title} - 対戦相手を探しています`;
    Alpine.store('matchmaking').gameIcon = game.icon;
    Alpine.store('matchmaking').gameTitle = game.title;
    // Ensure description is treated as a string, not HTML, if it comes from gameInfo
    Alpine.store('matchmaking').gameDescription = game.description;
    // The waitingText can remain as default or be updated if needed
});

socket.on('matchFound', (data) => {
    console.log('マッチが見つかりました:', data);
    gameState.currentRoom = data.roomId;
    gameState.players = data.players; // Still set here, used by gameStart/moveResult to find 'myPlayer'
    // gameState.currentGameType = data.gameType; // Alpine store is source of truth
    if (Alpine.store('gameScreen')) { // Ensure store exists
      Alpine.store('gameScreen').currentGameType = data.gameType; // Set Alpine store
    }
    
    // Update Alpine store for gameWaiting screen
    if (Alpine.store('gameWaiting')) {
        Alpine.store('gameWaiting').players = data.players;
        Alpine.store('gameWaiting').isReady = false;
        Alpine.store('gameWaiting').readyButtonText = '準備完了';
    }
    showScreen('gameWaiting');
    // updatePlayersInfo(); // Replaced by Alpine.js
});

socket.on('playerReadyUpdate', (data) => {
    // gameState.players = data.players; // Managed by Alpine store
    if (Alpine.store('gameWaiting')) {
        Alpine.store('gameWaiting').players = data.players;
    }
    // updatePlayersInfo(); // Replaced by Alpine.js
});

socket.on('gameStart', (data) => {
    console.log('ゲーム開始:', data);
    const gameScreenStore = Alpine.store('gameScreen');
    gameScreenStore.currentGameType = data.gameType;
    // Ensure gameState.players is up-to-date before finding current player
    // This might require 'players' to be passed in 'gameStart' data or rely on 'matchFound' having set it.
    // Assuming gameState.players is correctly populated from 'matchFound' or similar event.
    const myPlayerStart = gameState.players.find(p => p.id === gameState.playerId);
    // gameState.isMyTurn = myPlayerStart && myPlayerStart.name === data.currentPlayer; // Set in store
    gameScreenStore.isMyTurn = myPlayerStart && myPlayerStart.name === data.currentPlayer;
    gameScreenStore.gameStatusText = `現在のターン: ${data.currentPlayer}`;
    gameScreenStore.gameStatusClass = gameState.isMyTurn ? 'game-status your-turn' : 'game-status opponent-turn';

    // Hide disconnect notice if it was shown
    if (Alpine.store('modals')) {
        Alpine.store('modals').showDisconnectNotice = false;
    }

    if (data.gameType === 'numberguess') {
        gameScreenStore.attemptsInfoText = `範囲: ${data.targetRange} | 最大試行回数: ${data.maxAttempts}`;
        Alpine.store('numberGuess').guess = '';
        Alpine.store('numberGuess').history = [];
    } else if (data.gameType === 'hitandblow') {
        gameScreenStore.attemptsInfoText = `色の組み合わせ: ${data.codeLength}色 | 最大試行回数: ${data.maxAttempts}`;
        resetHitAndBlowAlpineState(); // Reset H&B store
    }
    
    // elements.attemptsList.innerHTML = ''; // Replaced by specific store resets or Alpine templates
    // resetColorSelection(); // Replaced by resetHitAndBlowAlpineState for H&B

    showScreen('gameScreen');
    // showGameInterface(data.gameType); // Replaced by Alpine x-show
    // updateTurnDisplay(data.currentPlayer); // Logic integrated into this handler
});

socket.on('moveResult', (data) => {
    console.log('移動結果:', data);
    const gameScreenStore = Alpine.store('gameScreen');
    const numberGuessStore = Alpine.store('numberGuess');
    
    // displayAttempt(data); // Replaced by store updates and Alpine templates
    
    if (data.nextPlayer) {
        const myPlayerMove = gameState.players.find(p => p.id === gameState.playerId);
        // gameState.isMyTurn = myPlayerMove && myPlayerMove.name === data.nextPlayer; // Set in store
        gameScreenStore.isMyTurn = myPlayerMove && myPlayerMove.name === data.nextPlayer;
        gameScreenStore.gameStatusText = `現在のターン: ${data.nextPlayer}`;
        gameScreenStore.gameStatusClass = gameState.isMyTurn ? 'game-status your-turn' : 'game-status opponent-turn';
    }
    
    if (gameScreenStore.currentGameType === 'numberguess') {
        let resultClass = '';
        if (data.result === '正解！') resultClass = 'correct';
        else if (data.result === '大きい') resultClass = 'high';
        else if (data.result === '小さい') resultClass = 'low';
        numberGuessStore.history.push({ player: data.player, guess: data.guess, result: data.result, resultClass: resultClass });
        numberGuessStore.guess = ''; // Reset input field
    } else if (gameScreenStore.currentGameType === 'hitandblow') {
        Alpine.store('hitAndBlow').history.push({ player: data.player, guess: [...data.guess], hit: data.hit, blow: data.blow });
        Alpine.store('hitAndBlow').selectedColors = [null, null, null, null];
        Alpine.store('hitAndBlow').currentColorSlot = 0;
        // resetColorSelection(); // Replaced by individual store property resets
    }
    
    gameScreenStore.attemptsInfoText = `試行回数: ${data.attempts.length}/10`;
});

socket.on('gameEnd', (data) => {
    console.log('ゲーム終了:', data);
    const gameEndStore = Alpine.store('gameEnd');
    
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
    
    gameEndStore.resultHTML = resultHtml;
    gameEndStore.resultClass = resultClass;
    // elements.gameResult.innerHTML = resultHtml; // Replaced by Alpine binding
    // elements.gameResult.className = `game-result ${resultClass}`; // Replaced by Alpine binding
    
    setTimeout(() => {
        showScreen('gameEnd');
    }, 3000);
});

socket.on('newChatMessage', (data) => {
    // displayChatMessage(data); // Replaced by Alpine store update
    Alpine.store('chat').messages.push({ player: data.player, timestamp: data.timestamp, message: data.message });
});

socket.on('newGameReady', (data) => {
    // gameState.players = data.players; // Managed by Alpine store
    if (Alpine.store('gameWaiting')) {
        Alpine.store('gameWaiting').players = data.players;
        Alpine.store('gameWaiting').isReady = false; // Reset ready state for new game
        Alpine.store('gameWaiting').readyButtonText = '準備完了';
    }
    showScreen('gameWaiting');
    // updatePlayersInfo(); // Replaced by Alpine.js
});

socket.on('opponentDisconnected', () => {
    // elements.disconnectNotice.classList.remove('hidden'); // Handled by Alpine store
    if (Alpine.store('modals')) {
        Alpine.store('modals').showDisconnectNotice = true;
    }
});

socket.on('backToGameSelection', () => {
    resetToGameSelection();
});

// イベントリスナー
// マッチメイキング関連
// elements.cancelMatchBtn event listener removed as it's handled by Alpine.js now

// elements.readyBtn event listener removed as it's handled by Alpine.js now in HTML

// Number Guess game event listeners removed (will be handled by Alpine x-on)
// elements.guessBtn.addEventListener('click', () => { makeNumberGuess(); });
// elements.guessInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { makeNumberGuess(); } });

// Hit and Blow event listeners removed (will be handled by Alpine x-on)
// elements.submitColorsBtn.addEventListener('click', () => { submitColors(); });
// document.querySelectorAll('.color-option').forEach(option => { /* ... */ });
// document.querySelectorAll('.color-slot').forEach(slot => { /* ... */ });

// Chat event listeners removed (handled by Alpine x-on in HTML)
// elements.chatSendBtn.addEventListener('click', () => { sendChatMessage(); });
// elements.chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { sendChatMessage(); } });

// Game end screen button event listeners removed (handled by Alpine x-on in HTML)
// elements.newGameBtn.addEventListener('click', () => { socket.emit('newGame'); });
// elements.backToSelectionBtn.addEventListener('click', () => { socket.emit('backToGameSelection'); });
// }); // This closing bracket was mismatched / an error from previous steps, removing it.

// elements.backToSelectionFromDisconnect.addEventListener('click', () => { // Handled by Alpine
//     elements.disconnectNotice.classList.add('hidden');
//     socket.emit('backToGameSelection');
// });

// ヘルパー関数
function startMatchmaking(gameType) {
    // gameState.currentGameType = gameType; // Alpine store is source of truth
    if (Alpine.store('gameScreen')) {
        Alpine.store('gameScreen').currentGameType = gameType;
    }
    const game = gameInfo[gameType];
    if (game) {
        Alpine.store('matchmaking').title = `${game.title} - 対戦相手を探しています`;
        Alpine.store('matchmaking').gameIcon = game.icon;
        Alpine.store('matchmaking').gameTitle = game.title;
        Alpine.store('matchmaking').gameDescription = game.description;
    } else {
        // Reset to default if gameType is invalid, though this case should ideally not happen
        Alpine.store('matchmaking').title = '対戦相手を探しています';
        Alpine.store('matchmaking').gameIcon = '';
        Alpine.store('matchmaking').gameTitle = '';
        Alpine.store('matchmaking').gameDescription = '';
    }
    Alpine.store('matchmaking').waitingText = '対戦相手を待っています... ⏳'; // Reset waiting text

    socket.emit('findMatch', { gameType: gameType });
    showScreen('matchmaking');
}

// function updatePlayersInfo() { // Fully replaced by Alpine.js in gameWaiting screen
// }

// function updateTurnDisplay(currentPlayerName) { // Replaced by direct store updates
//     // Logic moved into socket.on('gameStart') and socket.on('moveResult')
// }

// function enableGameInterface() { // Replaced by Alpine x-bind:disabled
// }

// function disableGameInterface() { // Replaced by Alpine x-bind:disabled
// }

// function makeNumberGuess() { // Replaced by Alpine component method in HTML
//     if (!gameState.isMyTurn) return;
    
//     const guess = parseInt(elements.guessInput.value);
//     if (isNaN(guess) || guess < 1 || guess > 100) {
//         alert('1〜100の数字を入力してください');
//         return;
//     }
    
//     socket.emit('makeMove', { guess: guess });
// }

// Hit and Blow related functions removed (logic moved to Alpine component or store)
// function selectColor(color, element) { /* ... */ }
// function updateColorSlots() { /* ... */ }
// function updateColorSlotHighlight() { /* ... */ }
// function submitColors() { /* ... */ }
// function resetColorSelection() { /* ... */ }

// displayAttempt function is now removed.

// Helper function to reset Hit and Blow Alpine store state
function resetHitAndBlowAlpineState() {
    if (Alpine.store('hitAndBlow')) { // Ensure store exists before using
        Alpine.store('hitAndBlow').selectedColors = [null, null, null, null];
        Alpine.store('hitAndBlow').currentColorSlot = 0;
        Alpine.store('hitAndBlow').history = [];
    }
    // Visual updates like highlighting slots or button states will be reactive via Alpine.
}

// function sendChatMessage() { // Replaced by Alpine component method in HTML
//     const message = elements.chatInput.value.trim();
//     if (message) {
//         socket.emit('chatMessage', { message: message });
//         elements.chatInput.value = '';
//     }
// }

// function displayChatMessage(data) { // Replaced by Alpine store update and template
//     const messageDiv = document.createElement('div');
//     messageDiv.className = 'chat-message';
//     messageDiv.innerHTML = `
//         <div class="chat-message-header">${data.player} - ${data.timestamp}</div>
//         <div class="chat-message-content">${data.message}</div>
//     `;

//     elements.chatMessages.appendChild(messageDiv);
//     elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
// }

function resetToGameSelection() {
    gameState = { // Keep properties not managed by Alpine, or essential for server state tracking
        currentRoom: null,
        playerId: socket.id, // This needs to be consistent
        players: [], // Authoritative list from server
        // isMyTurn: false, // Managed by Alpine.store('gameScreen').isMyTurn
        // currentGameType: null, // Managed by Alpine.store('gameScreen').currentGameType
        // selectedColors: [null, null, null, null], // Managed by Alpine.store('hitAndBlow').selectedColors
        // currentColorSlot: 0 // Managed by Alpine.store('hitAndBlow').currentColorSlot
    };
    
    if (Alpine.store('gameWaiting')) {
        Alpine.store('gameWaiting').isReady = false;
        Alpine.store('gameWaiting').readyButtonText = '準備完了';
        Alpine.store('gameWaiting').players = []; // Clear players on reset
        Alpine.store('gameWaiting').playerId = socket.id; // Ensure playerId is current
    }
    // elements.readyBtn.disabled = false; // Replaced by Alpine state
    // elements.readyBtn.textContent = '準備完了'; // Replaced by Alpine state
    // elements.chatMessages.innerHTML = ''; // Replaced by chat store reset
    if(Alpine.store('chat')) {
        Alpine.store('chat').messages = [];
        Alpine.store('chat').currentMessage = '';
    }
    // resetColorSelection(); // Replaced by specific store resets
    if (Alpine.store('hitAndBlow')) { // Ensure store exists before resetting
        resetHitAndBlowAlpineState();
    }
    if (Alpine.store('numberGuess')) {
        Alpine.store('numberGuess').guess = '';
        Alpine.store('numberGuess').history = [];
    }
    // Reset gameEnd store if needed, though it's mostly set on game end
    if (Alpine.store('gameEnd')) {
        Alpine.store('gameEnd').resultHTML = '';
        Alpine.store('gameEnd').resultClass = '';
    }
    
    showScreen('gameSelection');
}

// 初期化
// Moved getColorCode to be global

document.addEventListener('DOMContentLoaded', () => {
    Alpine.store('matchmaking', {
        title: '対戦相手を探しています',
        gameIcon: '',
        gameTitle: '',
        gameDescription: '',
        waitingText: '対戦相手を待っています... ⏳'
    });

    Alpine.store('gameWaiting', {
        players: [],
        isReady: false,
        readyButtonText: '準備完了',
        playerId: null // Will be set on connect
    });

    Alpine.store('gameScreen', {
        currentGameType: null,
        isMyTurn: false,
        gameStatusText: '',
        attemptsInfoText: '',
        gameStatusClass: 'opponent-turn' // Default class
    });

    Alpine.store('numberGuess', {
        guess: '',
        history: []
    });

    Alpine.store('hitAndBlow', {
        selectedColors: [null, null, null, null],
        currentColorSlot: 0,
        history: []
    });

    Alpine.store('chat', {
        messages: [],
        currentMessage: ''
    });

    Alpine.store('gameEnd', {
        resultHTML: '',
        resultClass: ''
    });

    Alpine.store('modals', {
        showDisconnectNotice: false
    });

    Alpine.effect(() => {
        const ngHistory = Alpine.store('numberGuess').history;
        if (Alpine.store('gameScreen').currentGameType === 'numberguess' && ngHistory.length > 0) {
            setTimeout(() => {
                const listEl = document.getElementById('attemptsList');
                if (listEl) listEl.scrollTop = listEl.scrollHeight;
            }, 0);
        }

        const hbHistory = Alpine.store('hitAndBlow').history;
        if (Alpine.store('gameScreen').currentGameType === 'hitandblow' && hbHistory.length > 0) {
            setTimeout(() => {
                const listEl = document.getElementById('attemptsList');
                if (listEl) listEl.scrollTop = listEl.scrollHeight;
            }, 0);
        }

        const chatMessages = Alpine.store('chat').messages;
        if (chatMessages.length > 0) {
            setTimeout(() => {
                const chatEl = document.getElementById('chatMessages');
                if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
            },0);
        }
    });

    showScreen('gameSelection');
    // resetColorSelection(); // Replaced by store initializations
});
