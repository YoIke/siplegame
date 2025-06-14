// DOM要素の管理
class DOMElements {
    constructor() {
        this.elements = {
            connectionStatus: document.getElementById('connectionStatus'),
            header: document.querySelector('header'),
            container: document.querySelector('.container'),
            passwordEntryScreen: document.getElementById('passwordEntryScreen'),
            displayNameInput: document.getElementById('displayNameInput'),
            passwordInput: document.getElementById('passwordInput'),
            submitPasswordBtn: document.getElementById('submitPasswordBtn'),
            passwordError: document.getElementById('passwordError'),
            gameSelection: document.getElementById('gameSelection'),
            gameSelectionMessage: document.getElementById('gameSelectionMessage'), // Added this line
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
    }

    getElement(elementName) {
        return this.elements[elementName];
    }

    // 画面切り替え
    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        this.elements[screenName].classList.remove('hidden');
        
        // ヘッダーとステータスバーの表示/非表示制御
        if (screenName === 'passwordEntryScreen') {
            this.showHeader();
        } else {
            this.hideHeader();
        }
    }

    // ヘッダーを表示
    showHeader() {
        if (this.elements.header) {
            this.elements.header.classList.remove('hidden');
        }
        if (this.elements.connectionStatus) {
            this.elements.connectionStatus.classList.remove('hidden');
        }
        if (this.elements.container) {
            this.elements.container.classList.remove('compact');
        }
    }

    // ヘッダーを非表示
    hideHeader() {
        if (this.elements.header) {
            this.elements.header.classList.add('hidden');
        }
        if (this.elements.connectionStatus) {
            this.elements.connectionStatus.classList.add('hidden');
        }
        if (this.elements.container) {
            this.elements.container.classList.add('compact');
        }
    }

    // ゲームインターフェース切り替え
    showGameInterface(gameType) {
        document.querySelectorAll('.game-interface').forEach(gameInterface => {
            gameInterface.classList.add('hidden');
        });
        
        if (gameType === 'numberguess') {
            this.elements.numberGuessGame.classList.remove('hidden');
        } else if (gameType === 'hitandblow') {
            this.elements.hitAndBlowGame.classList.remove('hidden');
        }
    }
}

// DOMElementsクラスをグローバルに公開
window.DOMElements = DOMElements;

// グローバルなDOMElements インスタンスを作成する関数
window.createDOMElements = function() {
    return new DOMElements();
};
