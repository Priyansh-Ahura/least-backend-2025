const mongoose = require('mongoose');
const { FLAG, USERSTATUS } = require('../../helper/enums');

const userSchema = new mongoose.Schema({
    userName: { type: String },
    guestId: { type: String },
    email: { type: String, required: true },
    device: { type: String, required: true },
    userStatus: { type: Number, enum: USERSTATUS.value, default: USERSTATUS.default },// 0: Not Playing, 1: Playing
    profilePic: { type: String, },
    selectedAvatar: { type: mongoose.Types.ObjectId },
    jwtToken: { type: String },
    currentGame: { type: mongoose.Types.ObjectId },
    isGuest: { type: Boolean, default: false },
    social: { type: Object },
    flag: { type: Number, enum: FLAG.value, default: FLAG.default }, // 1: active', 2: delete
},
    { timestamps: true });

module.exports = mongoose.model('googleUser', userSchema);
