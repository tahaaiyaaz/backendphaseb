// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const admin = require('firebase-admin');
// const { v4: uuidv4 } = require('uuid');
// const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai'); // Import Google AI SDK

// // --- Initialization ---
// try {
//     admin.initializeApp({
//         credential: admin.credential.applicationDefault(),
//     });
//     console.log('Firebase Admin SDK initialized successfully (Service A).');
// } catch (error) {
//     console.error('Error initializing Firebase Admin SDK (Service A):', error);
//     process.exit(1);
// }

// // --- Google AI Client Initialization ---
// const geminiApiKey = process.env.GEMINI_API_KEY;
// let genAI;
// let geminiModel;

// if (!geminiApiKey) {
//     console.warn('Warning: GEMINI_API_KEY not found in .env. AI features will use dummy data.');
// } else {
//     try {
//         genAI = new GoogleGenerativeAI(geminiApiKey);
//         // Model selection (use the appropriate model name)
//         geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Or "gemini-1.5-flash", "gemini-1.5-pro-latest" etc.
//         console.log(`Google Generative AI SDK initialized with model: ${geminiModel.model}`);
//     } catch (error) {
//          console.error('Error initializing Google Generative AI SDK:', error);
//          console.warn('AI features will use dummy data due to initialization error.');
//          geminiModel = null; // Ensure model is null if init fails
//     }
// }

// const app = express();
// const port = process.env.PORT ;

// // --- In-Memory Storage (Same as before) ---
// const previewBuilds = {};
// const MAX_BUILDS = 500;
// const BUILD_TTL_MS = 60 * 60 * 1000;
// setInterval(() => { /* ... (cleanup logic remains the same) ... */
//     const now = Date.now();
//     let cleanedCount = 0;
//     for (const buildId in previewBuilds) {
//         if (!previewBuilds[buildId].createdAt || (now - previewBuilds[buildId].createdAt > BUILD_TTL_MS)) {
//             delete previewBuilds[buildId];
//             cleanedCount++;
//         }
//     }
//     if (cleanedCount > 0) console.log(`Cleaned up ${cleanedCount} expired preview builds.`);
//     if (Object.keys(previewBuilds).length > MAX_BUILDS) console.warn(`Preview build store exceeded MAX_BUILDS (${MAX_BUILDS}).`);
// }, 5 * 60 * 1000);

// // --- Middleware (Same as before) ---



// // Define allowed origins
// const allowedOrigins = [
//     'http://127.0.0.1:5500', 
//     'https://sapphire-aubrie-31.tiiny.site/'// Your local frontend dev server
//     // Add your deployed frontend URL here later if needed
//     // e.g., 'https://your-project-id.web.app'
// ];

// const corsOptions = {
//   origin: function (origin, callback) {
//     console.log(`CORS check: Received Origin header = ${origin}`);
//     // Allow requests with no origin (like mobile apps or curl requests) OR
//     // Allow requests from whitelisted origins
//     if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       console.warn(`CORS blocked for origin: ${origin}`); // Log blocked origins
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // Ensure methods needed are allowed
//   allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization", // Allow necessary headers
//   credentials: true, // If you were using cookies/sessions across domains (not applicable here but good to know)
//   optionsSuccessStatus: 200 // Some legacy browsers choke on 204
// };




// app.use(cors(corsOptions)); // Use the configured options

// app.use(express.json());

// // app.use(cors());
// // app.use(express.json());
// const verifyFirebaseToken = async (req, res, next) => { /* ... (middleware code remains the same) ... */
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//         return res.status(401).json({ message: 'Unauthorized: No token provided.' });
//     }
//     const idToken = authHeader.split('Bearer ')[1];
//     try {
//         const decodedToken = await admin.auth().verifyIdToken(idToken);
//         req.user = decodedToken;
//         console.log(`User authenticated (Service A): ${req.user.uid}`);
//         next();
//     } catch (error) {
//         console.error('Error verifying Firebase token (Service A):', error);
//         return res.status(403).json({ message: 'Forbidden: Invalid or expired token.' });
//     }
// };


// // --- Refined AI Interaction Logic (Using Google Gemini) ---

// // --- Enhanced Prompt Engineering Helper ---
// function createInitialGenerationPrompt(userPrompt) {
//     return `You are an expert frontend web developer specializing in creating single-file HTML websites.
// Your task is to generate a complete and functional single HTML file based *only* on the user's request below.

// **Constraints & Requirements:**
// 1.  **Single File Output:** The entire output MUST be a single HTML file.
// 2.  **Structure:** Include standard HTML5 structure (<!DOCTYPE html>, <html>, <head>, <body>).
// 3.  **CSS:** All CSS rules MUST be placed within <style> tags inside the <head> section. Do NOT use external CSS files or inline styles on elements unless absolutely necessary for dynamic behavior.
// 4.  **JavaScript:** All JavaScript code MUST be placed within <script> tags, ideally placed just before the closing </body> tag. Do NOT use external JS files. Keep JS minimal for functionality described.
// 5.  **Content:** Directly incorporate the content requested by the user. Use placeholder text (like "Lorem ipsum...") only if specific content isn't provided and is clearly needed.
// 6.  **Images:** If the prompt implies images, use placeholder image services (like picsum.photos or placehold.co) with appropriate dimensions and add descriptive alt attributes. Example: \`<img src="https://picsum.photos/seed/coffeeshop/400/200" alt="A warm and inviting coffee shop interior">\`.
// 7.  **Clean Code:** Generate clean, well-formatted, and readable HTML, CSS, and JS. Use semantic HTML tags where appropriate.
// 8.  **NO Extra Text:** The output must contain ONLY the HTML code. Do NOT include any explanations, comments outside the code (like "Here is the HTML code:"), markdown formatting (like \`\`\`html), or any text before the \`<!DOCTYPE html>\` or after the closing \`</html>\` tag.

// **User's Website Request:**
// \`\`\`
// ${userPrompt}
// \`\`\`

// **Generated HTML Code:**`; // AI should start writing the code directly after this line.
// }

// function createRevisionPrompt(currentHtml, revisionRequest) {
//     return `You are an expert frontend web developer modifying an existing single-file HTML website.
// Your task is to take the provided HTML code and apply *only* the specific revision requested by the user.

// **Constraints & Requirements:**
// 1.  **Modify Existing Code:** You MUST work with the provided HTML code.
// 2.  **Apply Only Requested Revision:** Implement *only* the changes described in the revision request. Do not add unrelated features or make stylistic changes not asked for.
// 3.  **Single File Output:** The entire output MUST be the *complete, modified* single HTML file.
// 4.  **Maintain Structure:** Keep CSS within <style> tags and JavaScript within <script> tags as in the original code.
// 5.  **NO Extra Text:** The output must contain ONLY the modified HTML code. Do NOT include any explanations, comments about the changes, markdown formatting (like \`\`\`html), diffs, or any text before the \`<!DOCTYPE html>\` or after the closing \`</html>\` tag.

// **Current HTML Code:**
// \`\`\`html
// ${currentHtml}
// \`\`\`

// **User's Revision Request:**
// \`\`\`
// ${revisionRequest}
// \`\`\`

// **Modified HTML Code:**`; // AI should start writing the modified code directly after this line.
// }

// // --- Updated AI Functions ---
// async function generateWebsiteFromAI(prompt) {
//     console.log("Calling Google AI for initial generation...");
//     if (!geminiModel) { // Use dummy data if API key/model is missing/failed
//         console.warn("Using dummy AI response (initial generation).");
//         return `<!DOCTYPE html><html><head><title>Dummy Site</title><style>body{font-family: sans-serif; background-color: lightgoldenrodyellow;} h1{color: darkgreen;}</style></head><body><h1>Dummy Google AI Website</h1><p>Generated based on prompt: ${prompt}</p><p>Replace this with actual AI generation. Ensure GEMINI_API_KEY is set.</p></body></html>`;
//     }

//     const fullPrompt = createInitialGenerationPrompt(prompt);
//     // --- Configure safety settings (adjust as needed) ---
//     const safetySettings = [
//         { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
//         { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
//         { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
//         { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
//     ];

//     try {
//         const result = await geminiModel.generateContent(fullPrompt, safetySettings);
//         const response = result.response; // Use await result.response

//         // --- Improved Check for Blocked Content or Finish Reason ---
//         if (!response || response.promptFeedback?.blockReason) {
//             const blockReason = response?.promptFeedback?.blockReason || 'Unknown reason';
//             const safetyRatings = JSON.stringify(response?.promptFeedback?.safetyRatings || [], null, 2);
//             console.error(`AI generation blocked. Reason: ${blockReason}. Safety Ratings: ${safetyRatings}`);
//             throw new Error(`AI generation blocked due to safety constraints (${blockReason}). Please modify your prompt.`);
//         }

//         const generatedHtml = response.text(); // Call text() method

//         if (!generatedHtml) {
//             throw new Error("AI returned empty content.");
//         }
//         // Basic validation
//         const cleanedHtml = generatedHtml.trim(); // Trim whitespace
//         if (!cleanedHtml.toLowerCase().startsWith('<!doctype html>') || !cleanedHtml.toLowerCase().includes('</html>')) {
//              console.warn("AI response might not be complete HTML or has extra text:", cleanedHtml.substring(0, 150) + "...");
//              // Attempt to extract HTML if wrapped in markdown (basic attempt)
//              const htmlMatch = cleanedHtml.match(/```html\s*([\s\S]*?)\s*```/);
//              if (htmlMatch && htmlMatch[1]) {
//                  console.log("Extracted HTML from markdown.");
//                  return htmlMatch[1].trim();
//              }
//              // Return the potentially problematic response, hoping it's mostly correct
//              return cleanedHtml;
//         }

//         console.log("Google AI initial generation successful.");
//         return cleanedHtml; // Return the validated/cleaned HTML

//     } catch (error) {
//         console.error("Error calling Google AI API (initial generation):", error);
//          // Distinguish API errors from safety blocks
//         if (error.message.includes("safety constraints")) {
//              throw error; // Re-throw safety error
//         }
//         throw new Error(`AI generation failed: ${error.message}`);
//     }
// }

// async function reviseWebsiteFromAI(currentHtml, revisionRequest) {
//     console.log("Calling Google AI for revision...");
//      if (!geminiModel) { // Use dummy data
//         console.warn("Using dummy AI response (revision).");
//         return `${currentHtml}\n<!-- Dummy Revision Applied (Google AI): ${revisionRequest} -->`;
//     }

//     const fullPrompt = createRevisionPrompt(currentHtml, revisionRequest);
//     // --- Configure safety settings (same as initial) ---
//      const safetySettings = [
//         { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
//         { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
//         { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
//         { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
//     ];

//     try {
//         const result = await geminiModel.generateContent(fullPrompt, safetySettings);
//         const response = result.response; // Use await result.response

//          // --- Improved Check for Blocked Content or Finish Reason ---
//         if (!response || response.promptFeedback?.blockReason) {
//             const blockReason = response?.promptFeedback?.blockReason || 'Unknown reason';
//             const safetyRatings = JSON.stringify(response?.promptFeedback?.safetyRatings || [], null, 2);
//             console.error(`AI revision blocked. Reason: ${blockReason}. Safety Ratings: ${safetyRatings}`);
//             throw new Error(`AI revision blocked due to safety constraints (${blockReason}). Please modify your request.`);
//         }

//         const revisedHtml = response.text(); // Call text() method

//         if (!revisedHtml) {
//             throw new Error("AI returned empty content for revision.");
//         }
//          // Basic validation
//         const cleanedHtml = revisedHtml.trim();
//         if (!cleanedHtml.toLowerCase().startsWith('<!doctype html>') || !cleanedHtml.toLowerCase().includes('</html>')) {
//              console.warn("AI revision response might not be complete HTML or has extra text:", cleanedHtml.substring(0, 150) + "...");
//               // Attempt to extract HTML if wrapped in markdown
//              const htmlMatch = cleanedHtml.match(/```html\s*([\s\S]*?)\s*```/);
//              if (htmlMatch && htmlMatch[1]) {
//                  console.log("Extracted revised HTML from markdown.");
//                  return htmlMatch[1].trim();
//              }
//              return cleanedHtml;
//         }

//         console.log("Google AI revision successful.");
//         return cleanedHtml; // Return validated/cleaned HTML

//     } catch (error) {
//         console.error("Error calling Google AI API (revision):", error);
//          if (error.message.includes("safety constraints")) {
//              throw error; // Re-throw safety error
//         }
//         throw new Error(`AI revision failed: ${error.message}`);
//     }
// }


// // --- Routes (These remain structurally the same, calling the updated AI functions) ---

// // Generate Initial Website Endpoint
// app.post('/api/generate-initial', verifyFirebaseToken, async (req, res) => {
//     const { prompt } = req.body;
//     console.log(prompt)
//     if (!prompt) return res.status(400).json({ message: 'Prompt is required.' });

//     try {
//         const generatedHtml = await generateWebsiteFromAI(prompt); // Calls updated func
//         const buildId = uuidv4();
//         previewBuilds[buildId] = { html: generatedHtml, userId: req.user.uid, createdAt: Date.now() };
//         console.log(`Stored initial build ${buildId} for user ${req.user.uid}`);
//         res.status(201).json({ buildId: buildId });
//     } catch (error) {
//         console.error(`Error in initial generation for user ${req.user.uid}:`, error);
//         res.status(500).json({ message: `Failed to generate website: ${error.message}` });
//     }
// });

// // Revise Website Endpoint
// app.post('/api/revise-website', verifyFirebaseToken, async (req, res) => {
//     const { buildId, revision } = req.body;
//     if (!buildId || !revision) return res.status(400).json({ message: 'buildId and revision are required.' });

//     const build = previewBuilds[buildId];
//     if (!build) return res.status(404).json({ message: 'Build ID not found or expired.' });
//     if (build.userId !== req.user.uid) return res.status(403).json({ message: 'Forbidden: You do not own this build.' });

//     try {
//         const revisedHtml = await reviseWebsiteFromAI(build.html, revision); // Calls updated func
//         previewBuilds[buildId].html = revisedHtml;
//         previewBuilds[buildId].createdAt = Date.now(); // Update timestamp
//         console.log(`Updated build ${buildId} with revision for user ${req.user.uid}`);
//         res.status(200).json({ success: true, message: 'Revision successful.' });
//     } catch (error) {
//         console.error(`Error revising build ${buildId} for user ${req.user.uid}:`, error);
//         res.status(500).json({ message: `Failed to revise website: ${error.message}` });
//     }
// });

// // Preview Endpoint (Remains the same)
// app.get('/api/preview/:buildId/index.html', (req, res) => { /* ... (code remains the same) ... */
//     const { buildId } = req.params;
//     const build = previewBuilds[buildId];
//     if (build && build.html) {
//         res.setHeader('Content-Type', 'text/html');
//         res.send(build.html);
//     } else {
//         res.status(404).send('<html><body><h1>Preview Not Found</h1><p>The preview for this build ID does not exist or has expired.</p></body></html>');
//     }
// });

// // Get Final Code Endpoint (Remains the same)
// app.get('/api/get-final-code/:buildId', verifyFirebaseToken, (req, res) => { /* ... (code remains the same) ... */
//     const { buildId } = req.params;
//     const build = previewBuilds[buildId];
//     if (!build) return res.status(404).json({ message: 'Build ID not found or expired.' });
//     if (build.userId !== req.user.uid) return res.status(403).json({ message: 'Forbidden: You do not own this build.' });
//     res.status(200).json({ html: build.html });
// });


// // --- Error Handling Middleware (Remains the same) ---
// app.use((err, req, res, next) => { /* ... (code remains the same) ... */
//     console.error("Unhandled Error (Service A):", err);
//     res.status(500).json({ message: `Internal Server Error (Service A): ${err.message}` });
// });


// // --- Start Server ---
// app.listen(port, () => {
//     console.log(`Service A (AI & Preview - Google AI) listening at http://localhost:${port}`);
//     console.log("hau re bhai listening")
//     if (!geminiApiKey || !geminiModel) {
//          console.log("*************************************************");
//          console.log("*** Service A running with DUMMY AI data.     ***");
//          console.log("*** Set GEMINI_API_KEY in .env for real AI.   ***");
//          console.log("*************************************************");
//     }
// });





































































// Service A: server.js (Using Secret Manager, Lazy AI Init, Health Checks)

require('dotenv').config(); // For local development environment variables
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');

// --- Constants ---
// Automatically uses the project ID where App Engine is running
const GAE_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const FIREBASE_KEY_SECRET_NAME = `projects/${GAE_PROJECT_ID}/secrets/firebase-service-account-key/versions/latest`;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 8081; // GAE provides PORT, 8081 for local fallback
const AI_MODEL_NAME = "gemini-1.5-flash-latest"; // Or your preferred Gemini model

// --- Global Variables for Initialized Clients ---
let db;
let storage;
let genAI;
let geminiModel = null;
let isAiReady = false;
let aiInitializationError = null;

// --- In-Memory Storage & Cleanup ---
const previewBuilds = {};
const MAX_BUILDS = 500;
const BUILD_TTL_MS = 60 * 60 * 1000; // 1 hour
const cleanupInterval = setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;
    for (const buildId in previewBuilds) {
        if (!previewBuilds[buildId].createdAt || (now - previewBuilds[buildId].createdAt > BUILD_TTL_MS)) {
            delete previewBuilds[buildId];
            cleanedCount++;
        }
    }
    if (cleanedCount > 0) console.log(`[Cleanup] Cleaned up ${cleanedCount} expired preview builds.`);
    if (Object.keys(previewBuilds).length > MAX_BUILDS) console.warn(`[Cleanup] Preview build store exceeded MAX_BUILDS (${MAX_BUILDS}). Consider external store.`);
}, 5 * 60 * 1000); // Run every 5 minutes

// --- ASYNCHRONOUS Initialization Functions ---

// 1. Initialize Core Services (Secrets, Firebase, GCS) - Must be fast
async function initializeCoreServices() {
    try {
        console.log('[INIT_CORE] Starting core services initialization...');
        if (!GAE_PROJECT_ID) {
             throw new Error("GOOGLE_CLOUD_PROJECT environment variable not set. Cannot determine secret path.");
        }
        console.log(`[INIT_CORE] Target Project ID for Secret: ${GAE_PROJECT_ID}`);

        const secretManagerClient = new SecretManagerServiceClient({
            gaxOpts: { // Add timeout/retry for robustness
                timeout: 15000, // 15 seconds timeout
                retry: {
                    retryCodes: ['DEADLINE_EXCEEDED', 'UNAVAILABLE'],
                    backoffSettings: { initialRetryDelayMillis: 200, retryDelayMultiplier: 1.5, maxRetryDelayMillis: 10000, totalTimeoutMillis: 30000 }
                }
            }
        });
        console.log('[INIT_CORE] Secret Manager client created.');

        console.log(`[INIT_CORE] Fetching secret: ${FIREBASE_KEY_SECRET_NAME}`);
        const [version] = await secretManagerClient.accessSecretVersion({ name: FIREBASE_KEY_SECRET_NAME });
        console.log('[INIT_CORE] Secret fetched successfully.');

        const keyPayload = version.payload.data.toString('utf8');
        const serviceAccountCredentials = JSON.parse(keyPayload);
        console.log('[INIT_CORE] Service account key parsed.');

        admin.initializeApp({ credential: admin.credential.cert(serviceAccountCredentials) });
        db = admin.firestore();
        console.log('[INIT_CORE] Firebase Admin SDK initialized.');

        storage = new Storage({
            projectId: serviceAccountCredentials.project_id, // Use project ID from the key for GCS context
            credentials: serviceAccountCredentials,
        });
        console.log(`[INIT_CORE] Google Cloud Storage client initialized for project: ${serviceAccountCredentials.project_id}.`);

        console.log('[INIT_CORE] Core services initialized successfully.');
        return true;

    } catch (error) {
        console.error('[INIT_CORE] FATAL ERROR during core services initialization:', error);
        return false;
    }
}

// 2. Initialize Google AI (Run in background after server start)
async function initializeGoogleAI() {
    if (!GEMINI_API_KEY) {
        console.warn('[INIT_AI] Skipping Google AI initialization (GEMINI_API_KEY not set). AI features will be unavailable.');
        aiInitializationError = new Error("AI Service not configured (missing API key).");
        isAiReady = false;
        return;
    }
    if (geminiModel || isAiReady) {
        console.log('[INIT_AI] Google AI already initialized or initialization in progress.');
        return;
    }

    console.log('[INIT_AI] Starting Google AI initialization...');
    try {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: AI_MODEL_NAME });
        // Optional: Quick test call to confirm connectivity (might delay readiness signal)
        // console.log('[INIT_AI] Performing quick token count test...');
        // await geminiModel.countTokens("test");
        // console.log('[INIT_AI] Token count test successful.');

        isAiReady = true; // SUCCESS!
        aiInitializationError = null;
        console.log(`[INIT_AI] Google AI SDK initialized successfully with model: ${AI_MODEL_NAME}`);
    } catch (error) {
        console.error('[INIT_AI] FATAL ERROR during Google AI initialization:', error);
        geminiModel = null;
        isAiReady = false;
        aiInitializationError = error; // Store error
    }
}

// --- Express App Setup ---
const app = express();

// --- CORS Middleware ---
const allowedOrigins = [
    'http://127.0.0.1:5500', // Local dev (adjust port if different)
    'https://sapphire-aubrie-31.tiiny.site', // Your deployed frontend origin
    // Add any other frontend origins here
];
const corsOptions = {
  origin: function (origin, callback) {
    console.log(`[CORS] Check: Received Origin header = ${origin || 'N/A'}`);
    // Allow requests with no origin OR from whitelisted origins
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      console.log(`[CORS] Allowed for origin: ${origin || 'No Origin'}`);
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS')); // Pass error to callback
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS", // Must include OPTIONS for preflight
  allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization", // Allow required headers
  credentials: true, // If needed later
  optionsSuccessStatus: 200 // OK status for preflight response
};
app.use(cors(corsOptions));

// --- Basic Request Body Parsing ---
app.use(express.json());

// --- Firebase Auth Middleware ---
const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Allow OPTIONS requests to pass through without auth check for CORS preflight
        if (req.method === 'OPTIONS') { return next(); }
        console.warn('[AUTH] Unauthorized: No token provided.');
        return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        console.log(`[AUTH] User authenticated: ${req.user.uid}`);
        next();
    } catch (error) {
        console.error('[AUTH] Error verifying Firebase token:', error);
        return res.status(403).json({ message: 'Forbidden: Invalid or expired token.' });
    }
};

// --- Health Check Endpoints ---
app.get('/readiness_check', (req, res) => {
  console.log("[HealthCheck] Readiness check called.");
  // Could add checks here: e.g., is DB connected?
  res.status(200).send('OK');
});
app.get('/liveness_check', (req, res) => {
    console.log("[HealthCheck] Liveness check called.");
    res.status(200).send('OK');
});

// --- API Routes ---

// Generate Initial Website Endpoint
app.post('/api/generate-initial', verifyFirebaseToken, async (req, res) => {
    console.log(`[ROUTE /api/generate-initial] Request received.`);
    if (!isAiReady) {
        const errorMsg = `AI Service temporarily unavailable. ${aiInitializationError ? `Reason: ${aiInitializationError.message}` : 'Still initializing...'}`;
        console.error(`[ROUTE /api/generate-initial] AI not ready. ${errorMsg}`);
        return res.status(503).json({ message: errorMsg });
    }
    const { prompt } = req.body;
    console.log(`[ROUTE /api/generate-initial] User ${req.user.uid} - Prompt: "${prompt ? prompt.substring(0, 70) + '...' : 'empty'}"`);
    if (!prompt) return res.status(400).json({ message: 'Prompt is required.' });
    try {
        const generatedHtml = await generateWebsiteFromAI(prompt);
        const buildId = uuidv4();
        previewBuilds[buildId] = { html: generatedHtml, userId: req.user.uid, createdAt: Date.now() };
        console.log(`[ROUTE /api/generate-initial] Stored build ${buildId}`);
        res.status(201).json({ buildId: buildId });
    } catch (error) {
        console.error(`[ROUTE /api/generate-initial] Error for user ${req.user.uid}:`, error);
        res.status(500).json({ message: `Failed to generate website: ${error.message}` });
    }
});

// Revise Website Endpoint
app.post('/api/revise-website', verifyFirebaseToken, async (req, res) => {
    console.log(`[ROUTE /api/revise-website] Request received.`);
    if (!isAiReady) {
        const errorMsg = `AI Service temporarily unavailable. ${aiInitializationError ? `Reason: ${aiInitializationError.message}` : 'Still initializing...'}`;
        console.error(`[ROUTE /api/revise-website] AI not ready. ${errorMsg}`);
        return res.status(503).json({ message: errorMsg });
    }
    const { buildId, revision } = req.body;
    console.log(`[ROUTE /api/revise-website] User ${req.user.uid} - Revision for build ${buildId}: "${revision ? revision.substring(0, 70) + '...' : 'empty'}"`);
    if (!buildId || !revision) return res.status(400).json({ message: 'buildId and revision are required.' });
    const build = previewBuilds[buildId];
    if (!build) return res.status(404).json({ message: 'Build ID not found or expired.' });
    if (build.userId !== req.user.uid) {
        console.warn(`[ROUTE /api/revise-website] Forbidden access attempt by user ${req.user.uid} on build ${buildId} owned by ${build.userId}`);
        return res.status(403).json({ message: 'Forbidden: You do not own this build.' });
    }
    try {
        const revisedHtml = await reviseWebsiteFromAI(build.html, revision);
        previewBuilds[buildId].html = revisedHtml;
        previewBuilds[buildId].createdAt = Date.now(); // Update timestamp
        console.log(`[ROUTE /api/revise-website] Updated build ${buildId}`);
        res.status(200).json({ success: true, message: 'Revision successful.' });
    } catch (error) {
        console.error(`[ROUTE /api/revise-website] Error revising build ${buildId}:`, error);
        res.status(500).json({ message: `Failed to revise website: ${error.message}` });
    }
});

// Preview Endpoint
// Consider adding verifyFirebaseToken if previews should be private
app.get('/api/preview/:buildId/index.html', (req, res) => {
    const { buildId } = req.params;
    console.log(`[ROUTE /api/preview] Request for build ${buildId}`);
    const build = previewBuilds[buildId];
    if (build && build.html) {
        res.setHeader('Content-Type', 'text/html');
        res.send(build.html);
    } else {
        res.status(404).send('<html><body><h1>Preview Not Found</h1><p>The preview for this build ID does not exist or has expired.</p></body></html>');
    }
});

// Get Final Code Endpoint
app.get('/api/get-final-code/:buildId', verifyFirebaseToken, (req, res) => {
    const { buildId } = req.params;
    console.log(`[ROUTE /api/get-final-code] Request for build ${buildId} by user ${req.user.uid}`);
    const build = previewBuilds[buildId];
    if (!build) return res.status(404).json({ message: 'Build ID not found or expired.' });
    if (build.userId !== req.user.uid) {
        console.warn(`[ROUTE /api/get-final-code] Forbidden access attempt by user ${req.user.uid} on build ${buildId} owned by ${build.userId}`);
        return res.status(403).json({ message: 'Forbidden: You do not own this build.' });
    }
    res.status(200).json({ html: build.html });
});


// --- Global Error Handling Middleware ---
app.use((err, req, res, next) => {
    console.error("[ERROR_HANDLER] Unhandled Error (Service A):", err);
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ message: 'Forbidden by CORS policy.' });
    }
    // Default error handler
    res.status(500).json({ message: `Internal Server Error (Service A): ${err.message || 'Unknown error'}` });
});

// --- Start Server Function ---
async function startServer() {
    console.log("Attempting to initialize core services...");
    const coreServicesReady = await initializeCoreServices();

    if (!coreServicesReady) {
        console.error("SERVER START FAILED: Core services failed to initialize. Server will not listen.");
        // In a real scenario, might want more robust handling or retries
        // For now, prevent server from starting
        return;
    }

    // --- Start Listening ---
    const server = app.listen(PORT, () => {
        console.log(`----------------------------------------------------------------`);
        console.log(` Service A listening at http://localhost:${PORT} (or GAE Port ${process.env.PORT})`);
        console.log(` Core services (Firebase, GCS) are READY.`);
        console.log(` Starting background initialization of Google AI...`);
        console.log(`----------------------------------------------------------------`);

        // Trigger background AI initialization - DO NOT await
        initializeGoogleAI();
    });

    server.on('error', (error) => {
        console.error("FATAL: Server listening error:", error);
        process.exit(1); // Exit if server can't even start listening
    });

    // Graceful Shutdown Handling (Optional but Recommended)
    const signals = { 'SIGINT': 2, 'SIGTERM': 15 };
    Object.keys(signals).forEach((signal) => {
        process.on(signal, () => {
            console.log(`[Shutdown] Received ${signal}, shutting down gracefully...`);
            clearInterval(cleanupInterval); // Stop the cleanup loop
            server.close(() => {
                console.log('[Shutdown] HTTP server closed.');
                // Add any other cleanup here (e.g., close DB connections if applicable)
                process.exit(128 + signals[signal]);
            });
            // Force shutdown if server hasn't closed after a timeout
            setTimeout(() => {
                console.error('[Shutdown] Forcing shutdown after timeout.');
                process.exit(128 + signals[signal]);
            }, 5000); // 5 second timeout
        });
    });
}

// --- Run Server Start ---
startServer();

// --- AI Helper Functions (Using Google Gemini) ---

function createInitialGenerationPrompt(userPrompt) {
    return `You are an expert frontend web developer specializing in creating single-file HTML websites.
Your task is to generate a complete and functional single HTML file based *only* on the user's request below.

**Constraints & Requirements:**
1.  **Single File Output:** The entire output MUST be a single HTML file.
2.  **Structure:** Include standard HTML5 structure (\`<!DOCTYPE html>\`, \`<html>\`, \`<head>\`, \`<body>\`). Include a relevant \`<title>\` tag.
3.  **CSS:** All CSS rules MUST be placed within \`<style>\` tags inside the \`<head>\` section. Use modern CSS practices. Make it visually presentable by default. Do NOT use external CSS files or inline styles on elements.
4.  **JavaScript:** All JavaScript code MUST be placed within \`<script>\` tags, just before the closing \`</body>\` tag. Keep JS minimal for functionality described in the prompt. Do NOT use external JS files.
5.  **Content:** Directly incorporate the content requested by the user. Use relevant placeholder text (like "About Us section content...") only if specific content isn't provided.
6.  **Images:** If the prompt implies images, use placeholder image services (like picsum.photos or placehold.co) with appropriate dimensions and descriptive \`alt\` attributes. Example: \`<img src="https://picsum.photos/seed/website/600/300" alt="Relevant description based on prompt">\`.
7.  **Clean Code:** Generate clean, well-formatted, and readable HTML, CSS, and JS. Use semantic HTML tags (e.g., <header>, <nav>, <main>, <section>, <footer>).
8.  **NO Extra Text:** The output must contain ONLY the HTML code, starting precisely with \`<!DOCTYPE html>\` and ending precisely with \`</html>\`. Do NOT include any explanations, comments outside the code, markdown formatting (like \`\`\`html).

**User's Website Request:**
\`\`\`
${userPrompt}
\`\`\`

**Generated HTML Code:**`;
}

function createRevisionPrompt(currentHtml, revisionRequest) {
    return `You are an expert frontend web developer modifying an existing single-file HTML website.
Your task is to take the provided HTML code and apply *only* the specific revision requested by the user.

**Constraints & Requirements:**
1.  **Modify Existing Code:** You MUST work with the provided HTML code.
2.  **Apply Only Requested Revision:** Implement *only* the changes described in the revision request. Do not add unrelated features or make stylistic changes not asked for. Address the request accurately.
3.  **Single File Output:** The entire output MUST be the *complete, modified* single HTML file.
4.  **Maintain Structure:** Keep CSS within \`<style>\` tags and JavaScript within \`<script>\` tags as in the original code. Preserve existing functionality unless the revision explicitly asks to change it.
5.  **NO Extra Text:** The output must contain ONLY the modified HTML code, starting precisely with \`<!DOCTYPE html>\` and ending precisely with \`</html>\`. Do NOT include any explanations, comments about the changes, markdown formatting (like \`\`\`html), diffs.

**Current HTML Code:**
\`\`\`html
${currentHtml}
\`\`\`

**User's Revision Request:**
\`\`\`
${revisionRequest}
\`\`\`

**Modified HTML Code:**`;
}

// --- AI Function Implementations ---
async function generateWebsiteFromAI(prompt) {
    console.log(`[AI] Calling Google AI for initial generation (Model: ${AI_MODEL_NAME}).`);
    if (!geminiModel) throw new Error("AI Model not initialized."); // Should be caught by isAiReady check earlier

    const fullPrompt = createInitialGenerationPrompt(prompt);
    const safetySettings = [ /* ... Your safety settings ... */ ]; // Keep safety settings

    try {
        const result = await geminiModel.generateContent(fullPrompt, { safetySettings }); // Pass safetySettings correctly
        const response = result.response;

        if (!response || response.promptFeedback?.blockReason) {
            const blockReason = response?.promptFeedback?.blockReason || 'Unknown reason';
            console.error(`[AI] Initial generation blocked. Reason: ${blockReason}.`);
            throw new Error(`AI generation blocked due to safety constraints (${blockReason}). Please modify your prompt.`);
        }

        let generatedHtml = response.text();
        if (!generatedHtml) throw new Error("AI returned empty content.");

        // Basic cleaning/validation
        generatedHtml = generatedHtml.trim();
        const htmlMatch = generatedHtml.match(/^<!DOCTYPE html>[\s\S]*<\/html>$/i); // Check start/end
        if (!htmlMatch) {
             const markdownMatch = generatedHtml.match(/```html\s*([\s\S]*?)\s*```/);
             if (markdownMatch && markdownMatch[1]) {
                 console.warn("[AI] Initial response wrapped in markdown, extracting.");
                 generatedHtml = markdownMatch[1].trim();
             } else {
                console.warn("[AI] Initial response might not be complete HTML or has extra text:", generatedHtml.substring(0, 100) + "...");
                // Decide if you want to return potentially broken HTML or throw error
             }
        }

        console.log("[AI] Initial generation successful.");
        return generatedHtml;

    } catch (error) {
        console.error("[AI] Error calling Google AI API (initial generation):", error);
        if (error.message.includes("safety constraints")) throw error; // Re-throw specific safety errors
        throw new Error(`AI generation failed: ${error.message}`); // General AI error
    }
}

async function reviseWebsiteFromAI(currentHtml, revisionRequest) {
    console.log(`[AI] Calling Google AI for revision (Model: ${AI_MODEL_NAME}).`);
    if (!geminiModel) throw new Error("AI Model not initialized.");

    const fullPrompt = createRevisionPrompt(currentHtml, revisionRequest);
    const safetySettings = [ /* ... Your safety settings ... */ ]; // Keep safety settings

    try {
        const result = await geminiModel.generateContent(fullPrompt, { safetySettings }); // Pass safetySettings correctly
        const response = result.response;

        if (!response || response.promptFeedback?.blockReason) {
             const blockReason = response?.promptFeedback?.blockReason || 'Unknown reason';
            console.error(`[AI] Revision blocked. Reason: ${blockReason}.`);
            throw new Error(`AI revision blocked due to safety constraints (${blockReason}). Please modify your request.`);
        }

        let revisedHtml = response.text();
        if (!revisedHtml) throw new Error("AI returned empty content for revision.");

        // Basic cleaning/validation
        revisedHtml = revisedHtml.trim();
        const htmlMatch = revisedHtml.match(/^<!DOCTYPE html>[\s\S]*<\/html>$/i);
         if (!htmlMatch) {
             const markdownMatch = revisedHtml.match(/```html\s*([\s\S]*?)\s*```/);
             if (markdownMatch && markdownMatch[1]) {
                 console.warn("[AI] Revision response wrapped in markdown, extracting.");
                 revisedHtml = markdownMatch[1].trim();
             } else {
                console.warn("[AI] Revision response might not be complete HTML or has extra text:", revisedHtml.substring(0, 100) + "...");
             }
        }

        console.log("[AI] Revision successful.");
        return revisedHtml;

    } catch (error) {
        console.error("[AI] Error calling Google AI API (revision):", error);
         if (error.message.includes("safety constraints")) throw error;
        throw new Error(`AI revision failed: ${error.message}`);
    }
}
