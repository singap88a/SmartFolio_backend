import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import multer from 'multer';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

dotenv.config();

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Ensure the API key exists
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_KEY');

router.post('/generate-portfolio', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Text input is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'GEMINI_API_KEY is not configured in the server' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const getPrompt = (inputText) => `
You are an expert AI assistant that extracts portfolio data from unstructured text or CVs.
Extract the relevant information from the following text and return it as a JSON object that matches exactly this structure. 
Do not return any markdown formatting, ONLY return valid JSON. If some info is missing, leave it as an empty string or empty array.
IMPORTANT FOR ICONS: For "icon" fields in skills and services, guess an appropriate FontAwesome icon name in camelCase starting with 'fa' (e.g., faCode, faDatabase, faDesktop, faGlobe, faServer, faPalette, faMobile, faMicrochip, faCloud, faShieldHalved). Do NOT leave them empty.

{
  "name": "Full Name",
  "jobTitle": "Main job title or profession",
  "bio": "A professional summary or short biography.",
  "navbarLinks": [
    { "label": "Link Name", "url": "#link-url" }
  ],
  "skills": [
    { "name": "Skill 1", "icon": "faCode" },
    { "name": "Skill 2", "icon": "faDatabase" }
  ],
  "services": [
    { "title": "Service Name", "description": "Short description of the service", "icon": "faDesktop" }
  ],
  "projects": [
    { "title": "Project Name", "description": "Project description", "skills": ["Skill1", "Skill2"], "link": "https://..." }
  ],
  "socialLinks": {
    "facebook": "https://...",
    "twitter": "https://...",
    "instagram": "https://...",
    "linkedin": "https://...",
    "github": "https://..."
  },
  "contact": {
    "title": "Contact section title",
    "description": "Contact description",
    "email": "email@example.com",
    "phone": "+1234567890"
  }
}

Text to process:
"""
${inputText}
"""
    `;

    const prompt = getPrompt(text);

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    // Clean markdown if it exists
    if (responseText.startsWith('\`\`\`json')) {
      responseText = responseText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (responseText.startsWith('\`\`\`')) {
      responseText = responseText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    const parsedData = JSON.parse(responseText);

    res.status(200).json({ data: parsedData });
  } catch (error) {
    console.error('Error generating AI portfolio:', error);
    res.status(500).json({ message: 'Failed to generate data from text', error: error.message });
  }
});

router.post('/generate-portfolio-cv', upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CV file uploaded' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'GEMINI_API_KEY is not configured in the server' });
    }

    // Parse text from PDF buffer
    const pdfData = await pdfParse(req.file.buffer);
    const extractedText = pdfData.text;

    if (!extractedText.trim()) {
      return res.status(400).json({ message: 'Could not extract text from the provided PDF.' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const getPrompt = (inputText) => `
You are an expert AI assistant that extracts portfolio data from unstructured text or CVs.
Extract the relevant information from the following text and return it as a JSON object that matches exactly this structure. 
Do not return any markdown formatting, ONLY return valid JSON. If some info is missing, leave it as an empty string or empty array.
IMPORTANT FOR ICONS: For "icon" fields in skills and services, guess an appropriate FontAwesome icon name in camelCase starting with 'fa' (e.g., faCode, faDatabase, faDesktop, faGlobe, faServer, faPalette, faMobile, faMicrochip, faCloud, faShieldHalved). Do NOT leave them empty.

{
  "name": "Full Name",
  "jobTitle": "Main job title or profession",
  "bio": "A professional summary or short biography.",
  "navbarLinks": [
    { "label": "Link Name", "url": "#link-url" }
  ],
  "skills": [
    { "name": "Skill 1", "icon": "faCode" },
    { "name": "Skill 2", "icon": "faDatabase" }
  ],
  "services": [
    { "title": "Service Name", "description": "Short description of the service", "icon": "faDesktop" }
  ],
  "projects": [
    { "title": "Project Name", "description": "Project description", "skills": ["Skill1", "Skill2"], "link": "https://..." }
  ],
  "socialLinks": {
    "facebook": "https://...",
    "twitter": "https://...",
    "instagram": "https://...",
    "linkedin": "https://...",
    "github": "https://..."
  },
  "contact": {
    "title": "Contact section title",
    "description": "Contact description",
    "email": "email@example.com",
    "phone": "+1234567890"
  }
}

Text to process:
"""
${inputText}
"""
    `;

    const prompt = getPrompt(extractedText);
    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    if (responseText.startsWith('\`\`\`json')) {
      responseText = responseText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (responseText.startsWith('\`\`\`')) {
      responseText = responseText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    const parsedData = JSON.parse(responseText);

    res.status(200).json({ data: parsedData });
  } catch (error) {
    console.error('Error generating AI portfolio from CV:', error);
    res.status(500).json({ message: 'Failed to generate data from CV', error: error.message });
  }
});

router.post('/edit-portfolio', async (req, res) => {
  try {
    const { text, currentData } = req.body;

    if (!text || !currentData) {
      return res.status(400).json({ message: 'Text input and currentData are required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'GEMINI_API_KEY is not configured in the server' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Extract large base64 images to prevent prompt truncation and invalid JSON
    const dataToSend = { ...currentData };
    const savedHeroImage = dataToSend.heroImage;
    const savedLogo = dataToSend.logo;
    
    // We remove them or replace with placeholders
    if (dataToSend.heroImage && dataToSend.heroImage.length > 1000) {
      dataToSend.heroImage = "[BASE64_IMAGE_OMITTED]";
    }
    if (dataToSend.logo && dataToSend.logo.length > 1000) {
      dataToSend.logo = "[BASE64_IMAGE_OMITTED]";
    }

    const getPrompt = (userPrompt, portfolioData) => `
You are an expert AI assistant tasked with modifying a user's portfolio JSON data based on their specific request.

CURRENT JSON PORTFOLIO DATA:
\`\`\`json
${JSON.stringify(portfolioData, null, 2)}
\`\`\`

USER REQUEST: "${userPrompt}"

INSTRUCTIONS:
1. Apply the user's requested changes to the CURRENT JSON PORTFOLIO DATA.
2. DO NOT delete, empty, or overwrite unrelated fields. If they don't explicitly ask to remove something, keep it exactly as it is in the CURRENT JSON.
3. If they ask to add a skill, append it to the skills array.
4. If they ask to change the title, only change the jobTitle.
5. Return ONLY the modified JSON object. No markdown, no explanations. It must exactly match the existing schema structure.
    `;

    const prompt = getPrompt(text, dataToSend);
    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    if (responseText.startsWith('\`\`\`json')) {
      responseText = responseText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (responseText.startsWith('\`\`\`')) {
      responseText = responseText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    const parsedData = JSON.parse(responseText);

    // Restore the large base64 images if they were omitted
    if (parsedData.heroImage === "[BASE64_IMAGE_OMITTED]") {
      parsedData.heroImage = savedHeroImage;
    }
    if (parsedData.logo === "[BASE64_IMAGE_OMITTED]") {
      parsedData.logo = savedLogo;
    }

    res.status(200).json({ data: parsedData });
  } catch (error) {
    console.error('Error editing AI portfolio:', error);
    res.status(500).json({ message: 'Failed to edit portfolio data', error: error.message });
  }
});

export default router;
