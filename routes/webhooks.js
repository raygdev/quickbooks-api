const router = require('express').Router()
const Client = require('../data-context/Client')
const client = new Client()

router.post('/webhooks', (req, res) => {
    const webhookPayload = JSON.stringify(req.body)
    const signature = req.get('intuit-signature')
   
    if(!signature) {
        return res.status(401).send("FORBIDDEN")
    }
    if(!webhookPayload) {
        console.log(req.body)
      return  res.status(200).send('success')
    }
    const entities = req.body.eventNotifications[0].dataChangeEvent.entities[0]
    const paymentType = entities.name === 'Payment'
    const id = entities.id
    if(paymentType) {
        client.postToSlackMaybe(id)
    }
    res.status(200).send('success')
})


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


// {
//     entities: [
//       {
//         name: 'Invoice',
//         id: '103',
//         operation: 'Update',
//         lastUpdated: '2024-05-14T19:00:08.000Z'
//       }
//     ]
//   }

module.exports = router