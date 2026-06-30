import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function testModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key found in .env");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
  
  for (const m of models) {
    try {
      console.log(`Testing model: ${m}...`);
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent("Say hello");
      console.log(`  SUCCESS: ${m} responded with: ${result.response.text().substring(0, 20)}`);
      return; // Stop if we find one that works
    } catch (e: any) {
      console.error(`  FAILED: ${m} - ${e.message}`);
    }
  }
}

testModels();
