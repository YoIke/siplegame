// ゲーム情報定数
const GAME_INFO = {
    numberguess: {
        title: '数字当てゲーム',
        icon: '🎯',
        description: '1〜100の数字を当てよう！'
    },
    hitandblow: {
        title: 'ヒットアンドブロー',
        icon: '🌈',
        description: '4つの色の組み合わせを当てよう！'
    },
    cardgame: {
        title: 'クイックデュエル',
        icon: '🃏',
        description: '戦略カードゲーム！'
    }
};

// 色関連のヘルパー関数
const ColorUtils = {
    getColorCode(colorName) {
        const colorMap = {
            red: '#ff4444',
            blue: '#4444ff',
            green: '#44ff44',
            yellow: '#ffff44',
            pink: '#ff44ff',
            white: '#ffffff'
        };
        return colorMap[colorName] || '#ccc';
    },

    getColorDisplay(colors) {
        return colors.map(color => 
            `<span style="color: ${this.getColorCode(color)};">●</span>`
        ).join(' ');
    }
};

window.GAME_INFO = GAME_INFO;
window.ColorUtils = ColorUtils;
