const config = require('../../config')
const mongoose = require('mongoose')

const dburl = `mongodb+srv://${config.DBUSER}:${config.DBPASSWORD}@${config.DBCLUSTER}${config.DBCOLLECTION}?retryWrites=true`

mongoose.set('strictQuery', false)
mongoose.connect(dburl, {
    authSource: 'admin',
    useNewUrlParser: true,
    useUnifiedTopology: true,
}
).then(() =>{
    console.log('MongoDB connected!!!')})
.catch((err) =>{
    console.log('Failed to connect to DB', err)})

mongoose.syncIndexes().then().catch()

exports.mongoose