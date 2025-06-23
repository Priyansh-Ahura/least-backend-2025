const express = require('express');
const router = express.Router();
const gameRoomController = require('../controller/Game/game.controller');
const makeRequest = require('../middleware/make-request');
const UserCheckAuth = require('../middleware/user-check-auth')
const gameValidator = require('../validator/game.Validator')


router.post('/createGameRoom/', makeRequest, UserCheckAuth, gameValidator.createGameRoom,  gameRoomController.CreateGameRoom);
router.get('/game-room-list/',makeRequest, UserCheckAuth, gameRoomController.getGameRoomsList);
router.get('/getGameDetails/:id',makeRequest, UserCheckAuth, gameRoomController.GetGameDetails);
router.get('/getGameDetailsFromCode/:id',makeRequest, UserCheckAuth, gameRoomController.getRoomDetailsFromCode);
router.post('/beforeGameStart/:id', makeRequest, UserCheckAuth, gameRoomController.gameStart);
router.get('/getUserGameHistory/:playerId',makeRequest, UserCheckAuth, gameRoomController.fetchGameHistory);

module.exports = router;
