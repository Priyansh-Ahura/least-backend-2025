const express = require('express')
const router = express.Router()
const SupportValidator = require('../validator/support.validator')
const SupportFeedbackController = require('../controller/Support/support.controller')
const MakeRequest = require('../middleware/make-request')
const { multerService } = require('../helper/uploadimage')
const upload = multerService('support')

router.post('/createSupportTicket', MakeRequest, upload.fields([{ name: 'attachment', maxCount: 1 }]), SupportValidator.CreateSupportTicket, SupportFeedbackController.CreateSupportTicket)
router.post('/addFeedBack', MakeRequest, upload.none(), SupportValidator.GiveFeedback, SupportFeedbackController.AddFeedBack)
router.get('/getSupportRequestList',  MakeRequest, SupportFeedbackController.getSupportRequestList)
router.get('/getFeedBackList',  MakeRequest, SupportFeedbackController.getFeedBackList)

module.exports = router