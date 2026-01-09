import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { Tournament } from './db.js';

const DATA_DIR = process.env.DATA_DIR || './data';
const IMAGES_DIR = path.join(DATA_DIR, 'infographics');

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

export interface InfographicMetadata {
  id: string;
  filename: string;
  prompt: string;
  filters: {
    month?: string;
    gender?: string;
    grade?: string;
    eventType?: string;
    ageGroup?: string;
  };
  tournamentCount: number;
  createdAt: string;
}

// Store metadata in a JSON file
const METADATA_FILE = path.join(DATA_DIR, 'infographics.json');

function loadMetadata(): InfographicMetadata[] {
  if (fs.existsSync(METADATA_FILE)) {
    const data = fs.readFileSync(METADATA_FILE, 'utf-8');
    return JSON.parse(data);
  }
  return [];
}

function saveMetadata(metadata: InfographicMetadata[]): void {
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

export function getAllInfographics(): InfographicMetadata[] {
  return loadMetadata().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getInfographicPath(filename: string): string | null {
  const filepath = path.join(IMAGES_DIR, filename);
  if (fs.existsSync(filepath)) {
    return filepath;
  }
  return null;
}

export function deleteInfographic(id: string): boolean {
  const metadata = loadMetadata();
  const index = metadata.findIndex(m => m.id === id);
  if (index === -1) return false;

  const item = metadata[index];
  const filepath = path.join(IMAGES_DIR, item.filename);

  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }

  metadata.splice(index, 1);
  saveMetadata(metadata);
  return true;
}

function buildPrompt(tournaments: Tournament[], filters: InfographicMetadata['filters']): string {
  // Build tournament list with required fields: date, venue, category, grade, gender, email
  const tournamentList = tournaments.slice(0, 12).map(t =>
    `- Date: ${t.date} | Venue: ${t.venue} | Category: ${t.category} | Grade: ${t.grade} | Gender: ${t.gender}${t.organiserEmail ? ` | Contact: ${t.organiserEmail}` : ''}`
  ).join('\n');

  // Collect unique organiser emails for the contact section
  const uniqueEmails = [...new Set(tournaments.map(t => t.organiserEmail).filter(Boolean))];
  const contactEmails = uniqueEmails.slice(0, 3).join(', ');

  const prompt = `Create a professional tennis tournament flyer/infographic with the following specifications:

VISUAL STYLE - OFFICIAL LTA BRANDING:
- Use official LTA (Lawn Tennis Association) color scheme:
  - Primary: LTA Purple (#5B2D8C)
  - Secondary: LTA Green (#00A651)
  - Accent: White (#FFFFFF)
  - Background: Light grey or white with purple/green accents
- Include official LTA logo styling (text "LTA" in purple)
- Modern, professional design matching LTA brand guidelines
- Tennis ball and racket imagery integrated tastefully

CONTENT TO DISPLAY:
Title: "Sussex LTA Tennis Tournaments${filters.ageGroup ? ' - ' + filters.ageGroup : ''}${filters.gender && filters.gender !== 'Mixed' ? ' - ' + filters.gender : ''}"

Tournament Details (display each event with these fields):
${tournamentList}

FOOTER SECTION (REQUIRED):
- Online Registration: https://www.lta.org.uk/
${contactEmails ? `- Organiser Contact: ${contactEmails}` : ''}
- "Lawn Tennis Association - Sussex County"

LAYOUT:
- 4:3 aspect ratio (landscape)
- 2K resolution (2560x1920 pixels)
- Clear hierarchy with LTA-styled title at top
- Tournament details in organized grid showing: Date, Venue, Category, Grade, Gender
- Registration URL and contact info prominently at bottom
- LTA Sussex branding throughout

Create an official-looking tournament announcement suitable for social media and print. Do NOT use placeholder text - all information provided above is real data.`;

  return prompt;
}

export async function generateInfographic(
  tournaments: Tournament[],
  filters: InfographicMetadata['filters']
): Promise<InfographicMetadata> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const genai = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt(tournaments, filters);

  console.log('Generating infographic with prompt:', prompt.substring(0, 200) + '...');

  const response = await genai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: prompt,
    config: {
      responseModalities: ['Text', 'Image'] as const,
    },
  });

  // Find the image part in the response
  let imageData: Buffer | null = null;

  if (response.candidates && response.candidates[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        imageData = Buffer.from(part.inlineData.data, 'base64');
        break;
      }
    }
  }

  if (!imageData) {
    throw new Error('No image generated in response');
  }

  // Generate unique filename
  const timestamp = Date.now();
  const id = `infographic_${timestamp}`;
  const filename = `${id}.png`;
  const filepath = path.join(IMAGES_DIR, filename);

  // Save image
  fs.writeFileSync(filepath, imageData);
  console.log(`Saved infographic to ${filepath}`);

  // Create metadata
  const metadata: InfographicMetadata = {
    id,
    filename,
    prompt,
    filters,
    tournamentCount: tournaments.length,
    createdAt: new Date().toISOString(),
  };

  // Save metadata
  const allMetadata = loadMetadata();
  allMetadata.push(metadata);
  saveMetadata(allMetadata);

  return metadata;
}
