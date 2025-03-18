const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const admin = require('firebase-admin');
// const serviceAccount = require('./foricon-database-firebase-adminsdk-quo99-9d8315645e.json');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

admin.initializeApp({
  credential: admin.credential.cert({
    type: 'service_account',
    project_id: 'foricon-database',
    private_key_id: '9d8315645e6d0909bba9075812dbd160a31b7084',
    private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCbX3zzGqhDwLuV\nTDrfzIQawB4wSfArAjKIUi6bmLuSNDgg6r+f/X0GQFWKDpITixlrgQ5pKntjN9DE\nrS5gjAq+hJoY0xwVfOkAL2BEiqKbuv05tmZBBTC6z4r5G7wKHx3DjJ2sgleD9RR2\nZnQo6e4PqsVpgpEevWsjaVYthNR2v7yKR0ixuxE4+MfALSMjMW9xRhjmL3RMKNjX\nrduuTuCMf4rlJBrLQ+GznXrwAGGhZZLPUnynlpvPyhHs5VWDWMUY76QXyRJcz8kO\ncQI/6g11Ps0wWh1bImO5YdLgWm4yxoDKbxhEA7zQoZEKyw58N+A96XVkY60aAsmY\nOTbcrboNAgMBAAECggEAPP/2THOQ0FjgzLLLAoaG7wGyWH8O3bPVJxQs3EXQjowV\n5UaEyUl6RnQHoVYrH6Ui68QVZlCZdNC7FBxx8tHIfhgNb+WiRwVtbPcssnxDbySw\nunHUH37sLMvC4h5zav3gb5/LX6kkttgHmpyKym1dW6VOMChk1U7Eu3hlryVRTPVI\nujjpSob/bJVMNbNQr18r7wInawM0S/AanJClHPftYTKpSHf9YNupaFlLAZOFTDTW\nHr1ilt3BkRzzpIe24+BW5Hwulm/JHK9HnYQg3asLQW7sEk5tgA79y3HMn3HRK499\nl89fLFAQ8IRkV5tQw8yCJM6zym9zTiqdWsC1quC3OQKBgQC1H9C4sdp2fRRfp8mG\nIG4AwmjZBPln9jHZTmv29AQibkL1Kif7Axpg6Rw0lzHzfMBltrCAL8KYZehfvLhU\nG3nTbaBYotK20UekrJN6njFRAUIXU67y9Sb4/xTg21nTO820HgjMVeWGAyFIRVMY\nqPDtjXEmOK84IpCDrkQ4/xdZEwKBgQDbmnFu8/R75Q5TaQtWdlFrFF4ww8tWRNkG\nX+9GtseGh3Y/TEtS0HMbTmh8s8Jc36JjFhcynFHFOIHV1RW1p44gcYMzUDSL2uKK\nQcpxYwBDgKQgDOspnhKFY1OIAWVydOffuUO+A5OgFRB7wKL1S/3MzvyNPn8/63fP\nTXN8MC8kXwKBgQCUZvH8MnU9+jP0QCTFSdL3ulJv5jx3quejFjctyzeMAm3INHc3\nmo5FcxpSGMOrrb5yWGJ7VSaK+YyQzK728uA5lKv5k8c0VXru+RuJLw5XQcGmHUHN\n/YGmKFIx/me1xF1BxA4PZh2+VNgzP+Ha5akp6mcYGv+t7dwcmG97h77YkwKBgHRM\n8s4j/NKwmEmsVAjSWIQxIUEKMGHbzGQH4py8qCajDwiuyyVsp8lKWSPRv5mYBlQb\nmuV+y/960agBVaICvs6Hz0gZrfpzTY6TETfDipw1QLaIoPJFeOGTnOVmd+eJ6lMd\ntranBkO9ZCFl/+eQ+zTAWhgjhRjBB46OIh8fFZhZAoGBAJJ/4084ejsE09W9XARh\nWR/CeuYDtg5zEqI/Vuyc/ggL9sAb2SbH0lb1ceMhjlH+/10wzCGvdhtP7ww+NhvB\n7ZCg5Sgotr75YZ4W9eeNB+1IT2ADaAszCNlKolnwBodVMvK/FqLAm/E/CGibtAG6\nY0Fyag0ZF6ccBC03jklTwgec\n-----END PRIVATE KEY-----\n',
    client_email: 'firebase-adminsdk-quo99@foricon-database.iam.gserviceaccount.com',
    client_id: '109883086527318642905',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-quo99%40foricon-database.iam.gserviceaccount.com',
    universe_domain: 'googleapis.com'
  }),
  databaseURL: 'https://foricon-database-default-rtdb.asia-southeast1.firebasedatabase.app'
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