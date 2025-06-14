import { elements } from './config.js';

// 画面管理クラス
export class ScreenManager {
    static showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        if (elements[screenName] && elements[screenName] !== null) {
            elements[screenName].classList.remove('hidden');
        }
    }

    static showGameInterface(gameType) {
        document.querySelectorAll('.game-interface').forEach(gameInterface => {
            gameInterface.classList.add('hidden');
        });
        
        if (gameType === 'numberguess' && elements.numberGuessGame) {
            elements.numberGuessGame.classList.remove('hidden');
        } else if (gameType === 'hitandblow' && elements.hitAndBlowGame) {
            elements.hitAndBlowGame.classList.remove('hidden');
        }
    }

    static showModal(modalName) {
        if (elements[modalName] && elements[modalName] !== null) {
            elements[modalName].classList.remove('hidden');
        }
    }

    static hideModal(modalName) {
        if (elements[modalName] && elements[modalName] !== null) {
            elements[modalName].classList.add('hidden');
        }
    }
}
