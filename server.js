const app = require('./slackClient.config')
require('dotenv').config()


app.start(3000).then(() => {
    console.log('App is listening on port 3000')
})