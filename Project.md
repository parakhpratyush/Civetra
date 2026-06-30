# Civetra: Technical Documentation

## 🤖 Agentic Architecture
Civetra is built as a multi-modal agentic platform. It doesn't just display data; it interprets it.

### 1. Visual Perception Layer (Gemini Pro Vision)
- **Input**: Base64 Image string from client.
- **Agentic Logic**: The system analyzes the pixel data to determine if the content is civic-related, identifies the exact infrastructure failure (e.g., "Pothole" vs "Open Sewer"), and assigns a priority level without user input.

### 2. Conversational Agent (Gemini Flash)
- **Logic**: A context-aware chatbot (CivicBot) that maintains history and uses system-level instructions to redirect off-topic or political queries, ensuring the platform remains a safe community space.

### 3. Predictive Foresight
- **Mechanism**: The backend aggregates recent reports and sends a summarized "Community Pulse" to Gemini to generate foresight insights, allowing city planners to act proactively.

## 📦 Deployment Strategy
- **Frontend**: Distributed via Firebase Global CDN.
- **Backend**: Containerized Node.js environment deployed via **Google Cloud App Hosting**, providing seamless scaling and secure environment variable management for API keys.

## 🧬 Database Schema (Firestore)
- `users`: Profiles, badges, and civic reputation scores.
- `issues`: Geo-tagged reports with AI-generated metadata.
- `admin`: Elevated access controls for verification and resolution.

---
*Built for the vibe2ship Hackathon.*
