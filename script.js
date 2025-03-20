const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const admin = require('firebase-admin');
const cors = require('cors')
const { Paddle } = require('@paddle/paddle-node-sdk');

const sandbox = true;

const paddleAPIKey = sandbox ? '18f86afd453c26b72a48e422a908354e58e7a33d50767fd174' : 'e16469f750c345ea031f3d3275c1fd9dba1c41cf702c75a35f';
const paddle = new Paddle(paddleAPIKey);
const app = express();
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

app.use(cors({
    origin: 'https://foricon-dev.blogspot.com',
    headers: ['Content-Type'],
    credentials: true,
}))

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
})
const db = admin.firestore();

const fetch = require('node-fetch');

async function getActiveSubscription(customerEmail) {
    const response = await fetch('https://vendors.paddle.com/api/2.0/subscription/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            vendor_id: sandbox ? '28722' : '220972',
            vendor_auth_code: sandbox ? '18f86afd453c26b72a48e422a908354e58e7a33d50767fd174' : 'e16469f750c345ea031f3d3275c1fd9dba1c41cf702c75a35f',
            email: customerEmail,
        }),
    });
  
    if (response.ok) {
        const data = await response.json();
        const activeSubscription = data.response.find(subscription => subscription.state === 'active');
  
        if (activeSubscription) {
            console.log('Active Subscription ID:', activeSubscription.subscription_id);
            return activeSubscription.subscription_id;
        }
        else {
            console.log('No active subscription found for the user.');
            return null;
        }
    }
    else {
        console.error('Failed to fetch subscriptions:', await response.text());
        return null;
    }
}

app.post('/update-plan', (req, res) => {
    const signature = req.headers['paddle-signature'];
    const payload = req.body;
    
    if (verifyPaddleSignature(payload, signature)) {
        const date = new Date();
        const { status, custom_data, items } = payload.data;
        const { name } = items[0].price;
        const plan = name[0].toLowerCase() + name.substr(1).replace(' ', '');
        const userDoc = db.collection('users').doc(custom_data.uid);
        userDoc.set({
            plan: status == 'active' ? plan : 'lite',
            pageview: {
                count: 0,
                start: {
                    day: date.getDate(),
                    month: date.getMonth(),
                    year: date.getFullYear(),
                    timezone: date.getTimezoneOffset() / 60,
                }
            }
        }, { merge: true })
        
        res.status(200).send('Webhook processed');
    }
    else {
        console.log('Invalid signature');
        res.status(403).send('Invalid signature');
    }
})
app.post('/cancel-subscription', async (req, res) => {
    const { email, uid } = req.body;

    if (validateRequestOrigin(req)) {
        const userDoc = await db.collection('users').doc(uid).get();
        try {
            const response = await paddle.subscriptions.cancel(getActiveSubscription(email));
    
            if (response.success) {
                await userDoc.set({
                    plan: 'lite',
                    pageview: {
                        count: 0,
                    }
                }, { merge: true });
    
                res.status(200).send('Subscription canceled successfully');
            }
            else res.status(500).send('Failed to cancel subscription');
        }
        catch (error) {
            console.error('- Error canceling subscription -\n', error);
            res.status(500).send('Internal server error');
        }
    }
    else {
        console.log('Unauthorized request has been blocked');
        res.status(403).send('Request is forbidden');
    }
})

async function verifyPaddleSignature(rawBody, signature) {
    try {
        await paddle.webhooks.unmarshal(rawBody, paddleAPIKey, signature);
        console.log('Webhook verified and data received');
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