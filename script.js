import { initializeApp } from 'firebase/app';
import { getDoc, doc, setDoc, getFirestore } from 'firebase/storage';

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
// const serviceAccount = require('./foricon-database-firebase-adminsdk-quo99-9d8315645e.json');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const dbFirestore = getFirestore(app);

initializeApp({
    apiKey: "AIzaSyBHxOn0b3FRDBDQZxM-LFYr07GIOXO81sw",
    authDomain: "foricon-database.firebaseapp.com",
    projectId: "foricon-database",
    databaseURL: "https://foricon-database-default-rtdb.asia-southeast1.firebasedatabase.app",
    storageBucket: "foricon-database.appspot.com",
    messagingSenderId: "895804546140",
    appId: "1:895804546140:web:2e737ccdd006d4e8b7da99",
    measurementId: "G-2620Z04T3Q"
})

app.post('/update-plan', async (req, res) => {
    const signature = req.headers['paddle-signature'];
    const payload = req.body;
    
    // const isValid = verifyPaddleSignature(payload, signature);
    // if (!isValid) {
    //     return res.status(400).send('Invalid signature');
    // }

    const { status, custom_data, items } = payload.data;
    
    const plan = items[0].price.name;
    const ref = doc(dbFirestore, 'users', custom_data.uid);
    // const userDoc = await getDoc(ref);

    if (status == 'active') setDoc(ref, { plan }, { merge: true })
    else if (status == 'cancelled')
        setDoc(ref, {
            plan: 'lite',
        }, { merge: true })
    
    res.status(200).send('Webhook processed');
})

function verifyPaddleSignature(payload, signature) {
    const secret = 'pdl_ntfset_01jpj91047a53xze18x26241kt_xA3Jx0rq5ij8C9Gha6+91LXYpMc8I52k';
    const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    return hash == signature;
}

app.listen(3000, () => console.log('Server running on port 3000'));