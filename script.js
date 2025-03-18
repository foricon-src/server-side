const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const admin = require('firebase-admin');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

const firebaseConfig = {
    apiKey: "AIzaSyBHxOn0b3FRDBDQZxM-LFYr07GIOXO81sw",
    authDomain: "foricon-database.firebaseapp.com",
    databaseURL: "https://foricon-database-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "foricon-database",
    storageBucket: "foricon-database.appspot.com",
    messagingSenderId: "895804546140",
    appId: "1:895804546140:web:2e737ccdd006d4e8b7da99",
    measurementId: "G-2620Z04T3Q",
};
  
admin.initializeApp(firebaseConfig);

app.post('/update-plan', async (req, res) => {
    const signature = req.headers['paddle-signature'];
    const payload = req.body;
    
    // const isValid = verifyPaddleSignature(payload, signature);
    // if (!isValid) {
    //     return res.status(400).send('Invalid signature');
    // }

    const { status, custom_data, items } = payload.data;
    
    const plan = items[0].price.name;
    const db = admin.firestore();
    const userDoc = db.collection('users').doc(custom_data.uid);

    if (status == 'active') userDoc.update({ plan })
    else if (status == 'cancelled')
        userDoc.update({
            plan: 'lite',
        })
    
    res.status(200).send('Webhook processed');
})

function verifyPaddleSignature(payload, signature) {
    const secret = 'pdl_ntfset_01jpj91047a53xze18x26241kt_xA3Jx0rq5ij8C9Gha6+91LXYpMc8I52k';
    const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    return hash == signature;
}

app.listen(3000, () => console.log('Server running on port 3000'));