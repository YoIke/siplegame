// ヒットアンドブロー専用クラス
class HitAndBlowGame {
    constructor(domElements) {
        this.dom = domElements;
    }

    initialize() {
        gameState.resetColorSelection();
        this.updateColorSlots();
        this.updateColorSlotHighlight();
        this.dom.getElement('submitColorsBtn').disabled = true;
    }

    selectColor(color) {
        if (!gameState.isMyTurn) return;
        
        gameState.selectColor(color);
        this.updateColorSlots();
        this.updateColorSlotHighlight();
    }

    updateColorSlots() {
        gameState.selectedColors.forEach((color, index) => {
            const slot = document.querySelector(`[data-slot="${index}"]`);
            if (color) {
                slot.style.backgroundColor = ColorUtils.getColorCode(color);
                slot.classList.add('filled');
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
        
        const allSelected = gameState.areAllColorsSelected();
        this.dom.getElement('submitColorsBtn').disabled = !allSelected;
    }

    updateColorSlotHighlight() {
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

    submitColors() {
        if (!gameState.isMyTurn) return;
        
        if (!gameState.areAllColorsSelected()) {
            alert('4つの色をすべて選択してください');
            return;
        }
        
        // socketManagerの参照はグローバルから取得
        if (window.app && window.app.socketManager) {
            window.app.socketManager.makeMove({ colors: gameState.getSelectedColors() });
        }
    }

    setCurrentSlot(slotIndex) {
        gameState.setCurrentColorSlot(slotIndex);
        this.updateColorSlotHighlight();
    }

    setupEventListeners() {
        this.dom.getElement('submitColorsBtn').addEventListener('click', () => {
            this.submitColors();
        });

        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectColor(option.dataset.color);
            });
        });

        document.querySelectorAll('.color-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                const slotIndex = parseInt(slot.dataset.slot);
                this.setCurrentSlot(slotIndex);
            });
        });
    }
}

// HitAndBlowGameクラスをエクスポート
window.HitAndBlowGame = HitAndBlowGame;
