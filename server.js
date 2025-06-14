const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const BaseGameRoom = require('./gameLogic/baseGameRoom');
const NumberGuessRoom = require('./gameLogic/numberGuessRoom');
const HitAndBlowRoom = require('./gameLogic/hitAndBlowRoom');
const CardGameRoom = require('./gameLogic/cardGameRoom');
const initializeSocketHandlers = require('./socketHandlers'); // Import the handler initializer

// 静的ファイルの配信
app.use(express.static(path.join(__dirname, 'public')));

// ゲームの状態管理
const gameRooms = new Map(); // Stores active game room instances
const waitingPlayers = new Map(); // Stores players waiting by password: password -> { sockets: [], roomId: string, gameType: null | string, playersInfo: [] }

// Initialize Socket.io handlers
initializeSocketHandlers(io, gameRooms, waitingPlayers, NumberGuessRoom, HitAndBlowRoom, CardGameRoom);

// サーバー起動
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`サーバーがポート${PORT}で起動しました`);
});
