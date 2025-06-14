import { elements, gameConfig } from '../modules/config.js';
import { gameState } from '../modules/gameState.js';

// ヒットアンドブローゲームクラス  
export class HitAndBlowGame {
    constructor() {
        this.config = gameConfig.hitandblow;
        this.setupEventListeners();
        this.setupColorPalette();
    }

    setupColorPalette() {
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                const color = option.dataset.color;
                this.selectColor(color);
            });
        });

        const colorSlots = document.querySelectorAll('.color-slot');
        colorSlots.forEach((slot, index) => {
            slot.addEventListener('click', () => {
                gameState.currentColorSlot = index;
                this.updateSlotSelection();
            });
        });
    }

    setupEventListeners() {
        elements.submitColorsBtn.addEventListener('click', () => this.submitColors());
    }

    selectColor(color) {
        if (gameState.currentColorSlot < this.config.slotCount) {
            gameState.selectedColors[gameState.currentColorSlot] = color;
            this.updateColorDisplay();
            
            // 次のスロットに移動
            if (gameState.currentColorSlot < this.config.slotCount - 1) {
                gameState.currentColorSlot++;
                this.updateSlotSelection();
            }
        }
    }
    updateColorDisplay() {
        const colorSlots = document.querySelectorAll('.color-slot');
        gameState.selectedColors.forEach((color, index) => {
            const slot = colorSlots[index];
            if (color) {
                slot.style.backgroundColor = this.getColorCode(color);
                slot.style.border = '2px solid #333';
            } else {
                slot.style.backgroundColor = '#f0f0f0';
                slot.style.border = '2px solid #ccc';
            }
        });
    }

    updateSlotSelection() {
        const colorSlots = document.querySelectorAll('.color-slot');
        colorSlots.forEach((slot, index) => {
            if (index === gameState.currentColorSlot) {
                slot.classList.add('selected');
            } else {
                slot.classList.remove('selected');
            }
        });
    }

    getColorCode(colorName) {
        const colorMap = {
            red: '#ff4444',
            blue: '#4444ff', 
            green: '#44ff44',
            yellow: '#ffff44',
            pink: '#ff44ff',
            white: '#ffffff'
        };
        return colorMap[colorName] || '#f0f0f0';
    }

    submitColors() {
        const selectedCount = gameState.selectedColors.filter(c => c !== null).length;
        if (selectedCount !== this.config.slotCount) {
            alert(`${this.config.slotCount}つの色を選択してください`);
            return;
        }

        // 外部コールバックを呼び出し
        this.onColorsSubmit([...gameState.selectedColors]);
        this.disableInput();
    }
    addAttempt(playerName, colors, hit, blow, isOwn = false) {
        const attemptDiv = document.createElement('div');
        attemptDiv.className = `attempt ${isOwn ? 'own-attempt' : 'other-attempt'}`;
        
        const colorDivs = colors.map(color => 
            `<div class="attempt-color" style="background-color: ${this.getColorCode(color)};"></div>`
        ).join('');

        attemptDiv.innerHTML = `
            <span class="attempt-player">${playerName}:</span>
            <div class="attempt-colors">${colorDivs}</div>
            <span class="attempt-result">Hit: ${hit}, Blow: ${blow}</span>
        `;
        
        elements.attemptsList.appendChild(attemptDiv);
    }

    enableInput() {
        elements.submitColorsBtn.disabled = false;
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(option => option.style.pointerEvents = 'auto');
    }

    disableInput() {
        elements.submitColorsBtn.disabled = true;
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(option => option.style.pointerEvents = 'none');
    }

    reset() {
        elements.attemptsList.innerHTML = '';
        gameState.selectedColors = [null, null, null, null];
        gameState.currentColorSlot = 0;
        this.updateColorDisplay();
        this.updateSlotSelection();
        this.enableInput();
    }

    // 外部から設定されるコールバック
    onColorsSubmit(colors) {
        console.log('Colors submit callback not set:', colors);
    }
}
