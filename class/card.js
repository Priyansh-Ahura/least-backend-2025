class DropDeck {
    constructor() {
        this.DropDeckCardList = [];
    }
    addCard(cardDetails) {

        this.DropDeckCardList.push(cardDetails);
        return cardDetails;
    }
}

class OpenDeck {
    constructor() {
        this.OpenDeckCardList = [];
    }
    addCard(cardDetails) {

        this.OpenDeckCardList.push(cardDetails);
        return cardDetails;
    }
}

class CloseDeck {
    constructor() {
        this.CloseDeckCardList = [];
    }
    addCard(cardDetails) {

        this.CloseDeckCardList.push(cardDetails);
        return cardDetails;
    }
}

class ShuffleDeck {
    constructor() {
        this.ShuffleDeckCardList = [];
    }
    addCard(cardDetails) {

        this.ShuffleDeckCardList.push(cardDetails);
        return cardDetails;
    }
}

class Cards {
    constructor(id, cardName, typeOfCard,
        isTrump,
        cardPoint,
        uniqueID,
    ) {
        this.id = id;
        this.cardName = cardName;
        this.typeOfCard = typeOfCard;
        this.isTrump = isTrump;
        this.cardPoint = cardPoint;
        this.uniqueID = uniqueID;

    }
}

module.exports = {
    DropDeck, OpenDeck, CloseDeck, ShuffleDeck, Cards
};