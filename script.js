const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const admin = require('firebase-admin');
const cors = require('cors')
const { Paddle } = require('@paddle/paddle-node-sdk');
const cloudinary = require('cloudinary').v2;
const fetch = require('node-fetch');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { SVGIcons2SVGFontStream } = require('svgicons2svgfont');
const svg2ttf = require('svg2ttf');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const { svgPathBbox } = require('svg-path-bbox');
// const { Readable } = require('stream');

const sandbox = true;

const parser = new DOMParser();
const serializer = new XMLSerializer();

const paddleAPIKey = process.env[sandbox ? 'SANBOX_VENDOR_AUTH_CODE' : 'SANBOX_VENDOR_AUTH_CODE'];
const paddle = new Paddle(paddleAPIKey, {
    environment: sandbox ? 'sandbox' : 'live',
})
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cors({
    origin: 'https://foricon-dev.blogspot.com',
    headers: ['Content-Type'],
    credentials: true,
}))

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
})
const db = admin.firestore();
const userCollection = db.collection('users');

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
const api_key = process.env.CLOUDINARY_API_KEY;
const api_secret = process.env.CLOUDINARY_SECRET;

cloudinary.config({
    cloud_name, api_key, api_secret
})

function getObj() {
    const date = new Date();
    return {
        count: 0,
        start: {
            day: date.getDate(),
            month: date.getMonth(),
            year: date.getFullYear(),
            timezone: date.getTimezoneOffset() / 60,
        }
    }
}

app.post('/update-plan', (req, res) => {
    const signature = req.headers['paddle-signature'];
    const payload = req.body;
    
    if (verifyPaddleSignature(payload, signature)) {
        const { status, custom_data, items } = payload.data;
        const { name } = items[0].price;
        const plan = name[0].toLowerCase() + name.substr(1).replace(' ', '');
        const userDoc = userCollection.doc(custom_data.uid);
        userDoc.set({
            plan: status == 'active' ? plan : 'lite',
            pageview: getObj(),
        }, { merge: true })
        
        res.status(200).send({
            success: true,
            message: 'Webhook processed successfully',
        })
    }
    else {
        console.log('Invalid signature');
        res.status(403).send('Invalid signature');
    }
})
app.post('/cancel-subscription/:userId', async (req, res) => {
    if (validateRequestOrigin(req)) {
        const { userId } = req.params;

        const userDocRef = db.collection('users').doc(userId);
        const userDoc = await userDocRef.get();

        const transaction = await paddle.transactions.get(userDoc.data().tid);
        
        try {
            await paddle.subscriptions.cancel(transaction.subscriptionId, {
                effectiveFrom: 'immediately',
            })
            await userDocRef.set({
                tid: null,
                plan: 'lite',
                pageview: getObj(),
            }, { merge: true });
            
            res.status(200).send({
                success: true,
                message: 'Successfully canceled subscription',
            })
        }
        catch (error) {
            console.error(`Error canceling subscription for ${userId}: `, error);
            res.status(500).send({
                success: false,
                message: error.message,
            })
        }
    }
    else {
        console.log('Unauthorized request has been blocked');
        res.status(403).send('Request is forbidden');
    }
})
app.post('/send-notification', async (req, res) => {
    const { registrationToken, title, body } = req.body;

    if (validateRequestOrigin(req)) {
        if (!registrationToken || !title || !body)
            return res.status(400).send('Missing required fields');
    
        const message = {
            notification: {
                title: title,
                body: body,
            },
            token: registrationToken,
        };
    
        try {
            const response = await admin.messaging().send(message);
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error sending email: ', error);
            res.status(500).send({
                success: false,
                message: error.message,
            });
        }
    }
    else {
        console.log('Unauthorized request has been blocked');
        res.status(403).send({
            success: false,
            message: 'Request is forbidden',
        })
    }
})
app.post('/get-signature', (req, res) => {
    if (validateRequestOrigin(req)) {
        const timestamp = Math.floor(Date.now() / 1000);
        const folder = `users/${req.body.uid}`;
        const { public_id } = req.body;
      
        const paramsToSign = {
            timestamp,
            folder,
            public_id,
            upload_preset: 'default',
        }
      
        const signature = crypto
            .createHash('sha1')
            .update(
                Object.keys(paramsToSign)
                .sort()
                .map((key) => `${key}=${paramsToSign[key]}`)
                .join('&') + api_secret
            )
            .digest('hex');
      
        res.json({
            signature,
            timestamp,
            api_key,
            folder,
            public_id,
            upload_preset: 'default',
        })
    }
    else {
        console.log('Unauthorized request has been blocked');
        res.status(403).send('Request is forbidden');
    }
})
app.get('/list-user-files/:userId', async (req, res) => {
    if (validateRequestOrigin(req)) {
        const { userId } = req.params;

        try {
            const result = await cloudinary.search
            .expression(`folder:users/${userId}`)
            .with_field('context')
            .max_results(100)
            .execute();
      
            res.json(result.resources);
        }
        catch (error) {
            console.log(`Error listing ${userId} files: `, error);
            res.status(500).json({
                success: false,
                message: error.message,
            })
        }
    }
    else {
        console.log('Unauthorized request has been blocked');
        res.status(403).send('Request is forbidden');
    }
})
app.post('/remove-file/:type/:publicId(*)', async (req, res) => {
    if (validateRequestOrigin(req)) {
        const { type, publicId } = req.params;
    
        try {
            await cloudinary.uploader.destroy(publicId, {
                resource_type: type,
            })
            res.status(200).send({
                success: true,
                message: 'Successfully removed file',
            })
        }
        catch (error) {
            console.log('Error removing Cloudinary file: ', error);
            res.status(500).send({
                success: false,
                message: error.message,
            })
        }
    }
    else {
        console.log('Unauthorized request has been blocked');
        res.status(403).send('Request is forbidden');
    }
})
app.post('/transform', async (req, res) => {
    if (validateRequestOrigin(req)) {
        const { publicId, options } = req.body;
        options.secure = true;
        options.sign_url = true;

        res.json(cloudinary.url(publicId, options));
    }
    else {
        console.log('Unauthorized request has been blocked');
        res.status(403).send('Request is forbidden');
    }
})
function processSVG(svgContent, glyphName) {
    const doc = new DOMParser().parseFromString(svgContent, 'image/svg+xml');

    // Xóa toàn bộ path vô hình
    const paths = doc.getElementsByTagName('path');
    for (let i = paths.length - 1; i >= 0; i--) {
        const pathEl = paths[i];
        const fill = pathEl.getAttribute('fill');
        (!fill || fill === 'transparent' || fill === 'none' || fill === '#00000000') && pathEl.parentNode.removeChild(pathEl);
    }

    // Giữ nguyên viewBox để đảm bảo bounding box không bị thay đổi
    const svgEl = doc.getElementsByTagName('svg')[0];
    if (svgEl) {
        const vb = svgEl.getAttribute('viewBox');
        vb && svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }

    return new XMLSerializer().serializeToString(doc);
}
app.post('/create-font', multer({ dest: 'uploads/' }).array('icons'), async (req, res) => {
    try {
        const outputDir = path.join(__dirname, 'output');
        !fs.existsSync(outputDir) && fs.mkdirSync(outputDir, { recursive: true });

        const svgFontPath = path.join(outputDir, 'custom-icons.svg');

        const fontStream = new SVGIcons2SVGFontStream({
            fontName: 'Foricon Beta',
            normalize: false,
            fontHeight: 1000,
            ascent: 840,
            descent: 160,
            log: () => {},
        })

        const svgFontStream = fs.createWriteStream(svgFontPath);
        fontStream.pipe(svgFontStream);

        let unicodeStart = 0xE000;
        let glyphCount = 0;

        for (const file of req.files) {
            const originalName = file.originalname;
            const glyphName = path.parse(originalName).name.trim(); // tên file không có .svg

            const svgContent = fs.readFileSync(file.path, 'utf8');
            const doc = new DOMParser().parseFromString(svgContent, 'image/svg+xml');

            const allElements = doc.getElementsByTagName('*');
            for (let i = 0; i < allElements.length; i++) {
                const elem = allElements[i];
                const fill = elem.getAttribute('fill');
                const opacity = elem.getAttribute('opacity');
                const display = elem.getAttribute('display');

                if ((fill && fill.toLowerCase() === 'none') ||
                    (opacity && opacity === '0') ||
                    (display && display === 'none')) {
                    elem.setAttribute('d', '');
                    elem.removeAttribute('fill');
                    elem.removeAttribute('stroke');
                }
            }

            svgContent = new XMLSerializer().serializeToString(doc);

            const tmpPath = path.join('uploads', `${glyphName || 'unnamed'}-cleaned.svg`);
            fs.writeFileSync(tmpPath, svgContent);

            const glyphStream = fs.createReadStream(tmpPath);

            glyphStream.metadata = {
                unicode: [String.fromCharCode(unicodeStart++)],
                name: glyphName,
            }
            fontStream.write(glyphStream);
            glyphCount++;
        }

        fontStream.end();

        svgFontStream.on('finish', () => {
            try {
                const svgFontData = fs.readFileSync(svgFontPath, 'utf8');
                const ttf = svg2ttf(svgFontData, {});

                const ttfBuffer = Buffer.from(ttf.buffer);
                res.setHeader('Content-Disposition', 'attachment; filename=custom-icons.ttf');
                res.setHeader('Content-Type', 'font/ttf');
                res.send(ttfBuffer);
            }
            catch (err) {
                console.error('Lỗi khi chuyển SVG sang TTF:', err);
                res.status(500).send('Font build error');
            }
        })
        svgFontStream.on('error', (error) => {
            console.error('Lỗi khi ghi font SVG:', error);
            res.status(500).send({
                success: false,
                message: error.message,
            })
        })
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: error.message,
        })
    }
})

async function verifyPaddleSignature(body, signature) {
    try {
        await paddle.webhooks.unmarshal(JSON.stringify(body), paddleAPIKey, JSON.stringify(signature));
        console.log('Webhook verified and data received');
        return true;
    }
    catch (error) {
        console.error('Invalid webhook request: ', error.message);
        return false;
    }
}
function validateRequestOrigin(req) {
    const allowedOrigin = 'https://foricon-dev.blogspot.com';
    const referer = req.headers.referer || '';
    const origin = req.headers.origin || '';

    return referer.startsWith(allowedOrigin) || origin.startsWith(allowedOrigin);
}
// async function checkAndSyncEmails() {
//     console.log('Checked')
//     try {
//         const users = await admin.auth().listUsers();
        
//         for (const user of users.users) {
//             const { uid, email } = user;
            
//             const userDocRef = userCollection.doc(uid);
//             const userDoc = await userDocRef.get();

//             if (userDoc.exists && userDoc.data().email != email) {
//                 await userDocRef.update({ email });
//                 console.log(`Updated email for UID: ${uid}`);
//             }
//         }
//     }
//     catch (error) {
//         console.error("Error checking and syncing emails:", error);
//     }
// }
// setInterval(checkAndSyncEmails, 5000);

app.listen(3000, () => console.log('Server running on port 3000'));