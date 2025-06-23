const express = require('express');
const router = express.Router();
const cardDeckController = require("../controller/Deck/createDeck.controller");

router.post('/createDeck', cardDeckController.createDeck);

module.exports = router;