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
const waitingPlayers = [];

// ゲームルームクラス
class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = [];
    this.gameState = 'waiting'; // waiting, playing, finished
    this.currentPlayerIndex = 0;
    this.targetNumber = Math.floor(Math.random() * 100) + 1; // 1-100の数字
    this.attempts = [];
    this.chatMessages = [];
    this.maxAttempts = 10;
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
      this.targetNumber = Math.floor(Math.random() * 100) + 1;
      this.attempts = [];
      return true;
    }
    return false;
  }

  makeGuess(playerId, guess) {
    if (this.gameState !== 'playing') return null;
    
    const currentPlayer = this.players[this.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return null;

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
}

// Socket.io接続処理
io.on('connection', (socket) => {
  console.log('プレイヤーが接続しました:', socket.id);

  // マッチメイキング
  socket.on('findMatch', () => {
    // 待機中のプレイヤーがいるかチェック
    if (waitingPlayers.length > 0) {
      const opponent = waitingPlayers.pop();
      const roomId = `room_${Date.now()}`;
      const gameRoom = new GameRoom(roomId);
      
      // 両プレイヤーをルームに追加
      gameRoom.addPlayer(opponent);
      gameRoom.addPlayer(socket);
      gameRooms.set(roomId, gameRoom);

      // マッチング成功を通知
      io.to(roomId).emit('matchFound', {
        roomId: roomId,
        players: gameRoom.players.map(p => ({ id: p.id, name: p.name }))
      });
    } else {
      // 待機リストに追加
      waitingPlayers.push(socket);
      socket.emit('waitingForOpponent');
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
          io.to(room.roomId).emit('gameStart', {
            currentPlayer: room.players[room.currentPlayerIndex].name,
            targetRange: '1〜100',
            maxAttempts: room.maxAttempts
          });
        } else {
          io.to(room.roomId).emit('playerReadyUpdate', {
            players: room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready }))
          });
        }
      }
    }
  });

  // 数字予想
  socket.on('makeGuess', (data) => {
    const room = findRoomByPlayerId(socket.id);
    if (room) {
      const result = room.makeGuess(socket.id, parseInt(data.guess));
      if (result) {
        io.to(room.roomId).emit('guessResult', {
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
              targetNumber: result.targetNumber
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

  // 切断処理
  socket.on('disconnect', () => {
    console.log('プレイヤーが切断しました:', socket.id);
    
    // 待機リストから削除
    const waitingIndex = waitingPlayers.findIndex(p => p.id === socket.id);
    if (waitingIndex !== -1) {
      waitingPlayers.splice(waitingIndex, 1);
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
