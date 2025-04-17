// require('dotenv').config(); // Load environment variables from .env file
// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const axios = require('axios');
// const { v4: uuidv4 } = require('uuid');
// const cors = require('cors');


// const app = express();
// const port =3000;

// // --- Configuration ---
// const UPLOAD_DIR = path.join(__dirname, 'uploads');
// const JENKINS_URL = 'http://localhost:8080'; // e.g., 'http://your-jenkins-domain.com'
// const JENKINS_JOB_NAME = 'deploy-html-to-firebase';
// const JENKINS_USER ="tahaaiyaaz"; // Your Jenkins username
// const JENKINS_API_TOKEN = '11d5785f7e215c10222226eee02a1ca529'; // Your Jenkins API Token
// const BACKEND_CALLBACK_URL = 'http://localhost:3000'; // URL Jenkins calls back e.g., 'http://your-backend-url/deployment-complete'

// if (!fs.existsSync(UPLOAD_DIR)) {
//     fs.mkdirSync(UPLOAD_DIR);
// }

// if (!JENKINS_URL || !JENKINS_USER || !JENKINS_API_TOKEN || !BACKEND_CALLBACK_URL) {
//     console.error("FATAL ERROR: Missing Jenkins configuration in environment variables.");
//     process.exit(1);
// }

// // --- In-memory storage for deployment status (Replace with DB in production) ---
// const deploymentStatus = {}; // { deploymentId: { status: 'pending' | 'completed' | 'failed', url: '...', message: '...' } }

// // --- Multer Configuration ---
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         const deploymentId = uuidv4();
//         const uploadPath = path.join(UPLOAD_DIR, deploymentId);
//         fs.mkdirSync(uploadPath, { recursive: true });
//         // Attach deploymentId and path to request object for later use
//         req.deploymentId = deploymentId;
//         req.uploadPath = uploadPath;
//         cb(null, uploadPath);
//     },
//     filename: function (req, file, cb) {
//         // Always save as index.html inside the unique folder
//         cb(null, 'index.html');
//     }
// });
// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
//     fileFilter: (req, file, cb) => {
//         if (file.mimetype === 'text/html') {
//             cb(null, true);
//         } else {
//             cb(new Error('Invalid file type. Only HTML files are allowed.'), false);
//         }
//     }
// });

// // --- Middleware ---
// app.use(cors()); // Allow requests from frontend (adjust origin in production)
// app.use(express.json()); // To parse JSON bodies (like the callback from Jenkins)
// app.use(express.urlencoded({ extended: true }));

// // --- Routes ---

// // Endpoint for file upload from frontend
// // Endpoint for file upload from frontend
// app.post('/upload', upload.single('websiteFile'), async (req, res) => {
//     if (!req.file) {
//         return res.status(400).json({ message: 'No file uploaded or invalid file type.' });
//     }

//     // --- Retrieve necessary info from request object (set by multer) ---
//     const deploymentId = req.deploymentId;
//     const uploadedFilePath = req.file.path; // Full path to the saved file

//     console.log(`File uploaded for deployment ${deploymentId} at ${uploadedFilePath}`);

//     // --- Store initial deployment status ---
//     deploymentStatus[deploymentId] = { status: 'pending', url: null, message: null };

//     // --- Define Jenkins details ---
//     const jenkinsTriggerUrl = `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/buildWithParameters`;
//     const jenkinsJobParams = {
//         FILE_PATH: uploadedFilePath, // Jenkins needs access to this path!
//         DEPLOYMENT_ID: deploymentId,
//         CALLBACK_URL: `${BACKEND_CALLBACK_URL}/deployment-complete` // Jenkins calls this when done
//     };

//     // --- Attempt to trigger Jenkins Job ---
//     try {
//         // --- Fetch Jenkins CSRF Crumb first ---
//         let crumbValue = null;
//         let crumbHeaderName = 'Jenkins-Crumb'; // Default header name

//         try {
//             const crumbIssuerUrl = `${JENKINS_URL}/crumbIssuer/api/json`;
//             console.log(`Fetching CSRF crumb from ${crumbIssuerUrl}`);
//             const crumbResponse = await axios.get(crumbIssuerUrl, {
//                  auth: {
//                     username: JENKINS_USER,
//                     password: JENKINS_API_TOKEN
//                  },
//                  // Optional: Add timeout or other axios config if needed
//                  // timeout: 5000 // 5 seconds
//             });

//             if (crumbResponse.data && crumbResponse.data.crumb) {
//                 crumbValue = crumbResponse.data.crumb;
//                 // Use the header name Jenkins provides in the response, otherwise stick to default
//                 crumbHeaderName = crumbResponse.data.crumbRequestField || crumbHeaderName;
//                 console.log(`Successfully fetched Jenkins crumb. Header: ${crumbHeaderName}`);
//             } else {
//                  console.warn("Could not extract CSRF crumb from Jenkins response. Proceeding without it (might fail if CSRF is mandatory). Response:", crumbResponse.data);
//             }
//         } catch (crumbError) {
//              // Log error but proceed. Jenkins might not have CSRF enabled, or API token usage might bypass it sometimes.
//              if (crumbError.response && crumbError.response.status === 404) {
//                  console.warn(`Warning: Jenkins crumb issuer endpoint (${crumbError.config.url}) returned 404. Assuming CSRF is disabled or not needed for API token auth.`);
//              } else {
//                 console.warn(`Warning: Failed to fetch Jenkins CSRF crumb: ${crumbError.message}. Attempting job trigger without crumb.`);
//              }
//              // In case of error, crumbValue remains null
//         }
//         // --- End of Crumb Fetching ---

//         // --- Prepare headers for the trigger request ---
//         const triggerHeaders = {};
//         if (crumbValue) {
//             triggerHeaders[crumbHeaderName] = crumbValue; // Add crumb header if we got one
//         }
//         // Add any other headers if needed, e.g., triggerHeaders['Content-Type'] = 'application/x-www-form-urlencoded'; (though usually not needed for buildWithParameters with params in query string)

//         // --- Trigger the Jenkins Job ---
//         console.log(`Triggering Jenkins job: ${jenkinsTriggerUrl} with params:`, jenkinsJobParams);
//         const response = await axios.post(jenkinsTriggerUrl, null, { // POST request, body is null
//             params: jenkinsJobParams, // Parameters are sent as query string for buildWithParameters
//             auth: {
//                 username: JENKINS_USER,
//                 password: JENKINS_API_TOKEN
//             },
//             headers: triggerHeaders // Pass the prepared headers (including crumb if available)
//         });

//         // --- Handle Jenkins Response ---
//         // Status 201 Created usually indicates the job was successfully queued/triggered
//         if (response.status === 201) {
//             console.log(`Jenkins job triggered successfully for deployment ${deploymentId}. Build should start shortly.`);
//             // Respond to the frontend immediately indicating success so far
//             res.status(202).json({ // 202 Accepted is appropriate here
//                 message: 'File uploaded successfully. Deployment process started.',
//                 deploymentId: deploymentId
//             });
//         } else {
//             // Should ideally not happen if axios doesn't throw for non-2xx, but handle defensively
//             console.error(`Jenkins trigger returned unexpected status ${response.status} for ${deploymentId}. Response:`, response.data);
//             deploymentStatus[deploymentId] = { status: 'failed', message: `Failed to trigger Jenkins job (Unexpected Status: ${response.status})` };
//             res.status(500).json({ message: 'Failed to trigger Jenkins deployment job (unexpected status).' });
//         }

//     } catch (error) {
//         // --- Handle Errors during Jenkins Interaction ---
//         let errorMessage = error.message;
//         let statusCode = 500; // Default to Internal Server Error

//         // Check if the error is from axios and has a response from Jenkins
//         if (error.response) {
//             statusCode = error.response.status || 500; // Use status code from Jenkins response if available
//             console.error(`Error response from Jenkins (Status ${statusCode}):`, error.response.data || "No response body");

//             // Check if Jenkins returned an HTML page (likely login/error page due to Auth/CSRF failure)
//             if (error.response.headers && error.response.headers['content-type']?.includes('text/html')) {
//                 errorMessage = `Received HTML page from Jenkins (Status ${statusCode}). Likely an Authentication failure (check user/token) or CSRF issue (check crumb handling and Jenkins logs).`;
//                 console.error(`Error triggering Jenkins job for ${deploymentId}: ${errorMessage}`);
//                 statusCode = 401; // Unauthorized or Forbidden is more specific
//             } else {
//                  // Use error data from Jenkins if not HTML, otherwise stick to generic message
//                  errorMessage = `Jenkins API error (Status ${statusCode}): ${error.response.data?.message || errorMessage}`;
//             }
//         } else if (error.request) {
//              // The request was made but no response was received (e.g., network issue, Jenkins down)
//              console.error(`Error triggering Jenkins job for ${deploymentId}: No response received from Jenkins.`, error.request);
//              errorMessage = `Could not connect to Jenkins at ${JENKINS_URL}. Is it running and accessible?`;
//              statusCode = 504; // Gateway Timeout
//         } else {
//              // Something happened in setting up the request that triggered an Error
//              console.error(`Error setting up Jenkins request for ${deploymentId}:`, error.message);
//              errorMessage = `Error configuring request to Jenkins: ${error.message}`;
//         }

//         // Update deployment status and respond to frontend
//         deploymentStatus[deploymentId] = { status: 'failed', message: `Failed to trigger Jenkins job: ${errorMessage}` };
//         res.status(statusCode).json({ message: `Failed to trigger Jenkins job: ${errorMessage}` });
//     }
// });
// // Endpoint for Jenkins to callback when deployment is done
// app.post('/deployment-complete', (req, res) => {
//     const { deploymentId, status, url, error } = req.body;

//     console.log(`Received callback for deployment ${deploymentId}: Status: ${status}, URL: ${url}, Error: ${error}`);

//     if (!deploymentId || !status) {
//         return res.status(400).json({ message: 'Missing deploymentId or status in callback.' });
//     }

//     if (deploymentStatus[deploymentId]) {
//         deploymentStatus[deploymentId].status = status; // 'completed' or 'failed'
//         if (status === 'completed') {
//             deploymentStatus[deploymentId].url = url;
//         } else {
//             deploymentStatus[deploymentId].message = error || 'Jenkins job reported failure.';
//         }
//         console.log(`Updated status for ${deploymentId}:`, deploymentStatus[deploymentId]);

//         // Optional: Clean up the uploaded file after processing (success or fail)
//         const uploadPath = path.join(UPLOAD_DIR, deploymentId);
//          fs.rm(uploadPath, { recursive: true, force: true }, (err) => {
//              if (err) {
//                  console.error(`Error cleaning up upload directory ${uploadPath}:`, err);
//              } else {
//                  console.log(`Cleaned up upload directory: ${uploadPath}`);
//              }
//          });

//         res.status(200).json({ message: 'Callback received.' });
//     } else {
//         console.warn(`Received callback for unknown deployment ID: ${deploymentId}`);
//         res.status(404).json({ message: 'Deployment ID not found.' });
//     }
// });

// // Endpoint for frontend to poll deployment status
// app.get('/status/:deploymentId', (req, res) => {
//     const { deploymentId } = req.params;
//     const statusInfo = deploymentStatus[deploymentId];

//     if (statusInfo) {
//         res.status(200).json(statusInfo);
//     } else {
//         res.status(404).json({ message: 'Deployment ID not found.' });
//     }
// });

// // --- Error Handling ---
// app.use((err, req, res, next) => {
//     if (err instanceof multer.MulterError) {
//       return res.status(400).json({ message: `Multer error: ${err.message}` });
//     } else if (err) {
//       console.error("Unhandled Error:", err);
//       // Handle specific errors like file type filter
//       if (err.message.includes('Invalid file type')) {
//           return res.status(400).json({ message: err.message });
//       }
//       return res.status(500).json({ message: `Internal Server Error: ${err.message}` });
//     }
//     next();
// });

// // --- Start Server ---
// app.listen(port, () => {
//     console.log(`Backend server listening at http://localhost:${port}`);
//     console.log(`Expecting Jenkins at: ${JENKINS_URL}`);
//     console.log(`Expecting Jenkins callback at: ${BACKEND_CALLBACK_URL}/deployment-complete`);
// });

























































// // this code is for firebase storage previous was for hosing



// require('dotenv').config(); // Load environment variables first
// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const { v4: uuidv4 } = require('uuid');
// const cors = require('cors');
// const admin = require('firebase-admin'); // Import Firebase Admin SDK

// const app = express();
// const port = 3000;

// // --- Configuration ---
// const UPLOAD_DIR = path.join(__dirname, 'uploads');
// // Firebase Config - Loaded from .env
// const serviceAccountPath = './minhaj-bhaiya-app-firebase-adminsdk-2mqr6-15a10ab076.json';
// const storageBucket = 'gs://minhaj-bhaiya-app.appspot.com';

// // --- Ensure upload directory exists ---
// if (!fs.existsSync(UPLOAD_DIR)) {
//     fs.mkdirSync(UPLOAD_DIR);
// }

// // --- Validate Firebase Configuration ---
// if (!serviceAccountPath || !storageBucket) {
//     console.error("FATAL ERROR: Missing Firebase configuration (GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_STORAGE_BUCKET) in environment variables.");
//     process.exit(1);
// }
// if (!fs.existsSync(serviceAccountPath)) {
//     console.error(`FATAL ERROR: Service account key file not found at path: ${serviceAccountPath}`);
//     process.exit(1);
// }

// // --- Initialize Firebase Admin SDK ---
// try {
//     admin.initializeApp({
//         credential: admin.credential.cert(serviceAccountPath),
//         storageBucket: storageBucket
//     });
//     console.log("Firebase Admin SDK initialized successfully.");
// } catch (error) {
//     console.error("FATAL ERROR: Failed to initialize Firebase Admin SDK:", error);
//     process.exit(1);
// }
// const bucket = admin.storage().bucket(); // Get a reference to the storage bucket
// console.log(`Using Firebase Storage bucket: ${storageBucket}`);

// // --- Multer Configuration (Saves temporarily locally) ---
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         // Use a temporary unique ID for the local folder, not necessarily the final deployment ID concept
//         const tempId = uuidv4();
//         const uploadPath = path.join(UPLOAD_DIR, tempId);
//         fs.mkdirSync(uploadPath, { recursive: true });
//         req.tempUploadPath = uploadPath; // Store temp path
//         req.tempFileName = 'index.html'; // Keep original logic
//         cb(null, uploadPath);
//     },
//     filename: function (req, file, cb) {
//         cb(null, req.tempFileName); // Save as index.html in the temp folder
//     }
// });
// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
//     fileFilter: (req, file, cb) => {
//         if (file.mimetype === 'text/html') {
//             cb(null, true);
//         } else {
//             cb(new Error('Invalid file type. Only HTML files are allowed.'), false);
//         }
//     }
// });

// // --- Middleware ---
// app.use(cors()); // Allow requests from frontend
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // --- Routes ---

// // Endpoint for file upload from frontend - Now uploads to Firebase Storage
// app.post('/upload', upload.single('websiteFile'), async (req, res) => {
//     if (!req.file) {
//         return res.status(400).json({ message: 'No file uploaded or invalid file type.' });
//     }

//     const localFilePath = req.file.path; // Full path to the temporarily saved file
//     const tempUploadDir = req.tempUploadPath; // Get the temporary directory path
//     const deploymentId = uuidv4(); // Generate a unique ID for this deployment/upload
//     const storageDestinationPath = `uploads/${deploymentId}/index.html`; // Path within Firebase Storage

//     console.log(`File temporarily saved at ${localFilePath}`);
//     console.log(`Uploading to Firebase Storage at: ${storageDestinationPath}`);

//     try {
//         // 1. Upload the file to Firebase Storage
//         const [uploadedFile] = await bucket.upload(localFilePath, {
//             destination: storageDestinationPath,
//             metadata: {
//                 contentType: 'text/html', // Set content type for proper browser rendering
//                 // Optional: Add cache control headers if needed
//                 // cacheControl: 'public, max-age=3600',
//             },
//         });
//         console.log(`File uploaded to ${storageBucket}/${storageDestinationPath}`);

//         // 2. Make the file publicly accessible
//         await uploadedFile.makePublic();
//         console.log(`File made public.`);

//         // 3. Get the public URL
//         const publicUrl = uploadedFile.publicUrl();
//         console.log(`Public URL: ${publicUrl}`);

//         // 4. Respond to the client with the public URL
//         res.status(200).json({
//             message: 'File uploaded successfully to Firebase Storage.',
//             url: publicUrl,
//             deploymentId: deploymentId // You might still want to return this ID for tracking
//         });

//     } catch (error) {
//         console.error('Error uploading to Firebase Storage:', error);
//         res.status(500).json({
//             message: 'Failed to upload file to Firebase Storage.',
//             error: error.message // Provide error details for debugging
//         });
//     } finally {
//         // 5. Clean up the temporary local file and directory after upload attempt (success or failure)
//         fs.rm(tempUploadDir, { recursive: true, force: true }, (err) => {
//             if (err) {
//                 console.error(`Error cleaning up temporary upload directory ${tempUploadDir}:`, err);
//             } else {
//                 console.log(`Cleaned up temporary upload directory: ${tempUploadDir}`);
//             }
//         });
//     }
// });

// // --- REMOVED Jenkins Related Endpoints ---
// // The '/deployment-complete' and '/status/:deploymentId' endpoints are likely not needed
// // for this direct-to-storage approach unless you implement more complex status tracking.
// // You can remove or comment them out.

// /*
// // Endpoint for Jenkins to callback (No longer used in this flow)
// app.post('/deployment-complete', (req, res) => { ... });

// // Endpoint for frontend to poll deployment status (No longer directly applicable)
// app.get('/status/:deploymentId', (req, res) => { ... });
// */

// // --- Error Handling Middleware (Keep as is or adjust if needed) ---
// app.use((err, req, res, next) => {
//     if (err instanceof multer.MulterError) {
//       return res.status(400).json({ message: `Multer error: ${err.message}` });
//     } else if (err) {
//       console.error("Unhandled Error:", err);
//       if (err.message.includes('Invalid file type')) {
//           return res.status(400).json({ message: err.message });
//       }
//       // Clean up temp file on unhandled error during upload processing if it exists
//       if (req.tempUploadPath && fs.existsSync(req.tempUploadPath)) {
//           fs.rm(req.tempUploadPath, { recursive: true, force: true }, (cleanupErr) => {
//               if (cleanupErr) console.error(`Error during error-handling cleanup of ${req.tempUploadPath}:`, cleanupErr);
//           });
//       }
//       return res.status(500).json({ message: `Internal Server Error: ${err.message}` });
//     }
//     next();
// });

// // --- Start Server ---
// app.listen(port, () => {
//     console.log(`Backend server listening at http://localhost:${port}`);
//     // No longer logging Jenkins details
// });























































// // this code is for azure cloud storage
// require('dotenv').config(); // Load environment variables first
// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const { v4: uuidv4 } = require('uuid');
// const cors = require('cors');
// const admin = require('firebase-admin'); // Keep Firebase if you still need it

// // --- Import Azure SDK ---
// const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");


// const app = express();
// const port = 3000;

// // --- Configuration ---
// const UPLOAD_DIR = path.join(__dirname, 'uploads');

// // --- Firebase Config (Keep if needed) ---
// const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
// const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
// let firebaseInitialized = false; // Flag to track initialization

// // --- Azure Config ---
// const azureConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
// const azureContainerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

// // --- Ensure upload directory exists ---
// if (!fs.existsSync(UPLOAD_DIR)) {
//     fs.mkdirSync(UPLOAD_DIR);
// }

// // --- Validate Azure Configuration ---
// if (!azureConnectionString || !azureContainerName) {
//     console.warn("WARNING: Missing Azure configuration (AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_CONTAINER_NAME). Azure uploads will fail.");
//     // Decide if this should be a fatal error or just a warning
//     // process.exit(1);
// }

// // --- Initialize Firebase Admin SDK (Conditional) ---
// if (serviceAccountPath && storageBucket && fs.existsSync(serviceAccountPath)) {
//     try {
//         admin.initializeApp({
//             credential: admin.credential.cert(serviceAccountPath),
//             storageBucket: storageBucket
//         });
//         console.log("Firebase Admin SDK initialized successfully.");
//         firebaseInitialized = true;
//     } catch (error) {
//         console.error("ERROR: Failed to initialize Firebase Admin SDK:", error);
//         // Decide if this is fatal or just prevents Firebase usage
//     }
// } else {
//      console.warn("Firebase configuration missing or incomplete. Firebase features disabled.");
// }


// // --- Initialize Azure Blob Service Client ---
// let blobServiceClient;
// if(azureConnectionString) {
//     try {
//         blobServiceClient = BlobServiceClient.fromConnectionString(azureConnectionString);
//         console.log("Azure Blob Service Client initialized successfully.");
//     } catch (error) {
//         console.error("ERROR: Failed to initialize Azure Blob Service Client:", error);
//         // Decide if this is fatal or just prevents Azure usage
//         // process.exit(1);
//     }
// }


// // --- Multer Configuration (Same as before) ---
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         const tempId = uuidv4();
//         const uploadPath = path.join(UPLOAD_DIR, tempId);
//         fs.mkdirSync(uploadPath, { recursive: true });
//         req.tempUploadPath = uploadPath;
//         req.tempFileName = 'index.html'; // Keep original logic
//         cb(null, uploadPath);
//     },
//     filename: function (req, file, cb) {
//         cb(null, req.tempFileName);
//     }
// });
// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
//     fileFilter: (req, file, cb) => {
//         if (file.mimetype === 'text/html') {
//             cb(null, true);
//         } else {
//             cb(new Error('Invalid file type. Only HTML files are allowed.'), false);
//         }
//     }
// });

// // --- Middleware ---
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // --- Routes ---

// // == Keep your Firebase Upload Route (if needed) ==
// app.post('/upload-firebase', upload.single('websiteFile'), async (req, res) => {
//     if (!firebaseInitialized) {
//          return res.status(503).json({ message: 'Firebase service is not configured or initialized.' });
//     }
//     if (!req.file) {
//         return res.status(400).json({ message: 'No file uploaded or invalid file type.' });
//     }

//     const localFilePath = req.file.path;
//     const tempUploadDir = req.tempUploadPath;
//     const deploymentId = uuidv4();
//     const storageDestinationPath = `uploads/${deploymentId}/index.html`; // Firebase path

//     console.log(`Firebase: File temporarily saved at ${localFilePath}`);
//     console.log(`Firebase: Uploading to Storage at: ${storageDestinationPath}`);

//     const bucket = admin.storage().bucket(); // Get Firebase bucket reference

//     try {
//         const [uploadedFile] = await bucket.upload(localFilePath, {
//             destination: storageDestinationPath,
//             metadata: { contentType: 'text/html' },
//         });
//         await uploadedFile.makePublic();
//         const publicUrl = uploadedFile.publicUrl();
//         console.log(`Firebase: File uploaded to ${storageBucket}/${storageDestinationPath}`);
//         console.log(`Firebase: Public URL: ${publicUrl}`);

//         res.status(200).json({
//             message: 'File uploaded successfully to Firebase Storage.',
//             url: publicUrl,
//             deploymentId: deploymentId
//         });
//     } catch (error) {
//         console.error('Firebase Error uploading to Storage:', error);
//         res.status(500).json({
//             message: 'Failed to upload file to Firebase Storage.',
//             error: error.message
//         });
//     } finally {
//         fs.rm(tempUploadDir, { recursive: true, force: true }, (err) => {
//             if (err) console.error(`Firebase: Error cleaning up temp dir ${tempUploadDir}:`, err);
//             else console.log(`Firebase: Cleaned up temp dir: ${tempUploadDir}`);
//         });
//     }
// });


// // == New Azure Upload Route ==
// app.post('/upload-azure', upload.single('websiteFile'), async (req, res) => {
//     // Check if Azure client is initialized
//     if (!blobServiceClient) {
//         return res.status(503).json({ message: 'Azure Blob Storage service is not configured or initialized.' });
//     }
//      if (!req.file) {
//         return res.status(400).json({ message: 'No file uploaded or invalid file type.' });
//     }

//     const localFilePath = req.file.path; // Full path to the temporarily saved file
//     const tempUploadDir = req.tempUploadPath; // Get the temporary directory path
//     const deploymentId = uuidv4(); // Unique ID for this upload
//     const blobName = `uploads/${deploymentId}/index.html`; // Path within the Azure container

//     console.log(`Azure: File temporarily saved at ${localFilePath}`);
//     console.log(`Azure: Uploading to container '${azureContainerName}' as blob: ${blobName}`);

//     try {
//         // 1. Get a client for the container
//         const containerClient = blobServiceClient.getContainerClient(azureContainerName);

//         // Optional: Create container if it doesn't exist (requires more permissions)
//         // await containerClient.createIfNotExists({ access: 'blob' }); // Sets public access if creating

//         // 2. Get a client for the specific blob
//         const blockBlobClient = containerClient.getBlockBlobClient(blobName);

//         // 3. Upload the file
//         await blockBlobClient.uploadFile(localFilePath, {
//             blobHTTPHeaders: {
//                 blobContentType: 'text/html' // Set content type for browser
//             }
//         });
//         console.log(`Azure: File uploaded successfully to ${blockBlobClient.url}`);

//         // 4. Get the public URL (works because container access level is 'blob')
//         const publicUrl = blockBlobClient.url;

//         // 5. Respond to the client
//         res.status(200).json({
//             message: 'File uploaded successfully to Azure Blob Storage.',
//             url: publicUrl,
//             deploymentId: deploymentId
//         });

//     } catch (error) {
//         console.error('Azure: Error uploading to Blob Storage:', error);
//         // Provide more specific error message if possible
//         let errorMessage = error.message;
//         if (error.statusCode === 404 && error.details?.errorCode === 'ContainerNotFound') {
//              errorMessage = `Container '${azureContainerName}' not found. Please create it in the Azure portal.`;
//         } else if (error.statusCode === 403) {
//             errorMessage = `Permission denied. Check the connection string and container permissions. ${error.message}`;
//         }
//         res.status(500).json({
//             message: 'Failed to upload file to Azure Blob Storage.',
//             error: errorMessage
//         });
//     } finally {
//         // 6. Clean up the temporary local file and directory
//         fs.rm(tempUploadDir, { recursive: true, force: true }, (err) => {
//             if (err) {
//                 console.error(`Azure: Error cleaning up temporary upload directory ${tempUploadDir}:`, err);
//             } else {
//                 console.log(`Azure: Cleaned up temporary upload directory: ${tempUploadDir}`);
//             }
//         });
//     }
// });


// // --- Error Handling Middleware (Keep as is) ---
// app.use((err, req, res, next) => {
//     // ... (same error handling as before)
//     if (err instanceof multer.MulterError) {
//       return res.status(400).json({ message: `Multer error: ${err.message}` });
//     } else if (err) {
//       console.error("Unhandled Error:", err);
//       if (err.message.includes('Invalid file type')) {
//           return res.status(400).json({ message: err.message });
//       }
//       // Clean up temp file on unhandled error during upload processing if it exists
//       if (req.tempUploadPath && fs.existsSync(req.tempUploadPath)) {
//           fs.rm(req.tempUploadPath, { recursive: true, force: true }, (cleanupErr) => {
//               if (cleanupErr) console.error(`Error during error-handling cleanup of ${req.tempUploadPath}:`, cleanupErr);
//           });
//       }
//       return res.status(500).json({ message: `Internal Server Error: ${err.message}` });
//     }
//     next();
// });

// // --- Start Server ---
// app.listen(port, () => {
//     console.log(`Backend server listening at http://localhost:${port}`);
    
//     console.log(process.env.JENKINS_API_TOKEN)
// });







































































// require('dotenv').config(); // Load environment variables from .env file
// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const axios = require('axios');
// const { v4: uuidv4 } = require('uuid');
// const cors = require('cors');

// const app = express();
// const port = process.env.PORT || 3000;

// // --- Configuration ---
// const UPLOAD_DIR = path.join(__dirname, 'uploads'); // Directory to temporarily store uploads
// const JENKINS_URL = process.env.JENKINS_URL;
// // Reads the specific job name from .env for GitHub Pages deployment
// const JENKINS_JOB_NAME = process.env.JENKINS_JOB_NAME || 'upload-to-git'; // Default if not set
// const JENKINS_USER = process.env.JENKINS_USER;
// const JENKINS_API_TOKEN = process.env.JENKINS_API_TOKEN;
// const BACKEND_CALLBACK_URL = process.env.BACKEND_CALLBACK_URL;

// // --- Create Upload Directory if it doesn't exist ---
// if (!fs.existsSync(UPLOAD_DIR)) {
//     fs.mkdirSync(UPLOAD_DIR);
//     console.log(`Created upload directory: ${UPLOAD_DIR}`);
// }

// // --- Validate Essential Configuration ---
// if (!JENKINS_URL || !JENKINS_USER || !JENKINS_API_TOKEN || !BACKEND_CALLBACK_URL || !JENKINS_JOB_NAME) {
//     console.error("FATAL ERROR: Missing essential Jenkins/Backend configuration in environment variables.");
//     console.error("Required: JENKINS_URL, JENKINS_JOB_NAME, JENKINS_USER, JENKINS_API_TOKEN, BACKEND_CALLBACK_URL");
//     process.exit(1); // Exit if configuration is missing
// }

// // --- In-memory storage for deployment status (Replace with DB in production) ---
// const deploymentStatus = {}; // { deploymentId: { status: 'pending' | 'completed' | 'failed', url: '...', message: '...' } }

// // --- Multer Configuration (Saves file to unique folder) ---
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         const deploymentId = uuidv4();
//         // Use deploymentId as the folder name
//         const uploadPath = path.join(UPLOAD_DIR, deploymentId);
//         fs.mkdirSync(uploadPath, { recursive: true });
//         // Attach deploymentId and path to request object for later use
//         req.deploymentId = deploymentId;
//         req.uploadPath = uploadPath;
//         cb(null, uploadPath); // Save files to backend/uploads/<deploymentId>/
//     },
//     filename: function (req, file, cb) {
//         // Always save the uploaded file as index.html inside its unique folder
//         cb(null, 'index.html');
//     }
// });
// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
//     fileFilter: (req, file, cb) => {
//         // Allow only HTML files
//         if (file.mimetype === 'text/html') {
//             cb(null, true);
//         } else {
//             cb(new Error('Invalid file type. Only HTML files (.html) are allowed.'), false);
//         }
//     }
// });

// // --- Middleware ---
// app.use(cors()); // Allow requests from frontend (configure origin in production)
// app.use(express.json()); // To parse JSON bodies (like the callback from Jenkins)
// app.use(express.urlencoded({ extended: true }));

// // --- Routes ---

// // Endpoint for file upload from frontend
// // This is the same logic as before, but now uses the JENKINS_JOB_NAME configured for GitHub Pages
// app.post('/upload', upload.single('websiteFile'), async (req, res) => {
//     if (!req.file) {
//         return res.status(400).json({ message: 'No file uploaded or invalid file type.' });
//     }

//     const deploymentId = req.deploymentId;
//     const uploadedFilePath = req.file.path; // Full path to the saved file (e.g., F:\...\backend\uploads\<ID>\index.html)

//     console.log(`File uploaded for deployment ${deploymentId} at ${uploadedFilePath}`);
//     console.log(`Target Jenkins Job for GitHub Pages: ${JENKINS_JOB_NAME}`); // Log which job is targeted

//     deploymentStatus[deploymentId] = { status: 'pending', url: null, message: null };

//     const jenkinsTriggerUrl = `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/buildWithParameters`;
//     const jenkinsJobParams = {
//         // These parameters match what the GitHub Pages Jenkinsfile expects
//         FILE_PATH: uploadedFilePath,
//         DEPLOYMENT_ID: deploymentId,
//         CALLBACK_URL: `${BACKEND_CALLBACK_URL}/deployment-complete`
//     };

//     try {
//         // --- Fetch Jenkins CSRF Crumb first ---
//         let crumbValue = null;
//         let crumbHeaderName = 'Jenkins-Crumb';

//         try {
//             const crumbIssuerUrl = `${JENKINS_URL}/crumbIssuer/api/json`;
//             console.log(`Fetching CSRF crumb from ${crumbIssuerUrl}`);
//             const crumbResponse = await axios.get(crumbIssuerUrl, {
//                  auth: { username: JENKINS_USER, password: JENKINS_API_TOKEN }
//             });
//             if (crumbResponse.data && crumbResponse.data.crumb) {
//                 crumbValue = crumbResponse.data.crumb;
//                 crumbHeaderName = crumbResponse.data.crumbRequestField || crumbHeaderName;
//                 console.log(`Successfully fetched Jenkins crumb. Header: ${crumbHeaderName}`);
//             } else {
//                  console.warn("Could not extract CSRF crumb from Jenkins response. Proceeding without it.");
//             }
//         } catch (crumbError) {
//              if (crumbError.response && crumbError.response.status === 404) {
//                  console.warn(`Warning: Jenkins crumb issuer endpoint returned 404. Assuming CSRF is disabled.`);
//              } else {
//                 console.warn(`Warning: Failed to fetch Jenkins CSRF crumb: ${crumbError.message}. Attempting job trigger without crumb.`);
//              }
//         }
//         // --- End Crumb Fetching ---

//         const triggerHeaders = {};
//         if (crumbValue) {
//             triggerHeaders[crumbHeaderName] = crumbValue;
//         }

//         console.log(`Triggering Jenkins job: ${jenkinsTriggerUrl} with params:`, jenkinsJobParams);
//         const response = await axios.post(jenkinsTriggerUrl, null, {
//             params: jenkinsJobParams,
//             auth: { username: JENKINS_USER, password: JENKINS_API_TOKEN },
//             headers: triggerHeaders
//         });

//         if (response.status === 201) {
//             console.log(`Jenkins job triggered successfully for deployment ${deploymentId}. Build should start shortly.`);
//             res.status(202).json({
//                 message: 'File uploaded successfully. Deployment process started.',
//                 deploymentId: deploymentId
//             });
//         } else {
//             console.error(`Jenkins trigger returned unexpected status ${response.status} for ${deploymentId}. Response:`, response.data);
//             deploymentStatus[deploymentId] = { status: 'failed', message: `Failed to trigger Jenkins job (Unexpected Status: ${response.status})` };
//             res.status(500).json({ message: 'Failed to trigger Jenkins deployment job (unexpected status).' });
//         }

//     } catch (error) {
//         let errorMessage = error.message;
//         let statusCode = 500;
//         if (error.response) {
//             statusCode = error.response.status || 500;
//             console.error(`Error response from Jenkins (Status ${statusCode}):`, error.response.data || "No response body");
//             if (error.response.headers && error.response.headers['content-type']?.includes('text/html')) {
//                 errorMessage = `Received HTML page from Jenkins (Status ${statusCode}). Likely an Authentication failure or CSRF issue.`;
//                 statusCode = 401;
//             } else {
//                  errorMessage = `Jenkins API error (Status ${statusCode}): ${error.response.data?.message || errorMessage}`;
//             }
//         } else if (error.request) {
//              console.error(`Error triggering Jenkins job for ${deploymentId}: No response received.`, error.request);
//              errorMessage = `Could not connect to Jenkins at ${JENKINS_URL}.`;
//              statusCode = 504;
//         } else {
//              console.error(`Error setting up Jenkins request for ${deploymentId}:`, error.message);
//              errorMessage = `Error configuring request to Jenkins: ${error.message}`;
//         }
//         deploymentStatus[deploymentId] = { status: 'failed', message: `Failed to trigger Jenkins job: ${errorMessage}` };
//         res.status(statusCode).json({ message: `Failed to trigger Jenkins job: ${errorMessage}` });
//     }
// });

// // Endpoint for Jenkins to callback when deployment is done (No changes needed here)
// app.post('/deployment-complete', (req, res) => {
//     // Destructure the NEW expected fields from the request body sent by Jenkins
//     const { deploymentId, status, githubUser, githubRepo, subdir, error } = req.body;

//     // Log exactly what the backend received
//     console.log("--- Callback Received ---");
//     console.log("Request Body:", req.body); // Log the raw body
//     console.log(`Received ID: ${deploymentId}, Status: ${status}, User: ${githubUser}, Repo: ${githubRepo}, Subdir: ${subdir}, Error: ${error}`);
//     console.log("--- End Callback ---");


//     if (!deploymentId || !status) {
//         console.error(`Callback missing deploymentId or status.`);
//         // Send 400 Bad Request back to Jenkins
//         return res.status(400).json({ message: 'Missing deploymentId or status in callback.' });
//     }

//     if (deploymentStatus[deploymentId]) {
//         deploymentStatus[deploymentId].status = status;
//         let finalUrl = null; // Variable to hold the constructed URL

//         if (status === 'completed') {
//             // --- Construct the URL HERE in the backend ---
//             if (githubUser && githubRepo && subdir) {
//                 // Optional basic cleaning for subdir just in case (remove leading/trailing slashes)
//                 const cleanSubdir = subdir.replace(/^\/+|\/+$/g, '');
//                 // Construct the standard GitHub Pages URL format
//                 finalUrl = `https://${githubUser}.github.io/${githubRepo}/${cleanSubdir}/`;
//                 deploymentStatus[deploymentId].url = finalUrl; // Assign the constructed URL
//                 console.log(`Successfully constructed URL: ${finalUrl}`);
//             } else {
//                 // Log an error if components are missing, but mark deployment as completed without a URL
//                 console.error(`Missing components needed to build URL for ${deploymentId}. User: ${githubUser}, Repo: ${githubRepo}, Subdir: ${subdir}`);
//                 deploymentStatus[deploymentId].message = 'Deployment successful, but failed to reconstruct URL (missing data from Jenkins).';
//                 deploymentStatus[deploymentId].url = null; // Ensure URL is null if construction failed
//             }
//         } else { // status === 'failed'
//             deploymentStatus[deploymentId].message = error || 'Jenkins job reported failure.';
//             deploymentStatus[deploymentId].url = null; // Ensure URL is null on failure
//         }

//         console.log(`Updated status for ${deploymentId}:`, deploymentStatus[deploymentId]); // Check the final status object

//         // Optional: Clean up the uploaded file after processing
//         const uploadPath = path.join(UPLOAD_DIR, deploymentId); // Use the received deploymentId
//          fs.rm(uploadPath, { recursive: true, force: true }, (err) => {
//              if (err) console.error(`Error cleaning up upload directory ${uploadPath}:`, err);
//              else console.log(`Cleaned up upload directory: ${uploadPath}`);
//          });

//         // Send 200 OK back to Jenkins
//         res.status(200).json({ message: 'Callback received and processed.' });
//     } else {
//         // Deployment ID sent by Jenkins wasn't found in our memory
//         console.warn(`Received callback for unknown/expired deployment ID: ${deploymentId}`);
//         // Send 404 Not Found back to Jenkins
//         res.status(404).json({ message: 'Deployment ID not found or expired.' });
//     }
// });
// // Endpoint for frontend to poll deployment status (No changes needed here)
// app.get('/status/:deploymentId', (req, res) => {
//     const { deploymentId } = req.params;
//     const statusInfo = deploymentStatus[deploymentId];

//     if (statusInfo) {
//         res.status(200).json(statusInfo);
//     } else {
//         res.status(404).json({ message: 'Deployment ID not found.' });
//     }
// });

// // --- Error Handling Middleware (No changes needed here) ---
// app.use((err, req, res, next) => {
//     if (err instanceof multer.MulterError) {
//       return res.status(400).json({ message: `File upload error: ${err.message}` });
//     } else if (err) {
//       console.error("Unhandled Error:", err);
//       if (err.message.includes('Invalid file type')) {
//           return res.status(400).json({ message: err.message });
//       }
//       return res.status(500).json({ message: `Internal Server Error: ${err.message}` });
//     }
//     next();
// });

// // --- Start Server ---
// app.listen(port, () => {
//     console.log(`Backend server (GitHub Pages Deploy Trigger) listening at http://localhost:${port}`);
//     console.log(`Targeting Jenkins at: ${JENKINS_URL}`);
//     console.log(`Targeting Jenkins job: ${JENKINS_JOB_NAME}`);
//     console.log(`Expecting Jenkins callback at: ${BACKEND_CALLBACK_URL}/deployment-complete`);
// });



































































// this is phase D code from new gemini 

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Use promise-based fs
const axios = require('axios');
const admin = require('firebase-admin'); // NEW: Add Firebase Admin
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// --- Configuration ---
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const JENKINS_URL = process.env.JENKINS_URL;
const JENKINS_JOB_NAME = process.env.JENKINS_JOB_NAME;
const JENKINS_USER = process.env.JENKINS_USER;
const JENKINS_API_TOKEN = process.env.JENKINS_API_TOKEN;
const BACKEND_CALLBACK_URL = process.env.BACKEND_CALLBACK_URL;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY; // Optional API Key

// --- Initialize Firebase Admin SDK (NEW) ---
try {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });
    console.log('Firebase Admin SDK initialized successfully (Service D).');
} catch (error) {
    console.error('Error initializing Firebase Admin SDK (Service D): unable to initialise firebase ', error);
    process.exit(1);
}
const db = admin.firestore();

// --- Create Upload Directory ---
fs.mkdir(UPLOAD_DIR, { recursive: true })
    .then(() => console.log(`Upload directory ensured: ${UPLOAD_DIR}`))
    .catch(err => console.error(`Error creating upload directory ${UPLOAD_DIR}:`, err));

// --- Validate Essential Configuration ---
if (!JENKINS_URL || !JENKINS_JOB_NAME || !JENKINS_USER || !JENKINS_API_TOKEN || !BACKEND_CALLBACK_URL) {
    console.error("FATAL ERROR: Missing essential Jenkins/Backend configuration in .env");
    process.exit(1);
}

// --- REMOVED In-memory storage ---
// const deploymentStatus = {}; // NO LONGER NEEDED

// --- Multer Configuration (For internal endpoint) ---
const internalStorage = multer.diskStorage({
    destination: async function (req, file, cb) {
        // IMPORTANT: Use deploymentId received in the request body
        const deploymentId = req.body.deploymentId;
        if (!deploymentId) {
            return cb(new Error('Missing deploymentId in request body for storage destination.'), null);
        }
        const uploadPath = path.join(UPLOAD_DIR, deploymentId);
        try {
            await fs.mkdir(uploadPath, { recursive: true });
            req.deploymentId = deploymentId; // Attach for later use
            req.uploadPath = uploadPath; // Attach specific path
            cb(null, uploadPath);
        } catch (err) {
            cb(err, null);
        }
    },
    filename: function (req, file, cb) {
        cb(null, 'index.html'); // Always save as index.html
    }
});
const internalUpload = multer({
    storage: internalStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => { // Basic check, Service C should send correct type
        if (file.fieldname === 'websiteFile') {
            cb(null, true);
        } else {
            cb(new Error('Invalid field name for file upload.'), false);
        }
    }
});


// --- Middleware ---
app.use(cors()); // Adjust in production
app.use(express.json()); // Needed for Jenkins callback parsing
app.use(express.urlencoded({ extended: true })); // For form data parsing if needed

// Optional: Simple API Key Middleware for internal endpoint
const verifyInternalApiKey = (req, res, next) => {
    if (!INTERNAL_API_KEY) { // If no key is configured, allow access
        return next();
    }
    const apiKey = req.headers['x-internal-api-key'];
    if (apiKey && apiKey === INTERNAL_API_KEY) {
        next();
    } else {
        console.warn('Blocked internal request due to missing or invalid API key.');
        res.status(403).json({ message: 'Forbidden: Invalid API Key' });
    }
};

// --- Routes ---

// REMOVED: Original /upload endpoint is replaced

// NEW: Internal endpoint triggered by Service C (Cloud Function)
app.post('/internal/trigger-jenkins', verifyInternalApiKey, internalUpload.single('websiteFile'), async (req, res) => {
    // deploymentId is attached to req by multer storage function
    const deploymentId = req.deploymentId;
    const repoName = req.body.repoName; // Get repoName from request body
    // const userId = req.body.userId; // Optional: Get userId if passed by Service C

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded in the websiteFile field.' });
    }
    if (!deploymentId) {
        return res.status(400).json({ message: 'Missing deploymentId in request.' });
    }
    if (!repoName) {
        return res.status(400).json({ message: 'Missing repoName in request.' });
    }

    const uploadedFilePath = path.join(req.uploadPath, 'index.html'); // Construct full path

    console.log(`Internal trigger received for deployment ${deploymentId}, repo ${repoName}`);
    console.log(`File saved locally at: ${uploadedFilePath}`);

    // --- Trigger Jenkins (Same logic as before, but using received params) ---
    const jenkinsTriggerUrl = `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/buildWithParameters`;
    const jenkinsJobParams = {
        FILE_PATH: uploadedFilePath, // Pass the path accessible by Jenkins agent
        DEPLOYMENT_ID: deploymentId,
        REPO_NAME: repoName,
        CALLBACK_URL: `${BACKEND_CALLBACK_URL}/deployment-complete`
        // Optional: Pass userId if Jenkins needs it for callback
        // USER_ID: userId
    };

    try {
        // --- Fetch Jenkins CSRF Crumb (Same logic as your original code) ---
        let crumbValue = null;
        let crumbHeaderName = 'Jenkins-Crumb';
        try {
            const crumbIssuerUrl = `${JENKINS_URL}/crumbIssuer/api/json`;
            const crumbResponse = await axios.get(crumbIssuerUrl, { auth: { username: JENKINS_USER, password: JENKINS_API_TOKEN }});
            if (crumbResponse.data && crumbResponse.data.crumb) {
                crumbValue = crumbResponse.data.crumb;
                crumbHeaderName = crumbResponse.data.crumbRequestField || crumbHeaderName;
            } else { console.warn("Could not extract CSRF crumb."); }
        } catch (crumbError) {
            if (crumbError.response?.status === 404) console.warn("CSRF crumb issuer 404.");
            else console.warn(`Failed to fetch Jenkins crumb: ${crumbError.message}.`);
        }
        // --- End Crumb Fetching ---

        const triggerHeaders = {};
        if (crumbValue) triggerHeaders[crumbHeaderName] = crumbValue;

        console.log(`Triggering Jenkins job: ${jenkinsTriggerUrl} with params:`, jenkinsJobParams);
        const response = await axios.post(jenkinsTriggerUrl, null, {
            params: jenkinsJobParams,
            auth: { username: JENKINS_USER, password: JENKINS_API_TOKEN },
            headers: triggerHeaders
        });

        if (response.status === 201) {
            console.log(`Jenkins job triggered successfully for ${deploymentId}.`);
            // IMPORTANT: Respond 202 Accepted to Service C
            res.status(202).json({ message: 'Jenkins job triggered successfully.' });
        } else {
            console.error(`Jenkins trigger returned unexpected status ${response.status} for ${deploymentId}.`);
             // Respond with an error status to Service C
            res.status(502).json({ message: `Failed to trigger Jenkins job (Unexpected Status: ${response.status})` });
        }
    } catch (error) {
        // Handle Jenkins trigger error (same logic as your original code)
        let errorMessage = error.message;
        let statusCode = 500;
        // ... (copy your detailed Jenkins error handling here) ...
        if (error.response) { /* ... */ } else if (error.request) { /* ... */ } else { /* ... */ }
        console.error(`Error triggering Jenkins for ${deploymentId}: ${errorMessage}`);
         // Respond with an error status to Service C
        res.status(statusCode).json({ message: `Failed to trigger Jenkins job: ${errorMessage}` });
    }
});

// Jenkins Callback Endpoint (MODIFIED to update Firestore)
app.post('/deployment-complete', async (req, res) => { // Made async
    const { deploymentId, status, githubUser, githubRepo, subdir, error /*, userId */ } = req.body; // Destructure Jenkins payload

    console.log("--- Callback Received (Service D) ---");
    console.log("Request Body:", req.body); // Log raw body
    console.log(`Received ID: ${deploymentId}, Status: ${status}`);
    console.log("--- End Callback ---");

    if (!deploymentId || !status) {
        console.error(`Callback missing deploymentId or status.`);
        return res.status(400).json({ message: 'Missing deploymentId or status in callback.' });
    }

    const jobRef = db.collection('deploymentQueue').doc(deploymentId);
    let finalUrl = null;
    let updateData = {
        status: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (status === 'completed') {
        // Construct URL (Same logic as before)
        if (githubUser && githubRepo /* && subdir - decide if subdir needed */) {
             // Adjust subdir handling as needed. Often repoName is enough if deploying to root.
            const cleanSubdir = subdir ? subdir.replace(/^\/+|\/+$/g, '') : '';
            // Example: if subdir IS the repo name, maybe you don't need it twice?
            // Check your actual GitHub Pages URL structure.
            // Common structure: https://user.github.io/repoName/
             finalUrl = `https://${githubUser}.github.io/${githubRepo}/`; // Assuming deployment to root
            if (cleanSubdir && cleanSubdir !== '/') { // Add subdir if it's provided and not just root
                 finalUrl += `${cleanSubdir}/`;
            }
            updateData.finalUrl = finalUrl;
            console.log(`Successfully constructed URL: ${finalUrl}`);
        } else {
            console.error(`Missing components needed to build URL for ${deploymentId}.`);
            updateData.errorMessage = 'Deployment successful, but failed to reconstruct URL (missing data from Jenkins).';
        }
    } else { // status === 'failed'
        updateData.errorMessage = error || 'Jenkins job reported failure.';
    }

    // --- Update Firestore and User Count (Transaction) ---
    try {
        await db.runTransaction(async (transaction) => {
            const jobDoc = await transaction.get(jobRef);
            if (!jobDoc.exists) {
                 throw new Error(`Job document ${deploymentId} not found in Firestore.`);
            }
            const jobData = jobDoc.data();
            const userId = jobData.userId; // Get userId from the job data

            // Update the deployment queue document
            transaction.update(jobRef, updateData);
            console.log(`Updated deployment queue status for ${deploymentId} to ${status}`);

            // If completed successfully, increment user's site count
            if (status === 'completed') {
                if (!userId) {
                     console.error(`Cannot increment site count: userId missing in job data for ${deploymentId}`);
                     return; // Or handle differently
                }
                const userRef = db.collection('users').doc(userId);
                transaction.update(userRef, {
                    deployedSiteCount: admin.firestore.FieldValue.increment(1)
                });
                console.log(`Incremented deployedSiteCount for user ${userId}`);
            }
        });
        console.log(`Firestore transaction successful for ${deploymentId}.`);

    } catch (firestoreError) {
         console.error(`Firestore transaction failed for ${deploymentId}:`, firestoreError);
         // Don't send 500 back to Jenkins, it did its job. Log the error.
         // Consider adding retry logic or marking the job for manual review.
    }

    // --- Cleanup local file ---
    const uploadPath = path.join(UPLOAD_DIR, deploymentId);
    fs.rm(uploadPath, { recursive: true, force: true })
        .then(() => console.log(`Cleaned up local upload directory: ${uploadPath}`))
        .catch(err => console.error(`Error cleaning up upload directory ${uploadPath}:`, err));

     // --- Cleanup GCS file (Alternative place for cleanup) ---
     // If you didn't cleanup in Service C, do it here after DB update confirms final state.
    try {
        const jobDocSnapshot = await jobRef.get(); // Re-get job data to ensure gcsFilePath is available
        if (jobDocSnapshot.exists) {
            const gcsPath = jobDocSnapshot.data().gcsFilePath;
            if (gcsPath) {
                 const bucketName = gcsPath.split('/')[2];
                 const fileName = gcsPath.substring(gcsPath.indexOf('/', 5) + 1);
                 await storage.bucket(bucketName).file(fileName).delete();
                 console.log(`Cleaned up GCS file ${gcsPath}`);
            }
        }
    } catch (cleanupError) {
        console.error(`Warning: Failed to cleanup GCS file after callback for ${deploymentId}:`, cleanupError.message);
    }

    // --- Respond 200 OK to Jenkins ---
    res.status(200).json({ message: 'Callback received and processed by Service D.' });
});


// REMOVED: Original /status endpoint

// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `File upload error (Service D): ${err.message}` });
    } else if (err) {
      console.error("Unhandled Error (Service D):", err);
      return res.status(500).json({ message: `Internal Server Error (Service D): ${err.message}` });
    }
    next();
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Service D (Jenkins Trigger) listening at http://localhost:${port}`);
    console.log(`Expecting internal triggers at /internal/trigger-jenkins`);
    console.log(`Expecting Jenkins callback at ${BACKEND_CALLBACK_URL}/deployment-complete`);
});
