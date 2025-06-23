
class GamesList {
    constructor() {
        this.games = [];
    }

    addGames(gameDetails) {
        const existingGame = this.games.find((game) => game.id === gameDetails.id);
        if (existingGame) {
            // If game already exists, update it
            Object.assign(existingGame, gameDetails);
        } else {
            // Otherwise, add a new game
            this.games.push(gameDetails);
        }
        return gameDetails;
    }

    getGameDetails(roomId) {
        console.log("Game data retrieved from class, RoomId : " + roomId)
        let gameDetails = this.games.filter((game) => game.id === roomId)
        return gameDetails;
    }

    removeGame(roomId) {
        const initialLength = this.games.length;
        this.games = this.games.filter((game) => game.id !== roomId);
        const removed = this.games.length < initialLength;
        // console.log(removed ? `Removed game with id: ${roomId}` : `No game found with id: ${roomId}`);
        return removed;
    }

    changeGameStatus(roomId, newStatus) {
        let gameDetails = this.getGameDetails(roomId);
        gameDetails[0].gameStatus = newStatus;
        // console.log(`Game status updated: ${gameDetails[0].gameStatus}`);
        return gameDetails;
    }
}

class GameDetails {
    constructor(id,
        roomName,
        gameHost,
        roomCode,
        maxScoreLimit,
        turnClock,
        gameStatus,
        roomType,
        flag,
        Gametype,
        roomURL, players,
        closeDeck,
        randomTurn,
        trump,
        openDeck,
        dropDeck,
        currentRound,
        spectators,
    ) {
        this.id = id;
        this.roomName = roomName;
        this.gameHost = gameHost;
        this.roomCode = roomCode;
        this.maxScoreLimit = maxScoreLimit;
        this.turnClock = turnClock;
        this.gameStatus = gameStatus;
        this.roomType = roomType;
        this.flag = flag;
        this.Gametype = Gametype;
        this.roomURL = roomURL;
        this.players = players;
        this.closeDeck = closeDeck;
        this.randomTurn = randomTurn;
        this.trump = trump;
        this.openDeck = openDeck;
        this.dropDeck = dropDeck;
        this.currentRound = currentRound;
        this.spectators = spectators;
    }
}
class GamePlayer {
    constructor(id, name, profileImage, points, hasTurn, seconds, cards, flag, userScore) {
        this.id = id;
        this.name = name;
        this.profileImage = profileImage;
        this.points = points;
        this.hasTurn = hasTurn;
        this.seconds = seconds;
        this.cards = cards;
        this.flag = flag;
        this.userScore = userScore;
    }
}

class RoomData {
    constructor() {
        this.roomData = [];
    }

    addRoom(roomDetails) {
        this.roomData.push(roomDetails);
        return roomDetails;
    }
    removeRoom(roomId) {
        // Filter out the room with the specified roomId and update roomData
        this.roomData = this.roomData.filter((room) => {
            console.log(`This iS the room ${room}`)
            room.id !== roomId
        });

        // Log the updated roomData for verification
        //    console.log(`Room data after removal:`, this.roomData);

        // Return the updated roomData
        return this.roomData;

    }

    addPlayer(roomId, playerId) {

        const room = this.roomData.find(room => room.id === roomId);

        // If the room exists, add the playerId to the players array
        if (room) {
            if (room.players.includes(playerId)) {
                console.log("Player already exists");
                return room;
            } else {

                room.players.push(playerId);
                return room;
            }
        } else {
            // If the room doesn't exist, return an error or null
            return null;
        }
    }

    getRoomDetails(id) {
        let roomDetails = this.roomData.filter((room) => room.id === id)
        return roomDetails.length > 0 ? roomDetails : null;
    }

    getRoomPlayerDetails(playerId) {


        if (this.roomData.length > 0) {

            for (let room of this.roomData) {
                for (let player of room.players) {

                    if (player === playerId) {
                        return room.id; // Return the room's id if a match is found
                    }
                }
            }

            return null;

        } else {
            return null;
        }

    }

    removePlayer(roomId, playerId) {
        const room = this.roomData.find(room => room.id === roomId);
        if (room) {
            const playerIndex = room.players.indexOf(playerId);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                return room;
            } else {
                return `Player with ID ${playerId} not found in room ${roomId}.`;
            }
        } else {
            return `Room with ID ${roomId} not found.`;
        }
    }
}


module.exports = {
    GamesList, GameDetails, GamePlayer, RoomData
};