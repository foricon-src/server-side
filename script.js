const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const admin = require('firebase-admin');
const { Paddle, EventName } = require('@paddle/paddle-node-sdk');

const sandbox = true;

const paddleAPIKey = sandbox ? '18f86afd453c26b72a48e422a908354e58e7a33d50767fd174' : 'e16469f750c345ea031f3d3275c1fd9dba1c41cf702c75a35f';
const paddle = new Paddle(paddleAPIKey);
const app = express();
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
})
const db = admin.firestore();

app.post('/update-plan', (req, res) => {
    const signature = req.headers['paddle-signature'];
    const payload = req.body;
    
    if (verifyPaddleSignature(payload, signature)) {
        const { status, custom_data, items } = payload.data;
        const { name } = items[0].price;
        const plan = name[0].toLowerCase() + name.substr(1).replace(' ', '');
        const userDoc = db.collection('users').doc(custom_data.uid);
        if (status == 'active') userDoc.update({ plan })
        else if (status == 'cancelled')
            userDoc.update({
                plan: 'lite',
            })
        
        res.status(200).send('Webhook processed');
    }
    else {
        console.log('Invalid signature');
        res.status(400).send('Invalid signature');
    }
})
app.post('/cancel-subscription', async (req, res) => {
    const signature = req.headers['paddle-signature'];
    const payload = req.body;
    
    if (validateRequestOrigin(req)) {
        const { custom_data, items } = payload.data;
        const { id } = items[0].price;

        try {
            const response = await fetch(`https://api.paddle.com/subscriptions/${id}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${paddleAPIKey}`,
                },
                body: JSON.stringify({
                    effective_from: custom_data.immediately ? 'immediately' : 'next_billing_period',
                }),
            })
    
            const result = await response.json();
    
            if (response.ok) {
                console.log('Subscription canceled successfully: ', result);
                res.status(200).send('Subscription canceled successfully');
            }
            else {
                console.error('Error canceling subscription: ', result);
                res.status(400).send('Error canceling subscription');
            }
        }
        catch (error) {
            console.error('Error calling Paddle API: ', error);
            res.status(500).send('Internal server error');
        }
    }
    else {
        console.log('Not allowed request origin');
        res.status(400).send('Not allowed request origin');
    }
})

async function verifyPaddleSignature(rawBody, signature) {
    try {
        const eventData = await paddle.webhooks.unmarshal(rawBody, paddleAPIKey, signature);
        console.log('Webhook verified and data received: ', eventData);
        return true;
    }
    catch (error) {
        console.error('Invalid webhook request: ', error.message);
        return false;
    }
}
function validateRequestOrigin(req) {
    const allowedOrigin = 'https://foricon-dev.blogspot.com';
    const referer = req.headers.referer || '';
    const origin = req.headers.origin || '';

    return (
        referer.startsWith(allowedOrigin) || origin.startsWith(allowedOrigin)
    )
}

app.listen(3000, () => console.log('Server running on port 3000'));