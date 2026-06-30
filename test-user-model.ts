import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function testSpecificModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key found");
    return;
  }
  console.log("Testing with API Key:", apiKey.substring(0, 5) + "...");
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use the model name from the user's curl example
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent("Explain how AI works in a few words");
    console.log("✅ Success with gemini-flash-latest!");
    console.log("Response:", (await result.response).text());
  } catch (e) {
    console.log("❌ Failed with gemini-flash-latest:", e.message);
    
    // Try one more: gemini-1.5-flash-latest
    try {
        const model2 = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const result2 = await model2.generateContent("Hi");
        console.log("✅ Success with gemini-1.5-flash-latest!");
    } catch (e2) {
        console.log("❌ Failed with gemini-1.5-flash-latest:", e2.message);
    }
  }
}

testSpecificModel();
