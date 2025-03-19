const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const admin = require('firebase-admin');

const sandbox = true;

const paddleAPIKey = sandbox ? '18f86afd453c26b72a48e422a908354e58e7a33d50767fd174' : 'e16469f750c345ea031f3d3275c1fd9dba1c41cf702c75a35f';

const app = express();
app.use(bodyParser.raw({ type: 'application/json' }));

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
})
const db = admin.firestore();

app.post('/update-plan', (req, res) => {
    const signature = req.headers['paddle-signature'];
    const payload = req.body;
    console.log(payload)
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
        console.log('Invalid request');
        res.status(400).send('Invalid request');
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
        console.log('Invalid request');
        res.status(400).send('Invalid request');
    }
})

function verifyPaddleSignature(rawBody, signatureHeader) {
    const signatureParts = signatureHeader.split(';');
    const timestampPart = signatureParts.find(part => part.startsWith('ts='));
    const h1Part = signatureParts.find(part => part.startsWith('h1='));

    if (!timestampPart || !h1Part) return false;

    const timestamp = timestampPart.split('=')[1];
    const expectedSignature = h1Part.split('=')[1];

    const signedPayload = `${timestamp}:${rawBody}`;

    const computedSignature = crypto
        .createHmac('sha256', sandbox ? 'pdl_ntfset_01jpj91047a53xze18x26241kt_xA3Jx0rq5ij8C9Gha6+91LXYpMc8I52k' : 'pdl_ntfset_01jpq9jzcpt7fmvamf6x091hth_MvVAKdrqjwIFbKO/3V4riBNnT+Z/PgO7')
        .update(signedPayload)
        .digest('hex');

    return computedSignature === expectedSignature;
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