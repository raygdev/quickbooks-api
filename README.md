# Quickbooks and Slack Integration

To get started run
```
npm install
```

## Setting up your slack app
After installation, you will need to create a slack app to get the required `SLACK_SIGNING_SECRET` and `SLACK_BOT_TOKEN` that are used in the [Slack client configuration](./slackClient.config.js). Refer to the [quickstart](https://api.slack.com/start/quickstart) guide from slack to set up your app. Create a bot and provide the following scopes: `chat:write`, `chat:write.public` and `users:read` to give your bot appropriate permissions to access the needed functionality.

## Setting up your Quickbooks Sandbox
You will need to create a developer account to be able to start using the api. The scopes are already provided through the `OAuth` request in the application. The scopes are for `Payment`, `Accounting`, `OpenId`, `Email`, and `Profile`. They are already provided in the [Client](./data-context/Client.js#L28) class. Refer to [Create and start developing your app](https://developer.intuit.com/app/developer/qbo/docs/get-started/start-developing-your-app) from intuit to set up your `QB_CLIENT_ID` and `QB_CLIENT_SECRET`.

You will also need to setup a sandbox for using test data. Refer to [Create a sandbox company](https://developer.intuit.com/app/developer/qbo/docs/develop/sandboxes/manage-your-sandboxes) to get started on setting up the sandbox for the webhooks.

For webhooks configuration, the endpoint needs to be exposed over the internet and secured via https. The domain needs to have intermediate certificates installed to complete the chain of trust. You can achieve this by using ngrok. If you don't have ngrok installed refer to [quickstart](https://ngrok.com/docs/getting-started/) for ngrok to get start. Once you have ngrok installed run the command:
```
ngrok http http://localhost:3000
```
Once that is complete, copy the forwarding address created by ngrok and add it as an enpoint for the webhooks. The only thing being processed in the webhook right now are payments. The payments get looked up to find wether or not it was associated with an invoice. If it is, the invoice is looked up and the information is sent to a slack channel called `practice` otherwise it returns early. 

You will have to manually change the [channel](./data-context/Client.js#L132) to provide the name of an existing one for your app. The [getSlackUserById](./data-context/Client.js#L121) takes in a `name` parameter. Currently nothing is actually getting passed to it. The name looks up a user in a channel by the display name they have. You will have to manually change the string value passed to it [here](./data-context/Client.js#L131) for an existing user in your channel. This will change later when things become more dynamic.

## Run the app

Create a `.env` file and provide the keys in the `.env.sample` with the values of your secrets, ids, and tokens.

After everything has been set up run the command
```
npm run dev
```
You should have output to the terminal to let you know the app is running on port 3000. Once running, you will need to authenticate with quickbooks. In the url bar go to `http://localhost:3000/auth`. This will redirect you to intuit to authenticate the app. Once authenticated you should have a message in the top write stating `authorized`. 
1. After you have been authorized go to the sandbox. 
2. Select `Sales` in the side navigation and select `Invoices` in the dropdown.
3. Once on invoices, select `Receive Payment`.
4. Provide a payment amount (defaults to total amount owed) and select save and close.

After those steps, a webhook should be received. It will get processed asynchronously and should post to your specified channel and mention the specified user. Some webhooks may take up to 5 minutes to receive depending on intuit peak periods. So the request may not go through right away.

## Making file changes
Making file changes will cause the server to restart. The `Client` class is a singleton that holds auth state and query methods from two different libraries. If the app is restarted due to file changes, you will need to reauthenticate with quickbooks before the webhooks can be processed.

## Idea
Idea was to notify a specific user in a specific channel of a payment that was made to an invoice. I think the original case was to use the `tags` associated with invoices. But there is no way to connect a user in slack to an invoice in quickbooks that I can find. 

An alternative would be to create some kind of authentication for the application before authenticating with quickbooks. And storing the authenticated user. Also storing webhooks in a db so that they can be manually processed by a user in a UI upon full payment. The user may have to manually enter the user name and channel for the information to go to.

Some drawbacks are that each time someone else logs in, that token is stored with the client in memory. Possibly creating a mismatch of information in regards to who was responsible for what. The other drawback is that the user has to reauthenticate with quickbooks every hour. So payments may not get processed in an autonomous way. Which is why it is suggested that there be a UI to handle them and send to the appropriate user in slack. 