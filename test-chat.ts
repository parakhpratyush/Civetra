import { GoogleGenAI } from "@google/genai";
async function run() {
  const ai = new GoogleGenAI({ apiKey: "dummy" });
  const validHistory = [{ role: 'user', parts: [{ text: "hi" }] }];
  try {
    const chat = ai.chats.create({ model: "gemini-3.5-flash", history: validHistory });
    await chat.sendMessage({message: "hello"});
  } catch (e) {
    console.error("Test 3 error:", e);
  }
}
run();
