const express = require('express')
const router = express.Router()
const Client = require('../data-context/Client')
const app = require('../slackClient.config')

const client = new Client()


router.get('/auth', (req, res) => {
    const authUrl = client.authenticate()
    res.redirect(authUrl)

})

router.get('/callback', async (req, res, next) => {
    try {
    await client.handleAuthResponse(req.url, req.query.realmId)
    const user = await client.getUserInfo()
     if(!user.emailVerified) {
         console.log('forbidden')
         return res.status(401).send('FORBIDDEN')
     }
     res.send('authorized')
    } catch(e) {
     console.log(e)
     return res.status(401).send("FORBIDDEN")
    }
 
})


// async function processWebHookPayload(payload) {
//     if(payload) {
//         const invoices = payload.eventNotifications.filter(
//             event => {
//             event.dataChangeEvent.entities[0].name === 'invoice'
//         }).map(
//             event => {
//                 event.dataChangeEvent.entities[0].id
//             }
//         )
//     }

// }

// async function getInvoiceData(id) {
//     // return new Promise((resolve, reject) => {
//     //     qbo.getInvoice(id, (err,invoice) => {
//     //         if(err) {
//     //             console.log(err)
//     //             reject(err)
//     //         }
//     //         console.log(invoice)
//     //         resolve(invoice)
//     //     })
//     // })
// }

module.exports = { router }