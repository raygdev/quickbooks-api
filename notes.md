# Tags
Tags in quickbooks are not yet available through the api. So using tags as a means to @mention someone in slack may not be a good approach. It may be a better idea to have a dedicated channel and send the appropriate invoice through the channel with the attached account name.

# Teams channels
Will this be a teams channel through **slack connect**? In other words will this be messaging between organizations?

# Fork child process
Will I need to set up a forked child process to run a different thread and perform lookups so that the `/webhooks` endpoint can return before the 3 second timeout runs from intuit api? This seems like a reasonable idea but extra overhead to accomplish. Is there a way to simplify?

# Provision Slack Sandbox
I will have to provision a slack sandbox to test the calls against. Lookup chat api to send messages.

# Sending message with @mention
How to send a message with @handle to notify a specific user and how to connect that the intuit invoice? Will there be a dedicated channel? see [Using top level calls outside of Events](#using-top-level-calls-outside-of-events)

# Setting up QB sandbox
Have to set up a QB sandbox to test against.

# Testing webhook calls
Testing webhooks have to be served over https so have to set up an ngrok account to proxy to local host. Webhook endpoints are meant to be post endpoints. Sandbox webhooks don't seem to be working. Have to contact support?

# Sending messages as other entities
[sending A Message](https://api.slack.com/messaging/sending#impersonation)
Will alias the message as from another user. Only allowed if the user gives permission. Requires scope `chat:write.customize`. Also refer to [chat.postMessage api](https://api.slack.com/methods/chat.postMessage) for details on how to post to a specific user. Scopes `chat:write` `chat:write:user`. Rate limit is special... typically allows for 1 message per second per channel.

# Sending a PDF
Are they wanting to send the invoice pdf or a link to download? Or are they only wanting to notify the user that the invoice has been paid? Refer to [files.upload api](https://api.slack.com/methods/chat.postMessage)... now a deprecated api as of march 2025. Refer to [files.getUploadURLExternal api](https://api.slack.com/methods/files.getUploadURLExternal). Requires reads and write scopes `file:read` and `file:write` Rate limit is Tier 4

# Getting a list of users in slack
It would likely need to grab a list of users to notify if tags are possible. Would have to be a user name or full name to find the user that is associated with the account. [users.list api](https://api.slack.com/methods/users.list). Scope is `user:read`. Try to find the associate user with the invoice? How? Rate limit is Tier 2

# Using @slack/bolt

## Customizing a receiver
Seems bolt has multiple [receiver](https://slack.dev/bolt-js/concepts#receiver) options using built in express app or customizing one with express routes. How to make sure that you can customize this to integrate with webhooks from intuit. Check out [receiver options](https://slack.dev/bolt-js/reference#receiver-options) to see what options the reciever takes

## Using top level calls outside of Events
If you are calling a method outside of a listener you can use the top level `app.client` to work with the webAPI directly.[reference the doc](https://slack.dev/bolt-js/concepts#web-api). If org-wide app installations some now require a `team_id` to know which workspace to act on. Refer to [chat.postMessage](https://api.slack.com/methods/chat.postMessage) for the api method. See [rate limitiing](https://api.slack.com/methods/chat.postMessage#rate_limiting) for `chat.postMessage`.

## Installations need a store
Installations need a persistance method. Storing information to a db to retrieve information.

# Invoice API from intuit
Looking at the api for [invoices](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice#the-invoice-object) no tags are available in the api. Look into the custom fields on  the invoice.

## Questions about the use-case

1) Why can they not use the email field to email the invoice to the customer? What's the purpose of the application? Why does it need to be slack? Or is this meant for an employee from a slack team?

2) Are all paid invoices going to be announced in slack? Or only those ones with the specified tags/custom fields?

3) How can we differentiate between the paid invoices that need to go to slack and the ones that need to be emailed? Is that why tags are needed?

4) Are **all** paid invoices meant to be used in slack?

5) Is this an org-wide slack installation?

6) Are there any **private** channels that need to be posted to? Or are they all public channels within the workspace and team?

## Limitations
It seems that chat.postMessage has a limitation in that it can only @ the user if a given id is passed for that user. It will post in the bot channel with that specified user. But you can also pass a channel name and post in the channel with @user to ping them. So possibly passing a channel name that has a bot with access will allow the ping. Adding `chat:write.public` scope for the bot will allow posting in public channels it is not a member of. 

So how can I make sure that the user doesn't have to repeatedly log back in? For webhooks, I will also need to do any processing with the data on a separate thread. This may give stale information and incorrect error handling. How can I achieve this? Look into [Change Data Capture](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/changedatacapture#get-a-list-of-changed-entities) to receive the information needed. Query with the entity ie: `entities=Payment&changedSince=<Date>`.

Possibly storing data from a webhook in a db to process in a UI and allow the user to manually send a message to a user in slack based on the payment/invoice?

Creating a singleton allows me to capture auth information and pass that information to separate files where needed. Storing the information in memory. If the server is restarted, the `qbo` property is lost resulting in an `undefined` error. The access token is only valid for one hour, however the `qbo` instance can refresh the token. Though at this point anyone can authenticate creating a mismatch for webhooks and lookups of payments if it were a separate business for quickbooks. Do I need authentication for authentication? Explaination:

1) The user navigates to `/auth` and authenticates with quickbooks.
2) User is redirected to the `/callback` which has the `code`, `state`, and `realmId`.
- `realmId` is unique to the organization authenticating, not the user.
3) The client singleton is then used to handle the authentication response and initialize the `qbo` instance to make requests to intuit.
 - both `qbo` and `auth` instances have the capability of refreshing the access token
     - `qbo` is an instance of `node-quickbooks` 
     - `auth` is an instance of `OAuthClient` from `intuit-oauth`

The webhook endpoint only works for a single organization. No other webhooks can come from any other authenticated organization. Webhooks send a signature in a header (`intuit-signature`) that needs to be compared to a hash of the key given registering the webhook.

1) Let's assume, that because the singleton instance is stored in memory, that another user can authenticate by going to `/auth`.
2) This same client is responsible for authenticating queries to intuit to grab data needed. 
3) Since another user that was not part of the specific quickbooks organization (not the same `realmId`) is logged in and the request has to be made on a different thread to post the information from the webhook... there will likely be a data mismatch and possibly send inappropriate information to a user in slack. This would lead to failed requests or missed information.
4) This could create confusion, let's say, if the invoices belong to the realmId or organization and are not unique in terms of having there own table. Meaning that multiple organizations can have the same id for an invoice belonging to that organization.
    - So the same id can exist for an invoice which provides a good lookup and sends invoice information that doesn't belong to the intended audience.
    - or the invoice id doesn't exist for that organization and the information is never sent resulting in a missed notification for the intended audience.

### Some possible solutions for the above issues.

1) Authenticate the users with a custom authentication requiring them to login before authenticating with quickbooks.
    - i\. Allows to make sure we can tie data to a single organization and to a user that logged in and authenticated with qbo. 
    - ii\. Ties the orgs realmId with the user and hopefully the apporpriate webhook.

# Change Data Capture
node-quickbooks 
```ts
enum Entitites {
    Payment,
    Invoice,
    Customer,
    ...etc
}

qbo.changeDataCapture(entities: Entities[],since: Date, callback: (err,list) => void)
```
 will help to grab missed data if a user was not logged in. Base this on the `realmId` and not the user. `realmId` is organization wide. So the realm id would need to be stored in an orgainization rather than with a specific user. `entities` is an array of missed data. Need to find a way to query the `payments` data that was missed when an org was logged out.

 # Use batch requests for Data Capture
 Refer to [Batch Request](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/batch)
 ```js
// since SQL style queries are being used batch request in a fashion like this
interface BatchRequest = {
    Query: string,
    bId: string
}

// sample batch request.
let batch = [
    {
        Query: "select * from Invoice where Balance = '0' and id = '66'",
        bId: 'bid4'
    },
    {
        Query: "select * from Invoice where Balance = '0' and id = '99",
        bId: 'bid5'
    }
]

 qbo.batch(items: BatchRequest[], callback: (err, batchItems) => void)

// access with 
let invoiceIds = batchItems.BatchItemResponse.filter(query => {
    return query.QueryResponse.Invoice
}).map(query => {
    return query.QueryResponse.Invoice[0].id
})

 //sample response
 {
 "BatchItemResponse": [
  {
   "QueryResponse": {},
   "bId": "bid4"
  },
  {
   "QueryResponse": {
    "Invoice": [
     {
      "AllowIPNPayment": false,
      "AllowOnlinePayment": false,
      "AllowOnlineCreditCardPayment": false,
      "AllowOnlineACHPayment": false,
      "domain": "QBO",
      "sparse": false,
      "Id": "99",
      "SyncToken": "2",
      "MetaData": {
       "CreateTime": "2024-04-13T13:36:31-07:00",
       "LastModifiedByRef": {
        "value": "9341452266648113"
       },
       "LastUpdatedTime": "2024-05-14T13:29:14-07:00"
      },
      "CustomField": [],
      "DocNumber": "1032",
      "TxnDate": "2024-04-11",
      "CurrencyRef": {
       "value": "USD",
       "name": "United States Dollar"
      },
      "LinkedTxn": [
       {
        "TxnId": "166",
        "TxnType": "Payment"
       }
      ],
      "Line": [
       {
        "Id": "1",
        "LineNum": 1,
        "Description": "Sod",
        "Amount": 300,
        "DetailType": "SalesItemLineDetail",
        "SalesItemLineDetail": {
         "ItemRef": {
          "value": "14",
          "name": "Sod"
         },
         "UnitPrice": 15,
         "Qty": 20,
         "ItemAccountRef": {
          "value": "49",
          "name": "Landscaping Services:Job Materials:Plants and Soil"
         },
         "TaxCodeRef": {
          "value": "TAX"
         }
        }
       },
       {
        "Id": "2",
        "LineNum": 2,
        "Description": "Garden Rocks",
        "Amount": 84,
        "DetailType": "SalesItemLineDetail",
        "SalesItemLineDetail": {
         "ItemRef": {
          "value": "13",
          "name": "Rocks"
         },
         "UnitPrice": 12,
         "Qty": 7,
         "ItemAccountRef": {
          "value": "48",
          "name": "Landscaping Services:Job Materials:Fountains and Garden Lighting"
         },
         "TaxCodeRef": {
          "value": "TAX"
         }
        }
       },
       {
        "Amount": 384,
        "DetailType": "SubTotalLineDetail",
        "SubTotalLineDetail": {}
       }
      ],
      "TxnTaxDetail": {
       "TxnTaxCodeRef": {
        "value": "2"
       },
       "TotalTax": 30.72,
       "TaxLine": [
        {
         "Amount": 30.72,
         "DetailType": "TaxLineDetail",
         "TaxLineDetail": {
          "TaxRateRef": {
           "value": "3"
          },
          "PercentBased": true,
          "TaxPercent": 8,
          "NetAmountTaxable": 384
         }
        }
       ]
      },
      "CustomerRef": {
       "value": "26",
       "name": "Travis Waldron"
      },
      "CustomerMemo": {
       "value": "Thank you for your business and have a great day!"
      },
      "BillAddr": {
       "Id": "27",
       "Line1": "78 First St.",
       "City": "Monlo Park",
       "CountrySubDivisionCode": "CA",
       "PostalCode": "94304",
       "Lat": "37.4585825",
       "Long": "-122.1352789"
      },
      "ShipAddr": {
       "Id": "27",
       "Line1": "78 First St.",
       "City": "Monlo Park",
       "CountrySubDivisionCode": "CA",
       "PostalCode": "94304",
       "Lat": "37.4585825",
       "Long": "-122.1352789"
      },
      "FreeFormAddress": true,
      "SalesTermRef": {
       "value": "3",
       "name": "Net 30"
      },
      "DueDate": "2024-05-11",
      "TotalAmt": 414.72,
      "ApplyTaxAfterDiscount": false,
      "PrintStatus": "NeedToPrint",
      "EmailStatus": "NotSet",
      "BillEmail": {
       "Address": "Travis@Waldron.com"
      },
      "Balance": 0
     }
    ],
    "startPosition": 1,
    "maxResults": 1,
    "totalCount": 1
   },
   "bId": "bid5"
  }
 ],
 "time": "2024-05-14T15:48:02.958-07:00"
}
```
Should likely use this batch request to get invoice information from `CDC` when webhooks don't go through

# Saving the user
Need to persist the logged in user to grab the realm id of the organization for the last updated timestamp. Choose a db that will relate the information. SQL or Mongo? A user's `realmId` should link them to the organization. 

# Flow of events
1) the user is authenticated to the `/auth` endpoint.
2) the user, on success, is redirected to `/callback`
3) the user information is stored if the user does not exist
- if the user exists, the user's organization is looked up and the last known good timestamp of a webhook is looked up based on that organization.
- Payment id needs to be saved with the timestamp to ensure that good timestamp can be skipped so as not to send additional messages that have already been seen.
- possibly process this on a different thread.
- once the user is logged in webhooks should continue to come in with the latest information past the `cdc` call.

