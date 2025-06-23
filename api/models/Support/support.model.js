const mongoose = require('mongoose')
const { FLAG } = require('../../helper/enums')

const Support = new mongoose.Schema(
    {
        Name: { type: String, required: true },
        Email: { type: String, required: true },
        Issue: { type: String, required: true },
        MobileNo: { type: Number, required: false },
        Description: { type: String, required: true },
        Attachment: { type: String },
        flag: { type: Number, enum: FLAG.value, default: FLAG.default }
    },
    {
        timestamps: true
    }
);

const feedback = new mongoose.Schema(
    {
        Rating: { type: String, required: true },
        Name: { type: String, required: true },
        Email: { type: String, required: true },
        FeatureFeedback: { type: String },
        profilePic: { type: String },
        flag: { type: Number, enum: FLAG.value, default: FLAG.default }
    },
    {
        timestamps: true
    }
);

module.exports = {
    Support: mongoose.model('support', Support),
    feedback: mongoose.model('feedback', feedback),
}