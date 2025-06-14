const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 静的ファイルの配信
app.use(express.static(path.join(__dirname, 'public')));

// ゲームの状態管理
const gameRooms = new Map();
const waitingPlayers = new Map(); // ゲームタイプ別の待機プレイヤー

// ベースゲームルームクラス
class BaseGameRoom {
  constructor(roomId, gameType) {
    this.roomId = roomId;
    this.gameType = gameType;
    this.players = [];
    this.gameState = 'waiting'; // waiting, playing, finished
    this.currentPlayerIndex = 0;
    this.chatMessages = [];
  }

  addPlayer(socket) {
    if (this.players.length < 2) {
      this.players.push({
        socket: socket,
        id: socket.id,
        name: `プレイヤー${this.players.length + 1}`,
        ready: false
      });
      socket.join(this.roomId);
      return true;
    }
    return false;
  }

  removePlayer(socketId) {
    this.players = this.players.filter(player => player.id !== socketId);
    if (this.players.length === 0) {
      return true; // ルーム削除
    }
    return false;
  }

  startGame() {
    if (this.players.length === 2 && this.players.every(p => p.ready)) {
      this.gameState = 'playing';
      this.currentPlayerIndex = 0;
      this.initializeGame();
      return true;
    }
    return false;
  }

  addChatMessage(playerId, message) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      const chatMessage = {
        player: player.name,
        message: message,
        timestamp: new Date().toLocaleTimeString()
      };
      this.chatMessages.push(chatMessage);
      return chatMessage;
    }
    return null;
  }

  // 継承先で実装する抽象メソッド
  initializeGame() { throw new Error('Must implement initializeGame'); }
  makeMove(playerId, moveData) { throw new Error('Must implement makeMove'); }
}

// 数字当てゲームクラス
class NumberGuessRoom extends BaseGameRoom {
  constructor(roomId) {
    super(roomId, 'numberguess');
    this.targetNumber = Math.floor(Math.random() * 100) + 1;
    this.attempts = [];
    this.maxAttempts = 10;
  }

  initializeGame() {
    this.targetNumber = Math.floor(Math.random() * 100) + 1;
    this.attempts = [];
  }

  makeMove(playerId, moveData) {
    if (this.gameState !== 'playing') return null;
    
    const currentPlayer = this.players[this.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return null;

    const guess = parseInt(moveData.guess);
    const attempt = {
      player: currentPlayer.name,
      guess: guess,
      result: this.getHint(guess)
    };

    this.attempts.push(attempt);

    // 正解チェック
    if (guess === this.targetNumber) {
      this.gameState = 'finished';
      return { ...attempt, winner: currentPlayer.name, targetNumber: this.targetNumber };
    }

    // 最大試行回数チェック
    if (this.attempts.length >= this.maxAttempts) {
      this.gameState = 'finished';
      return { ...attempt, draw: true, targetNumber: this.targetNumber };
    }

    // ターン切り替え
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 2;
    return attempt;
  }

  getHint(guess) {
    if (guess === this.targetNumber) return '正解！';
    if (guess < this.targetNumber) return '小さい';
    return '大きい';
  }
}

// ヒットアンドブローゲームクラス
class HitAndBlowRoom extends BaseGameRoom {
  constructor(roomId) {
    super(roomId, 'hitandblow');
    this.targetColors = this.generateTargetColors();
    this.attempts = [];
    this.maxAttempts = 10;
    this.colors = ['red', 'blue', 'green', 'yellow', 'pink', 'white'];
    this.codeLength = 4;
  }

  initializeGame() {
    this.targetColors = this.generateTargetColors();
    this.attempts = [];
  }

  generateTargetColors() {
    const colors = ['red', 'blue', 'green', 'yellow', 'pink', 'white'];
    const target = [];
    const usedColors = new Set();
    
    while (target.length < 4) {
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      if (!usedColors.has(randomColor)) {
        target.push(randomColor);
        usedColors.add(randomColor);
      }
    }
    
    return target;
  }

  makeMove(playerId, moveData) {
    if (this.gameState !== 'playing') return null;
    
    const currentPlayer = this.players[this.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return null;

    const guess = moveData.colors;
    const result = this.calculateHitAndBlow(guess);
    
    const attempt = {
      player: currentPlayer.name,
      guess: guess,
      hit: result.hit,
      blow: result.blow
    };

    this.attempts.push(attempt);

    // 正解チェック（全部Hit）
    if (result.hit === this.codeLength) {
      this.gameState = 'finished';
      return { ...attempt, winner: currentPlayer.name, targetColors: this.targetColors };
    }

    // 最大試行回数チェック
    if (this.attempts.length >= this.maxAttempts) {
      this.gameState = 'finished';
      return { ...attempt, draw: true, targetColors: this.targetColors };
    }

    // ターン切り替え
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 2;
    return attempt;
  }

  calculateHitAndBlow(guess) {
    let hit = 0;
    let blow = 0;
    
    // Hit（位置と色が一致）をカウント
    const targetCopy = [...this.targetColors];
    const guessCopy = [...guess];
    
    for (let i = 0; i < this.codeLength; i++) {
      if (guess[i] === this.targetColors[i]) {
        hit++;
        targetCopy[i] = null;
        guessCopy[i] = null;
      }
    }
    
    // Blow（色は一致するが位置が違う）をカウント
    for (let i = 0; i < this.codeLength; i++) {
      if (guessCopy[i] !== null) {
        const index = targetCopy.indexOf(guessCopy[i]);
        if (index !== -1) {
          blow++;
          targetCopy[index] = null;
        }
      }
    }
    
    return { hit, blow };
  }
}

// Socket.io接続処理
io.on('connection', (socket) => {
  console.log('プレイヤーが接続しました:', socket.id);

  // マッチメイキング（ゲームタイプ指定）
  socket.on('findMatch', (data) => {
    const gameType = data.gameType || 'numberguess';
    
    // 待機中のプレイヤーリストを初期化
    if (!waitingPlayers.has(gameType)) {
      waitingPlayers.set(gameType, []);
    }
    
    const waitingList = waitingPlayers.get(gameType);
    
    // 待機中のプレイヤーがいるかチェック
    if (waitingList.length > 0) {
      const opponent = waitingList.pop();
      const roomId = `${gameType}_${Date.now()}`;
      
      let gameRoom;
      if (gameType === 'numberguess') {
        gameRoom = new NumberGuessRoom(roomId);
      } else if (gameType === 'hitandblow') {
        gameRoom = new HitAndBlowRoom(roomId);
      }
      
      // 両プレイヤーをルームに追加
      gameRoom.addPlayer(opponent);
      gameRoom.addPlayer(socket);
      gameRooms.set(roomId, gameRoom);

      // マッチング成功を通知
      io.to(roomId).emit('matchFound', {
        roomId: roomId,
        gameType: gameType,
        players: gameRoom.players.map(p => ({ id: p.id, name: p.name }))
      });
    } else {
      // 待機リストに追加
      waitingList.push(socket);
      socket.emit('waitingForOpponent', { gameType: gameType });
    }
  });

  // プレイヤー準備完了
  socket.on('playerReady', (data) => {
    const room = findRoomByPlayerId(socket.id);
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.ready = true;
        
        // 全プレイヤーが準備完了かチェック
        if (room.startGame()) {
          const gameStartData = {
            gameType: room.gameType,
            currentPlayer: room.players[room.currentPlayerIndex].name,
            maxAttempts: room.maxAttempts || 10
          };
          
          if (room.gameType === 'numberguess') {
            gameStartData.targetRange = '1〜100';
          } else if (room.gameType === 'hitandblow') {
            gameStartData.colors = room.colors;
            gameStartData.codeLength = room.codeLength;
          }
          
          io.to(room.roomId).emit('gameStart', gameStartData);
        } else {
          io.to(room.roomId).emit('playerReadyUpdate', {
            players: room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready }))
          });
        }
      }
    }
  });

  // ゲーム移動（数字予想 or 色選択）
  socket.on('makeMove', (data) => {
    const room = findRoomByPlayerId(socket.id);
    if (room) {
      const result = room.makeMove(socket.id, data);
      if (result) {
        io.to(room.roomId).emit('moveResult', {
          ...result,
          attempts: room.attempts,
          nextPlayer: room.gameState === 'playing' ? room.players[room.currentPlayerIndex].name : null
        });

        // ゲーム終了チェック
        if (room.gameState === 'finished') {
          setTimeout(() => {
            io.to(room.roomId).emit('gameEnd', {
              winner: result.winner || null,
              draw: result.draw || false,
              targetNumber: result.targetNumber,
              targetColors: result.targetColors
            });
          }, 2000);
        }
      }
    }
  });

  // チャットメッセージ
  socket.on('chatMessage', (data) => {
    const room = findRoomByPlayerId(socket.id);
    if (room) {
      const chatMessage = room.addChatMessage(socket.id, data.message);
      if (chatMessage) {
        io.to(room.roomId).emit('newChatMessage', chatMessage);
      }
    }
  });

  // 新しいゲーム開始
  socket.on('newGame', () => {
    const room = findRoomByPlayerId(socket.id);
    if (room) {
      room.gameState = 'waiting';
      room.players.forEach(p => p.ready = false);
      room.attempts = [];
      room.currentPlayerIndex = 0;
      
      io.to(room.roomId).emit('newGameReady', {
        players: room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready }))
      });
    }
  });

  // ゲーム選択に戻る
  socket.on('backToGameSelection', () => {
    const room = findRoomByPlayerId(socket.id);
    if (room) {
      const shouldDeleteRoom = room.removePlayer(socket.id);
      if (shouldDeleteRoom) {
        gameRooms.delete(room.roomId);
      } else {
        socket.to(room.roomId).emit('opponentDisconnected');
      }
    }
    socket.emit('backToGameSelection');
  });

  // 切断処理
  socket.on('disconnect', () => {
    console.log('プレイヤーが切断しました:', socket.id);
    
    // 待機リストから削除
    for (const [gameType, waitingList] of waitingPlayers.entries()) {
      const index = waitingList.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        waitingList.splice(index, 1);
        break;
      }
    }

    // ゲームルームから削除
    const room = findRoomByPlayerId(socket.id);
    if (room) {
      const shouldDeleteRoom = room.removePlayer(socket.id);
      
      if (shouldDeleteRoom) {
        gameRooms.delete(room.roomId);
      } else {
        // 相手に切断を通知
        socket.to(room.roomId).emit('opponentDisconnected');
      }
    }
  });
});

// ヘルパー関数
function findRoomByPlayerId(playerId) {
  for (const room of gameRooms.values()) {
    if (room.players.some(p => p.id === playerId)) {
      return room;
    }
  }
  return null;
}

// サーバー起動
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`サーバーがポート${PORT}で起動しました`);
});
