const statusCode = require('../../helper/statuscode')
const AvatarDb = require('../../models/avatar/avatar.model')
const messages = require('../../helper/messages')
const Helper = require('../../helper/index')
const config = require('../../../config')

const avatarController = {}

avatarController.addAvatar = async (req, res) => {
    const { isPremium } = req.body
    try {
        console.log(req.file)
        const createObj = {
            avatarLink: req.file.path,
            isPremium: isPremium
        }

        const result = await AvatarDb.create(createObj)

        return res.status(statusCode.OK).json({
            message: messages.AvatarAdded,
            result
        })

    } catch (error) {
        Helper.writeErrorLog(req, error);

        return res.status(statusCode.InternalServerError).json({
            message: messages.ErrorTryAgain,
        });
    }
}

avatarController.getAvatars = async (req, res) => {
    try {
        const result = await AvatarDb.find({flag: 1});

for (let i = 0; i < result.length; i++) {
    const element = result[i];

    element.avatarLink = await Helper.getValidImageUrl(element.avatarLink)
    
}

        return res.status(statusCode.OK).json({
            message: messages.AvatarsFetched,
            result
        });

    } catch (error) {
        Helper.writeErrorLog(req, error);

        return res.status(statusCode.InternalServerError).json({
            message: messages.ErrorTryAgain,
        });
    }
};


module.exports = avatarController