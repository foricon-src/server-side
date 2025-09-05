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
const svgpath = require('svgpath');
const bbox = require('svgpath-bbox');
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
function processSVG(svgContent) {
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');

    let maxX = 0, maxY = 0, minX = Infinity, minY = Infinity;

    function updateBBoxFromPath(d) {
        try {
            const [x1, y1, x2, y2] = bbox(d);
            if (x1 < minX) minX = x1;
            if (y1 < minY) minY = y1;
            if (x2 > maxX) maxX = x2;
            if (y2 > maxY) maxY = y2;
        }
        catch (e) {}
    }

    function traverse(node) {
        if (!node.getAttribute) return;

        const fill = node.getAttribute('fill');
        const stroke = node.getAttribute('stroke');
        const opacity = node.getAttribute('opacity');
        const display = node.getAttribute('display');
        const visibility = node.getAttribute('visibility');

        const invisible =
        (fill === 'none' || fill === 'transparent') &&
        (!stroke || stroke === 'none') &&
        (opacity === '0' || display === 'none' || visibility === 'hidden');

        if (node.tagName === 'path') {
            const d = node.getAttribute('d');
            d && updateBBoxFromPath(d);
            if (invisible) {
                // xóa path vô hình (không render)
                node.parentNode.removeChild(node);
                return;
            }
        }

        if (node.tagName === 'rect') {
            const x = parseFloat(node.getAttribute('x') || 0);
            const y = parseFloat(node.getAttribute('y') || 0);
            const w = parseFloat(node.getAttribute('width') || 0);
            const h = parseFloat(node.getAttribute('height') || 0);
            updateBBoxFromPath(`M${x},${y} h${w} v${h} h${-w} Z`);
            if (invisible) {
                node.parentNode.removeChild(node);
                return;
            }
        }

        if (node.tagName === 'circle') {
            const cx = parseFloat(node.getAttribute('cx') || 0);
            const cy = parseFloat(node.getAttribute('cy') || 0);
            const r = parseFloat(node.getAttribute('r') || 0);
            updateBBoxFromPath(`M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0`);
            if (invisible) {
                node.parentNode.removeChild(node);
                return;
            }
        }

        if (node.childNodes)
            for (let i = 0; i < node.childNodes.length; i++)
                traverse(node.childNodes[i]);
    }

    traverse(doc.documentElement);

    const cleaned = serializer.serializeToString(doc);
    const bboxResult = {
        width: maxX - minX || 0,
        height: maxY - minY || 0,
    }

    return { svg: cleaned, bbox: bboxResult };
}
app.post('/create-font', multer({ dest: 'uploads/' }).array('icons'), async (req, res) => {
    try {
        const outputDir = path.join(__dirname, 'output');
        !fs.existsSync(outputDir) && fs.mkdirSync(outputDir, { recursive: true });

        const svgFontPath = path.join(outputDir, 'custom-icons.svg');
        const fontStream = new SVGIcons2SVGFontStream({
            fontName: 'Foricon Beta',
            normalize: true,
            fontHeight: 1000,
            ascent: 840,
            descent: 160,
            log: () => {},
        })

        const svgFontStream = fs.createWriteStream(svgFontPath);
        fontStream.pipe(svgFontStream);

        let unicodeStart = 0xe000;
        let notdefHandled = false;

        for (const file of req.files) {
            const originalName = file.originalname;
            const glyphName = path.parse(originalName).name;

            let svgContent = fs.readFileSync(file.path, 'utf8');
            const { svg: cleaned, bbox: glyphBBox } = processSVG(svgContent);

            const glyphStream = new stream.Readable();
            glyphStream.push(cleaned);
            glyphStream.push(null);

            if (!glyphName || glyphName === '') {
                if (!notdefHandled) {
                    glyphStream.metadata = {
                        unicode: [0x0000],
                        name: '.notdef',
                    }
                    fontStream.write(glyphStream);
                    notdefHandled = true;
                }
                continue;
            }

            glyphStream.metadata = {
                unicode: [String.fromCharCode(unicodeStart++)],
                name: glyphName,
                advanceWidth: glyphBBox.width || 644, // giữ width từ bbox
            }
            fontStream.write(glyphStream);
        }

        fontStream.end();

        svgFontStream.on('finish', () => {
            const svgFontData = fs.readFileSync(svgFontPath, 'utf8');
            const ttf = svg2ttf(svgFontData, {});
            const ttfBuffer = Buffer.from(ttf.buffer);

            // Xóa file tạm
            req.files.forEach((file) => fs.unlink(file.path, () => {}));
            fs.unlink(svgFontPath, () => {});

            res.setHeader(
                'Content-Disposition',
                'attachment; filename=custom-icons.ttf'
            )
            res.setHeader('Content-Type', 'font/ttf');
            res.send(ttfBuffer);
        })

        svgFontStream.on('error', (err) => {
            console.error('Lỗi ghi SVG font:', err);
            res.status(500).send('Lỗi khi tạo font SVG');
        })
    }
    catch (err) {
        console.error('Lỗi xử lý font:', err);
        res.status(500).send('Lỗi server');
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