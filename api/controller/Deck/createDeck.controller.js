const Helper = require("../../helper/index");
const messages = require("../../helper/messages");
const statusCode = require("../../helper/statuscode");
const cardDB = require("../../models/Deck/deck.model")

const cardDeck = {}

cardDeck.createDeck = async (req, res) => {
    try {
        const typesOfCard = ['DIAMONDS', 'HEARTS', 'CLUBS', 'SPADES'];
        const ranks = ['ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king'];

        const cards = [];
        let uniqueID = 1;

        for (const type of typesOfCard) {
            for (const rank of ranks) {
                let cardName = '';
                let cardPoint = 0;
                let isJoker = false;

                if (rank === 'jack') {
                    cardName = `${rank}`;
                    cardPoint = 10;
                } else if (rank === 'queen') {
                    cardName = `${rank}`;
                    cardPoint = 10;
                } else if (rank === 'king') {
                    cardName = `${rank}`;
                    cardPoint = 10;
                } else if (rank === 'ace') {
                    cardName = `${rank}`;
                    cardPoint = 1;
                } else {
                    cardName = `${rank}`;
                    // Convert the rank to an integer if it's a number word
                    switch (rank) {
                        case 'two':
                            cardPoint = 2;
                            break;
                        case 'three':
                            cardPoint = 3;
                            break;
                        case 'four':
                            cardPoint = 4;
                            break;
                        case 'five':
                            cardPoint = 5;
                            break;
                        case 'six':
                            cardPoint = 6;
                            break;
                        case 'seven':
                            cardPoint = 7;
                            break;
                        case 'eight':
                            cardPoint = 8;
                            break;
                        case 'nine':
                            cardPoint = 9;
                            break;
                        case 'ten':
                            cardPoint = 10;
                            break;
                        default:
                            cardPoint = 0;
                            break;
                    }
                }

                cards.push({
                    cardName,
                    typeOfCard: type,
                    isTrump: isJoker,
                    points: cardPoint,
                    uniqueID
                });

                uniqueID++;
            }
        }

        // Insert only 52 cards into the database
        const shuffledCards = cards.slice(0, 52);
        await cardDB.insertMany(shuffledCards);

        return res.status(200).json({ message: "Deck created successfully." });
    } catch (err) {
        console.error("Error creating deck:", err);
        return res.status(500).json({ message: "Error occurred while creating deck." });
    }
}

module.exports = cardDeck;