const mongoose = require('mongoose');
const { GAMESTATUS, FLAG } = require('../../helper/enums');
const { ObjectId } = require('mongoose').Types


const createdEachPlayerGameDetailsSchema = new mongoose.Schema(
    {
        roomId: { type: ObjectId },
        playerId: { type: ObjectId },
        roundScore: { type: Object },
        overAllScore: { type: Number },
        isEliminated: { type: Boolean },
        playerName: { type: String },
        flag: { type: Number, enum: FLAG.value, default: FLAG.default },
    },
    { timestamps: true }
);


module.exports = mongoose.model('GamePlayerData', createdEachPlayerGameDetailsSchema);
