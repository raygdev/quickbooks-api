const axios = require('axios')


async function fetchWebhooks() {
    const res = await axios.post('https://cbfa-2601-c2-e81-320-744a-ceb6-8ebc-b270.ngrok-free.app/webhooks', { message: 'hello' })
    const data = res.data
    console.log(res.data)
}
fetchWebhooks()
 .catch(e => console.log(e.response.data))