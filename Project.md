# Civetra: Architectural & Feature Specification

## 🍎 PWA & Installation Engineering
Civetra is engineered to be **Native-First**. We used a Progressive Web App (PWA) architecture to bridge the gap between web and mobile.

- **Service Workers**: For ultra-fast caching and offline availability.
- **Manifest Orchestration**: Custom `manifest.json` ensuring the "Install/Download" button appears in all modern browsers (Apple Safari, Google Chrome, Microsoft Edge).
- **Iconography**: High-resolution, premium assets generated for both 192px and 512px resolutions.

---

## 👁️ Feature Deep-Dive

### 1. The Civic Lens (Visual Intelligence)
- **Technology**: Multi-modal prompt engineering with Gemini Pro Vision.
- **Workflow**: 
  1. Capture -> 2. Base64 Encoding -> 3. Backend perception -> 4. Automated JSON metadata generation.
- **Impact**: Reduces reporting friction by 90%, transforming an arduous process into a simple "Point & Shoot" action.

### 2. AI Predictive Foresight Ticker
- **Algorithm**: Temporal data scanning of the Firestore `issues` collection.
- **Agentic Logic**: Gemini Flash analyzes spatial and temporal density to generate foresight insights, moving the city from *reactive* to *proactive* governance.

### 3. Smart CivicBot (The Guardian)
- **Guardrails**: System-level instructions in the Node.js backend to prevent off-topic or political misuse.
- **Agent Role**: Acts as a 24/7 concierge for the city, guiding users through the complex reporting lifecycle.

### 4. Real-Time Spatial Truth
- **Engine**: Leaflet.js with custom marker-clustering logic.
- **Real-time Core**: Powered by Firestore `onSnapshot` listeners, ensuring the map updates globally in <500ms.

---

## 🎨 Design Engineering: The Dual-Theme Engine

### 🌑 Obsidian Dark Mode
- **Design Intent**: Designed for low-light "War Room" environments.
- **Visual Language**: Deep grays (`#0a0a0a`), vibrant purples, and Glassmorphism.

### ☀️ Radiant Light Mode
- **Design Intent**: Designed for high-glare, outdoor environments (field reporting).
- **Visual Language**: High-contrast typography and soft, layered shadows.

---

## 🚀 Deployment Infrastructure
- **CI/CD**: Automatic rollouts via GitHub & Firebase App Hosting.
- **Containerization**: Docker-based deployment on Google Cloud Run for the AI backend.
- **Global Delivery**: Firebase Hosting for sub-second page loads via Google’s Global Edge Network.

---
*Built for the vibe2ship Hackathon.*
