const mongoose = require('mongoose');

// const cardSchema = new mongoose.Schema({
//   cardName: { type: String, required: true },
//   typeOfCard: { type: String, required: true },
//   isJoker: { type: Boolean, default: false },
//   cardPoint: { type: Number, required: true },
//   uniqueID: { type: Number, required: true, unique: true }
// },{ timestamps: true });

const cardSchema = new mongoose.Schema({
  cardName: { type: String, required: true },
  isTrump: { type: Boolean, default: false },
  points: { type: Number, required: true },
  uniqueID: { type: Number, required: true, unique: true },
  typeOfCard: { type: String, required: true }
},{ timestamps: true });


module.exports = mongoose.model('Card', cardSchema);


