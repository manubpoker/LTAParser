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
  // Determine visual theme based on filters
  let visualTheme = 'professional tennis tournament';
  let colorScheme = 'green and white tennis court colors';

  if (filters.gender === 'Male') {
    visualTheme = 'men\'s tennis competition';
  } else if (filters.gender === 'Female') {
    visualTheme = 'women\'s tennis competition';
  }

  if (filters.ageGroup) {
    if (filters.ageGroup.includes('8U') || filters.ageGroup.includes('9U') || filters.ageGroup.includes('10U')) {
      visualTheme = 'junior children\'s tennis, fun and energetic';
      colorScheme = 'bright, playful colors with tennis elements';
    } else if (filters.ageGroup.includes('U')) {
      visualTheme = 'youth tennis competition';
    } else if (filters.ageGroup.includes('Open')) {
      visualTheme = 'adult tennis championship';
    }
  }

  // Build tournament list text
  const tournamentList = tournaments.slice(0, 12).map(t =>
    `- ${t.title} | ${t.date} | ${t.venue} | ${t.category}`
  ).join('\n');

  const prompt = `Create a professional tennis tournament flyer/infographic with the following specifications:

VISUAL STYLE:
- Theme: ${visualTheme}
- Color scheme: ${colorScheme}
- Include tennis imagery (rackets, balls, courts, players silhouettes)
- Modern, clean design suitable for a sports organization
- Sussex Tennis branding style

CONTENT TO DISPLAY:
Title: "Sussex Tennis Tournaments${filters.ageGroup ? ' - ' + filters.ageGroup : ''}${filters.gender && filters.gender !== 'Mixed' ? ' - ' + filters.gender : ''}"

Tournament List (display these events clearly):
${tournamentList}

LAYOUT:
- 4:3 aspect ratio (landscape)
- 2K resolution (2560x1920 pixels)
- Clear hierarchy with title at top
- Tournament details in organized grid or list
- Contact/registration info at bottom
- LTA (Lawn Tennis Association) Sussex branding

Make it look like an official tournament announcement that could be shared on social media or printed as a poster.`;

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
    model: 'gemini-2.0-flash-exp-image-generation',
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
