const mongoose = require('mongoose');
const GameRoomDB = require('../../models/Game/game.model');
const UserDB = require('../../models/User/user.model')
const deckDB = require('../../models/Deck/deck.model')
const Helper = require('../../helper/index');
const statusCode = require('../../helper/statuscode');
const config = require('../../../config')
const messages = require('../../helper/messages');
const { GAMETYPEMULTIPLAYER, GAMEROOMRULE } = require('../../helper/enums');
const io = require("../../config/socket");
const redisService = require('../../services/redisService');

const { GamesList, GameDetails, GamePlayer } = require('../../../class/game')
const { Cards, CloseDeck, DropDeck, OpenDeck, ShuffleDeck } = require('../../../class/card');
const { request } = require('../../../app');


gameRoomController = {}

// Create Game Room
gameRoomController.CreateGameRoom = async (req, res) => {
  try {
    const { roomName, maxScoreLimit, turnClock, roomType } = req.body;
    const userId = req.userData.id;
    let roomtype;
    if (roomType === 1) {
      roomtype = GAMEROOMRULE.value[1];
    } else {
      roomtype = GAMEROOMRULE.value[0]
    }

    // Find the user details
    const gameHost = await UserDB.findById(userId).lean();
    if (!gameHost) {
      return res.status(statusCode.NotFound).json({
        message: messages.UserNotFound
      });
    }

    // Check if the user is already hosting a room
    const existingRoom = await GameRoomDB.findOne({
      gameHost: userId,
      $or: [
        { gameStatus: { $ne: 2 } },
        { gameStatus: { $ne: 3 } }
      ],
      flag: { $ne: 2 }
    });
    if (existingRoom) {
      return res.status(statusCode.BadRequest).json({
        message: messages.AlreadyHostingRoom
      });
    }

    const playerinRoom = await GameRoomDB.findOne({
      gameHost: userId,
      gameStatus: { $ne: 1 },
    });
    if (playerinRoom && gameHost.userStatus === 1) {
      return res.status(statusCode.BadRequest).json({
        message: messages.AlreadyinARoom
      });
    }


    // Check if the room name already exists
    const nameExists = await GameRoomDB.findOne({ roomName: roomName, flag: 1 }).lean();
    if (nameExists) {
      return res.status(statusCode.Conflict).json({
        message: messages.GameRoomExists
      });
    }

    let roomCode;
    roomCode = Helper.generateRandomCode();

    const baseURL = 'http://localhost:3001/';
    const roomURL = baseURL + 'join-room/' + roomCode;
    const newGameRoomObject = {
      flag: 1,
      Gametype: GAMETYPEMULTIPLAYER.default,
      gameStatus: 0,
      roomName,
      roomType: roomtype,
      maxScoreLimit,
      turnClock,
      roomCode,
      // players: [{ playerId: gameHost._id, playerName: gameHost.userName }],
      gameHost: userId,
      roomURL
    };

    // Create the new game room
    const result = await GameRoomDB.create(newGameRoomObject);

    if (result) {
      // const gameList = await fetchRoomList();
      io.getIO().emit("liveGames", {
        action: "roomAdd",
        result: result,
      });
    }
    res.status(statusCode.Created).json({
      message: messages.roomCreated,
      result
    });
  } catch (err) {
    const request = req;
    Helper.writeErrorLog(request, err);
    return res.status(statusCode.InternalServerError).send({
      message: messages.errorTryAgain,
      error: err
    });
  }
};

gameRoomController.getRoomDetailsFromCode = async (req, res) => {
  let { id } = req.params;
  try {
    const result = await GameRoomDB.findOne({ roomCode: id })
    if (!result) {
      return res.status(statusCode.NotFound).send({
        message: messages.GameRoomNotFound
      })
    }
    if (result.gameStatus == 2 || result.gameStatus == 3) {
      return res.status(statusCode.NotFound).send({
        message: messages.GameCompleted
      })
    }

    return res.status(statusCode.OK).send({
      message: messages.GameRoomDetails,
      result: [result]
    })

  } catch (err) {
    const request = req;
    Helper.writeErrorLog(request, err);
    return res.status(statusCode.InternalServerError).send({
      message: messages.errorTryAgain,
      error: err
    });
  }

}

// Before Game Start
gameRoomController.gameStart = async (req, res) => {
  try {
    const id = req.params.id;
    const { playerId } = req.body;
    // const hostId = req.userData.id
    const room = await GameRoomDB.findById({ _id: id });

    if (!room) {
      return res.status(statusCode.NotFound).json({
        message: messages.RoomNotFound
      });
    }

    // For postman varification token is belongs to correct host
    // const hostExist = room.gameHost == hostId
    // if (!hostExist) {
    //   return res.status(statusCode.BadRequest).json({
    //     message: messages.HostNotFound
    //   });
    // }

    const alreadyInRoom = await GameRoomDB.findOne({ _id: { $ne: id }, "players.playerId": { $in: playerId } });
    if (alreadyInRoom) {
      return res.status(statusCode.BadRequest).json({
        message: messages.PlayerAlreadyInRoom
      });
    }

    // playerId.unshift(hostId);
    let CloseDeckCardList = new CloseDeck()
    let DropDeckCardList = []
    let OpenDeckCardList = new OpenDeck()

    const numCardDeck = Helper.calculateCardDecks(playerId.length);

    const cardDeck = []
    for (let c = 0; c < numCardDeck; c++) {
      const deck = await deckDB.find();
      for (let a = 0; a < deck.length; a++) {
        const element = deck[a];
        cardDeck.push(element)
      }
    }

    const shuffledDeck = Helper.shuffleArray(cardDeck);

    const closeDeckList = await CloseDeckCardList.addCard(shuffledDeck)

    const trumpIndex = await Math.floor(Math.random() * closeDeckList.length);

    const trump = closeDeckList[trumpIndex]
    if (trump) {
      trump.isTrump = true;
    }

    for (const card of closeDeckList) {
      if (trump.cardName === card.cardName) {
        card.isTrump = true;
      }
    }

    closeDeckList.splice(trumpIndex, 1)

    // const openDeckCardIndex = Math.floor(Math.random() * closeDeckList.length);
    // const removeOpenDeckCardFromCloseDeck = closeDeckList.splice(openDeckCardIndex, 1)[0];
    // const openDeckList = await OpenDeckCardList.addCard(closeDeckList[removeOpenDeckCardFromCloseDeck])

    const openDeckCardIndex = Math.floor(Math.random() * closeDeckList.length);
    const [removeOpenDeckCardFromCloseDeck] = closeDeckList.splice(openDeckCardIndex, 1);
    const openDeckList = await OpenDeckCardList.addCard(removeOpenDeckCardFromCloseDeck);

    const cardToEachPlayer = 7;
    const playerRandomTurn = playerId[Math.floor(Math.random() * playerId.length)];

    const players = []
    for (const playerIds of playerId) {
      let userCards = [];
      let roundScore = [];
      const user = await UserDB.findById({ _id: playerIds })
      const playeObjtoPush = { playerId: user._id, playerName: user.userName ?? user.guestId, totalScore: 0 }

      await UserDB.findByIdAndUpdate(user._id, { userStatus: 1, currentGame: id })
      // push joined player into databse

      await GameRoomDB.findByIdAndUpdate(id, { $push: { players: playeObjtoPush } },);

      const playerObj = {
        id: user._id,
        name: user.userName ?? user.guestId,
        profileImage: user.profilePic,
        points: 0,
        seconds: playerRandomTurn == user._id ? room.turnClock : 0,
        hasTurn: playerRandomTurn == user._id ? true : false,
        flag: user.flag,
      }

      // Check if the player is eliminated before dealing cards

      for (let j = 0; j < cardToEachPlayer; j++) {

        if (closeDeckList.length > 0) {
          let card = closeDeckList.pop();

          userCards.push(card);
          if (card.isTrump == false) {
            playerObj.points += card.points;
          }
          // console.log(playerObj)
          // console.log(`User cards and name: ${userCards.length}, ${playerObj.points}`);
        } else {
          console.log("No more cards to deal!");
          break;
        }
      }
      playerObj.cards = userCards;

      playerObj.userScore = {
        userName: user.userName ?? user.guestId,
        roundScore: [],
        totalScore: 0,
      }
      if (!playerObj.profileImage.includes(config.GOOGLE_IMAGE_BASE_URL)) {
        playerObj.profileImage = await Helper.getValidImageUrl(playerObj.profileImage)
      }
      playerObj.isEliminated = false
      players.push(playerObj)

    }
    let currentRound = 1;
    let spectators = [];
    const roomId = room._id.toString()
    const gameData = new GameDetails(
      id,
      room.roomName,
      room.gameHost,
      room.roomCode,
      room.maxScoreLimit,
      room.turnClock,
      room.gameStatus,
      room.roomType,
      room.flag,
      room.Gametype,
      room.roomURL,
      players,
      closeDeckList,
      playerRandomTurn,
      [trump],
      [openDeckList],
      DropDeckCardList,
      currentRound,
      spectators,
    )

    await redisService.setData(roomId, gameData)
    // io.getIO().emit("mainGame", {action: 'GameStart', roomId:roomId });

    res.status(statusCode.OK).json({
      message: "Game  Started!",
      result: gameData
    });


  } catch (err) {
    const request = req
    Helper.writeErrorLog(request, err)
    return res.status(statusCode.InternalServerError).send({
      message: messages.errorTryAgain,
      error: err
    })
  }
}

// Get Rooms List
gameRoomController.getGameRoomsList = async (req, res) => {
  try {

    const result = await GameRoomDB.find(
      { gameStatus: 0, flag: 1 },
      { _id: 1, roomName: 1, password: 1, players: 1, maxScoreLimit: 1, turnClock: 1, gameHost: 1 })
      .sort({ updatedAt: -1 })
      .lean();


    res.status(statusCode.OK).json({
      message: messages.GameRoomsFetched,
      result
    });
    io.getIO().emit("roomList", { result });
  } catch (err) {
    const request = req
    Helper.writeErrorLog(request, err)
    return res.status(statusCode.InternalServerError).send({
      message: messages.errorTryAgain,
      error: err
    })
  }
};

gameRoomController.fetchGameHistory = async (req, res) => {
  let { limit, page, search, sortBy, dateEnd, dateStart } = req.query;
  const playerId = req.params.playerId;
  const playerIdObj = await UserDB.findById(playerId);

  if (!playerIdObj) {
    return res.status(statusCode.NotFound).json({
      message: messages.UserNotFound
    });
  }

  if (!page) page = 1
  if (!search) search = ''
  if (!limit || limit === 'undefined' || limit === 1) limit = 10

  page = parseInt(page)
  limit = parseInt(limit)

  if (sortBy) sortBy = parseInt(sortBy)

  const skip = page > 0 ? (page - 1) * limit : 0

  const matchObject = {
    gameStatus: { $in: [2, 3] },
    'players.playerId': playerIdObj._id
  };

  try {
    const sortObject = {}
    if (sortBy) {
      switch (sortBy) {
        case 1:
          sortObject.createdAt = -1
          break
        case 2:
          sortObject.createdAt = 1
          break
      }

    } else {
      sortObject.createdAt = -1
    }

    if (search) {
      matchObject.$or = [
        { 'players.playerName': { $regex: search, $options: 'i' } },
        { roomName: { $regex: search, $options: 'i' } }
      ];
    }

    if (dateStart) {
      matchObject.createdAt = {
        $gte: new Date(dateStart),
        $lte: new Date(dateEnd)
      }
    }

    const totalGamesPlayed = await GameRoomDB.countDocuments({
      gameStatus: { $in: [2, 3] },
      'players.playerId': playerIdObj._id
    });

    const winrate = 70;


    const resultAggregate = await GameRoomDB.aggregate([
      {
        $match: matchObject
      },
      {
        $sort: sortObject
      },
      {
        $project: {
          _id: 1,
          roomName: { $ifNull: ["$roomName", "-"] },
          gameHost: { $ifNull: ["$gameHost", "-"] },
          roomCode: { $ifNull: ["$roomCode", 0] },
          maxScoreLimit: { $ifNull: ["$maxScoreLimit", 0] },
          turnClock: { $ifNull: ["$turnClock", 0] },
          flag: { $ifNull: ["$flag", 0] },
          gameStatus: { $ifNull: ["$gameStatus", 0] },
          Gametype: { $ifNull: ["$Gametype", "-"] },
          players: {
            $filter: {
              input: '$players',
              as: 'player',
              cond: { $eq: ['$$player.playerId', playerIdObj._id] }
            }
          },
          createdAt: 1,
          updatedAt: 1
        }
      },
      {
        $addFields: {
          players: {
            $map: {
              input: "$players",
              as: "player",
              in: {
                $mergeObjects: [
                  "$$player",
                  {
                    totalPlayerScore: {
                      $let: {
                        vars: {
                          lastRoundScore: {
                            $cond: [
                              { $gt: [{ $size: "$$player.userScore.roundScore" }, 0] },
                              {
                                $arrayElemAt: [
                                  "$$player.userScore.roundScore",
                                  {
                                    $subtract: [
                                      { $size: "$$player.userScore.roundScore" },
                                      1
                                    ]
                                  }
                                ]
                              },
                              { totalScore: 0 } // fallback object
                            ]
                          }
                        },
                        in: "$$lastRoundScore.totalScore"
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $facet: {
          metaData: [
            { $count: 'totalDocs' }
          ],
          docs: [
            { $skip: skip },
            { $limit: limit }
          ]
        }
      }
    ]);


    let totalDocs = resultAggregate[0]?.metaData[0]?.totalDocs;
    const paginationValues = await Helper.getPaginationValues(totalDocs, limit, page);
    const result = {
      docs: resultAggregate[0].docs,
      totalGamesPlayed,
      winrate,
      ...paginationValues
    };
    // console.log("i've got this results......", result)

    res.status(statusCode.Created).json({
      message: messages.PlayerGameHistory,
      result
    });

  } catch (err) {
    const request = req;
    Helper.writeErrorLog(request, err);
    return res.status(statusCode.InternalServerError).send({
      message: messages.errorTryAgain,
      error: err
    });
  }
}

gameRoomController.GetGameDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await GameRoomDB.findOne({ _id: id })
    if (!result) {
      return res.status(statusCode.NotFound).send({
        message: messages.GameRoomNotFound
      })
    }
    if (result.gameStatus == 2 || result.gameStatus == 3) {
      return res.status(statusCode.NotFound).send({
        message: messages.GameCompleted
      })
    }

    return res.status(statusCode.OK).send({
      message: messages.GameRoomDetails,
      result
    })

  } catch (err) {
    const request = req;
    Helper.writeErrorLog(request, err);
    return res.status(statusCode.InternalServerError).send({
      message: messages.errorTryAgain,
      error: err
    });
  }
}

module.exports = gameRoomController
