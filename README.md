# 🛡️ Civetra: The Gemini-Powered Civic Trust Engine

**Visual Intelligence for Smarter, More Accountable Communities.**

Civetra is a cutting-edge civic technology platform that empowers citizens to report, track, and resolve hyperlocal infrastructure issues. By leveraging **Google's Gemini Pro Vision**, Civetra turns every smartphone into a sophisticated sensor for city improvement.

---

## 👁️ The "Civic Lens" Experience
Civetra's core feature, the **Civic Lens**, provides a "Google Lens" style experience for civic reporting:
- **Instant Recognition**: Point your camera at a pothole, broken streetlight, or waste overflow.
- **AI Automated Intelligence**: Gemini Pro Vision analyzes the image to automatically categorize the issue, estimate severity, and extract location data.
- **Zero Friction**: No long forms. Just take a photo, and the AI handles the rest.

---

## 🚀 Key Features
- **AI Predictive Insights**: A live dashboard ticker that uses Gemini Flash to predict community needs based on reporting trends.
- **Interactive Spatial Mapping**: Real-time visualization of community issues using geo-clustering.
- **Agentic CivicBot**: A 24/7 AI assistant that helps users navigate the platform and redirects political or off-topic queries.
- **Gamified Impact**: Earn badges and certificates for verified civic contributions.
- **Admin Command Center**: A professional dashboard for city officials to manage and resolve reports.

---

## 🛠️ Tech Stack
- **AI/ML**: Google Gemini API (Pro Vision, Flash)
- **Frontend**: React.js, Tailwind CSS, Framer Motion, Three.js
- **Backend**: Node.js, Express
- **Database**: Firebase Firestore (Real-time sync)
- **Auth**: Firebase Authentication
- **Cloud**: Google Cloud App Hosting, Cloud Run, Firebase Hosting

---

## 💻 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20 or higher recommended)
- [Firebase CLI](https://firebase.google.com/docs/cli)
- A Google Cloud Project with Gemini API enabled.

### Installation
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/parakhpratyush/Civetra.git
   cd Civetra
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   Create a `.env` file in the root directory and add your keys:
   ```env
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   GEMINI_API_KEY=your_gemini_key
   ```

### Running Locally
- **Frontend (Development)**:
  ```bash
  npm run dev
  ```
- **Backend (AI Server)**:
  ```bash
  node server.js
  ```

---

## 🌍 Deployment
The application is optimized for **Google Cloud App Hosting**.
- **Live Frontend**: [civetra.web.app](https://civetra.web.app)
- **Full-Stack (AI-Enabled)**: [civetra-ai-brain--civetra.us-east4.hosted.app](https://civetra-ai-brain--civetra.us-east4.hosted.app)

---

## 🧬 Project Structure
```text
├── src/                # React Frontend
│   ├── components/     # UI Components (Civic Lens, Map, Chatbot)
│   ├── contexts/       # State Management (Auth, Notifications)
│   ├── pages/          # Main Views (Dashboard, Home, Report)
├── server.ts           # Node.js AI Backend (Gemini Integration)
├── firestore.rules     # Database Security Rules
├── Dockerfile          # Container config for Cloud Run
└── README.md           # Project Documentation
```

---
*Built with ❤️ for the vibe2ship Hackathon.*
