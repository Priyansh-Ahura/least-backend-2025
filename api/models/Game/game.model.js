const mongoose = require('mongoose');
const { GAMESTATUS, FLAG, GAMETYPEMULTIPLAYER, GAMEROOMRULE } = require('../../helper/enums');
const { ObjectId } = require('mongoose').Types

const createdGameRoomSchema = new mongoose.Schema(
  {
    roomName: { type: String, required: true },
    gameHost: { type: ObjectId, ref: 'User', required: true },
    players: [{
      _id: false,
      playerId: { type: ObjectId, ref: 'User' },
      playerName: { type: String },
      tempSocketId: { type: String },
      userScore: {
        totalScore: {type: Number},
        roundScore: { type: Array, default: [] }
      },
    }],
    roomCode: { type: String },
    maxScoreLimit: { type: Number, required: true },
    turnClock: { type: Number, required: true },
    gameStatus: { type: Number, enum: GAMESTATUS.value, default: GAMESTATUS.default }, // 0 : Waiting, 1 : Active, 2 : Completed 3: Abandon
    roomType: { type: Number, enum: GAMEROOMRULE.value, default: GAMEROOMRULE.default }, //0 : Public Room, 1: Private Room
    flag: { type: Number, enum: FLAG.value, default: FLAG.default }, // 1: active', 3: delete, 2: Inactive
    Gametype: { type: String, enun: GAMETYPEMULTIPLAYER.value }, // default : MULTIPLAYER
    roomURL: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('GameRoom', createdGameRoomSchema);
