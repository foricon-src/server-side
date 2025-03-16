const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

const PORT = process.env.PORT || 3000;

const express = require('express');
const app = express();

app.post('/paddle-webhook', async (req, res) => {
  console.log(req.body);

  res.sendStatus(200);
})

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`))