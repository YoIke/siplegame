// 数字当てゲーム専用クラス
class NumberGuessGame {
    constructor(domElements) {
        this.dom = domElements;
    }

    initialize() {
        this.dom.getElement('guessInput').value = '';
        this.dom.getElement('guessInput').disabled = !gameState.isMyTurn;
        this.dom.getElement('guessBtn').disabled = !gameState.isMyTurn;
    }

    makeGuess() {
        if (!gameState.isMyTurn) return;
        
        const guess = parseInt(this.dom.getElement('guessInput').value);
        if (isNaN(guess) || guess < 1 || guess > 100) {
            alert('1〜100の数字を入力してください');
            return;
        }
        
        // socketManagerの参照はグローバルから取得
        if (window.app && window.app.socketManager) {
            window.app.socketManager.makeMove({ guess: guess });
        }
    }

    clearInput() {
        this.dom.getElement('guessInput').value = '';
    }

    setupEventListeners() {
        this.dom.getElement('guessBtn').addEventListener('click', () => {
            this.makeGuess();
        });

        this.dom.getElement('guessInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.makeGuess();
            }
        });
    }
}

// NumberGuessGameクラスをエクスポート
window.NumberGuessGame = NumberGuessGame;
