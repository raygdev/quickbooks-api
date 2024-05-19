const router = require('express').Router()
const app = require('../slackClient.config')

router.get('/hello', (req,res,next) => {
  app.client.chat.postMessage({
    text: 'hello world @Ray'
  }).then(message => {
    res.send(message)
  })
})

module.exports = router