# Deployment Instructions - GestureSpeak Web Application

This document provides a comprehensive step-by-step guide to deploying the GestureSpeak Web Application into production. 

The application architecture consists of:
1. **Frontend**: React + TypeScript + Material UI (Deployed on **Vercel**).
2. **Backend**: Java Spring Boot (Deployed on **Render** or **Railway**).
3. **Database/Auth**: **Firebase** (Authentication, Firestore Database, and Cloud Storage).

---

## Part 1: Firebase Project Setup

### 1. Create a Firebase Project
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project**, enter `GestureSpeak` as the project name, and follow the setup wizard.
3. Choose whether to enable Google Analytics (optional) and click **Create Project**.

### 2. Configure Firebase Authentication
1. In the left sidebar of the Firebase Console, go to **Build** > **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, enable the **Email/Password** provider.
4. Save the configuration.

### 3. Create Firestore Database
1. Go to **Build** > **Firestore Database**.
2. Click **Create Database**.
3. Select a database location closest to your users.
4. Select **Start in production mode** or **Start in test mode**. 
   > [!IMPORTANT]
   > If starting in production mode, make sure your rules allow reading/writing based on authentication. Example rules:
   > ```javascript
   > rules_version = '2';
   > service cloud.firestore {
   >   match /databases/{database}/documents {
   >     match /users/{userId} {
   >       allow read, write: if request.auth != null && request.auth.uid == userId;
   >     }
   >     match /predictionHistory/{id} {
   >       allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
   >     }
   >     match /learningContent/{id} {
   >       allow read: if true;
   >       allow write: if request.auth != null && request.auth.token.role == 'ADMIN';
   >     }
   >     match /emergencyLogs/{id} {
   >       allow read, write: if request.auth != null;
   >     }
   >   }
   > }
   > ```

### 4. Create Firebase Cloud Storage
1. Go to **Build** > **Storage**.
2. Click **Get Started**.
3. Select storage location and click **Done**.

### 5. Generate Firebase Admin Service Account (for Backend)
1. Go to **Project Settings** (gear icon in the sidebar) > **Service Accounts**.
2. Select **Firebase Admin SDK** and click **Generate New Private Key**.
3. A JSON file will download (e.g., `gesturespeak-firebase-adminsdk-xxxxx.json`).
4. Rename this file to `firebase-service-account.json` and place it in:
   `gesturespeak-backend/src/main/resources/firebase-service-account.json`
   > [!WARNING]
   > Do NOT commit this file to public git repositories as it contains private security credentials.

### 6. Register Web App (for Frontend)
1. Go to **Project Settings** > **General**.
2. Under **Your apps**, click the Web icon (`</>`) to register a new web app.
3. Enter `GestureSpeak Web` as the app nickname and click **Register app**.
4. Firebase will show your Web Config credentials. Copy these keys for frontend environment configuration.

---

## Part 2: Backend Deployment (Render or Railway)

The backend is built as a standard Spring Boot executable JAR using Maven.

### 1. Environment Configurations
Your backend reads configurations from `application.properties`. When deploying, you should pass the Firebase Service Account content securely.
To deploy without placing files on disk:
- Set the `FIREBASE_CONFIG_JSON` environment variable containing the raw JSON content of your service account credentials file. The backend configuration (`FirebaseConfig.java`) will automatically detect it and write a temporary credentials profile.

### 2. Deployment on Render
1. Create a [Render](https://render.com/) account and connect your GitHub repository.
2. In Render, click **New** > **Web Service**.
3. Select your GestureSpeak repository.
4. Configure the Web Service settings:
   - **Name**: `gesturespeak-api`
   - **Environment**: `Docker` or `Java` (Select Java and configure Maven commands if building directly).
   - **Build Command**: `./mvnw clean package -DskipTests`
   - **Start Command**: `java -jar target/backend-0.0.1-SNAPSHOT.jar`
5. Under **Advanced**, add the following Environment Variables:
   - `SPRING_PROFILES_ACTIVE`: `prod`
   - `SERVER_PORT`: `8080`
   - `FIREBASE_CONFIG_JSON`: *(Copy-paste the complete contents of `firebase-service-account.json` here)*
6. Click **Create Web Service**. Render will build the Maven project and start the server.

### 3. Deployment on Railway
1. Sign up on [Railway.app](https://railway.app/).
2. Create a **New Project** > **Deploy from GitHub repo** and select your repository.
3. Go to the project settings, and select **Variables** to add the env variables:
   - `FIREBASE_CONFIG_JSON`: *(Complete contents of your service account JSON file)*
   - `PORT`: `8080`
4. Railway will automatically detect the Maven configuration, build the target jar, and launch the service.

---

## Part 3: Frontend Deployment (Vercel)

The React frontend compiles down to optimized static assets using Vite.

### 1. Set Up Environmental Variables
Create a file named `.env.production` (or configure these directly in the Vercel dashboard):

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_BACKEND_URL=https://your-backend-api-url.onrender.com
```

### 2. Deploying on Vercel
1. Go to the [Vercel Dashboard](https://vercel.com/) and click **Add New** > **Project**.
2. Import your GestureSpeak repository.
3. Configure project options:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `gesturespeak-frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand the **Environment Variables** section and add all keys from your `.env.production` file.
5. Click **Deploy**. Vercel will bundle the TypeScript code and deploy it to a global CDN edge.

---

## Verification checklist

Once both layers are deployed:
1. Navigate to your Vercel URL.
2. Sign up a new user, and verify a user document is successfully written to Firestore.
3. Try starting a Sign Detection camera session. Ensure MediaPipe tracks hand skeletons and predictions execute successfully.
4. Toggle emergency alerts, verifying a warning siren emits and log entries populate in the Firestore `emergencyLogs` collection.
