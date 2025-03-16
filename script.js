const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

const PORT = process.env.PORT || 3000;

const express = require('express');
const app = express();

app.post('/paddle-webhook', async (req, res) => {
  const { custom_data, event_type } = req.body;
  custom_data = JSON.parse(custom_data);

  if (event_type === 'subscription_cancelled') {
    const userDoc = await db.collection('users').where('uid', '==', custom_data.uid).get();
    
    if (!userDoc.empty) {
      const userRef = userDoc.docs[0].ref;

      try {
        await userRef.setDoc({
          plan: 'lite',
        }, { merge: true })
      }
      catch (error) {
        console.error(error)
      }
    }
  }

  res.sendStatus(200);
})

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`))