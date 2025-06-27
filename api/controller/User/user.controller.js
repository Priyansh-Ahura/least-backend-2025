const statusCode = require('../../helper/statuscode');
const jwt = require('jsonwebtoken');
const User = require('../../models/User/user.model');
const messages = require('../../helper/messages');
const Helper = require('../../helper/index')
const config = require('../../../config')
const GameDB = require('../../models/Game/game.model');
const { default: mongoose } = require('mongoose');
const userController = {};

//Social login
userController.socialSignin = async (req, res) => {
    try {
        const { name, email, photoUrl, userSocialId } = req.body


        let user = await User.findOne({ email: email }).lean()

        if (user && user.flag === 3) {
            return res.status(400).json({
                message: 'user blocked'
            })
        }
        // login
        if (!user) {

            const userObj = {
                userName: name,
                email: email,
                device: req.body.device ? req.body.device : "",
                profilePic: photoUrl,
            }


            user = await User.create(userObj)




            const jwtToken = jwt.sign({
                email: user.email,
                id: user._id
            }, config.JWT_KEY,)
            const device = req.body.device
            const updateObj = {
                jwtToken,
                device,
                social: {
                    type: "G",
                    id: userSocialId,
                }

            }

            await User.updateOne({ _id: user._id }, updateObj)

            return res.status(200).json({ message: messages.UserLoggedIn, token: jwtToken })

        } else {
            const jwtToken = jwt.sign({
                email: user.email,
                id: user._id
            }, process.env.JWT_KEY,)
            const device = req.body.device
            const updateObj = {
                jwtToken,
                device,
                social: {
                    type: "G",
                    id: userSocialId,
                }

            }

            await User.updateOne({ _id: user._id }, updateObj)

            return res.status(200).json({ message: messages.UserLoggedIn, token: jwtToken })

        }
        // return res.status(400).json({ message: "Account Doesn't Exist! Please Register First", error: "Account Doesn't Exist! Please Register First" })


    } catch (error) {
        Helper.writeErrorLog(req, error);

        return res.status(statusCode.InternalServerError).json({
            message: messages.ErrorTryAgain,
        });
    }
}

//Guest login
userController.guestLogin = async (req, res) => {
    const { device, guestId } = req.body
    // console.log("im someone's body ", req.body)
    try {
        let user;
        if (!guestId) {
            const guestId = await Helper.generateUniqueId(); // Generate a unique identifier for the guest  
            const guestUser = {
                guestId: `Guest_${guestId}`,
                email: `guest_${guestId}@least.com`, // Generate a unique email for the guest
                isGuest: true,
                profilePic: req.body.profilePic || '', // Optional: if you want to set a default profile picture
                device: device || '',
            };

            user = await User.create(guestUser);

            const jwtToken = jwt.sign({
                email: user.email,
                id: user._id,
            }, process.env.JWT_KEY);

            const updateObj = {
                jwtToken,
                device: guestUser.device,
                social: {
                    type: "GUEST",
                    id: User.guestId,
                },
            };

            await User.updateOne({ _id: user._id }, updateObj);

            // return res.status(200).json({ message: messages.UserLoggedIn, token: jwtToken });
            return res.status(200).json({ message: messages.UserLoggedIn, token: jwtToken });
        } else {
            // user = await User.findOne({ userName: guestId }).lean;
            user = await User.findOne({ userName: guestId }).lean();

            if (!user) {
                return res.status(400).json({ message: messages.UserNotFound });
            }

            const jwtToken = jwt.sign({
                email: user.email,
                id: user._id,
            }, process.env.JWT_KEY);

            const updateObj = {
                jwtToken,
                device: device,
                social: {
                    type: "GUEST",
                    id: guestId,
                },
            };

            await User.updateOne({ _id: user._id }, updateObj);
            console.log("hey im guest and im in yay", User)

            return res.status(200).json({ message: messages.UserLoggedIn, token: jwtToken });

        }


    } catch (error) {
        const request = req;
        Helper.writeErrorLog(request, error);
        return res.status(statusCode.InternalServerError).send({
            message: messages.ErrorTryAgain,
        });
    }
};

//Get User Details
userController.getUserDetails = async (req, res) => {
    try {
        const id = req.userData._id
        const userData = await User.findOne({ _id: id }).select('_id email userName isGuest guestId device profilePic jwtToken social.id flag userStatus currentGame ')

        if (userData === null || userData.flag !== 1) {
            return res.status(statusCode.Unauthorized).json({
                message: 'Auth fail'
            })
        }

        if (!userData.userName) {
            userData.userName = userData.guestId
        }
        if (userData.profilePic && !userData.profilePic.includes('https://lh3.googleusercontent.com')) {
            userData.profilePic = await Helper.getValidImageUrl(userData.profilePic);
        }
        return res.status(statusCode.OK).json({
            message: messages.profileReturned,
            result: userData
        })

    } catch (error) {
        const request = req;
        Helper.writeErrorLog(request, error);
        return res.status(statusCode.InternalServerError).send({
            message: messages.ErrorTryAgain,
        });
    }
}

// User Profile Edit
userController.editProfile = async (req, res) => {
    let { userName, avatar } = req.body
    // console.log(req.userData)
    const id = req.userData._id;

    try {

        // if (!req?.file?.path) {
        //     return res.status(statusCode.BadRequest)
        //         .json({
        //             message: messages.noDataFound
        //         })
        // }
        // const updatedImage = req.files.profilePic


        const userUpdateObj = {}
        if (userName) {
            userUpdateObj.userName = userName?.trim()
            const isExist = await User.findOne(userName).lean();
            if (isExist) {
                return res.status(statusCode.Unauthorized).json({
                    message: messages.Usernameistaken
                })
            }

        } else if (avatar) {
            if (avatar?.includes(config.URL)) {
                avatar = avatar.replace(config.URL, '');
            }

            userUpdateObj.profilePic = avatar
        }


        const result = await User.findByIdAndUpdate(
            id, userUpdateObj, { new: true, runValidators: true }
        )
        result.profilePic = await Helper.getValidImageUrl(result.profilePic)

        return res.status(statusCode.OK).json({
            message: messages.profileUpdated,
            result
        })

    } catch (error) {
        const request = req;
        Helper.writeErrorLog(request, error);
        return res.status(statusCode.InternalServerError).send({
            message: messages.ErrorTryAgain,
        });
    }
}


userController.guestGoogleSigninTransfer = async (req, res) => {
    const id = req.userData._id
    const { name, email, photoUrl, userSocialId } = req.body

    try {


        let user = await User.findOne({ email: email }).lean()

        if (user) {
            return res.status(statusCode.Conflict).json({
                message: messages.GoogleAlreadyLinked
            })
        }
        if (user && user.flag == 3) {
            return res.status(statusCode.Conflict).json({
                message: messages.GoogleAccountDisable
            })
        }


        const updateObj = {
            userName: name,
            email: email,
            device: req.body.device ? req.body.device : "",
            profilePic: photoUrl,
            isGuest: false,
            social: {
                type: "G",
                id: userSocialId,
            }
        }


        const result = await User.findByIdAndUpdate({ _id: id }, updateObj, { new: true, runValidators: true })

        return res.status(statusCode.OK).json({
            message: messages.GoogleAccountLinked,
            result: result
        })


    } catch (err) {
        const request = req;
        Helper.writeErrorLog(request, err);
        return res.status(statusCode.InternalServerError).send({
            message: messages.ErrorTryAgain,
        });
    }
}


module.exports = userController;