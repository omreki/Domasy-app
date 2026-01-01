# Domasy Server - Backend API (Firebase Edition)

Complete REST API for the Domasy Document Management System built with Node.js, Express, and Firebase (Firestore & Storage).

## 🚀 Features

### Core Functionality
- ✅ **User Authentication** - JWT-based auth with Role-Based Access Control (RBAC)
- ✅ **Document Management** - Upload (Firebase Storage), update, delete documents (Firestore)
- ✅ **Approval Workflows** - Multi-stage document approval system
- ✅ **Project Management** - Organize documents into projects
- ✅ **Team Management** - User roles and permissions
- ✅ **Audit Logging** - Complete activity tracking
- ✅ **Dashboard Analytics** - Real-time statistics

### Security Features
- JWT token authentication
- Password hashing with bcrypt
- Role-based authorization
- Rate limiting
- Helmet security headers
- CORS protection
- File upload validation

## 📋 Prerequisites

- Node.js >= 18.0.0
- Firebase Project (Firestore, Storage, Auth enabled)
- Service Account Key (JSON)

## 🛠️ Installation

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Cloud Firestore**
4. Enable **Storage**
5. Go to **Project Settings > Service Accounts**
6. Generate a new private key -> Download `serviceAccountKey.json`
7. Place `serviceAccountKey.json` in the `server` directory (it is git-ignored)

### 3. Environment Setup

Create/Edit `.env` file:

```env
NODE_ENV=development
PORT=5000

# Firebase Config (Option 1: File Path - Recommended)
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

# Firebase Config (Option 2: Env Vars)
# FIREBASE_PROJECT_ID=...
# FIREBASE_CLIENT_EMAIL=...
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# File Upload
MAX_FILE_SIZE=26214400

# CORS
CLIENT_URL=http://localhost:3000
```

### 4. Run the Server

```bash
# Development
npm run dev

# Production
npm start
```

## 📡 API Endpoints

(Same as MongoDB version - The API contract remains identical)

- **Auth:** `/api/auth/*`
- **Documents:** `/api/documents/*`
- **Projects:** `/api/projects/*`
- **Approvals:** `/api/approvals/*`
- **Users:** `/api/users/*`
- **Audit:** `/api/audit/*`

## 🏗️ Architecture Change

This backend has been migrated from MongoDB to **Google Firebase**.

### Services
Instead of Mongoose models, we now use Service classes in `server/services/`:
- `UserService.js`
- `DocumentService.js`
- `ProjectService.js`
- `ApprovalWorkflowService.js`
- `AuditLogService.js`

These services handle all interactions with Firestore and Firebase Storage.

## 📁 Project Structure

```
server/
├── config/             # Firebase configuration
│   └── firebase.js
├── controllers/        # Request handlers
├── services/           # Firestore/Storage logic (Replaces models)
├── routes/             # API routes
├── middleware/         # Auth & Upload
├── serviceAccountKey.json # Firebase credentials (IGNORED)
├── server.js           # Main entry point
└── package.json
```

## 📝 License

MIT
