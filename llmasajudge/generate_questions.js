const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
require('dotenv').config({ path: path.join(__dirname, '../apps/backend/.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
  try {
    console.log("Loading PDFs...");
    const pdfPath1 = path.join(__dirname, 'subhisample.pdf');
    const pdfPath2 = path.join(__dirname, 'subhisamplecv (1).pdf');

    const pdfBuffer1 = fs.readFileSync(pdfPath1);
    const pdfBuffer2 = fs.readFileSync(pdfPath2);

    const pdfData1 = await pdfParse(pdfBuffer1);
    const pdfData2 = await pdfParse(pdfBuffer2);

    const text1 = pdfData1.text;
    const text2 = pdfData2.text;

    console.log("PDFs loaded successfully. Initializing Gemini API...");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in backend .env");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });

    const prompt = `You are an expert HR interviewer. 
I have extracted text from two candidate documents:

Document 1:
${text1}

Document 2:
${text2}

Based on the information in these documents, generate exactly 10 professional, specific, and probing interview questions for this candidate. 
Return ONLY a plain text list of the 10 questions, one per line. Do not include introductory text, numbers, markdown, or any explanations.`;

    console.log("Generating questions using Gemini...");
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log("Questions generated. Saving to questions.txt...");
    const outputPath = path.join(__dirname, 'questions.txt');
    fs.writeFileSync(outputPath, responseText, 'utf-8');

    console.log("Process complete! Questions saved to " + outputPath);

  } catch (error) {
    console.error("Error occurred:", error);
  }
}

main();
