import { dbFirestore } from 'https://foricon-src.github.io/foricon-firebase/script.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

console.log('ok')

app.post('/update-plan', async (req, res) => {
    const signature = req.headers['paddle-signature'];
    const payload = req.body;
    
    const isValid = verifyPaddleSignature(payload, signature);
    // if (!isValid) {
    //     return res.status(400).send('Invalid signature');
    // }

    const { status, custom_data, items } = payload.data;
    
    const plan = items[0].price.name;
    const ref = doc(dbFirestore, 'users', custom_data.uid);

    if (status == 'active') setDoc(ref, { plan }, { merge: true });
    else if (status == 'cancelled')
        setDoc(ref, {
            plan: 'lite'
        }, { merge: true });
    
    res.status(200).send('Webhook processed');
})

function verifyPaddleSignature(payload, signature) {
    const secret = 'pdl_ntfset_01jpj91047a53xze18x26241kt_xA3Jx0rq5ij8C9Gha6+91LXYpMc8I52k';
    const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    return hash == signature;
}

app.listen(3000, () => console.log('Server running on port 3000'));