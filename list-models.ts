import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key found");
    return;
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // There isn't a direct listModels in the client SDK usually, 
    // but we can try to fetch a known model or use the REST API if needed.
    // Let's just try the 3 most common ones.
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
    
    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent("Hi");
        console.log(`✅ Model ${m} is available and working!`);
        return m;
      } catch (e) {
        console.log(`❌ Model ${m} failed: ${e.message}`);
      }
    }
  } catch (err) {
    console.error("Error during listing:", err);
  }
}

listModels();
