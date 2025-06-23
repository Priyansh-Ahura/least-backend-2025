require('dotenv').config()

const development = {
    PORT: process.env.PORT || 3071,
    REDIS_PORT: process.env.REDIS_PORT || 6379,
    URL: process.env.URL || '',
    DBUSER: process.env.DBUSER || '',
    DBPASSWORD: process.env.DBPASSWORD || '',
    DBCLUSTER: process.env.DBCLUSTER || '',
    DBCOLLECTION: process.env.DBCOLLECTION || '',
    PRIVATEKEY: process.env.PRIVATEKEY || '',
    PUBLICKEY: process.env.PUBLICKEY || '',
    REDIS_KEY: process.env.REDIS_KEY || '',
    JWT_KEY: process.env.JWT_KEY || '',
    APP_ID: process.env.APP_ID || '',
    API_KEY: process.env.API_KEY || '',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_SECRET_KEY: process.env.GOOGLE_SECRET_KEY || '',
    GOOGLE_REDIRECT_URL: process.env.GOOGLE_REDIRECT_URL || '',
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
    REDIS_HOST: process.env.REDIS_HOST || '',
    REDIS_PORT: process.env.REDIS_PORT || '',
    EMAILSERVICE: process.env.EMAILSERVICE || '',
    GMAIL: process.env.GMAIL || '',
    GMAILPASS: process.env.GMAILPASS || '',
    EMAILPORT: process.env.EMAILPORT || '',
    GOOGLE_IMAGE_BASE_URL: process.env.GOOGLE_IMAGE_BASE_URL || '',
}

module.exports = development

