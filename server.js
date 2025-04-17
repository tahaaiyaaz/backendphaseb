require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// --- Initialization ---
try {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(), // Uses GOOGLE_APPLICATION_CREDENTIALS env var
    });
    console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    process.exit(1);
}

const storage = new Storage(); // Uses GOOGLE_APPLICATION_CREDENTIALS
const bucketName = process.env.GCS_BUCKET_NAME;
if (!bucketName) {
    console.error('Error: GCS_BUCKET_NAME environment variable is not set.');
    process.exit(1);
}
const bucket = storage.bucket(bucketName);
console.log(`Configured to use GCS Bucket: ${bucketName}`);

const db = admin.firestore();
const app = express();
const port = process.env.PORT || 3001;

// --- Multer Configuration (Memory Storage) ---
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/html') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only HTML files (.html) are allowed.'), false);
        }
    },
});

// --- Middleware ---

const allowedOrigins = [
    'http://127.0.0.1:5500','https://sapphire-aubrie-31.tiiny.site/' ,'*'// Your local frontend dev server
    // Add your deployed frontend URL here later if needed
    // e.g., 'https://your-project-id.web.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests) OR
    // Allow requests from whitelisted origins
    console.log(`CORS check: Received Origin header = ${origin}`);
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`); // Log blocked origins
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // Ensure methods needed are allowed
  allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization", // Allow necessary headers
  credentials: true, // If you were using cookies/sessions across domains (not applicable here but good to know)
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};




app.use(cors(corsOptions)); // Use the configured options

app.use(express.json());

// app.use(cors()); // Configure origins properly in production
// app.use(express.json());

// Firebase Auth Middleware
const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken; // Attach user info (uid, email, etc.)
        console.log(`User authenticated: ${req.user.uid} (${req.user.email})`);
        next();
    } catch (error) {
        console.error('Error verifying Firebase token:', error);
        return res.status(403).json({ message: 'Forbidden: Invalid or expired token.' });
    }
};

// --- Helper Functions ---
const getUserProfile = async (uid) => {
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    return doc.exists ? doc.data() : null;
};

const ensureUserProfile = async (user) => {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    if (!doc.exists) {
        console.log(`Creating profile for new user: ${user.uid}`);
        try {
            await userRef.set({
                email: user.email || null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                deployedSiteCount: 0,
                // Add other default fields if needed (e.g., plan: 'free')
            });
            return await getUserProfile(user.uid); // Return the newly created profile
        } catch (error) {
            console.error(`Failed to create user profile for ${user.uid}:`, error);
            throw new Error('Failed to initialize user profile.');
        }
    }
    return doc.data();
};

// --- Routes ---

// Queue Deployment Route
app.post('/api/queue-deployment', verifyFirebaseToken, upload.single('websiteFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded or invalid file type.' });
    }

    try {
        // Ensure profile exists and get current data
        let profile = await ensureUserProfile(req.user);
        // Re-fetch profile to be absolutely sure we have the latest count after creation
        profile = await getUserProfile(req.user.uid);
        if (!profile) {
             throw new Error('Failed to load user profile after ensuring its existence.'); // Should not happen
        }

        console.log(`User ${req.user.uid} profile data:`, profile);


        // Check Free Limit (Assuming 'deployedSiteCount' exists)
        const siteCount = profile.deployedSiteCount || 0;
        // Add logic here if you introduce paid plans, e.g., check profile.plan
        if (siteCount >= 1) {
            console.warn(`User ${req.user.uid} reached free limit (${siteCount} sites).`);
            return res.status(403).json({ message: 'Free website limit reached. Upgrade required for more sites.' });
        }

        const deploymentId = uuidv4();
        const repoName = `user-${req.user.uid.substring(0, 6)}-site-${Date.now()}`; // Example repo name
        const gcsFileName = `uploads/${deploymentId}/index.html`;
        const gcsFilePath = `gs://${bucketName}/${gcsFileName}`;

        console.log(`Generated deploymentId: ${deploymentId}, repoName: ${repoName}`);
        console.log(`Uploading file to GCS path: ${gcsFilePath}`);

        // Upload file buffer to GCS
        const file = bucket.file(gcsFileName);
        await file.save(req.file.buffer, {
            metadata: { contentType: 'text/html' },
        });
        console.log(`File uploaded successfully to GCS for ${deploymentId}`);

        // Add job to Firestore Queue
        const jobData = {
            userId: req.user.uid,
            status: 'pending',
            gcsFilePath: gcsFilePath,
            repoName: repoName,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            finalUrl: null,
            errorMessage: null,
        };

        await db.collection('deploymentQueue').doc(deploymentId).set(jobData);
        console.log(`Deployment job ${deploymentId} added to Firestore queue.`);

        res.status(202).json({
            message: 'Website file received and queued for deployment.',
            deploymentId: deploymentId,
        });

    } catch (error) {
        console.error(`Error in /api/queue-deployment for user ${req.user?.uid}:`, error);
        res.status(500).json({ message: `Failed to queue deployment: ${error.message}` });
    }
});

// Get Deployment Status Route
app.get('/api/deployment-status/:deploymentId', verifyFirebaseToken, async (req, res) => {
    const { deploymentId } = req.params;

    try {
        const jobRef = db.collection('deploymentQueue').doc(deploymentId);
        const doc = await jobRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Deployment not found.' });
        }

        const jobData = doc.data();

        // Verify ownership
        if (jobData.userId !== req.user.uid) {
            console.warn(`User ${req.user.uid} attempted to access deployment ${deploymentId} owned by ${jobData.userId}`);
            return res.status(403).json({ message: 'Forbidden: You do not own this deployment.' });
        }

        // Return relevant status info
        res.status(200).json({
            deploymentId: deploymentId,
            status: jobData.status,
            finalUrl: jobData.finalUrl,
            errorMessage: jobData.errorMessage,
            createdAt: jobData.createdAt?.toDate(), // Convert timestamp to Date object
            updatedAt: jobData.updatedAt?.toDate(),
        });

    } catch (error) {
        console.error(`Error fetching status for deployment ${deploymentId}:`, error);
        res.status(500).json({ message: 'Failed to retrieve deployment status.' });
    }
});

// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `File upload error: ${err.message}` });
    } else if (err) {
      console.error("Unhandled Error (Service B):", err);
      if (err.message.includes('Invalid file type')) {
          return res.status(400).json({ message: err.message });
      }
      return res.status(500).json({ message: `Internal Server Error: ${err.message}` });
    }
    next();
});


// --- Start Server ---
app.listen(port, () => {
    console.log(`Service B (User Facing) listening at http://localhost:${port}`);
});