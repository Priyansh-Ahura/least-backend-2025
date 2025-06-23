const express = require('express');
const router = express.Router();
const userController = require("../controller/User/user.controller");
const userValidator = require("../validator/user.validator");
const { multerService } = require('../helper/uploadimage')
const makeRequest = require('../middleware/make-request');
const UserCheckAuth = require('../middleware/user-check-auth');
const upload = multerService('profilePic')

router.put('/updateProfile', makeRequest, UserCheckAuth, upload.none(), userController.editProfile);
router.post('/socialSignin', makeRequest, userValidator.socialSignin, userController.socialSignin);
router.put('/linkGoogleAccount', makeRequest, UserCheckAuth, userValidator.socialSignin, userController.guestGoogleSigninTransfer);
router.post('/guestLogin', makeRequest, userController.guestLogin);
router.patch('/getUserDetails', makeRequest, UserCheckAuth, userController.getUserDetails);



module.exports = router;