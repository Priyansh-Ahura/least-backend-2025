const messages = require('../helper/messages');
const statusCode = require('../helper/statuscode');

const userValidator = {}

userValidator.socialSignin = async (req, res, next) => {
    const { name, email, userSocialId } = req.body;

    if (!name || !email || !userSocialId) {
        return res.status(statusCode.BadRequest).json({ message: "All Fields Are Required" })
    }
    next();
}

userValidator.editProfile = async (req, res, next) => {
    const { userName } = req.body;

    if (!userName) {
        return res
            .status(statusCode.UnprocessableEntity)
            .json({ message: 'validation error', errors: "All The Fields Are Required" })
    }
    if( userName.lenght >= 50){
        return res
        .status(statusCode.UnprocessableEntity)
        .json({ message: 'Validation error', errors: 'The name can not be greater than fifty latters.' })
    }
    next()
}

module.exports = userValidator;