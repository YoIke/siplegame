import { elements, gameConfig } from '../modules/config.js';
import { gameState } from '../modules/gameState.js';

// 数字当てゲームクラス
export class NumberGuessGame {
    constructor() {
        this.config = gameConfig.numberguess;
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (elements.guessBtn) {
            elements.guessBtn.addEventListener('click', () => this.makeGuess());
        }
        if (elements.guessInput) {
            elements.guessInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.makeGuess();
                }
            });
        }
    }

    makeGuess() {
        if (!elements.guessInput) return;
        
        const guess = parseInt(elements.guessInput.value);
        
        if (isNaN(guess) || guess < this.config.minValue || guess > this.config.maxValue) {
            alert(`${this.config.minValue}〜${this.config.maxValue}の数字を入力してください`);
            return;
        }

        // 外部コールバックを呼び出し（Socket.io送信用）
        this.onGuessSubmit(guess);
        elements.guessInput.value = '';
        if (elements.guessInput) elements.guessInput.disabled = true;
        if (elements.guessBtn) elements.guessBtn.disabled = true;
    }

    addAttempt(playerName, guess, result, isOwn = false) {
        if (!elements.attemptsList) return;
        
        const attemptDiv = document.createElement('div');
        attemptDiv.className = `attempt ${isOwn ? 'own-attempt' : 'other-attempt'}`;
        
        let resultText = '';
        if (result === 'correct') {
            resultText = '正解！';
        } else if (result === 'higher') {
            resultText = 'もっと大きい';
        } else if (result === 'lower') {
            resultText = 'もっと小さい';
        }

        attemptDiv.innerHTML = `
            <span class="attempt-player">${playerName}:</span>
            <span class="attempt-guess">${guess}</span>
            <span class="attempt-result">${resultText}</span>
        `;
        
        elements.attemptsList.appendChild(attemptDiv);
    }

    enableInput() {
        if (elements.guessInput) {
            elements.guessInput.disabled = false;
            elements.guessInput.focus();
        }
        if (elements.guessBtn) {
            elements.guessBtn.disabled = false;
        }
    }

    disableInput() {
        if (elements.guessInput) elements.guessInput.disabled = true;
        if (elements.guessBtn) elements.guessBtn.disabled = true;
    }

    reset() {
        if (elements.attemptsList) elements.attemptsList.innerHTML = '';
        if (elements.guessInput) elements.guessInput.value = '';
        this.enableInput();
    }

    // 外部から設定されるコールバック
    onGuessSubmit(guess) {
        console.log('Guess submit callback not set:', guess);
    }
}
