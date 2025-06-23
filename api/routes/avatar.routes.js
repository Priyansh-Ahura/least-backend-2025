const express = require('express')
const router = express.Router()
const avatarController = require('../controller/avatar/avatar.controller')
const MakeRequest = require('../middleware/make-request')

const { multerService } = require('../helper/uploadimage')
const upload = multerService('avatar')

router.post('/addAvatar', MakeRequest, upload.single('avatar'), avatarController.addAvatar)
router.get('/getAvatarList', MakeRequest, avatarController.getAvatars)

module.exports = router