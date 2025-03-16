const express = require('express');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const app = express();
app.use(express.json());

app.post('/update-firestore', async (req, res) => {
  const { userId, subscriptionStatus } = req.body;

  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    await userRef.update({ subscriptionStatus });
    res.status(200).send('Firestore updated successfully');
  } catch (error) {
    console.error('Error updating Firestore:', error);
    res.status(500).send('Failed to update Firestore');
  }
});

app.listen(3000, () => console.log('Server is running on port 3000'));