import { GoogleGenerativeAI } from "@google/generative-ai";

async function testFirebaseKey() {
  const apiKey = "AIzaSyBe0n4b1iIemFx898anZdoc-wtkZED8mCQ";
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    console.log(`Testing Firebase key with gemini-1.5-flash...`);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Say hello");
    console.log(`  SUCCESS: Response: ${result.response.text().substring(0, 20)}`);
  } catch (e: any) {
    console.error(`  FAILED: ${e.message}`);
  }
}

testFirebaseKey();
