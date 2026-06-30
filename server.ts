import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Helper to create a fresh AI instance with the current API key
function getAIModel(modelName = "gemini-flash-latest", systemInstruction?: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing from .env");
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Try primary model, fallback to gemini-pro if needed
  try {
    return genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction: systemInstruction 
    });
  } catch (e) {
    console.warn(`Failed to init ${modelName}, falling back to gemini-pro`);
    return genAI.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction 
    });
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 8080;

  // Increase payload limit for base64 images
  app.use(express.json({ limit: "50mb" }));

  // ==========================================
  // GET ICON ENDPOINT
  // ==========================================
  app.post("/api/get-icon", async (req, res) => {
    try {
      const { category, description } = req.body;
      const model = getAIModel();

      const prompt = `You are an expert at assigning the most accurate single emoji icon to a civic issue report.
Given the category and description of the issue below, return ONLY a JSON object containing a single field "icon" with the emoji. Do not include markdown formatting like \`\`\`json.

Category: ${category}
Description: ${description || "No description provided."}

Example response:
{"icon": "🕳️"}
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      let jsonResponse = JSON.parse(text || "{}");
      res.json(jsonResponse);

    } catch (error: any) {
      console.error("Gemini API Error (get-icon):", error.message);
      res.status(500).json({ error: "Failed to generate icon", details: error.message });
    }
  });

  // ==========================================
  // CATEGORIZE ENDPOINT
  // ==========================================
  app.post("/api/categorize", async (req, res) => {
    try {
      const { description, imageBase64 } = req.body;
      const model = getAIModel();

      const prompt = `Analyze this civic issue report and extract the following in JSON format:
- category: BE HIGHLY SPECIFIC AND GRANULAR. Do NOT use generic terms like "Infrastructure" or "Sanitation". Instead, name the exact physical issue (e.g., "Pothole", "Landfill", "Dirty River", "Broken Streetlight", "Water Leakage", "Fallen Tree", "Open Sewer").
- severity: "Low", "Medium", "High", or "Critical".
- title: A short, clear title for the issue.
- tags: Array of 2-3 relevant tags.

User Description: ${description || "No description provided."}
`;

      let contents: any[] = [prompt];

      if (imageBase64) {
        const base64Data = imageBase64.split(",")[1] || imageBase64;
        contents.push({
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        });
      }

      const result = await model.generateContent(contents);
      const response = await result.response;
      const text = response.text();

      let jsonResponse = JSON.parse(text || "{}");
      res.json(jsonResponse);

    } catch (error: any) {
      console.error("Gemini API Error (categorize):", error.message);
      res.status(500).json({ error: "Failed to categorize issue", details: error.message });
    }
  });

  // ==========================================
  // AI CONTENT MODERATOR ENDPOINT
  // ==========================================
  app.post("/api/moderate-content", async (req, res) => {
    try {
      const { text, imageBase64 } = req.body;
      const model = getAIModel();

      const prompt = `You are a strict, enterprise-grade civic platform content moderator.
Analyze the following text and optional image for any of the following violations:
1. NSFW, nudity, or sexually explicit content
2. Hate speech, racism, or severe profanity
3. Extreme violence or gore
4. Spam or highly irrelevant content (this is a civic issue reporting platform for a city)

Text to analyze: "${text || "No text provided."}"

Respond strictly with a JSON object in this format:
{
  "approved": boolean,
  "reason": "String explaining why it was rejected, or 'Approved' if safe."
}`;

      let contents: any[] = [prompt];

      if (imageBase64) {
        const base64Data = imageBase64.split(",")[1] || imageBase64;
        contents.push({
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        });
      }

      const result = await model.generateContent(contents);
      const response = await result.response;
      const resultText = response.text();

      const jsonResponse = JSON.parse(resultText || "{}");
      res.json(jsonResponse);

    } catch (error: any) {
      console.error("Gemini Moderation Error:", error.message);
      // Fail open (allow) if AI is down so users can still report emergencies
      res.status(200).json({ approved: true, reason: "AI Moderation Unavailable - Failed Open" });
    }
  });

  // ==========================================
  // INSIGHTS CACHE & RATE LIMITING
  // ==========================================
  let latestInsights = [
    {
      title: "Community Resilience Peak",
      description: "AI analysis indicates a 24% increase in proactive community reporting across all sectors this month.",
      iconType: "zap"
    },
    {
      title: "Smart City Infrastructure",
      description: "Our AI systems are monitoring urban patterns to optimize city resource allocation in real-time.",
      iconType: "alert"
    }
  ];
  let insightRequests = [];
  const INSIGHT_LIMIT = 4;
  const LIMIT_WINDOW = 60 * 1000; // 1 minute

  // ==========================================
  // INSIGHTS ENDPOINT
  // ==========================================
  app.post("/api/insights", async (req, res) => {
    try {
      const now = Date.now();
      insightRequests = insightRequests.filter(t => now - t < LIMIT_WINDOW);

      if (insightRequests.length >= INSIGHT_LIMIT) {
        console.log("Insights Rate Limit Hit (4/min). Returning cached/fallback data.");
        return res.json({ insights: latestInsights });
      }

      insightRequests.push(now);
      const { issuesSummary } = req.body;
      const model = getAIModel();

      const prompt = `You are an expert AI City Planner for the platform 'Civetra'. Given the following summary of recent civic issues, generate 2 high-level predictive insights.
If data is empty, generate 2 general but realistic civic foresight insights for a modern smart city.
Title should be bold and under 40 chars. Description under 120 chars.

Recent Issues Summary:
${issuesSummary || "No recent issues (Database is currently empty/new)."}

Return ONLY a JSON array containing exactly 2 objects:
- title: string
- description: string
- iconType: "alert" or "zap"`;

      let jsonResponse = latestInsights;
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const parsed = JSON.parse(text || "[]");
        if (Array.isArray(parsed) && parsed.length > 0) {
          jsonResponse = parsed.slice(0, 2);
          latestInsights = [...jsonResponse]; // Update cache
        }
      } catch (genError: any) {
        console.warn("Insights generation failed, using cached:", genError.message);
        jsonResponse = latestInsights;
      }

      res.json({ insights: jsonResponse });
    } catch (e: any) {
      console.error("Insights API Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/latest-insights", (req, res) => {
    res.json({ insights: latestInsights });
  });

  // ==========================================
  // SHARE IMPACT ENDPOINT
  // ==========================================
  app.post("/api/share-impact", async (req, res) => {
    try {
      const { title, description, category, location } = req.body;
      const model = getAIModel();

      const prompt = `You are the public relations manager for Civetra. A civic issue has just been resolved by the community!
Generate a short, celebratory, and professional social media post (under 280 characters) announcing this success.
Do NOT include the title of the issue in the generated text, just weave the context naturally.
Include 2-3 relevant hashtags at the end (e.g. #Civetra #CommunityImpact).

Issue Context:
Title: ${title}
Description: ${description}
Category: ${category}
Location: ${location?.address || "Local Area"}

Return ONLY the raw text of the post. Do not use quotes around it.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      res.json({ text: text?.trim() });
    } catch (e: any) {
      console.error("Share Impact API Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================
  // CHAT ENDPOINT
  // ==========================================
  
  const FALLBACK_QA = [
    { pattern: /what is civetra|what do you do|how does this work|about civetra/i, response: "Civetra is a civic trust engine that empowers citizens to report public infrastructure issues (like potholes, broken streetlights, or waste). We use AI to categorize your reports and map them for verified action." },
    { pattern: /how to report|add a report|create a report|report an issue/i, response: "It's easy! Click the 'ADD REPORT' button at the top right, or 'Report Issue' on the home page. Upload a photo and describe the problem, and our AI will handle the rest." },
    { pattern: /track my report|where is my report|status of my report/i, response: "Once logged in, click 'Track Report' in the bottom navigation or visit your 'Profile' to see the status of all your submitted issues (Reported, Verified, In Progress, Resolved)." },
    { pattern: /who fixes|what happens after|who resolves/i, response: "After verification, issues appear on our Map and Dashboard. City administrators can assign resources, and registered community Volunteers can step in to help resolve localized issues." },
    { pattern: /what is the map|show me the map|where are issues/i, response: "The Map provides a live view of all reported civic issues. You can use it to pinpoint problems and see what has already been reported by others in your area." },
    { pattern: /free to use|does it cost/i, response: "Yes! Civetra is completely free for citizens and volunteers to use to improve their communities." },
    { pattern: /need an account|do i have to sign up|create an account/i, response: "You can view the map and public issues without an account, but you need to sign in to report new issues, track them, or volunteer." },
    { pattern: /what kind of issues|what can i report/i, response: "You can report any public infrastructure or civic issue, such as potholes, broken streetlights, water leakage, fallen trees, open sewers, or illegal dumping." },
    { pattern: /upload photo|add picture/i, response: "Yes! When creating a report, you can upload a photo of the issue. Our AI uses this image to better categorize and assess the severity of the problem." },
    { pattern: /exact location|gps/i, response: "Yes, when you report an issue, you can drop a pin on the interactive map to provide the exact GPS coordinates so authorities can find it easily." },
    { pattern: /fake report|spam/i, response: "Our platform uses an AI Content Moderator to scan reports for spam, inappropriate content, or irrelevance before they are posted to ensure data quality." },
    { pattern: /what do statuses mean|status meaning/i, response: "Reported: Just submitted. Verified: Confirmed by an admin. In Progress: Being worked on. Resolved: The issue has been fixed!" },
    { pattern: /how long|when will it be fixed/i, response: "Resolution time depends on the severity of the issue and the available city resources or volunteers. You can track updates in real-time on your profile." },
    { pattern: /ai used|artificial intelligence/i, response: "We use AI to automatically categorize issues, assign emoji icons, moderate content for spam, generate predictive insights for city planners, and power this chatbot!" },
    { pattern: /ai insights|predictive insights/i, response: "AI Insights analyze recent reports to predict future problems (like localized flooding from multiple water leaks) to help administrators take proactive measures." },
    { pattern: /3d gallery|cube/i, response: "The 3D Gallery on the dashboard is an interactive, WebGL-powered cube that visualizes recently reported issues in a dynamic, spatial format." },
    { pattern: /how to volunteer|become a volunteer/i, response: "If you want to help fix issues, create an account and visit the 'Volunteer' tab. You can find tasks near you and contribute to your community." },
    { pattern: /what does a volunteer do/i, response: "Volunteers can take up verified community tasks, such as community cleanups, clearing minor debris, or assisting in local civic initiatives." },
    { pattern: /leaderboard/i, response: "The Leaderboard ranks the most active citizens and volunteers based on the number of issues they've successfully reported or resolved, encouraging community engagement." },
    { pattern: /badges|certificates|rewards/i, response: "As you report or resolve issues, you earn digital badges and certificates that appear on your profile to showcase your civic contribution." },
    { pattern: /share|social media/i, response: "Yes! Once an issue is resolved, you can use our 'Share Impact' feature to generate an AI-written post to share your community's success on social media." },
    { pattern: /updates|feed/i, response: "The Updates or Feed section shows a chronological timeline of recent activities, such as new reports, status changes, and resolved issues across the city." },
    { pattern: /change avatar|edit profile/i, response: "You can select an avatar during sign-up. To view your stats, visit the Profile section." },
    { pattern: /forgot password|reset password/i, response: "On the Login modal, enter your email and click the password reset option if available, or try logging in with Google if you linked your account." },
    { pattern: /admin|administrators/i, response: "Admins have a special dashboard to review reported issues, update statuses, view AI insights, and manage the platform. Admins cannot create citizen reports." },
    { pattern: /can admin report/i, response: "No, the 'Add Report' feature is designed specifically for citizens. Admins focus on managing and resolving the issues." },
    { pattern: /data secure|privacy/i, response: "Yes, your data is securely stored using enterprise-grade cloud databases. We only use your email for authentication and notifications." },
    { pattern: /who are you|your name/i, response: "I am CivicBot, the AI assistant for the Civetra platform. I'm here to help you navigate the system and understand how to make a civic impact!" },
    { pattern: /thank you|thanks/i, response: "You're very welcome! Let me know if you need help with anything else." },
    { pattern: /hi|hello|hey|greetings/i, response: "Hello! I am CivicBot. How can I help you with the Civetra platform today?" }
  ];

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      const model = getAIModel("gemini-flash-latest", "You are CivicBot, the dedicated AI assistant for the Civetra platform. Your primary mission is to help citizens understand civic issues, report problems like potholes or waste, and learn about the community resolution process. \n\nIMPORTANT BEHAVIOR: \n1. If a user asks about politics, world leaders, or off-topic political figures, politely but firmly redirect them: 'I am here to focus on improving our local community and infrastructure. Let's keep the conversation on civic issues!' \n2. Keep your responses concise, friendly, and helpful. \n3. Format your responses with markdown.");

      // Format history strictly to satisfy Gemini API requirements
      let validHistory: any[] = [];
      let lastRole = null;

      for (const msg of history || []) {
        const role = msg.role === 'bot' ? 'model' : 'user';
        const text = msg.text || " ";

        if (validHistory.length === 0 && role === 'model') {
          continue;
        }

        if (role === lastRole) {
          validHistory[validHistory.length - 1].parts[0].text += "\n\n" + text;
        } else {
          validHistory.push({ role, parts: [{ text }] });
          lastRole = role;
        }
      }

      const chatSession = model.startChat({
        history: validHistory,
        generationConfig: {
          maxOutputTokens: 1000,
        }
      });

      const result = await chatSession.sendMessage(message || " ");
      const response = await result.response;
      const text = response.text();

      res.json({ reply: text });
    } catch (error: any) {
      console.warn("Chat API Error, falling back to manual Q&A:", error.message);
      
      const userMessage = (req.body.message || " ").toLowerCase();
      let fallbackReply = "I am currently experiencing a very high volume of requests, so my advanced AI features are temporarily resting! However, I can still help you with basic questions about how to use Civetra, how to report an issue, or how to track your impact. Could you rephrase your question?";
      
      for (const qa of FALLBACK_QA) {
        if (qa.pattern.test(userMessage)) {
          fallbackReply = qa.response;
          break;
        }
      }
      
      res.json({ reply: fallbackReply });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
