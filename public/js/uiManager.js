// UI管理クラス
class UIManager {
    constructor(domElements) {
        this.dom = domElements;
    }

    updateMatchmakingDisplay(data) {
        const game = GAME_INFO[data.gameType];
        this.dom.getElement('matchmakingTitle').textContent = `${game.title} - 対戦相手を探しています`;
        this.dom.getElement('selectedGameInfo').innerHTML = `
            <div style="font-size: 3rem;">${game.icon}</div>
            <h3>${game.title}</h3>
            <p>${game.description}</p>
        `;
    }

    updatePlayersInfo() {
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
        this.dom.getElement('playersInfo').innerHTML = html;
    }

    updateGameStatus(data) {
        this.dom.getElement('gameStatus').textContent = `現在のターン: ${data.currentPlayer}`;
        
        if (data.gameType === 'numberguess') {
            this.dom.getElement('attemptsInfo').textContent = 
                `範囲: ${data.targetRange} | 最大試行回数: ${data.maxAttempts}`;
        } else if (data.gameType === 'hitandblow') {
            this.dom.getElement('attemptsInfo').textContent = 
                `色の組み合わせ: ${data.codeLength}色 | 最大試行回数: ${data.maxAttempts}`;
        }
        
        this.dom.getElement('attemptsList').innerHTML = '';
    }

    updateTurnDisplay(currentPlayerName) {
        const isMyTurn = gameState.updateTurn(currentPlayerName);
        
        if (isMyTurn) {
            this.dom.getElement('gameStatus').className = 'game-status your-turn';
            this.enableGameInterface();
        } else {
            this.dom.getElement('gameStatus').className = 'game-status opponent-turn';
            this.disableGameInterface();
        }
    }

    enableGameInterface() {
        if (gameState.currentGameType === 'numberguess') {
            this.dom.getElement('guessInput').disabled = false;
            this.dom.getElement('guessBtn').disabled = false;
        } else if (gameState.currentGameType === 'hitandblow') {
            this.dom.getElement('submitColorsBtn').disabled = false;
            document.querySelectorAll('.color-option').forEach(opt => opt.style.pointerEvents = 'auto');
            document.querySelectorAll('.color-slot').forEach(slot => slot.style.pointerEvents = 'auto');
        }
    }

    disableGameInterface() {
        if (gameState.currentGameType === 'numberguess') {
            this.dom.getElement('guessInput').disabled = true;
            this.dom.getElement('guessBtn').disabled = true;
        } else if (gameState.currentGameType === 'hitandblow') {
            this.dom.getElement('submitColorsBtn').disabled = true;
            document.querySelectorAll('.color-option').forEach(opt => opt.style.pointerEvents = 'none');
            document.querySelectorAll('.color-slot').forEach(slot => slot.style.pointerEvents = 'none');
        }
    }

    displayAttempt(data) {
        const attemptDiv = document.createElement('div');
        
        if (gameState.currentGameType === 'numberguess') {
            this.displayNumberGuessAttempt(attemptDiv, data);
        } else if (gameState.currentGameType === 'hitandblow') {
            this.displayHitBlowAttempt(attemptDiv, data);
        }
        
        this.dom.getElement('attemptsList').appendChild(attemptDiv);
        this.dom.getElement('attemptsList').scrollTop = this.dom.getElement('attemptsList').scrollHeight;
    }

    displayNumberGuessAttempt(attemptDiv, data) {
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
    }

    displayHitBlowAttempt(attemptDiv, data) {
        attemptDiv.className = 'hit-blow-attempt';
        
        const colorsHtml = data.guess.map(color => 
            `<div class="attempt-color" style="background-color: ${ColorUtils.getColorCode(color)}; ${color === 'white' ? 'border: 2px solid #999;' : ''}"></div>`
        ).join('');
        
        attemptDiv.innerHTML = `
            <div>
                <div class="attempt-player">${data.player}</div>
                <div class="attempt-colors">${colorsHtml}</div>
            </div>
            <div class="attempt-result-hb">
                <div class="hit-count">Hit: ${data.hit}</div>
                <div class="blow-count">Blow: ${data.blow}</div>
            </div>
        `;
    }

    displayGameResult(data) {
        let resultHtml = '';
        let resultClass = '';
        
        if (data.winner) {
            let isWinner = false;
            
            // カードゲームの場合はサーバーから送られるisWinnerフラグを使用
            if (data.isWinner !== undefined) {
                isWinner = data.isWinner;
            } else {
                // 他のゲーム（数字当て、ヒットアンドブロー）の場合は従来の方式
                const myPlayerName = gameState.getMyPlayerName();
                isWinner = data.winner === myPlayerName;
            }
            
            if (isWinner) {
                resultHtml = this.getWinnerResultHtml(data);
                resultClass = 'winner';
            } else {
                resultHtml = this.getLoserResultHtml(data);
                resultClass = 'loser';
            }
        } else if (data.draw) {
            resultHtml = this.getDrawResultHtml(data);
            resultClass = 'draw';
        }
        
        this.dom.getElement('gameResult').innerHTML = resultHtml;
        this.dom.getElement('gameResult').className = `game-result ${resultClass}`;
    }

    getWinnerResultHtml(data) {
        return `
            <div class="result-title">🎉 勝利！</div>
            <div class="result-details">
                ${data.targetNumber ? `正解は ${data.targetNumber} でした！` : ''}
                ${data.targetColors ? `正解は ${ColorUtils.getColorDisplay(data.targetColors)} でした！` : ''}
            </div>
        `;
    }

    getLoserResultHtml(data) {
        return `
            <div class="result-title">😢 敗北</div>
            <div class="result-details">
                ${data.winner} の勝利！
                ${data.targetNumber ? `正解は ${data.targetNumber} でした。` : ''}
                ${data.targetColors ? `正解は ${ColorUtils.getColorDisplay(data.targetColors)} でした。` : ''}
            </div>
        `;
    }

    getDrawResultHtml(data) {
        return `
            <div class="result-title">📝 引き分け</div>
            <div class="result-details">
                誰も正解できませんでした。
                ${data.targetNumber ? `正解は ${data.targetNumber} でした。` : ''}
                ${data.targetColors ? `正解は ${ColorUtils.getColorDisplay(data.targetColors)} でした。` : ''}
            </div>
        `;
    }

    resetInterface(preserveChat = false) {
        console.log('UIManager.resetInterface called with preserveChat:', preserveChat);
        const readyBtn = this.dom.getElement('readyBtn');
        if (readyBtn) {
            readyBtn.disabled = false;
            readyBtn.textContent = '準備完了';
            console.log('Ready button reset to enabled state');
        } else {
            console.warn('Ready button element not found');
        }
        
        // チャット履歴を保持するかどうかを制御
        if (!preserveChat) {
            console.log('Clearing chat messages as preserveChat=false');
            this.dom.getElement('chatMessages').innerHTML = '';
        } else {
            console.log('Preserving chat messages as preserveChat=true');
        }
    }

    // Password related methods
    getPasswordValue() {
        return this.dom.getElement('passwordInput').value;
    }

    displayPasswordError(message) {
        this.dom.getElement('passwordError').textContent = message;
    }

    clearPasswordError() {
        this.dom.getElement('passwordError').textContent = '';
    }

    showWaitingForPasswordMatch(password) {
        this.dom.showScreen('matchmaking');
        this.dom.getElement('matchmakingTitle').textContent = `「${password}」で対戦相手を探しています`;
        this.dom.getElement('selectedGameInfo').innerHTML = '<p>同じあいことばのプレイヤーを待っています...</p>';
    }

    displayMessageAboveGameCards(message) {
        const messageElement = this.dom.getElement('gameSelectionMessage');
        if (messageElement) {
            messageElement.textContent = message || ''; // Clear if message is empty or null
        } else {
            console.warn('gameSelectionMessage element not found in DOMElements');
        }
    }

    // ゲーム選択確認モーダルを表示
    showGameSelectionConfirm(data) {
        const gameInfo = GAME_INFO[data.gameType];
        this.dom.getElement('selectedGameName').textContent = gameInfo.title;
        // ゲームタイプをモーダル要素にデータ属性として保存
        this.dom.getElement('gameSelectionConfirm').dataset.gameType = data.gameType;
        this.dom.getElement('gameSelectionConfirm').classList.remove('hidden');
        
        // ゲーム選択画面にメッセージを表示
        this.displayMessageAboveGameCards(`相手が「${gameInfo.title}」を選択しています...`);
    }

    // ゲーム選択拒否時の処理
    showGameSelectionRejected(data) {
        const gameInfo = GAME_INFO[data.gameType];
        this.displayMessageAboveGameCards(`「${gameInfo.title}」が拒否されました。別のゲームを選択してください。`);
        
        // 確認モーダルを隠す
        this.dom.getElement('gameSelectionConfirm').classList.add('hidden');
    }

    // 確認モーダルを隠す
    hideGameSelectionConfirm() {
        this.dom.getElement('gameSelectionConfirm').classList.add('hidden');
    }

    // フローティングチャットアイコンの表示制御
    showFloatingChatIcon() {
        if (window.app && window.app.chatManager) {
            window.app.chatManager.showFloatingIcon();
        }
    }

    hideFloatingChatIcon() {
        if (window.app && window.app.chatManager) {
            window.app.chatManager.hideFloatingIcon();
        }
    }
}

// UIManagerクラスをエクスポート
window.UIManager = UIManager;
