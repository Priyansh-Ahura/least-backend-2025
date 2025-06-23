const mongoose = require('mongoose');
const {FLAG} = require('../../helper/enums')

const avatarSchema = new mongoose.Schema({
    avatarLink: { type: String, required: true },
    isPremium: { type: Boolean, required: true },
    price: { type: Number },
    flag: { type: Number, enum: FLAG.value, default: FLAG.default }, // 1: active', 3: delete, 2: Inactive
  
}, { timestamps: true })


module.exports = mongoose.model('avatars', avatarSchema);
