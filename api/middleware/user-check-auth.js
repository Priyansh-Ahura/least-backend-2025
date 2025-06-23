const jwt = require('jsonwebtoken');
const User = require('../models/User/user.model');
const config = require('../../config');
const statusCode = require('../helper/statuscode');
const messages = require('../helper/messages');

const UserCheckAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(statusCode.Unauthorized).json({ message: messages.authFail });
        }
            // Verify token
        const decoded = jwt.verify(token, config.JWT_KEY);
        const { id } = decoded;
        console.log(id)

        // Find user by ID
        const userData = await User.findOne({ _id: id });
        if (!userData) { 
            return res.status(statusCode.Unauthorized).json({ message: messages.authFail });
        }
  
        req.userData = userData; 
        
        next();
    } catch (err) {
        console.log(err);
        return res.status(statusCode.Unauthorized).json({ message: messages.authFail });
    }
};
  
module.exports = UserCheckAuth;
