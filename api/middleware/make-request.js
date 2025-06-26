const fs = require('fs')
const moment = require('moment')
const Helper = require('../helper/index')
const { format } = require('path')

module.exports = async (req, res, next) => {
  try {
    const requestURL = req.protocol + '://' + req.get('host') + req.originalUrl

    const requestBody = JSON.stringify(req.body)
    const date = moment().format('MMMM Do YYYY, h:mm:ss a')
    fs.appendFileSync(
      'request.log',
      'REQUEST DATE : ' +
      date +
      '\n' +
      'API URL : ' +
      requestURL +
      '\n' +
      'API PARAMETER : ' +
      requestBody +
      '\n\n'
    ) // , function (
    next()
  } catch (err) {
    const requestURL = req.protocol + '://' + req.get('host') + req.originalUrl
    const requestBody = JSON.stringify(req.body)
    Helper.writeErrorLog(
      requestURL,
      requestBody,
      err
    )
  }
}