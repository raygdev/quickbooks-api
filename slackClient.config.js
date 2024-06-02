const bolt = require('@slack/bolt')
const express = require('express')
const Client = require('./data-context/Client')
const crypto = require("crypto")
require('dotenv').config()
const client = new Client()
const app = new bolt.App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    receiver: new bolt.ExpressReceiver({
        signingSecret: process.env.SLACK_SIGNING_SECRET,
        token: process.env.SLACK_BOT_TOKEN
    })
})
app.receiver.app.use(express.json())
app.receiver.app.use(express.urlencoded({ extended: false }))
app.receiver.app.use(require('./routes/auth').router)
app.receiver.app.post('/webhooks',(req, res) => {
    const webhookPayload = JSON.stringify(req.body)
    const signature = req.get('intuit-signature')
   
    if(!signature) {
        return res.status(401).send("FORBIDDEN")
    }
    if(!webhookPayload) {
        console.log(req.body)
      return  res.status(200).send('success')
    }
    const hash = crypto.createHmac('sha256', process.env.QB_WEBHOOK_VERIFIER).update(webhookPayload).digest('base64')
    const entities = req.body.eventNotifications[0].dataChangeEvent.entities[0]
    const paymentType = entities.name === 'Payment'
    const id = entities.id
    if(paymentType) {
        client.postToSlackMaybe(id, app).catch(e => console.log(e))
    }

    // client.getInvoiceFromPayment(req.body.eventNotifications[0].dataChangeEvent.entities[0].id)
    //  .then(invoice => console.log(invoice))
    //  .catch(e => console.log(e))
    console.log(req.body.eventNotifications[0].dataChangeEvent)
    res.status(200).send('success')
})
app.receiver.app.use('/hello', async (req,res) => {
    const query = req.query
    const users = await app.client.users.list()
    const user = users.members.find(user => user.real_name === query.name)
    console.log(user)

    app.client.chat.postMessage({
        text: `Hello <@${user?.id}>! ${query.message}`,
        channel: 'practice'
    }).then(message => {
        console.log(message)
        res.send(message)
    }).catch(e => {
        console.log(e)
        res.send('something went wrong')
    })
})

async function processPayload(payload) {
    
}

async function postMessageFromPayload(person,channel) {

}



module.exports = app