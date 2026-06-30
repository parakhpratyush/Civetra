var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.post("/api/get-icon", async (req, res) => {
    try {
      const { category, description } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is missing" });
      }
      const ai2 = new import_genai.GoogleGenAI({ apiKey });
      let prompt = `You are an expert at assigning the most accurate single emoji icon to a civic issue report.
Given the category and description of the issue below, return ONLY a JSON object containing a single field "icon" with the emoji. Do not include markdown formatting like \`\`\`json.

Category: ${category}
Description: ${description || "No description provided."}

Example response:
{"icon": "\u{1F573}\uFE0F"}
`;
      const response = await ai2.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });
      let jsonResponse = JSON.parse(response.text || "{}");
      res.json(jsonResponse);
    } catch (error) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Failed to generate icon", details: error.message });
    }
  });
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { category } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is missing" });
      }
      const ai2 = new import_genai.GoogleGenAI({ apiKey });
      const prompt = `A flat vector illustration of ${category}, neo-brutalism style, thick bold black outlines, stark minimal colors, pure white background, crisp comic book aesthetic, UI icon`;
      const response = await ai2.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: "1:1"
        }
      });
      if (response.generatedImages && response.generatedImages.length > 0) {
        const base64Image = response.generatedImages[0].image.imageBytes;
        res.json({ imageUrl: `data:image/jpeg;base64,${base64Image}` });
      } else {
        throw new Error("No image generated");
      }
    } catch (error) {
      console.error("Gemini Imagen API Error:", error);
      res.status(500).json({ error: "Failed to generate image", details: error.message });
    }
  });
  app.post("/api/categorize", async (req, res) => {
    try {
      const { description, imageBase64 } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is missing" });
      }
      const ai2 = new import_genai.GoogleGenAI({ apiKey });
      const prompt = `Analyze this civic issue report and extract the following in JSON format:
- category: BE HIGHLY SPECIFIC AND GRANULAR. Do NOT use generic terms like "Infrastructure" or "Sanitation". Instead, name the exact physical issue (e.g., "Pothole", "Landfill", "Dirty River", "Broken Streetlight", "Water Leakage", "Fallen Tree", "Open Sewer").
- severity: "Low", "Medium", "High", or "Critical".
- title: A short, clear title for the issue.
- tags: Array of 2-3 relevant tags.

User Description: ${description || "No description provided."}
`;
      let contents = [prompt];
      if (imageBase64) {
        const base64Data = imageBase64.split(",")[1] || imageBase64;
        contents.push({
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
            // Or infer from prefix
          }
        });
      }
      const response = await ai2.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });
      let jsonResponse = JSON.parse(response.text || "{}");
      res.json(jsonResponse);
    } catch (error) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Failed to categorize issue", details: error.message });
    }
  });
  app.post("/api/moderate-content", async (req, res) => {
    try {
      const { text, imageBase64 } = req.body;
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
      let contents = [prompt];
      if (imageBase64) {
        const base64Data = imageBase64.split(",")[1] || imageBase64;
        contents.push({
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        });
      }
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });
      const jsonResponse = JSON.parse(response.text || "{}");
      res.json(jsonResponse);
    } catch (error) {
      console.error("Gemini Moderation Error:", error);
      res.status(200).json({ approved: true, reason: "AI Moderation Unavailable - Failed Open" });
    }
  });
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { category } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is missing" });
      const ai2 = new import_genai.GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
      const prompt = `Create a bold, Neo-Brutalist style illustration of a civic issue related to: ${category}. Use thick black outlines, stark minimalistic flat colors, and a crisp comic book aesthetic. Pure white background.`;
      const response = await ai2.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: "1:1"
        }
      });
      const base64Image = response.generatedImages[0].image.imageBytes;
      const imageUrl = `data:image/jpeg;base64,${base64Image}`;
      res.json({ imageUrl });
    } catch (e) {
      console.error("Image generation failed:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/insights", async (req, res) => {
    try {
      const { issuesSummary } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is missing" });
      const ai2 = new import_genai.GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
      const prompt = `You are an expert AI City Planner. Given the following summary of recent civic issues reported by citizens, generate 2 high-level predictive insights.
For example, if you see many 'pothole' and 'water' reports in a certain area, you might predict localized flooding or severe road degradation.

Recent Issues Summary:
${issuesSummary || "No recent issues."}

Return ONLY a JSON array containing exactly 2 objects. Each object must have:
- title: A bold, catchy title for the insight (e.g. "Localized Flooding Risk - Sector 62")
- description: A detailed 1-2 sentence prediction explaining why this insight was generated based on the data.
- iconType: Either "alert" (for risks) or "zap" (for immediate hazards).

Do not include markdown blocks like \`\`\`json. Return raw JSON.`;
      const response = await ai2.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3
        }
      });
      let jsonResponse = JSON.parse(response.text || "[]");
      if (!Array.isArray(jsonResponse)) jsonResponse = [jsonResponse];
      res.json({ insights: jsonResponse.slice(0, 2) });
    } catch (e) {
      console.error("Insights API Error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/share-impact", async (req, res) => {
    try {
      const { title, description, category, location } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is missing" });
      const ai2 = new import_genai.GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
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
      const response = await ai2.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "text/plain",
          temperature: 0.7
        }
      });
      res.json({ text: response.text?.trim() });
    } catch (e) {
      console.error("Share Impact API Error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is missing" });
      }
      const ai2 = new import_genai.GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
      let validHistory = [];
      let lastRole = null;
      for (const msg of history || []) {
        const role = msg.role === "bot" ? "model" : "user";
        const text = msg.text || " ";
        if (validHistory.length === 0 && role === "model") {
          continue;
        }
        if (role === lastRole) {
          validHistory[validHistory.length - 1].parts[0].text += "\n\n" + text;
        } else {
          validHistory.push({ role, parts: [{ text }] });
          lastRole = role;
        }
      }
      const chatSession = ai2.chats.create({
        model: "gemini-2.5-flash",
        history: validHistory,
        config: {
          systemInstruction: "You are CivicBot, a helpful AI assistant for the Civetra platform. You help citizens understand civic issues, report problems, and learn about the resolution process (Reported -> Verified -> In Progress -> Resolved). Keep your responses concise, friendly, and helpful. Format your responses with markdown."
        }
      });
      const response = await chatSession.sendMessage({ message: message || " " });
      res.json({ reply: response.text });
    } catch (error) {
      console.error("Chat API Error:", error);
      res.status(500).json({ error: "Failed to get chat response", details: error.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
