const Helper = require('../../helper/index')
const messages = require('../../helper/messages')
const statusCode = require('../../helper/statuscode')
const config = require('../../../config')
const SupportFeedbackDB = require('../../models/Support/support.model')
const SupportDB = SupportFeedbackDB.Support
const FeedbackDB = SupportFeedbackDB.feedback


const SupportFeedbackController = {}

SupportFeedbackController.CreateSupportTicket = async (req, res) => {
    const {
        Name, Email, Issue, MobileNo, Description, Attachment
    } = req.body

    try {
        const supportObject = {
            Name: Name,
            Email: Email,
            Issue: Issue,
            MobileNo: MobileNo,
            Description: Description,
            Attachment: Attachment,
        }

        function validateMobileNo(mobileNo) {
            const mobileNoRegex = /^[6-9]\d{9}$/;
            return mobileNoRegex.test(mobileNo);
        }

        if (!validateMobileNo(MobileNo)) {
            return res.status(statusCode.BadRequest).json({
                message: messages.invalidMobileNo,
            });
        }

        if (!req.files.mimetype === 'image/jpeg' || !req.files.mimetype === 'image/jpg' || !req.files.mimetype === 'image/png' || !req.files.mimetype === 'image/svg' || !req.files.mimetype === 'image/jpeg') {
            return res.status(statusCode.BadRequest).json({
                message: 'Please upload profile picture with extension jpg, jpeg, png, svg',
            });
        }

        if (req.files.attachment != null) {
            if (req?.files?.attachment[0]?.path) supportObject.Attachment = req.files.attachment[0].path
        }

        const SupportTicket = await SupportDB.create(supportObject)

        const supportMailObj = {
            subject: `Need Support!`,
            text: `Name: ${Name}\nEmail: ${Email}\nIssue: ${Issue}\nMobileNo: ${MobileNo}\nDescription: ${Description}`,
        }

        if (req.files.attachment != null) {
            supportMailObj.attachmentName = req?.files?.attachment[0]?.originalname,
                supportMailObj.attachmentPath = req?.files?.attachment[0]?.path
        }
        Helper.sendSupportMail(supportMailObj)

        return res.status(statusCode.Accepted).json({
            message: messages.supportTicketCreated,
            result: SupportTicket
        })
    } catch (err) {
        const request = req
        Helper.writeErrorLog(request, err)
        return res.status(statusCode.InternalServerError).json({
            message: messages.errorTryAgain,
            error: err
        })
    }
}

SupportFeedbackController.AddFeedBack = async (req, res) => {
    const { Rating, Name, Email, FeatureFeedback } = req.body

    try {
        const supportObject = {
            Name: Name,
            Email: Email,
            Rating: Rating,
            FeatureFeedback: FeatureFeedback
        }

        const Feedback = await FeedbackDB.create(supportObject)

        const supportMailObj = {
            subject: `Feedback`,
            text: `Name: ${Name}\nEmail: ${Email}\nRating: ${Rating}\nFeature feedback: ${FeatureFeedback}`,

        }

        Helper.sendSupportMail(supportMailObj)

        return res.status(statusCode.Accepted).json({
            message: messages.feedBackCreated,
            result: Feedback
        })

    } catch (err) {
        const request = req
        Helper.writeErrorLog(request, err)

        return res.status(statusCode.InternalServerError).json({
            message: messages.errorTryAgain,
            error: err
        })
    }
}


SupportFeedbackController.getSupportRequestList = async (req, res) => {
    let { limit, page, search, dateStart, dateEnd } = req.query

    if (!page) page = 1
    if (!search) search = ''
    if (!limit || limit === 'undefined' || limit === 1) limit = 10
    page = parseInt(page)
    limit = parseInt(limit)

    const matchObject = {}

    matchObject.flag = 1
    try {
        if (search) {
            matchObject.$or = [
                { Name: { $regex: search, $options: 'i' } },
                { Email: { $regex: search, $options: 'i' } },
                { Issue: { $regex: search, $options: 'i' } },
                { Description: { $regex: search, $options: 'i' } }
            ]
        }


        if (dateStart) {
            matchObject.createdAt = {
                $gte: dateStart,
                $lte: dateEnd
            }
        }


        let totalDocs = await SupportDB.countDocuments(matchObject).lean()
        if (!totalDocs) {
            totalDocs = 0
        }

        const resultData = await SupportDB.find(matchObject,
            {
                Name: 1,
                Email: 1,
                Issue: 1,
                Description: 1,
                Attachment: 1,
                flag: 1,
                _id: 1
            }
        ).sort({ createdAt: -1 })
            .skip(page > 0 ? ((page - 1) * limit) : 0)
            .limit(limit)
            .lean();


        const paginationValues = await Helper.getPaginationValues(totalDocs, limit, page)

        const result = { docs: resultData, ...paginationValues }


        for (let i = 0; i < result.docs.length; i++) {
            const singleData = result.docs[i]

            if (singleData.Attachment) {
                singleData.Attachment = await Helper.getValidImageUrl(singleData.Attachment)
            }
        }

        return res.status(statusCode.OK).json({
            message: messages.SupportRequestRetrieved,
            result
        })

    } catch (err) {
        const request = req
        Helper.writeErrorLog(request, err)

        return res.status(statusCode.InternalServerError).json({
            message: messages.errorTryAgain,
            error: err
        })
    }
}

SupportFeedbackController.getFeedBackList = async (req, res) => {
    let { limit, page, search, dateStart, dateEnd } = req.query

    if (!page) page = 1
    if (!search) search = ''
    if (!limit || limit === 'undefined' || limit === 1) limit = 10
    page = parseInt(page)
    limit = parseInt(limit)

    const matchObject = {}

    matchObject.flag = 1
    try {
        if (search) {
            matchObject.$or = [
                { Rating: { $regex: search, $options: 'i' } },
                { Name: { $regex: search, $options: 'i' } },
                { Email: { $regex: search, $options: 'i' } },
                { FeatureFeedback: { $regex: search, $options: 'i' } }
            ]
        }

        if (dateStart) {
            matchObject.createdAt = {
                $gte: dateStart,
                $lte: dateEnd
            }
        }

        let totalDocs = await FeedbackDB.countDocuments(matchObject).lean()
        if (!totalDocs) {
            totalDocs = 0
        }



        const resultData = await FeedbackDB.find(matchObject, { Rating: 1, Name: 1, Email: 1, FeatureFeedback: 1,Attachment:1, flag: 1, _id: 1 }).sort({ createdAt: -1 })
            .skip(page > 0 ? ((page - 1) * limit) : 0)
            .limit(limit)
            .lean()

        const paginationValues = await Helper.getPaginationValues(totalDocs, limit, page)

        const result = { docs: resultData, ...paginationValues }

        return res.status(statusCode.OK).json({
            message: messages.SupportRequestRetrieved,
            result
        })

    } catch (err) {
        const request = req
        Helper.writeErrorLog(request, err)

        return res.status(statusCode.InternalServerError).json({
            message: messages.errorTryAgain,
            error: err
        })
    }
}



module.exports = SupportFeedbackController;