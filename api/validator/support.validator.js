const messages = require('../helper/messages')
const statusCode = require('../helper/statuscode')
const Helper = require('../helper/index')

const SupportFeedbackValidator = {}


SupportFeedbackValidator.CreateSupportTicket = async (req, res, next) => {
    const {
        Name, Email, Issue, Description
    } = req.body

    const name = Name?.trim()
    const email = Email?.trim()
    const issue = Issue?.trim()
    const description = Description?.trim()


    if (!name ||
        !email ||
        !issue ||
        !description) {
        return res.status(statusCode.BadRequest).json({
            message: messages.allFieldsRequired
        })
    }

    if (!Helper.isValidEmailId(email) || email.length >= 50) {
        return res.status(statusCode.UnprocessableEntity).json({
            message: messages.validationError,
            error: 'Please enter a valid Email Id'
        })
    }
    next()
}


SupportFeedbackValidator.GiveFeedback = async (req, res, next) => {
    const {
        Rating, Name, Email
    } = req.body
    const rating = Rating?.trim()
    const name = Name?.trim()
    const email = Email?.trim()

    if (!name ||
        !email ||
        !rating
    ) {
        return res.status(statusCode.BadRequest).json({
            message: messages.allFieldsRequired
        })
    }

    if (!Helper.isValidEmailId(email) || email.length >= 50) {
        return res.status(statusCode.UnprocessableEntity).json({
            message: messages.validationError,
            error: 'Please enter a valid Email Id'
        })
    }
    next()

}


module.exports = SupportFeedbackValidator