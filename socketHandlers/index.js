// This module will handle all socket.io event listeners.

// Dependencies will be passed from server.js
let gameRooms; // Map of active game rooms, will be initialized by server.js
let waitingPlayers; // Map of players waiting for a match, will be initialized by server.js
let NumberGuessRoom; // Class, will be initialized by server.js
let HitAndBlowRoom; // Class, will be initialized by server.js
let CardGameRoom; // Class, will be initialized by server.js

// Helper function to find room by player ID (checks both gameRooms and waitingPlayers)
function findRoomByPlayerId(playerId) {
  if (!gameRooms) return null; // Guard against gameRooms not being initialized
  
  // Check active game rooms first
  for (const room of gameRooms.values()) {
    if (room.players.some(p => p.id === playerId)) {
      return room;
    }
  }
  
  // Check waiting players (for password-matched players who haven't started a game yet)
  for (const entry of waitingPlayers.values()) {
    if (entry.sockets.some(s => s.id === playerId)) {
      return {
        roomId: entry.roomId,
        players: entry.playersInfo,
        isWaitingRoom: true, // フラグを追加して待機ルームであることを示す
        addChatMessage: function(playerId, message) {
          // 待機ルーム用のチャットメッセージ処理
          const player = this.players.find(p => p.id === playerId);
          if (player) {
            return {
              player: player.name,
              message: message,
              timestamp: new Date().toLocaleTimeString()
            };
          }
          return null;
        }
      };
    }
  }
  
  return null;
}

function initializeSocketHandlers(ioInstance, localGameRooms, localWaitingPlayers, numGuessClass, hnBClass, cardGameClass) {
  gameRooms = localGameRooms;
  waitingPlayers = localWaitingPlayers;
  NumberGuessRoom = numGuessClass;
  HitAndBlowRoom = hnBClass;
  CardGameRoom = cardGameClass;
  const io = ioInstance; // Use the passed io instance

  io.on('connection', (socket) => {
    console.log('プレイヤーが接続しました (from socketHandlers):', socket.id);

    // // マッチメイキング（ゲームタイプ指定） - 旧ロジック、コメントアウト
    // socket.on('findMatch', (data) => {
    //   const gameType = data.gameType || 'numberguess';
    //   if (!waitingPlayers.has(gameType)) {
    //     waitingPlayers.set(gameType, []);
    //   }
    //   const waitingList = waitingPlayers.get(gameType);
    //   if (waitingList.length > 0) {
    //     const opponent = waitingList.pop();
    //     const roomId = `${gameType}_${Date.now()}`;
    //     let gameRoom;
    //     if (gameType === 'numberguess') {
    //       gameRoom = new NumberGuessRoom(roomId);
    //     } else if (gameType === 'hitandblow') {
    //       gameRoom = new HitAndBlowRoom(roomId);
    //     }
    //     gameRoom.addPlayer(opponent);
    //     gameRoom.addPlayer(socket);
    //     gameRooms.set(roomId, gameRoom);
    //     io.to(roomId).emit('matchFound', {
    //       roomId: roomId,
    //       gameType: gameType,
    //       players: gameRoom.players.map(p => ({ id: p.id, name: p.name }))
    //     });
    //   } else {
    //     waitingList.push(socket);
    //     socket.emit('waitingForOpponent', { gameType: gameType });
    //   }
    // });

    socket.on('matchByPassword', (data) => {
      const { password, displayName } = data;
      if (!password) {
        socket.emit('error', { message: 'Password is required.' });
        return;
      }
      
      if (!displayName) {
        socket.emit('error', { message: 'Display name is required.' });
        return;
      }

      if (!waitingPlayers.has(password)) {
        // New password entry
        const roomId = `room_${password}_${Date.now()}`;
        
        // プレイヤーをSocket.IOルームに参加させる
        socket.join(roomId);
        console.log(`[matchByPassword] Player ${socket.id} joined Socket.IO room ${roomId}`);
        
        waitingPlayers.set(password, {
          sockets: [socket],
          roomId: roomId,
          gameType: null, // Game type not selected yet
          playersInfo: [{ id: socket.id, name: displayName, ready: false }]
        });
        console.log(`[matchByPassword] New room created for password "${password}", room ID: ${roomId}, player: ${socket.id}, name: ${displayName}`);
        socket.emit('waitingForPasswordMatch', { password: password, roomId: roomId });
      } else {
        // Password entry exists
        const passwordEntry = waitingPlayers.get(password);

        if (passwordEntry.sockets.some(s => s.id === socket.id)) {
          console.warn(`[matchByPassword] Player ${socket.id} already in room for password "${password}".`);
          // プレイヤーを再度ルームに参加させる（再接続の場合）
          socket.join(passwordEntry.roomId);
          console.log(`[matchByPassword] Player ${socket.id} rejoined Socket.IO room ${passwordEntry.roomId}`);
          
          // Potentially re-emit success if they are already matched or waiting state
          if (passwordEntry.sockets.length === 1) {
            socket.emit('waitingForPasswordMatch', { password: password, roomId: passwordEntry.roomId });
          } else if (passwordEntry.sockets.length === 2) {
             // If already matched, re-send match found to this specific socket.
             // This handles cases where a client might disconnect and reconnect with the same password.
            const otherPlayerSocket = passwordEntry.sockets.find(s => s.id !== socket.id);
            if (otherPlayerSocket) { // Ensure the other player still exists
                 socket.emit('matchFound', { // Emitting 'matchFound' as per client expectation after password match
                    roomId: passwordEntry.roomId,
                    players: passwordEntry.playersInfo,
                    // No gameType here, game selection will follow
                 });
            } else { // Other player disconnected, treat as new entry
                passwordEntry.sockets = [socket];
                passwordEntry.playersInfo = [{ id: socket.id, name: displayName, ready: false }];
                passwordEntry.gameType = null; // Reset gameType if any
                console.log(`[matchByPassword] Room for password "${password}" had only one disconnected player. Resetting for ${socket.id}.`);
                socket.emit('waitingForPasswordMatch', { password: password, roomId: passwordEntry.roomId });
            }
          }
          return;
        }


        if (passwordEntry.sockets.length === 1) {
          // Second player joins
          passwordEntry.sockets.push(socket);
          passwordEntry.playersInfo.push({ id: socket.id, name: displayName, ready: false });

          // 第2プレイヤーをSocket.IOルームに参加させる
          socket.join(passwordEntry.roomId);
          console.log(`[matchByPassword] Player ${socket.id} joined Socket.IO room ${passwordEntry.roomId}`);

          console.log(`[matchByPassword] Player ${socket.id} joined room for password "${password}". Room ID: ${passwordEntry.roomId}. Notifying both players.`);

          // Emit 'matchFound' (as expected by client logic after password match)
          // This signals that two players are connected by password and should proceed to game selection.
          passwordEntry.sockets.forEach(s => {
            s.emit('matchFound', { // Changed from 'passwordMatchSuccess' to 'matchFound'
              roomId: passwordEntry.roomId,
              players: passwordEntry.playersInfo,
              // No gameType here, game selection will follow on client-side
            });
          });
        } else {
          // Room is full (already 2 players)
          console.log(`[matchByPassword] Room for password "${password}" is full. Rejecting player ${socket.id}.`);
          socket.emit('passwordRoomFull', { password: password });
        }
      }
    });

    socket.on('selectGame', (data) => {
      const { gameType, roomId } = data;
      const playerSocket = socket;

      console.log(`[selectGame] Player ${playerSocket.id} selected game ${gameType} for room ${roomId}`);

      // Find the original password entry if needed, or rely on roomId for GameRoom creation.
      // For now, we assume roomId is sufficient to manage/create the GameRoom.
      // Let's find the password entry to update its gameType and player list.
      let passwordEntry = null;
      for (const entry of waitingPlayers.values()) {
        if (entry.roomId === roomId) {
          passwordEntry = entry;
          break;
        }
      }

      if (!passwordEntry) {
        console.error(`[selectGame] No password entry found for room ID ${roomId}. Cannot start game.`);
        playerSocket.emit('error', { message: `Room ${roomId} not found or not ready for game selection.` });
        return;
      }

      if (passwordEntry.sockets.length !== 2) {
        console.error(`[selectGame] Room ${roomId} does not have 2 players. Current: ${passwordEntry.sockets.length}`);
        playerSocket.emit('error', { message: `Room ${roomId} is not full. Cannot start game.`});
        return;
      }

      // Check if a game is already selected or running for this room ID in gameRooms
      if (gameRooms.has(roomId)) {
          const existingRoom = gameRooms.get(roomId);
          // If a game exists and this player is part of it, perhaps they are trying to change game?
          // Or this is a redundant call. For now, let's assume if a game room exists, we don't recreate.
          console.warn(`[selectGame] Game room ${roomId} already exists with game type ${existingRoom.gameType}. Current selection: ${gameType}.`);
          // Potentially emit an error or current game state.
          // For now, let's just prevent re-initialization if game is same or already started.
          if (existingRoom.gameType === gameType && existingRoom.gameState !== 'finished') {
            // If same game and not finished, maybe just re-send game info
            // This case needs careful thought for production.
            // For now, avoid re-creating.
             console.log(`[selectGame] Game ${gameType} already set up for room ${roomId}.`);
             // Re-send matchFound to ensure client is on the right screen (gameWaiting)
              passwordEntry.sockets.forEach(s => {
                s.emit('matchFound', {
                  roomId: passwordEntry.roomId,
                  players: passwordEntry.playersInfo,
                  gameType: gameType // Now include gameType
                });
              });
            return;
          } else if (existingRoom.gameType !== gameType && existingRoom.gameState !== 'finished') {
            // Trying to select a different game while one is active.
            playerSocket.emit('error', {message: `Another game (${existingRoom.gameType}) is already active in this room.`});
            return;
          }
          // If game is finished, it's okay to select a new one, existing room will be replaced.
      }

      // 相手プレイヤーに確認を要求
      const otherPlayerSocket = passwordEntry.sockets.find(s => s.id !== playerSocket.id);
      if (otherPlayerSocket) {
        console.log(`[selectGame] Sending game selection request to opponent ${otherPlayerSocket.id}`);
        otherPlayerSocket.emit('gameSelectionRequest', {
          gameType: gameType,
          roomId: roomId,
          requesterName: passwordEntry.playersInfo.find(p => p.id === playerSocket.id)?.name || 'Unknown'
        });
      } else {
        console.error(`[selectGame] Could not find opponent socket for room ${roomId}`);
        playerSocket.emit('error', { message: 'Opponent not found.' });
      }
    });

    // ゲーム選択確認の応答
    socket.on('gameSelectionResponse', (data) => {
      const { gameType, roomId, accepted } = data;
      const responderSocket = socket;

      console.log(`[gameSelectionResponse] Player ${responderSocket.id} ${accepted ? 'accepted' : 'rejected'} game ${gameType} for room ${roomId}`);

      let passwordEntry = null;
      for (const entry of waitingPlayers.values()) {
        if (entry.roomId === roomId) {
          passwordEntry = entry;
          break;
        }
      }

      if (!passwordEntry) {
        console.error(`[gameSelectionResponse] No password entry found for room ID ${roomId}`);
        return;
      }

      const requesterSocket = passwordEntry.sockets.find(s => s.id !== responderSocket.id);
      if (!requesterSocket) {
        console.error(`[gameSelectionResponse] Could not find requester socket for room ${roomId}`);
        return;
      }

      if (!accepted) {
        // ゲーム選択が拒否された場合
        console.log(`[gameSelectionResponse] Game ${gameType} rejected in room ${roomId}`);
        requesterSocket.emit('gameSelectionRejected', {
          gameType: gameType,
          roomId: roomId,
          rejectorName: passwordEntry.playersInfo.find(p => p.id === responderSocket.id)?.name || 'Unknown'
        });
        return;
      }

      // ゲーム選択が承認された場合、ゲームルームを作成
      console.log(`[gameSelectionResponse] Game ${gameType} accepted in room ${roomId}. Creating game room.`);

      // Check if a game is already selected or running for this room ID in gameRooms
      if (gameRooms.has(roomId)) {
          const existingRoom = gameRooms.get(roomId);
          console.warn(`[gameSelectionResponse] Game room ${roomId} already exists with game type ${existingRoom.gameType}. Current selection: ${gameType}.`);
          if (existingRoom.gameType === gameType && existingRoom.gameState !== 'finished') {
            console.log(`[gameSelectionResponse] Game ${gameType} already set up for room ${roomId}.`);
            passwordEntry.sockets.forEach(s => {
              s.emit('matchFound', {
                roomId: passwordEntry.roomId,
                players: passwordEntry.playersInfo,
                gameType: gameType // Now include gameType
              });
            });
            return;
          } else if (existingRoom.gameType !== gameType && existingRoom.gameState !== 'finished') {
            requesterSocket.emit('error', {message: `Another game (${existingRoom.gameType}) is already active in this room.`});
            return;
          }
      }

      passwordEntry.gameType = gameType; // Set the game type in the password entry

      let gameRoomInstance;
      if (gameType === 'numberguess') {
        gameRoomInstance = new NumberGuessRoom(roomId);
      } else if (gameType === 'hitandblow') {
        gameRoomInstance = new HitAndBlowRoom(roomId);
      } else if (gameType === 'cardgame') {
        gameRoomInstance = new CardGameRoom(roomId);
      } else {
        console.error(`[gameSelectionResponse] Unknown game type: ${gameType}`);
        requesterSocket.emit('error', { message: `Unknown game type: ${gameType}`});
        return;
      }

      gameRoomInstance.isPasswordRoom = true; // Mark as a password-matched room

      // Add players from passwordEntry.playersInfo to the gameRoomInstance
      passwordEntry.playersInfo.forEach(pInfo => {
        const pSocket = passwordEntry.sockets.find(s => s.id === pInfo.id);
        if (pSocket) {
          gameRoomInstance.addPlayer(pSocket, pInfo.name); // Pass name if BaseGameRoom supports it
        }
      });

      // Ensure players in gameRoomInstance have ready state false
      gameRoomInstance.players.forEach(p => p.ready = false);

      gameRooms.set(roomId, gameRoomInstance);
      console.log(`[gameSelectionResponse] Game room ${roomId} created with game ${gameType}. Players:`, gameRoomInstance.players.map(p=>p.name));

      // Notify both players that the game is selected and they should move to the gameWaiting screen
      passwordEntry.sockets.forEach(s => {
        console.log(`[gameSelectionResponse] Emitting matchFound to player ${s.id}`);
        s.emit('matchFound', {
          roomId: roomId,
          players: gameRoomInstance.players.map(p => ({ id: p.id, name: p.name, ready: p.ready })),
          gameType: gameType // Crucially, gameType is now included
        });
      });
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
            } else if (room.gameType === 'cardgame') {
              // カードゲーム開始時は各プレイヤーに個別情報を送信
              room.players.forEach(player => {
                const playerSocket = io.sockets.sockets.get(player.id);
                if (playerSocket) {
                  const playerGameState = room.getPlayerGameState(player.id);
                  playerSocket.emit('gameStart', {
                    ...gameStartData,
                    ...playerGameState
                  });
                }
              });
              return; // 個別送信したので共通送信はスキップ
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

    // ゲーム移動（数字予想 or 色選択 or カード操作）
    socket.on('makeMove', (data) => {
      const room = findRoomByPlayerId(socket.id);
      if (room) {
        const result = room.makeMove(socket.id, data);
        if (result) {
          if (room.gameType === 'cardgame') {
            // カードゲーム専用の処理
            if (result.error) {
              // エラーの場合は送信者のみに送る
              socket.emit('moveError', result);
            } else {
              // 成功の場合は全員に結果を送信
              io.to(room.roomId).emit('moveResult', result);
              
              // 各プレイヤーに個別の情報（手札等）を送信
              room.players.forEach(player => {
                const playerSocket = io.sockets.sockets.get(player.id);
                if (playerSocket) {
                  const playerGameState = room.getPlayerGameState(player.id);
                  playerSocket.emit('gameStateUpdate', playerGameState);
                }
              });
              
              // ゲーム終了チェック
              if (room.gameState === 'finished') {
                setTimeout(() => {
                  // 各プレイヤーに個別に勝敗情報を送信
                  room.players.forEach(player => {
                    const playerSocket = io.sockets.sockets.get(player.id);
                    if (playerSocket) {
                      const isWinner = result.winner === player.name;
                      playerSocket.emit('gameEnd', {
                        winner: result.winner,
                        isWinner: isWinner
                      });
                    }
                  });
                }, 2000);
              }
            }
          } else {
            // 既存のゲーム（数字当て、ヒットアンドブロー）の処理
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
      }
    });

    // チャットメッセージ
    socket.on('chatMessage', (data) => {
      console.log(`[chatMessage] Received from ${socket.id}:`, data);
      
      const room = findRoomByPlayerId(socket.id);
      console.log(`[chatMessage] Room found:`, room);
      
      if (room) {
        console.log(`[chatMessage] Room ID: ${room.roomId}, isWaitingRoom: ${room.isWaitingRoom}`);
        
        const chatMessage = room.addChatMessage(socket.id, data.message);
        console.log(`[chatMessage] Chat message created:`, chatMessage);
        
        if (chatMessage) {
          console.log(`[chatMessage] Emitting to room ${room.roomId}:`, chatMessage);
          io.to(room.roomId).emit('newChatMessage', chatMessage);
          console.log(`[chatMessage] Message emitted successfully`);
        } else {
          console.error(`[chatMessage] Failed to create chat message for player ${socket.id}`);
        }
      } else {
        console.error(`[chatMessage] No room found for player ${socket.id}`);
        console.log(`[chatMessage] Available gameRooms:`, Array.from(gameRooms.keys()));
        console.log(`[chatMessage] Available waitingPlayers:`, Array.from(waitingPlayers.keys()));
      }
    });

    // 新しいゲーム開始
    socket.on('newGame', () => { // Play Same Game Again
      const room = findRoomByPlayerId(socket.id);
      if (room && room.isPasswordRoom) { // Ensure it's a password room to allow "play again"
        console.log(`[newGame] Player ${socket.id} wants to play game ${room.gameType} again in room ${room.roomId}`);
        
        // Reset game-specific state
        if (typeof room.resetGame === 'function') {
            console.log(`[newGame] Calling resetGame for room ${room.roomId}`);
            room.resetGame(); // This method should be in BaseGameRoom and overridden if needed
        } else { // Fallback for older room structures
            console.log(`[newGame] Using fallback reset for room ${room.roomId}`);
            room.gameState = 'waiting';
            room.attempts = [];
            room.currentPlayerIndex = 0;
            if (room.gameType === 'numberguess' && typeof room.initializeTarget === 'function') room.initializeTarget();
            if (room.gameType === 'hitandblow' && typeof room.initializeCode === 'function') room.initializeCode();
            // Reset player ready states
            room.players.forEach(p => p.ready = false);
        }

        console.log(`[newGame] Room ${room.roomId} reset. Players ready state:`, room.players.map(p => ({id: p.id, ready: p.ready})));
        console.log(`[newGame] Room state: ${room.gameState}`);
        
        io.to(room.roomId).emit('newGameReady', { // Client uses this to go to gameWaiting screen
          roomId: room.roomId,
          gameType: room.gameType,
          players: room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready }))
        });
      } else if (room) {
        // Non-password room, original simple newGame logic (might be deprecated)
         console.warn(`[newGame] 'newGame' called for non-password room ${room.roomId}. This flow might be deprecated.`);
        room.gameState = 'waiting';
        room.players.forEach(p => p.ready = false);
        io.to(room.roomId).emit('newGameReady', {
            players: room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready }))
        });
      }
    });

    // ゲーム選択に戻る (Return to Game Selection screen for a different game)
    socket.on('backToGameSelection', () => {
      const room = findRoomByPlayerId(socket.id);
      if (room && room.isPasswordRoom) {
        console.log(`[backToGameSelection] Player ${socket.id} wants to return to game selection in room ${room.roomId}`);
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
          player.wantsToReturnToSelection = true;
        }

        const otherPlayer = room.players.find(p => p.id !== socket.id);
        if (otherPlayer && otherPlayer.wantsToReturnToSelection) {
          // Both players want to return to selection
          console.log(`[backToGameSelection] Both players in room ${room.roomId} want to return. Resetting room for new game selection.`);
          room.gameType = null;
          room.attempts = [];
          room.gameState = 'waitingForGameSelection'; // New state
          room.players.forEach(p => {
            p.ready = false; // Reset ready state for new game selection
            p.wantsToReturnToSelection = false; // Reset flag
          });
           if (typeof room.resetGameSpecificState === 'function') { // Method to clear numbers, codes etc.
            room.resetGameSpecificState();
          }

          // Notify both players they can now select a new game
          room.players.forEach(pSocket => {
            const s = io.sockets.sockets.get(pSocket.id);
            if (s) {
              s.emit('readyForNewGameSelection', {
                roomId: room.roomId,
                players: room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready }))
              });
            }
          });
        } else if (otherPlayer) {
          // Only this player wants to return, notify the other player
          console.log(`[backToGameSelection] Player ${socket.id} waiting for opponent in room ${room.roomId} to also return.`);
          const otherSocket = io.sockets.sockets.get(otherPlayer.id);
          if (otherSocket) {
            otherSocket.emit('opponentReturnedToSelection', {
              roomId: room.roomId,
              players: room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready, wantsToReturnToSelection: p.wantsToReturnToSelection }))
            });
          }
          
          // 最初にボタンを押したプレイヤーにも状態を送信
          socket.emit('waitingForOpponentToReturnToSelection', {
            roomId: room.roomId,
            players: room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready, wantsToReturnToSelection: p.wantsToReturnToSelection }))
          });
        } else {
          // 相手プレイヤーが見つからない場合（単独で戻る）
          console.log(`[backToGameSelection] No other player found for ${socket.id} in room ${room.roomId}. Going to selection directly.`);
          socket.emit('readyForNewGameSelection', {
            roomId: room.roomId,
            players: room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready }))
          });
        }
           // The player who clicked might also get an update to show they are waiting for opponent.
           // For now, client handles this by disabling buttons.
      } else {
        // Original logic for non-password rooms or if room not found (e.g., cancelling initial password match)
        console.log(`[backToGameSelection] Player ${socket.id} not in a password room or room not found. Emitting backToGameSelection to self.`);
        if (room) { // if room exists but not password room
             const shouldDeleteRoom = room.removePlayer(socket.id);
             if (shouldDeleteRoom) gameRooms.delete(room.roomId);
             else socket.to(room.roomId).emit('opponentDisconnected'); // Notify other if any
        }
        socket.emit('backToGameSelection'); // Tell client to go to its initial screen (likely password)
      }
    });

    // 切断処理
    socket.on('disconnect', () => {
      console.log('プレイヤーが切断しました (from socketHandlers):', socket.id);

      // Handle disconnection from password-based waiting rooms (before game room is made)
      let foundInWaitingPlayers = false;
      for (const [password, entry] of waitingPlayers.entries()) {
        const playerIndex = entry.sockets.findIndex(s => s.id === socket.id);
        if (playerIndex !== -1) {
          console.log(`Player ${socket.id} disconnected from password waiting room "${password}".`);
          const removedPlayerInfo = entry.playersInfo[playerIndex];
          entry.sockets.splice(playerIndex, 1);
          entry.playersInfo.splice(playerIndex, 1);
          foundInWaitingPlayers = true;

          if (entry.sockets.length === 0) {
            console.log(`Password waiting room "${password}" is now empty. Deleting.`);
            waitingPlayers.delete(password);
          } else if (entry.sockets.length === 1) {
            // If a game (GameRoom) was already associated with this password entry's roomId and is in gameRooms,
            // this disconnect should be handled by the active game room logic below.
            // This part is for when they are still in 'waitingPlayers' (e.g. one player joined, other didn't yet, or both matched by password but not selected game)
            if (!gameRooms.has(entry.roomId)) {
                 const remainingSocket = entry.sockets[0];
                 console.log(`Notifying remaining player ${remainingSocket.id} in password waiting room "${password}" about opponent disconnection.`);
                 remainingSocket.emit('opponentLeftPasswordMatch', { roomId: entry.roomId, opponentId: removedPlayerInfo.id });
                 // Reset the waitingPlayers entry to accept a new player or be cleaned up
                 entry.gameType = null;
            }
          }
          break;
        }
      }

      // Handle disconnection from active game rooms
      const room = findRoomByPlayerId(socket.id);
      if (room) {
        console.log(`Player ${socket.id} disconnected from active game room ${room.roomId}.`);
        const otherPlayer = room.players.find(p => p.id !== socket.id);

        if (room.isPasswordRoom && otherPlayer) {
          console.log(`[disconnect] Password room ${room.roomId}. Notifying ${otherPlayer.id} and ending match.`);
          const otherSocket = io.sockets.sockets.get(otherPlayer.id);
          if (otherSocket) {
            otherSocket.emit('opponentDisconnectedEndMatch', { roomId: room.roomId, opponentId: socket.id });
          }
          // Clean up from gameRooms and waitingPlayers
          gameRooms.delete(room.roomId);
          // Also remove the corresponding entry from waitingPlayers if it still exists based on roomId
          for (const [password, entry] of waitingPlayers.entries()) {
            if (entry.roomId === room.roomId) {
              console.log(`[disconnect] Deleting password entry for room ${room.roomId} from waitingPlayers.`);
              waitingPlayers.delete(password);
              break;
            }
          }
        } else if (otherPlayer) { // Non-password room or no other player (should be caught by shouldDeleteRoom)
          const shouldDeleteRoom = room.removePlayer(socket.id); // BaseGameRoom handles removing player
          if (shouldDeleteRoom) {
            console.log(`[disconnect] Room ${room.roomId} is empty, deleting.`);
            gameRooms.delete(room.roomId);
          } else {
            console.log(`[disconnect] Notifying opponent in room ${room.roomId}.`);
            socket.to(room.roomId).emit('opponentDisconnected', { opponentId: socket.id });
          }
        } else { // Player was alone in the room
             console.log(`[disconnect] Player ${socket.id} was alone in room ${room.roomId}. Deleting room.`);
             gameRooms.delete(room.roomId);
        }
      }
    });
  });
}

module.exports = initializeSocketHandlers;
