const express = require('express');
const app = express();
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const cors = require('cors');
const morgan = require('morgan');
const userRoute = require('./api/routes/user.route');
const gameRoomRoute = require('./api/routes/game.route');
const adminRoute = require('./api/routes/admin.route')
const supportRoutes = require('./api/routes/support.routes')
const cardDeck = require('./api/routes/deck.route')
const avatarRoutes = require('./api/routes/avatar.routes')
const DbConfig = require('./api/config/db')

mongoose.Promise = global.Promise

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.set('trust proxy', true)
app.use('/uploads', express.static('uploads'))
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', '*')

    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, PATCH, DELETE')

        return res.status(statusCode.OK).json({})
    }
    next()
})

app.use(morgan('dev'));
app.use('/api/user', userRoute);
app.use('/api/game', gameRoomRoute);
app.use('/api/cardDeck', cardDeck)
app.use('/api/support', supportRoutes)
app.use('/api/avatar', avatarRoutes)

// app.use('/api/admin', adminRoute)

module.exports = app;
