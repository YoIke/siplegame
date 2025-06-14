// ゲーム設定とDOM要素の管理
export const gameConfig = {
    numberguess: {
        title: '数字当てゲーム',
        icon: '🎯',
        description: '1〜100の数字を当てよう！',
        minValue: 1,
        maxValue: 100
    },
    hitandblow: {
        title: 'ヒットアンドブロー',
        icon: '🌈',
        description: '4つの色の組み合わせを当てよう！',
        colors: ['red', 'blue', 'green', 'yellow', 'pink', 'white'],
        slotCount: 4
    }
};

// DOM要素の安全な取得関数
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found`);
    }
    return element;
}

// DOM要素のキャッシュ（nullチェック付き）
export const elements = {
    connectionStatus: safeGetElement('connectionStatus'),
    gameSelection: safeGetElement('gameSelection'),
    matchmaking: safeGetElement('matchmaking'),
    gameWaiting: safeGetElement('gameWaiting'),
    gameScreen: safeGetElement('gameScreen'),
    gameEnd: safeGetElement('gameEnd'),
    disconnectNotice: safeGetElement('disconnectNotice'),
    
    matchmakingTitle: safeGetElement('matchmakingTitle'),
    selectedGameInfo: safeGetElement('selectedGameInfo'),
    waitingMessage: safeGetElement('waitingMessage'),
    cancelMatchBtn: safeGetElement('cancelMatchBtn'),
    readyBtn: safeGetElement('readyBtn'),
    playersInfo: safeGetElement('playersInfo'),
    
    gameStatus: safeGetElement('gameStatus'),
    attemptsInfo: safeGetElement('attemptsInfo'),
    attemptsList: safeGetElement('attemptsList'),
    
    // 数字当てゲーム
    numberGuessGame: safeGetElement('numberGuessGame'),
    guessInput: safeGetElement('guessInput'),
    guessBtn: safeGetElement('guessBtn'),
    
    // ヒットアンドブロー
    hitAndBlowGame: safeGetElement('hitAndBlowGame'),
    submitColorsBtn: safeGetElement('submitColorsBtn'),
    
    chatMessages: safeGetElement('chatMessages'),
    chatInput: safeGetElement('chatInput'),
    chatSendBtn: safeGetElement('chatSendBtn'),
    
    gameResult: safeGetElement('gameResult'),
    newGameBtn: safeGetElement('newGameBtn'),
    backToSelectionBtn: safeGetElement('backToSelectionBtn'),
    backToSelectionFromDisconnect: safeGetElement('backToSelectionFromDisconnect')
};
