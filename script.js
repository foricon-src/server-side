const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const admin = require('firebase-admin');
const cors = require('cors')
const { Paddle } = require('@paddle/paddle-node-sdk');

const sandbox = true;

const paddleAPIKey = process.env[sandbox ? 'SANBOX_VENDOR_AUTH_CODE' : 'SANBOX_VENDOR_AUTH_CODE'];
const paddle = new Paddle(paddleAPIKey, {
    environment: sandbox ? 'sandbox' : 'live',
})
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
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
const userCollection = db.collection('users');

const fetch = require('node-fetch');

function getObj() {
    const date = new Date();
    return {
        count: 0,
        start: {
            day: date.getDate(),
            month: date.getMonth(),
            year: date.getFullYear(),
            timezone: date.getTimezoneOffset() / 60,
        }
    }
}

app.post('/update-plan', (req, res) => {
    const signature = req.headers['paddle-signature'];
    const payload = req.body;
    
    if (verifyPaddleSignature(payload, signature)) {
        const { status, custom_data, items } = payload.data;
        const { name } = items[0].price;
        const plan = name[0].toLowerCase() + name.substr(1).replace(' ', '');
        const userDoc = userCollection.doc(custom_data.uid);
        userDoc.set({
            plan: status == 'active' ? plan : 'lite',
            pageview: getObj(),
        }, { merge: true })
        
        res.status(200).send('Webhook processed');
    }
    else {
        console.log('Invalid signature');
        res.status(403).send('Invalid signature');
    }
})
app.post('/cancel-subscription', async (req, res) => {
    const { uid } = req.body;

    if (validateRequestOrigin(req)) {
        const userDocRef = db.collection('users').doc(uid);
        const userDoc = await userDocRef.get();

        const transaction = await paddle.transactions.get(userDoc.data().tid);
        
        try {
            await paddle.subscriptions.cancel(transaction.subscriptionId, {
                effectiveFrom: 'immediately',
            })
            await userDocRef.set({
                tid: null,
                plan: 'lite',
                pageview: getObj(),
            }, { merge: true });
            
            res.status(200).send('Subscription canceled successfully');
        }
        catch (error) {
            console.error('Error canceling subscription: ', error);
            res.status(500).send('Internal server error');
        }
    }
    else {
        console.log('Unauthorized request has been blocked');
        res.status(403).send('Request is forbidden');
    }
})

async function verifyPaddleSignature(body, signature) {
    try {
        await paddle.webhooks.unmarshal(JSON.stringify(body), paddleAPIKey, JSON.stringify(signature));
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
async function checkAndSyncEmails() {
    console.log('Checked')
    try {
        const users = await admin.auth().listUsers();
        
        for (const user of users.users) {
            const { uid, email } = user;
            
            const userDocRef = userCollection.doc(uid);
            const userDoc = await userDocRef.get();
            console.log(userDoc.data().email, email)
            if (userDoc.exists && userDoc.data().email != email) {
                await userDocRef.update({ email });
                console.log(`Updated email for UID: ${uid}`);
            }
        }
    }
    catch (error) {
        console.error("Error checking and syncing emails:", error);
    }
}
setInterval(checkAndSyncEmails, 2000);

app.listen(3000, () => console.log('Server running on port 3000'));