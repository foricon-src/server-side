const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const admin = require('firebase-admin');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: '//foricon-database-default-rtdb.asia-southeast1.firebasedatabase.app',
})

console.log('ok')

app.post('/update-plan', async (req, res) => {
    return req;
    const signature = req.headers['paddle-signature'];
    const payload = req.body;

    const isValid = verifyPaddleSignature(payload, signature);
    if (!isValid) {
        return res.status(400).send('Invalid signature');
    }

    const { user_id, plan_name, status } = payload;
    const db = admin.firestore();
    const userDoc = db.collection('users').doc(user_id);

    if (status == 'active')
        userDoc.update({
            plan: plan_name,
        })
    else if (status == 'cancelled')
        userDoc.update({
            plan: 'lite',
        })
    
    res.status(200).send('Webhook processed');
})

function verifyPaddleSignature(payload, signature) {
    const secret = 'your-paddle-webhook-secret';
    const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    return hash === signature;
}

app.listen(3000, () => console.log('Server running on port 3000'));