const OAuthClient = require('intuit-oauth')
const QuickBooks = require('node-quickbooks')
const app = require('../slackClient.config')

class Client {
    constructor() {
        if(this.constructor.instance) {
            return this.constructor.instance
        }
        this.oauth = new OAuthClient({
            clientId: process.env.QB_CLIENT_ID,
            clientSecret: process.env.QB_CLIENT_SECRET,
            environment: process.env.NODE_ENV || 'sandbox',
            redirectUri: 'http://localhost:3000/callback',
            logging: true
        })
        this.qbo = undefined
        this.constructor.instance = this
    }

    async setToken(token) {
        this.oauth.token = token
        this.qbo.token = token
    }

    authenticate() {
        let authUrl = this.oauth.authorizeUri({
            scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.Payment, OAuthClient.scopes.OpenId, OAuthClient.scopes.Email, OAuthClient.scopes.Profile],
            state: 'intuit-test'
        })
        return authUrl
    }
    
    initQbo(authResponse, realmId) {
        this.qbo = new QuickBooks(
            process.env.QB_CLIENT_ID, //consumer key
            process.env.QB_CLIENT_SECRET, // consumer secret
            authResponse.json.access_token, //token
            false, // no token secret for oauth2
            // req.query.realmId,
            realmId, //realm id
            !(process.env.NODE_ENV === 'production'), //sandbox testing
            false, //degug
            4,
            '2.0',
            authResponse.json.refresh_token
        )
    }

    async getInvoice(id) {
        return await new Promise((resolve, reject) => {
            this.qbo?.getInvoice(id,(err, invoice) => {
                if(err) {
                    console.error(err)
                    reject(err)
                }
                resolve(invoice)
            })
        })
    }

    async getCDC(entities, since) {
        return await new Promise((resolve,reject) => {
            this.qbo.changeDataCapture(entities, since, (err, changes) => {
                if(err) {
                    console.error(err)
                    reject(err)
                }
                resolve(changes)
            })
        })
    }

    async getPayment(id) {
        return await new Promise((resolve,reject) => {
            this.qbo.getPayment(id, (err, payment) => {
                if(err) {
                    console.error(err)
                    reject(err)
                }
                resolve({
                    TxnType: payment.Line[0].LinkedTxn[0].TxnType,
                    TxnId: payment.Line[0].LinkedTxn[0].TxnId,
                    TotalAmt: payment.TotalAmt
                })
            })
        })
    }
    async getInvoiceFromPayment(id) {
        try {
            const payment = await this.getPayment(id)
            if(payment.TxnType === 'Invoice') {
                const invoice = await this.getInvoice(payment.TxnId)
                return {
                    balance: invoice.Balance,
                    customer: invoice.CustomerRef.name,
                    dueDate: invoice.DueDate,
                    total: invoice.TotalAmt,
                    payment: payment.TotalAmt
                }
            }
            return;

        } catch(e) {
            console.log(e)
            console.log('something went wrong')
        }

    }

    async getUserInfo() {
        const user = await this.oauth.getUserInfo()
        return user.json
    }

    async handleAuthResponse(url, realmId) {
        const authResponse = await this.oauth.createToken(url)
        this.initQbo(authResponse, realmId)
    }

    async getSlackUserIdByName(name, app) {
        const users = await app.client.users.list()
        const user = users.members.find(user => user.real_name === name)
        return user?.id
    }

    async postToSlackMaybe(id, app) {
       try { const invoice = await this.getInvoiceFromPayment(id)
        if(invoice) {
            const user = await this.getSlackUserIdByName("Ray", app)
            await app.client.chat.postMessage({
                channel: 'practice',
                text: `Hello <${user ? "@" + user : 'anyone'}>! A customer ${invoice.customer} has made a payment of ` + 
                `$${invoice.payment}. There account total is $${invoice.total} and the current balance is ` + 
                `$${invoice.balance}.`
            })
        }
        return;
      } catch(e) {
        console.log(e)
      }
    }
}

// {
//     AllowIPNPayment: false,
//     AllowOnlinePayment: false,
//     AllowOnlineCreditCardPayment: false,
//     AllowOnlineACHPayment: false,
//     domain: 'QBO',
//     sparse: false,
//     Id: '16',
//     SyncToken: '5',
//     MetaData: {
//       CreateTime: '2024-04-11T15:10:40-07:00',
//       LastUpdatedTime: '2024-05-17T16:40:54-07:00'
//     },
//     CustomField: [],
//     DocNumber: '1007',
//     TxnDate: '2024-03-20',
//     CurrencyRef: { value: 'USD', name: 'United States Dollar' },
//     LinkedTxn: [
//       { TxnId: '171', TxnType: 'Payment' },
//       { TxnId: '172', TxnType: 'Payment' },
//       { TxnId: '173', TxnType: 'Payment' },
//       { TxnId: '174', TxnType: 'Payment' },
//       { TxnId: '32', TxnType: 'Payment' }
//     ],
//     Line: [
//       {
//         Id: '1',
//         LineNum: 1,
//         Description: 'Custom Design',
//         Amount: 750,
//         DetailType: 'SalesItemLineDetail',
//         SalesItemLineDetail: [Object]
//       },
//       {
//         Amount: 750,
//         DetailType: 'SubTotalLineDetail',
//         SubTotalLineDetail: {}
//       }
//     ],
//     TxnTaxDetail: { TotalTax: 0 },
//     CustomerRef: { value: '13', name: 'John Melton' },
//     CustomerMemo: { value: 'Thank you for your business and have a great day!' },
//     BillAddr: {
//       Id: '53',
//       Line1: 'John Melton',
//       Line2: '85 Pine St.',
//       Line3: 'Menlo Park, CA  94304',
//       Lat: '37.3813444',
//       Long: '-122.1802812'
//     },
//     ShipAddr: {
//       Id: '13',
//       Line1: '85 Pine St.',
//       City: 'Menlo Park',
//       CountrySubDivisionCode: 'CA',
//       PostalCode: '94304',
//       Lat: '37.4451342',
//       Long: '-122.1409626'
//     },
//     SalesTermRef: { value: '3', name: 'Net 30' },
//     DueDate: '2024-04-19',
//     TotalAmt: 750,
//     ApplyTaxAfterDiscount: false,
//     PrintStatus: 'NeedToPrint',
//     EmailStatus: 'NotSet',
//     BillEmail: { Address: 'John@Melton.com' },
//     Balance: 330
//   }

// "Line": [
//     {
//       "Amount": 30,
//       "LinkedTxn": [
//         {
//           "TxnId": "16",
//           "TxnType": "Invoice"
//         }
//       ],

module.exports = Client