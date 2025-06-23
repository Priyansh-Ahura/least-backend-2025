const express = require('express');
const https = require("https");
const http = require("http");
const redis = require('redis');
const app = require('./app')
const config = require('./config')
const mongoose = require('mongoose');
const GameDB = require('./api/models/Game/game.model')
const UserDb = require('./api/models/User/user.model')
const deckDB = require('./api/models/Deck/deck.model')
const redisService = require('./api/services/redisService')
const { GamesList, RoomData } = require('./class/game');
const { Cards, CloseDeck, DropDeck, OpenDeck, ShuffleDeck } = require('./class/card')
const messages = require('./api/helper/messages');
const Helper = require('./api/helper');
const options = {
}

const server = http.createServer(options, app)
const io = require("./api/config/socket").init(server);

server.listen({ port: config.PORT }, () => {
   console.log('server started at: ' + config.PORT)
})

let gameList = new GamesList()
let roomList = new RoomData()

// Store custom IDs mapped to socket IDs
const customIdToSocketMap = new Map();

io.on('connection', async (socket) => {
   console.log("New Player Came ", socket.handshake.query.customId);

   const customId = socket.handshake.query.customId;
   // Store the mapping
   customIdToSocketMap.set(socket.id, customId);
   socket.on('roomList', async (data) => {

      const gameList = await fetchRoomList();
      io.emit("liveGames", {
         action: "listing",
         result: gameList,
      });
   })
   socket.on('joinRoom', async (data) => {
      const action = "joinRoom";
      try {
         const roomId = data.roomId.trim();
         const playerId = data.playerId.trim();
         const roomCode = data.roomCode;

         const roomExist = roomList.getRoomDetails(roomId)
         const playerDetails = await userDetails(playerId)
         const gameRoom = await fetchGameRooms(roomId);
         const roomDetails = await GameDB.findOne({ _id: roomId });

         if (data.action === "Add") {

            if (!roomExist) {
               await roomList.addRoom({
                  id: roomId,
                  players: [playerId],
               })
            } else {

               // Check if the room has fewer than 8 players before allowing a new player to join
               if (roomExist[0].players.length >= 8) {
                  return io.in(roomId).emit("joinRoomError", { action: 'roomFull', message: 'The room is full. Only 8 players can join.' });
               }

               if (roomDetails.roomType === 0 && (!roomDetails.gameStatus == 1 || !roomDetails.gameStatus == 2)) {
                  await roomList.addPlayer(roomId, playerId)
               } else if (roomDetails.roomType === 1 && (!roomDetails.gameStatus == 1 || !roomDetails.gameStatus == 2)) {
                  if (roomDetails.roomCode === data.roomCode || roomDetails.gameHost == playerId) {
                     await roomList.addPlayer(roomId, playerId)
                  } else {
                     return io.in(roomId).emit("joinRoomError", { action: 'roomCode', message: messages.roomCode });
                  }
               } else {
                  return io.in(roomId).emit("joinRoomError", "Invalid Room ID format.");
               }
            }

            if (roomDetails.roomType === 1) {
               if (data.roomCode === "" || data.roomCode === null) {
                  return io.in(roomId).emit("joinRoomError", { action: 'roomCode', message: messages.roomCode });
               }
               else if (roomDetails.roomCode !== data.roomCode) {
                  return io.in(roomId).emit("joinRoomError", { action: 'roomCode', message: messages.InvalidroomCode });
               }
            }



            // // Check if roomId is provided
            if (roomId == "" || playerId == "") {
               return io.in(roomId).emit("joinRoomError", "Room ID is required.");
            }

            const userInRoom = await UserDb.findOne({ _id: playerId });
            if (!userInRoom) {
               return io.in(roomId).emit("joinRoomError", "Player not found.");
            }


            if (!mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(playerId)) {
               return io.in(roomId).emit("joinRoomError", "Invalid Room ID format.");
            }


            if (!gameRoom || gameRoom.length === 0) {
               return io.in(roomId).emit("joinRoomError", "Game room not found.");
            }

            if (!gameRoom || !gameRoom._id) {
               return io.in(roomId).emit("joinRoomError", "User not found.");
            }

            if (roomId) {
               socket.join(roomId);
               const roomPlayer = roomList.getRoomDetails(roomId)
               for (let i = 0; i < roomPlayer[0].players.length; i++) {
                  const element = roomPlayer[0].players[i];
                  const playerDetails = await userDetails(element)

                  if (!playerDetails.profilePic.includes(config.GOOGLE_IMAGE_BASE_URL)) {

                     playerDetails.profilePic = await Helper.getValidImageUrl(playerDetails.profilePic)
                  }

                  io.in(roomId).emit("roomEvent", {
                     action: "Add",
                     playerJoind: `${playerDetails.userName} Joined The Room ${roomId}`,
                     roomName: gameRoom.roomName,
                     playerId: playerDetails._id,
                     playerName: playerDetails.userName ?? playerDetails.guestId,
                     playerProfile: playerDetails.profilePic,
                     tempSocketId: socket.id
                  })

                  const roomDetails = roomList.getRoomDetails(roomId)

                  io.emit("liveGames", {
                     action: "playerAdd",
                     result: roomDetails,
                  });
               }

            }
         } else if (data.action = "Remove") {

            if (roomId) {

               io.in(roomId).emit("roomEvent", {
                  action: "Remove",
                  playerLeft: `${playerDetails.userName} Left The Room ${roomId}`,
                  roomName: gameRoom.roomName,
                  playerId: playerDetails._id,
                  playerName: playerDetails.userName,
                  playerProfile: playerDetails.profilePic,
                  tempSocketId: socket.id
               })

            }
            roomList.removePlayer(roomId, playerId);
            const roomData = roomList.getRoomDetails(roomId);
            const gameHost = gameRoom.gameHost.toString();
            io.emit("liveGames", {
               action: "playerRemove",
               result: roomData,
            });

            if (roomData && roomData[0]?.players.length != 0) {
               const room = roomData[0];
               const gameHost = gameRoom.gameHost.toString();
               const players = room.players;

               if (!players.includes(gameHost)) {
                  const newGameHost = players[0];
                  const playerDetails = await userDetails(newGameHost)
                  gameRoom.gameHost = playerDetails._id;
                  await gameRoom.save();
                  io.in(roomId).emit("roomEvent", { action: "newHost", newHostId: playerDetails._id, newHostName: playerDetails.userName });
               }
            }

            if (roomData && roomData[0]?.players.length === 0) {
               roomList.removeRoom(roomId)
               gameList.removeGame(roomId);
               redisService.deleteData(roomId);
               const updateGameStatus = await GameDB.findByIdAndUpdate(
                  roomId,
                  { $set: { gameStatus: 3, flag: 2 } },
                  { new: true, useFindAndModify: false }
               );

               io.emit("liveGames", {
                  action: "roomRemove",
                  result: [{ id: roomId }],
               })

            }

         } else {
            return io.in(roomId).emit("joinRoomError", { action: 'roomFull', message: 'The room is full. Only 8 players can join.' });
         }


      } catch (error) {
         const errorMessage = messages.ErrorJoinigRoom;
         const game = { action };
         Helper.writeGameErrorLog(game, error, errorMessage);
         // io.in(data.roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
      }
   });

   socket.on('mainGame', async (data) => {
      const action = "mainGame";
      try {
         const { action, roomId, playerId, dropCardsindex, deckType, cardName } = data;
         console.log(action);
         switch (action) {

            case 'roomList':
               fetchRoomList();
               break;

            case 'gameStart':
               startGame(roomId);
               break;

            case 'dropCard':
               handleDropCard(roomId, playerId, dropCardsindex);
               break;

            case 'pickCard':
               handlePickCard(roomId, playerId, deckType);
               break;
            case 'endTurn':
               endTurn(roomId, playerId, cardName)
               break;
            case 'leastCall':
               handleLeastCall(roomId, playerId);
               break;
            case 'spectatorJoined':
               handleJoinSpectator(roomId, playerId);
               break;

            case 'reJoinRoom':
               reJoinRoom(roomId, playerId);
               break;


            default:
               console.error('Unknown action:', action);
         }
      } catch (error) {
         const errorMessage = messages.ErrorTryAgain;
         const game = { action, errorMessage };
         Helper.writeGameErrorLog(game, error);
         // io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
      }
   });

   socket.on('disconnect', async () => {
      const action = "disconnect";
      try {
         const customId = customIdToSocketMap.get(socket.id);
         const roomId = roomList.getRoomPlayerDetails(customId);
         const roomData = roomList.getRoomDetails(roomId);
         roomList.removePlayer(roomId, customId);

         const gameDetails = gameList.getGameDetails(roomId)[0];
         if (gameDetails) {
            const player = gameDetails.players.find(player => player.id === customId);
            if (player) {
               player.flag = 2;
               gameList.addGames(gameDetails);
               console.log(`Updated flag for player: ${player.playerName}`);
            } else {
               console.error(`Player not found in gameDetails for id: ${customId}`);
            }
         }

         io.emit("liveGames", {
            action: "playerRemove",
            result: roomData,
         });

         socket.emit("roomEvent", `Player ${socket.id} disconnected and removed from game room.`);
         console.log(`Player ${socket.id} disconnected and removed from game room.`);
      } catch (error) {
         const errorMessage = messages.ErrorTryAgain;
         const game = { action, errorMessage };
         Helper.writeGameErrorLog(game, error);
         // io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
      }
   });
});


const fetchRoomList = async () => {
   const action = "fetchRoomList-Function";
   try {
      const result = await GameDB.find({
         $and: [
            { gameStatus: 0 },
            { flag: 1 },
            { roomType: 0 }
         ]
      })
         .select('_id roomName password players roomCode maxScoreLimit turnClock gameHost roomType')
         .populate('roomName')
         .sort({ createdAt: -1 })
         .lean();

      if (roomList.roomData.length <= 0) {

         for (let i = 0; i < result.length; i++) {
            const element = result[i];
            const roomId = JSON.parse(JSON.stringify(element._id));

            var roomAdd = roomList.addRoom({
               id: roomId,
               players: [],
            })



         }

      }
      else {
         console.log('RoomExist')
         for (let i = 0; i < result.length; i++) {
            const element = result[i];
            const roomId = JSON.parse(JSON.stringify(element._id));
            const roomData = roomList.getRoomDetails(roomId)

            if (roomData == null) {
               console.log("creating the room")
               var roomAdd = roomList.addRoom({
                  id: roomId,
                  players: [],
               })
            } else {
               console.log(`RoomExist ${result[i].players}, ${roomData}`)
               result[i].players = await roomData[0].players
            }
         }
      }
      return result;
   } catch (error) {
      const errorMessage = messages.ErrorfetchingGame;
      const game = { action, errorMessage };
      Helper.writeGameErrorLog(game, error);
      // io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }
}

async function fetchGameRooms(roomId) {
   const action = "fetchGameRooms-Function";
   try {
      const gameRoom = await GameDB.findById(roomId);
      return gameRoom;
   } catch (error) {
      const errorMessage = messages.ErrorfetchingGame;
      const game = { roomId, action, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }
}

async function userDetails(playerId) {
   const action = "fetchUserDetails-Function";
   try {
      const userDetails = await UserDb.findById(playerId);
      return userDetails;
   } catch (error) {
      const errorMessage = messages.Errorfetchinguser;
      const game = { playerId, action, errorMessage };
      Helper.writeGameErrorLog(game, error);
      // io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }
}

const shuffleAndMoveOpenDeckCard = (gameDetails) => {
   const action = "shuffleAndMoveOpenDeckCard-Function";
   try {
      const openDeck = gameDetails.openDeck;
      if (openDeck.length > 1) {
         const firstCard = openDeck.shift(); // Remove the first card from the open deck
         const shuffledDeck = Helper.shuffleArray(openDeck); // Shuffle the remaining open deck
         gameDetails.closeDeck.push(...shuffledDeck); // Move shuffled cards to the close deck
         openDeck.unshift(firstCard); // Put the first card back to the start of the open deck
      } else if (openDeck.length === 1) {
         const firstCard = openDeck[0];
         gameDetails.closeDeck.push(...Helper.shuffleArray(openDeck));
         gameDetails.openDeck = [firstCard];
      }
   } catch (error) {
      const errorMessage = messages.ErrorshuffleAndMove;
      const game = { roomId: gameDetails.id, action, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(gameDetails.id).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }

};

// Handle game start
const startGame = async (roomId) => {
   const action = "gameStart";
   try {
      const jsonData = await redisService.get(roomId);
      const gameDetails = gameList.addGames(jsonData);

      if (!jsonData && !gameDetails || (!jsonData || !gameDetails)) {
         io.in(roomId).emit("roomEvent", { action: "error", result: 'Game room data not found!' });
      }

      if (gameDetails.currentRound === 1) {
         const updatedGameDetails = gameList.changeGameStatus(roomId, 1);
         if (updatedGameDetails && updatedGameDetails[0].gameStatus === 1) {
            const gameRoom = await GameDB.findById(roomId);
            if (gameRoom) {
               gameRoom.gameStatus = 1;
               await gameRoom.save();

               io.emit("liveGames", {
                  action: "roomRemove",
                  result: [{ id: roomId }],
               })
            }
         }

         const gameData = updatedGameDetails[0]
         io.in(roomId).emit("roomEvent", { action: "gameStart", data: { result: gameData } });
         gameStartTimer(roomId, gameData.players, gameData.randomTurn, gameData.turnClock, gameData.closeDeck, gameData.dropDeck, 10);
      } else {
         const gameData = gameList.getGameDetails(roomId)[0];
         gameStartTimer(roomId, gameData.players, gameData.randomTurn, gameData.turnClock, gameData.closeDeck, gameData.dropDeck, 10);
      }
   } catch (error) {
      const errorMessage = messages.ErrorStartingGame;
      const game = { roomId, action, errorMessage };
      Helper.writeGameErrorLog(game, error);
      // io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }

}
// Handle Player Drop card
const handleDropCard = async (roomId, playerId, dropCardsindex) => {
   const action = "handleDropCard";
   try {
      const droppedCards = dropCards(gameList, roomId, playerId, dropCardsindex);

      if (droppedCards) {
         const updatedGameDetails = gameList.getGameDetails(roomId)[0];
         const updatedPlayer = updatedGameDetails.players.find(player => player.id === playerId);

         if (updatedPlayer) {
            io.in(roomId).emit("mainGame", { action: "dropCard1", cards: updatedPlayer.cards }); // Emit updated card data to the player who dropped the card
         }
         updatePlayerPoints(updatedGameDetails);
         checkAndMoveToNextPlayer(roomId, updatedGameDetails, playerId);
         io.in(roomId).emit("mainGame", { action: "dropCard", droppedCards: droppedCards[0], playerId });
      }
   } catch (error) {
      const errorMessage = messages.ErrorDropCard;
      const game = { roomId, playerId, action, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(roomId).emit("error", { action: `${action}-Error`, message: errorMessage });
   }
};

const dropCards = (gameList, roomId, playerId, dropCardsindex) => {
   const action = "dropCards";
   try {
      const gameDetails = gameList.getGameDetails(roomId)[0];

      if (!gameDetails) {
         io.in(roomId).emit("gameError", "Invalid room ID.");
         return null;
      }

      const player = gameDetails.players.find(player => player.id === playerId);

      if (!player || player.cards.length === 0) {
         io.in(roomId).emit("gameError", `Player with ID ${playerId} has no cards to drop.`);
         return null;
      }

      if (player && player.cards.length > 0) {
         // Retrieve the cards to be dropped
         const cardsToDrop = dropCardsindex.map(index => player.cards[index]);

         // Validate that all cards have the same name and points
         const isValidDrop = cardsToDrop.every(card =>
            card.cardName === cardsToDrop[0].cardName &&
            card.cardPoint === cardsToDrop[0].cardPoint
         );

         if (!isValidDrop) {
            io.in(roomId).emit("gameError", "All cards to be dropped must have the same name and points.");
            return null;
         }

         const droppedCards = [];
         // Sort indices in descending order to avoid indexing issues during splice
         dropCardsindex.sort((a, b) => b - a);

         for (let index of dropCardsindex) {
            const droppedCard = player.cards.splice(dropCardsindex, 1)[0];
            // const droppedNewCard = player.cards.splice(dropCardsindex, 1)[0];
            if (droppedCard) {
               droppedCards.push(droppedCard);
               player.dropCard = true;
               updatePlayerPoints(gameDetails);
               gameDetails.dropDeck.push(droppedCard);
            }
         }
         gameList.addGames(gameDetails);
         return droppedCards;
      } else {
         io.in(roomId).emit("gameError", `Player with ID ${playerId} has no cards to drop.`);
         return null;
      }
   } catch (error) {
      const errorMessage = messages.ErrorDropingCard;
      const game = { roomId, playerId, action, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }
};

//  Handle Player Pick card from a specified deck (open or close)
const handlePickCard = async (roomId, playerId, deckType) => {
   const action = "handlePickCard";
   try {
      const pickedCard = await pickCard(gameList, roomId, playerId, deckType);

      if (pickedCard) {
         const updatedGameDetails = gameList.getGameDetails(roomId)[0];
         updatePlayerPoints(updatedGameDetails);
         checkAndMoveToNextPlayer(roomId, updatedGameDetails, playerId);
         io.in(roomId).emit("mainGame", { action: "pickCard", pickedCard: pickedCard, playerId, updatedGameDetails });
      }
   } catch (error) {
      const errorMessage = messages.ErrorHandlaingPickCard;
      const game = { roomId, playerId, action, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }
};

const pickCard = async (gameList, roomId, playerId, deckType) => {
   const action = "pickCard";
   try {
      const gameDetails = gameList.getGameDetails(roomId)[0];
      const player = gameDetails.players.find(player => player.id === playerId);
      let pickedCard = null;

      if (deckType === 'closeDeck' && gameDetails.closeDeck.length > 0) {
         pickedCard = gameDetails.closeDeck.pop();
      } else if (deckType === 'openDeck' && gameDetails.openDeck.length > 0) {
         pickedCard = gameDetails.openDeck.shift();
      } else {
         console.error(`Deck type ${deckType} is empty or invalid.`);
      }

      if (pickedCard) {
         player.cards.push(pickedCard);
         player.pickCard = true;
         updatePlayerPoints(gameDetails);
         gameList.addGames(gameDetails);

         if (gameDetails.closeDeck.length <= 2) {
            console.log("Shuffling open deck cards and moving to close deck");
            io.in(roomId).emit("mainGame", { action: "showPopup", message: "Shuffling cards. Please wait..." });
            shuffleAndMoveOpenDeckCard(gameDetails);
            await gameList.addGames(gameDetails);
            updatePlayerPoints(gameDetails);
            io.in(roomId).emit("mainGame", { action: "updatedDeck", closeDeck: gameDetails.closeDeck, openDeck: gameDetails.openDeck });
         }
      }
      return pickedCard;

   } catch (error) {
      const errorMessage = messages.ErrorHandlaingPickCard;
      const game = { roomId, playerId, action, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }
};

// Check both conditions and move to the next player if met
const checkAndMoveToNextPlayer = (roomId, gameDetails, playerId) => {
   const action = "checkAndMoveToNextPlayer-Function";
   try {
      const player = gameDetails.players.find(player => player.id === playerId);
      if (player.dropCard && player.pickCard) {
         nextPlayerTurn(roomId, gameDetails);
      }
   } catch (error) {
      const errorMessage = messages.checkAndMoveToNextPlayer;
      const game = { roomId, playerId, action, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }
};

// Caclulate cards point after each player turn.
const calculateCardPoints = (player) => {
   const action = "calculateCardPoints-Function"
   try {
      let totalPoints = 0;
      player.cards.forEach(card => {
         if (!card.isTrump) {
            totalPoints += card.points;
         }
      });
      return totalPoints;
   } catch (error) {
      const errorMessage = messages.calculateCardPoints;
      const game = { action, errorMessage };
      Helper.writeGameErrorLog(game, error);
      // io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }
};

// Function to update player points after drop and pick actions
const updatePlayerPoints = (gameDetails) => {
   const action = "updatePlayerPoints-Function";
   try {
      gameDetails.players.forEach(player => {
         player.points = calculateCardPoints(player);
      });
   } catch (error) {
      const errorMessage = messages.ErrorUpdatePoints;
      const game = { action, roomId: gameDetails.id, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(gameDetails.id).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }
};

const gameStartTimer = (roomId, players, randomTurn, turnClock, closeDeck, dropDeck, countDown) => {
   const action = "updateTimer";
   try {
      const countdownInterval = setInterval(() => {
         if (countDown > -1) {
            io.in(roomId).emit("mainGame", { action: "updateTimer", timer: countDown });
            countDown--; // Decrement the timer
         } else {
            clearInterval(countdownInterval); // Clear the interval when timer reaches 0
            handlePlayerTurns(roomId, players, randomTurn, turnClock, closeDeck, dropDeck);
         }
      }, 1000); // 1000 milliseconds = 1 second
   } catch (error) {
      const errorMessage = messages.ErrorGametimer;
      const game = { action, roomId, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }


}

// Handle Player Turn
const handlePlayerTurns = (roomId, players, randomTurn, turnClock, closeDeck, dropDeck) => {
   const action = "playerTurn";
   try {
      let currentIndex = players.findIndex(player => player.id === randomTurn);
      if (currentIndex === -1) {
         io.emit("gameError", "Initial player for randomTurn not found.");
         return;
      }

      const nextTurn = () => {
         players.forEach(player => {
            player.hasTurn = false;
            player.seconds = 0;
            player.dropCard = false;
            player.pickCard = false;
            player.turnCount = player.turnCount || 0;
         });

         // Find the next active (non-eliminated) player
         const findNextPlayerIndex = (startIndex) => {
            let index = startIndex;
            do {
               index = (index + 1) % players.length;
            } while (players[index].isEliminated);
            return index;
         };


         const currentPlayer = players[currentIndex];
         currentPlayer.hasTurn = true;
         currentPlayer.seconds = turnClock;
         currentPlayer.turnCount++;

         const countdown = async (seconds) => {
            if (seconds >= 0) {
               io.in(roomId).emit("mainGame", { action: "playerTurn", roomId, currentPlayer: currentPlayer.id, countdown: seconds, turn: currentPlayer.turnCount });

               // Check if the player's turn is still active before setting the next countdown
               if (currentPlayer.hasTurn) {
                  setTimeout(() => {
                     countdown(seconds - 1);
                  }, 1000);
               }
            } else {
               if (!currentPlayer.hasTurn) {
                  io.emit("gameError", `${currentPlayer.name} Player turn was completed.`);
                  return;
               }

               // Auto drop/pick if player's turn count is greater than 1
               if (currentPlayer.turnCount > 1) {
                  const dropCardIndex = getLowestCardIndex(currentPlayer.cards);
                  console.log("Auto drop card index:", dropCardIndex);
                  if (dropCardIndex !== -1) {
                     try {
                        await handleDropCard(roomId, currentPlayer.id, [dropCardIndex]);
                        await handlePickCard(roomId, currentPlayer.id, 'closeDeck');
                     } catch (err) {
                        console.error("Error in auto drop/pick logic:", err);
                     }
                  }
               }

               let pickedCard = null;
               if (currentPlayer.dropCard && !currentPlayer.pickCard) {
                  pickedCard = await handlePickCard(roomId, currentPlayer.id, 'closeDeck');
               }

               let gameDetails;
               if (currentPlayer.dropCard && dropDeck.length > 0) {
                  gameDetails = gameList.getGameDetails(roomId)[0];
                  gameDetails.openDeck.unshift(...dropDeck);
                  gameDetails.dropDeck = [];
                  dropDeck = [];
                  updatePlayerPoints(gameDetails);
                  gameList.addGames(gameDetails);
               }

               const nextPlayerIndex = findNextPlayerIndex(currentIndex);
               io.in(roomId).emit("mainGame", { action: "nextPlayerTurn", roomId, nextPlayer: players[nextPlayerIndex].id, previousPlayer: currentPlayer.id, examle: "working" });

               currentIndex = nextPlayerIndex;

               nextTurn();
            }
         };
         countdown(turnClock); // Start the countdown without initial delay
      };

      nextTurn();
   } catch (error) {
      const errorMessage = messages.ErrorPlayerTurn;
      const game = { action, roomId, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }
};

// Move to the next player's turn
const nextPlayerTurn = (roomId, gameDetails) => {
   const action = "nextPlayerTurn";
   try {
      const players = gameDetails.players;
      const currentIndex = players.findIndex(player => player.hasTurn);

      const findNextPlayerIndex = (startIndex) => {
         let index = startIndex;
         do {
            index = (index + 1) % players.length;
         } while (players[index].isEliminated);
         return index;
      };

      const nextIndex = findNextPlayerIndex(currentIndex)
      // (currentIndex + 1) % players.length;
      // Stop the current player's turn
      players[currentIndex].hasTurn = false;

      if (gameDetails.dropDeck.length > 0) {

         io.in(roomId).emit("mainGame", { action: "openDeckUpdate", dropDeckCard: gameDetails.dropDeck });
         gameDetails.openDeck.unshift(...gameDetails.dropDeck); // Add drop deck cards to the beginning of the open deck
         gameDetails.dropDeck = []; // Empty the drop deck
         gameList.addGames(gameDetails);

         const updatedGameDetails = gameList.getGameDetails(roomId)[0];
         io.in(roomId).emit("mainGame", { action: "nextPlayerTurn", roomId, nextPlayer: players[nextIndex].id, previousPlayer: players[currentIndex].id });

         setTimeout(() => {
            handlePlayerTurns(roomId, players, players[nextIndex].id, gameDetails.turnClock, gameDetails.closeDeck, gameDetails.dropDeck);
         }, 1000);
      } else {
         handlePlayerTurns(roomId, players, players[nextIndex].id, gameDetails.turnClock, gameDetails.closeDeck, gameDetails.dropDeck);
      }
   } catch (error) {
      const errorMessage = messages.ErrorNextPlyerTurn;
      const game = { action, roomId, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }
};

//  End turn when same card dropped.
const endTurn = async (roomId, playerId, cardName) => {
   const action = "endTurn-Function";
   try {
      const gameDetails = gameList.getGameDetails(roomId)[0];
      if (gameDetails.openDeck.length > 0 && gameDetails.openDeck[0].cardName === cardName) {
         const player = gameDetails.players.find(player => player.id === playerId);
         player.pickCard = true;
         const updatedGameDetails = gameList.getGameDetails(roomId)[0];
         updatePlayerPoints(updatedGameDetails);
         checkAndMoveToNextPlayer(roomId, updatedGameDetails, playerId);
      }
   } catch (error) {
      const errorMessage = messages.ErrorEndTurn;
      const game = { action, roomId, playerId, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }

}

//Handle Rejoin
const reJoinRoom = async (roomId, playerId) => {
   const action = "reJoinRoom";
   try {
      const gameDetails = gameList.getGameDetails(roomId)[0];
      if (gameDetails && gameDetails?.gameStatus == 1) {
         const player = gameDetails.players.find(player => player.id === playerId);
         player.flag = 1;
         const result = {}
         result.result = gameDetails

         setTimeout(() => {
            io.in(roomId).emit("roomEvent", { action: "reJoinRoom", result: result, playerId: playerId, });
         }, 300);
         setTimeout(() => {
            io.in(roomId).emit("roomEvent", { action: "gameStart1", data: { result: gameDetails }, playerId: playerId, });
         }, 1000);

      } else {
         setTimeout(() => {
            io.in(roomId).emit("roomEvent", { action: "reJoinRoom", playerId: playerId, message: messages.GameCompleted });
         }, 300);

      }
   } catch (error) {
      const errorMessage = messages.ErrorRejoinGame;
      const game = { action, roomId, playerId, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }

}

const handlePlayerElimination = async (gameDetails) => {
   const action = "handlePlayerElimination-Function";
   try {
      for (const player of gameDetails.players) {
         // Check if the player is eliminated
         const isPlayerEliminated = player.userScore.roundScore.some(round => round.isEliminated);

         // If the player is eliminated, update their status
         if (isPlayerEliminated) {
            try {
               const playerDetails = await UserDb.findById(player.id);
               if (playerDetails) {
                  playerDetails.userStatus = 0;
                  await playerDetails.save();
                  console.log(`Updated status for player: ${playerDetails.playerName}`);
               }
            } catch (error) {
               console.error(`Error updating status for player ${player.id}:`, error);
            }
         }
      }
   } catch (error) {
      const errorMessage = messages.ErrorhandlePlayerElimination;
      const game = { action, roomId: gameDetails.id, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(gameDetails.id).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }
};

// Handle Player Least Call
const handleLeastCall = async (roomId, playerId) => {
   const action = "leastCall";
   try {
      const gameDetails = gameList.getGameDetails(roomId)[0];
      const leastCaller = gameDetails.players.find(player => player.id === playerId);

      if (leastCaller && leastCaller.hasTurn && leastCaller.points <= 10) {
         const leastCallerPoints = leastCaller.points;
         const otherPlayers = gameDetails.players.filter(player => player.id !== playerId);
         let addBurstPoints = 0;
         let isLeastCallerWinner = true;
         let winner = {};

         const nonEliminatedPlayers = otherPlayers.filter(player => !player.isEliminated);

         // Extract the points and find the minimum value among non-eliminated players
         const pointsArray = nonEliminatedPlayers.map(player => player.points);
         const minPoints = Math.min(...pointsArray);
         console.log(minPoints)
         if (minPoints < leastCallerPoints) {
            const maxScoreLimit = gameDetails.maxScoreLimit;
            addBurstPoints = Math.floor(0.4 * maxScoreLimit);
            isLeastCallerWinner = false;
            winner = otherPlayers.find(player => player.points === minPoints);
         }

         // for (const player of otherPlayers) {

         //    if (player.points < leastCallerPoints) {
         //       const maxScoreLimit = gameDetails.maxScoreLimit;
         //       addBurstPoints = Math.floor(0.4 * maxScoreLimit);
         //       isLeastCallerWinner = false;
         //       winner = player
         //       break;
         //    }
         // }
         if (!isLeastCallerWinner) {
            leastCaller.points += addBurstPoints;
         } else {
            winner = leastCaller
         }

         // Update all players' round scores and total scores
         gameDetails.players.forEach(async player => {
            const roundScore = player.points;
            const previousTotalScore = player.userScore.roundScore.length > 0 ? player.userScore.roundScore[player.userScore.roundScore.length - 1].totalScore : 0;
            let playerTotalScore;
            let playerIsEliminated = false;
            let roundLeastCaller = false;
            let roundWinner = false;

            if (isLeastCallerWinner && player.id === playerId) {
               // Least caller is the winner
               if (gameDetails.currentRound === 1) {
                  playerTotalScore = 0;
               } else {
                  playerTotalScore = previousTotalScore;
               }
               roundLeastCaller = true;
               roundWinner = true;
            } else {
               // Not the winner or not the least caller
               playerTotalScore = previousTotalScore + roundScore;
            }

            if (playerTotalScore > gameDetails.maxScoreLimit) {
               playerIsEliminated = true;
               io.in(roomId).emit("mainGame", {
                  action: "playerEliminated",
                  playerId: player.id,
                  playerName: player.name ?? player.guestId,
                  playerImage: player.profileImage,
                  playerPoints: playerTotalScore

               });
            }

            player.userScore.totalScore = playerTotalScore;
            player.leastCalled = roundLeastCaller;
            player.isWinner = roundWinner;
            player.isEliminated = player.userScore.totalScore >= gameDetails.maxScoreLimit

            const roundScoreData = {
               playerName: player.name ?? player.guestId,
               roundNo: gameDetails.currentRound,
               isWinner: player.id === playerId && isLeastCallerWinner,
               roundScore: player.id === playerId && isLeastCallerWinner ? 0 : roundScore,
               totalScore: playerTotalScore,
               isEliminated: player.userScore.totalScore >= gameDetails.maxScoreLimit
            };

            player.userScore.roundScore.push(roundScoreData);



            await GameDB.findOneAndUpdate(
               { _id: roomId, 'players.playerId': player.id },
               { $push: { 'players.$.userScore.roundScore': roundScoreData }, }
            );
         });
         // Check if only two players were left and one got eliminated
         const remainingPlayers = gameDetails.players.filter(player => !player.userScore.roundScore[gameDetails.currentRound - 1]?.isEliminated);

         if (remainingPlayers.length === 1 && !remainingPlayers.isEliminated) {
            await handlePlayerElimination(gameDetails);
            io.in(roomId).emit("mainGame", { action: "leastCall", leastCaller: leastCaller, isWinner: isLeastCallerWinner, roundWinner: winner, currentRound: gameDetails.currentRound, gameCompleted: true, gameDetails });
            declareGameWinner(roomId);
         }
         else {
            await handlePlayerElimination(gameDetails);
            io.in(roomId).emit("mainGame", { action: "leastCall", leastCaller: leastCaller, isWinner: isLeastCallerWinner, roundWinner: winner, currentRound: gameDetails.currentRound, gameDetails });
            endRound(roomId);
         }

      } else {
         checkAndMoveToNextPlayer(roomId, updatedGameDetails, playerId);
         io.in(roomId).emit("gameError", "Invalid least call request.");
      }
   } catch (error) {
      console.log(error)
      const errorMessage = messages.ErrorCallingLeast;
      const game = { action, roomId, playerId, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }

};

// End round after least call
const endRound = (roomId) => {
   const action = "endRound-Function";
   try {
      const gameDetails = gameList.getGameDetails(roomId)[0];

      // Check for game end condition
      const remainingPlayers = gameDetails.players.filter(player => {
         const currentRoundEliminationStatus = player.userScore.roundScore[gameDetails.currentRound - 1]?.isEliminated || false;
         return !currentRoundEliminationStatus;
      });
      if (remainingPlayers.length === 1) {
         declareGameWinner(roomId);
      } else {
         // Increment round number
         gameDetails.closeDeck = [];
         gameDetails.openDeck = [];
         gameDetails.dropDeck = [];
         gameDetails.trump = {};

         gameDetails.players.forEach(player => {
            player.points = 0;
            player.hasTurn = false;
            player.seconds = 0;
            player.cards = [];
            player.leastCalled = false;
            player.isWinner = false;
         });
         gameList.addGames(gameDetails);
         startNewRound(gameDetails);
      }
   } catch (error) {
      const errorMessage = messages.ErrorEndRound;
      const game = { action, roomId, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }
};

// Start new game round 
const startNewRound = async (gameDetails) => {
   const action = "startNewRound-Function";
   try {
      let playerIndex = gameDetails.players.findIndex(player => player.id === gameDetails.randomTurn);
      let nextPlayerIndex = (playerIndex + 1) % gameDetails.players.length;
      // Skip eliminated players to find the next player who should start the round
      while (gameDetails.players[nextPlayerIndex].userScore.roundScore[gameDetails.currentRound - 1].isEliminated) {
         nextPlayerIndex = (nextPlayerIndex + 1) % gameDetails.players.length;

      }

      gameDetails.currentRound += 1;

      // Filter out eliminated players from the list of active players
      const activePlayers = gameDetails.players.filter(player => {
         for (let i = 0; i < gameDetails.currentRound - 1; i++) {
            if (player.userScore.roundScore[i] && player.userScore.roundScore[i].isEliminated) {
               return false;
            }
         }
         return true;
      });

      activePlayers.forEach(player => {
         player.points = 0;
         player.hasTurn = false;
         player.cards = [];
      });

      // Generate new deck and shuffle
      const numCardDeck = Helper.calculateCardDecks(activePlayers.length);
      let cardDeck = [];

      for (let c = 0; c < numCardDeck; c++) {
         const deck = await deckDB.find();
         cardDeck = cardDeck.concat(deck);
      }

      const shuffledDeck = Helper.shuffleArray(cardDeck);

      const closeDeckList = await new CloseDeck().addCard(shuffledDeck);

      // Set trump card and open deck
      const trumpIndex = Math.floor(Math.random() * closeDeckList.length);
      const trump = closeDeckList[trumpIndex];
      trump.isTrump = true;
      closeDeckList.forEach(card => {
         if (card.cardName === trump.cardName) {
            card.isTrump = true;
         }
      });
      closeDeckList.splice(trumpIndex, 1);

      const openDeckCardIndex = Math.floor(Math.random() * closeDeckList.length);
      const [removeOpenDeckCardFromCloseDeck] = closeDeckList.splice(openDeckCardIndex, 1);
      const openDeckList = await new OpenDeck().addCard(removeOpenDeckCardFromCloseDeck);
      // const openDeckList = await new OpenDeck().addCard(closeDeckList.pop());

      // Distribute cards to active players
      const cardToEachPlayer = 7;
      for (let i = 0; i < activePlayers.length; i++) {
         for (let j = 0; j < cardToEachPlayer; j++) {
            if (closeDeckList.length > 0) {
               const card = closeDeckList.pop();
               activePlayers[i].cards.push(card);
               if (!card.isTrump) {
                  activePlayers[i].points += card.points;
               }
            } else {
               console.log("No more cards to deal!");
               break;
            }
         }
      }

      // Update game details with new round details
      gameDetails.players = gameDetails.players.map(player => ({
         ...player,
         points: activePlayers.includes(player) ? player.points : 0,
         hasTurn: activePlayers.includes(player) ? player.hasTurn : false,
         cards: activePlayers.includes(player) ? player.cards : []
      }));
      gameDetails.closeDeck = closeDeckList;
      gameDetails.trump = [trump];
      gameDetails.openDeck = [openDeckList];
      gameDetails.dropDeck = [];
      gameDetails.randomTurn = activePlayers[nextPlayerIndex].id;

      for (let i = 0; i < gameDetails.players.length; i++) {
         const element = gameDetails.players[i];
         if (element.id === gameDetails.randomTurn) {
            gameDetails.players[i].hasTurn = true,
               gameDetails.players[i].seconds = gameDetails.turnClock
         }

      }
      updatePlayerPoints(gameDetails);

      await gameList.addGames(gameDetails);

      const newRoundgameData = gameList.getGameDetails(gameDetails.id)[0];

      let result = {}
      result = newRoundgameData

      updatePlayerPoints(newRoundgameData);

      io.in(gameDetails.id).emit("mainGame", { action: "nexRound", result });

      const countDown = 15;

      gameStartTimer(gameDetails.id, newRoundgameData.players, newRoundgameData.randomTurn, newRoundgameData.turnClock, newRoundgameData.closeDeck, newRoundgameData.dropDeck, countDown);
   } catch (error) {
      console.log(`Has Error ${error}`)
      const errorMessage = messages.ErrorStartingNewRound;
      const game = { roomId: gameDetails.id, action, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(gameDetails.id).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }
};

// Handle a spectator joining the game
const handleJoinSpectator = async (roomId, playerId) => {
   const action = "spectatorJoined";
   try {
      const gameDetails = gameList.getGameDetails(roomId)[0];
      const isPlayerInGame = gameDetails.players.some(player => player.id === playerId);
      const isPlayerEliminated = gameDetails.players.some(player => player.id === playerId && player.userScore.roundScore.some(round => round.isEliminated));
      const isActiveGame = gameDetails.gameStatus === 1 && gameDetails.flag === 1;


      if (isPlayerInGame && isPlayerEliminated && isActiveGame) {

         if (!gameDetails.spectators.some(spectator => spectator.playerId === playerId)) {
            // Add player to spectators list
            const playerDetails = await userDetails(playerId);
            gameDetails.spectators.push({
               playerId: playerId,
               playerName: playerDetails.userName
            });

            await redisService.setData(roomId, gameDetails)
            await gameList.addGames(gameDetails);
            const spectatorPlayer = gameList.getGameDetails(roomId)[0];
            io.in(roomId).emit("mainGame", { action: "spectatorJoined", spectator: { playerId: playerId, playerName: playerDetails.userName }, spectatorPlayer });
         } else {
            io.in(roomId).emit("gameError", "Player is already spectating the game.");
         }

      } else {
         io.in(roomId).emit("gameError", "Cannot join as spectator.");
      }
   } catch (error) {
      const errorMessage = messages.Errorjoinspectator;
      const game = { action, roomId, playerId, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }

};

// Pause  all player turn
const stopAllPlayerTurns = (roomId) => {
   const action = "stopAllPlayerTurns-Function";
   try {
      const gameDetails = gameList.getGameDetails(roomId)[0];
      if (gameDetails) {
         gameDetails.players.forEach(player => {
            player.hasTurn = false;
            player.seconds = 0;
         });
      }
   } catch (error) {
      const errorMessage = messages.errorTryAgain;
      const game = { action, roomId, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }

};

// declare winner
const declareGameWinner = async (roomId) => {
   const action = "gameEnd";
   try {
      const gameDetails = gameList.getGameDetails(roomId)[0];
      const remainingPlayers = gameDetails.players.filter(player => !player.userScore.roundScore[gameDetails.currentRound - 1].isEliminated);
      const winner = remainingPlayers[0];

      io.in(roomId).emit("mainGame", { action: "gameEnd", winner: winner, gameDetails });
      gameDetails.spectators = [];

      stopAllPlayerTurns(roomId);
      if (winner) {
         const gameRoom = await GameDB.findById(roomId);

         if (gameRoom && gameRoom.players) {
            for (const player of gameRoom.players) {
               const playerDetails = await UserDb.findById(player.playerId);
               if (playerDetails) {
                  playerDetails.userStatus = 0;
                  await playerDetails.save();
               }
            }

            gameRoom.gameStatus = 2;
            gameRoom.flag = 2;
            await gameRoom.save();
         }
      }
      endRunningGame(roomId);
   } catch (error) {
      const errorMessage = messages.ErrordeclareGameWinner;
      const game = { action, roomId, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }

};

// Find lowest card index from player cards
const getLowestCardIndex = (cards) => {
   const action = "getLowestCardIndex-Function";
   try {
      // Check for trump cards first
      const trumpCardIndex = cards.findIndex(card => card.isTrump === true);
      if (trumpCardIndex !== -1) {
         return trumpCardIndex;
      }

      // If no trump card is found, find the lowest value card
      let lowestIndex = -1;
      let lowestValue = Number.MAX_VALUE;

      cards.forEach((card, index) => {
         const cardValue = card.points; // Using points as the card value
         if (cardValue < lowestValue) {
            lowestValue = cardValue;
            lowestIndex = index;
         }
      });

      return lowestIndex;
   } catch (error) {
      const errorMessage = messages.ErrorgetLowestCardIndex;
      const game = { action, errorMessage };
      Helper.writeGameErrorLog(game, error);
      // io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }
};

// end game remove data
const endRunningGame = (roomId) => {
   const action = "gameDataDeleted";
   try {
      roomList.removeRoom(roomId)
      gameList.removeGame(roomId);
      redisService.deleteData(roomId);
      io.in(roomId).emit("mainGame", { action: "gameDataDeleted", message: "Game data deleted and not found" });
   } catch (error) {
      const errorMessage = messages.ErrorendRunningGame;
      const game = { action, errorMessage };
      Helper.writeGameErrorLog(game, error);
      io.in(roomId).emit("gameError", { action: `${action}-Error`, message: errorMessage });
   }
}