// This module will handle all socket.io event listeners.

// Dependencies will be passed from server.js
let gameRooms; // Map of active game rooms, will be initialized by server.js
let waitingPlayers; // Map of players waiting for a match, will be initialized by server.js
let NumberGuessRoom; // Class, will be initialized by server.js
let HitAndBlowRoom; // Class, will be initialized by server.js

// Helper function (needs access to gameRooms)
function findRoomByPlayerId(playerId) {
  if (!gameRooms) return null; // Guard against gameRooms not being initialized
  for (const room of gameRooms.values()) {
    if (room.players.some(p => p.id === playerId)) {
      return room;
    }
  }
  return null;
}

function initializeSocketHandlers(ioInstance, localGameRooms, localWaitingPlayers, numGuessClass, hnBClass) {
  gameRooms = localGameRooms;
  waitingPlayers = localWaitingPlayers;
  NumberGuessRoom = numGuessClass;
  HitAndBlowRoom = hnBClass;
  const io = ioInstance; // Use the passed io instance

  io.on('connection', (socket) => {
    console.log('プレイヤーが接続しました (from socketHandlers):', socket.id);

    // マッチメイキング（ゲームタイプ指定）
    socket.on('findMatch', (data) => {
      const gameType = data.gameType || 'numberguess';

      if (!waitingPlayers.has(gameType)) {
        waitingPlayers.set(gameType, []);
      }

      const waitingList = waitingPlayers.get(gameType);

      if (waitingList.length > 0) {
        const opponent = waitingList.pop();
        const roomId = `${gameType}_${Date.now()}`;

        let gameRoom;
        if (gameType === 'numberguess') {
          gameRoom = new NumberGuessRoom(roomId);
        } else if (gameType === 'hitandblow') {
          gameRoom = new HitAndBlowRoom(roomId);
        }

        gameRoom.addPlayer(opponent);
        gameRoom.addPlayer(socket);
        gameRooms.set(roomId, gameRoom);

        io.to(roomId).emit('matchFound', {
          roomId: roomId,
          gameType: gameType,
          players: gameRoom.players.map(p => ({ id: p.id, name: p.name }))
        });
      } else {
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
      console.log('プレイヤーが切断しました (from socketHandlers):', socket.id);

      for (const [gameType, waitingList] of waitingPlayers.entries()) {
        const index = waitingList.findIndex(p => p.id === socket.id);
        if (index !== -1) {
          waitingList.splice(index, 1);
          break;
        }
      }

      const room = findRoomByPlayerId(socket.id);
      if (room) {
        const shouldDeleteRoom = room.removePlayer(socket.id);

        if (shouldDeleteRoom) {
          gameRooms.delete(room.roomId);
        } else {
          socket.to(room.roomId).emit('opponentDisconnected');
        }
      }
    });
  });
}

module.exports = initializeSocketHandlers;
