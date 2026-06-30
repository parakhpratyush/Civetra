import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function testExperimentalModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Trying the exact model name that appeared in your 429 error log
  const modelName = "gemini-2.5-flash"; 
  
  try {
    console.log(`Testing with model name: ${modelName}...`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Hello");
    console.log(`  SUCCESS: ${result.response.text()}`);
  } catch (e: any) {
    console.error(`  FAILED: ${e.message}`);
  }
}

testExperimentalModel();
