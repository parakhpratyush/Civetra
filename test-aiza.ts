import { GoogleGenerativeAI } from "@google/generative-ai";

async function testAizaKey() {
  const apiKey = "AIzaSyBe0n4b1iIemFx898anZdoc-wtkZED8mCQ";
  console.log("Testing AIza key from firebase config...");
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hi");
    console.log("✅ AIza key works!");
    console.log("Response:", (await result.response).text());
  } catch (e) {
    console.log("❌ AIza key failed:", e.message);
  }
}

testAizaKey();
