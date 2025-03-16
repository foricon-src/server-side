const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

const PORT = process.env.PORT || 3000;

const express = require('express');
const app = express();

app.post('/paddle-webhook', async (req, res) => {
  const { subscription_id, event_type } = req.body;

  if (event_type === 'subscription_cancelled') {
    const userDoc = await db.collection('users').where('uid', '==', subscription_id).get();
    
    if (!userDoc.empty) {
      const userRef = userDoc.docs[0].ref;
      await userRef.update({ plan: "lite" });
    }
  }

  res.sendStatus(200);
})

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`))