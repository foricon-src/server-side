const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const admin = require('firebase-admin');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

try {
    admin.initializeApp({
      credential: admin.credential.cert(require(process.env.GOOGLE_APPLICATION_CREDENTIALS)),
      databaseURL: 'https://foricon-database.firebaseio.com',
    });
    console.log("Successfully.");
}
catch (error) {
    console.error("Firebase initialization error: ", error);
}
const db = admin.firestore();

app.post('/update-plan', async (req, res) => {
    const signature = req.headers['paddle-signature'];
    const payload = req.body;
    
    // const isValid = verifyPaddleSignature(payload, signature);
    // if (!isValid) {
    //     return res.status(400).send('Invalid signature');
    // }

    const { status, custom_data, items } = payload.data;
    
    const plan = items[0].price.name;
    const userDoc = db.collection('users').doc(custom_data.uid);

    if (status == 'active') userDoc.update({ plan })
    else if (status == 'cancelled')
        userDoc.update({
            plan: 'lite',
        })
    
    res.status(200).send('Webhook processed');
})

// function verifyPaddleSignature(payload, signature) {
//     const secret = 'pdl_ntfset_01jpj91047a53xze18x26241kt_xA3Jx0rq5ij8C9Gha6+91LXYpMc8I52k';
//     const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
//     return hash == signature;
// }

app.listen(3000, () => console.log('Server running on port 3000'));