const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

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