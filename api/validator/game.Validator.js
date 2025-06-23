const messages = require("../helper/messages");
const statusCode = require("../helper/statuscode");

const GameValidator = {}

GameValidator.createGameRoom = async ( req, res, next) => {
    const { roomName, turnClock, maxScoreLimit } = req.body;
    
    if(!roomName){
        return res.status(statusCode.BadRequest).json({ message: messages.roomNameRequire });
    }

    if (maxScoreLimit > 500) {
        return res.status(statusCode.UnprocessableEntity).json({ message: messages.maxScoreLimit});
    } 

    if(turnClock > 60){
        return res.status(statusCode.UnprocessableEntity).json({ message: messages.turnClockLimit});
    }

    next()
}

module.exports = GameValidator;