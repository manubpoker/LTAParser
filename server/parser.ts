import { Tournament } from './db.js';

/**
 * Resilient parser for LTA Tournament Calendars.
 * Specifically handles the multi-column layout by looking for keywords
 * and boundaries like "CD:", "WD:", and "Mixed/Male/Female".
 */
export function parseTournamentsProgrammatically(text: string): Tournament[] {
  const tournaments: Tournament[] = [];

  // Normalize spacing and dashes
  const normalizedText = text.replace(/[–—]/g, '-');

  // Permissive Regex for LTA Code
  const entryStartRegex = /([A-Z]\s*[A-Z]\s*[A-Z]\s*[-]\s*\d\s*\d\s*[-]\s*\d\s*\d\s*\d\s*\d)/g;

  // Order matters - more specific patterns first (with gender suffixes)
  const categoryPatterns = [
    // 8U-10U are mixed gender (no Boys/Girls suffix)
    { label: "8U", regex: /8\s*&\s*U\s*EVENTS/i },
    { label: "9U", regex: /9\s*&\s*U\s*EVENTS/i },
    { label: "10U", regex: /10\s*&\s*U\s*EVENTS/i },
    // 11U-18U have Boys/Girls suffixes - check gender-specific patterns first
    { label: "11U Boys", regex: /11\s*&\s*U\s*EVENTS?\s*[-–—]\s*BOYS/i },
    { label: "11U Girls", regex: /11\s*&\s*U\s*EVENTS?\s*[-–—]\s*GIRLS/i },
    { label: "12U Boys", regex: /12\s*&\s*U\s*EVENTS?\s*[-–—]\s*BOYS/i },
    { label: "12U Girls", regex: /12\s*&\s*U\s*EVENTS?\s*[-–—]\s*GIRLS/i },
    { label: "14U Boys", regex: /14\s*&\s*U\s*EVENTS?\s*[-–—]\s*BOYS/i },
    { label: "14U Girls", regex: /14\s*&\s*U\s*EVENTS?\s*[-–—]\s*GIRLS/i },
    { label: "16U Boys", regex: /16\s*&\s*U\s*EVENTS?\s*[-–—]\s*BOYS/i },
    { label: "16U Girls", regex: /16\s*&\s*U\s*EVENTS?\s*[-–—]\s*GIRLS/i },
    { label: "18U Boys", regex: /18\s*&\s*U\s*EVENTS?\s*[-–—]\s*BOYS/i },
    { label: "18U Girls", regex: /18\s*&\s*U\s*EVENTS?\s*[-–—]\s*GIRLS/i },
    // Open events with gender
    { label: "Open Men", regex: /OPEN\s*EVENTS?\s*[-–—]\s*MEN/i },
    { label: "Open Women", regex: /OPEN\s*EVENTS?\s*[-–—]\s*WOMEN/i },
  ];

  const codeMatches = Array.from(normalizedText.matchAll(entryStartRegex));
  let currentCategory = "Junior";

  for (let i = 0; i < codeMatches.length; i++) {
    const match = codeMatches[i];
    const rawCode = match[0];
    const normalizedCode = rawCode.replace(/\s+/g, '');
    const startIndex = match.index || 0;
    const nextMatch = codeMatches[i + 1];
    const endIndex = nextMatch ? nextMatch.index : normalizedText.length;
    const chunk = normalizedText.substring(startIndex, endIndex);

    // Filter for Sussex
    if (!normalizedCode.toUpperCase().startsWith("SUS-")) continue;

    // Track Category Header
    const textBefore = normalizedText.substring(Math.max(0, startIndex - 1000), startIndex);
    for (const cat of categoryPatterns) {
      if (cat.regex.test(textBefore)) {
        currentCategory = cat.label;
      }
    }

    // --- Targeted Extraction ---

    // 1. Gender & Event Type
    const genderMatch = chunk.match(/\b(Mixed|Male|Female)\b/i);
    const typeMatch = chunk.match(/\b(Singles|Doubles)\b/i);
    const gender = genderMatch ? genderMatch[0] : "Mixed";
    const eventType = typeMatch ? typeMatch[0] : "Singles";

    // 2. Grade (digit near "Singles/Doubles")
    const gradeMatch = chunk.match(/(?:Singles|Doubles|Grade)\s*(\d)/i);
    const grade = gradeMatch ? gradeMatch[1] : "4";

    // 3. Date (Sat 06 Sep)
    const dateMatch = chunk.match(/(?:Sat|Sun|Mon|Tue|Wed|Thu|Fri)\s*\d{1,2}\s*\w{3}/i);
    const dateStr = dateMatch ? dateMatch[0].replace(/\s+/g, ' ') : "TBD";

    // 4. Deadlines (CD: 01/09/2025 10:00)
    const cdMatch = chunk.match(/CD:\s*(\d{2}\/\d{2}\/\d{4}\s*\d{2}:\d{2})/i);
    const wdMatch = chunk.match(/WD:\s*(\d{2}\/\d{2}\/\d{4}\s*\d{2}:\d{2})/i);
    const cd = cdMatch ? cdMatch[1] : "N/A";
    const wd = wdMatch ? wdMatch[1] : "N/A";

    // 5. Email
    const emailMatch = chunk.match(/([a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,})/);
    const email = emailMatch ? emailMatch[0].replace(/\s+/g, '') : "";

    // 6. Title (Text between Code and first Gender/Type/Date marker)
    // Keep full title but remove trailing date patterns like "- 1-11-2025" or "- 01/11/2025"
    const titleStopIndex = Math.min(
      chunk.indexOf(gender) > -1 ? chunk.indexOf(gender) : chunk.length,
      chunk.indexOf(eventType) > -1 ? chunk.indexOf(eventType) : chunk.length
    );
    let title = chunk.substring(rawCode.length, titleStopIndex).trim();
    title = title.replace(/^[-–—\s]+/, '').replace(/[-–—\s]+$/, '');
    // Remove trailing date patterns like "- 1-11-2025", "- 01/11/2025", "- 1/11/25", "- 2 - 1 - 2026"
    title = title.replace(/\s*[-–—]\s*\d{1,2}\s*[-\/–—]\s*\d{1,2}\s*[-\/–—]\s*\d{2,4}\s*$/gi, '');
    // Clean up any trailing dashes/spaces
    title = title.replace(/[-–—\s]+$/, '').trim();

    // 7. Venue (Text between Date and "CD:")
    let venue = "Sussex Club";
    if (dateMatch) {
      const dateEndIndex = chunk.indexOf(dateMatch[0]) + dateMatch[0].length;
      const cdStartIndex = chunk.indexOf("CD:");
      if (cdStartIndex > dateEndIndex) {
        venue = chunk.substring(dateEndIndex, cdStartIndex).trim();
      }
    }
    venue = venue.replace(/\s+/g, ' ').substring(0, 80);

    // Month Label
    const monthMap: Record<string, string> = {
      'JAN': 'January', 'FEB': 'February', 'MAR': 'March', 'APR': 'April',
      'MAY': 'May', 'JUN': 'June', 'JUL': 'July', 'AUG': 'August',
      'SEP': 'September', 'OCT': 'October', 'NOV': 'November', 'DEC': 'December'
    };
    const dateParts = dateStr.toUpperCase().split(' ');
    const monthAbbr = dateParts[dateParts.length - 1];
    const fullMonth = monthMap[monthAbbr] || 'Upcoming';
    const year = normalizedCode.includes('-25-') ? '2025' : '2026';

    // Create unique ID combining code, gender, event type, and category
    const uniqueId = `${normalizedCode}-${gender}-${eventType}-${currentCategory}`.replace(/\s+/g, '_');

    tournaments.push({
      id: uniqueId,
      title: title || `${currentCategory} Event`,
      gender: gender,
      eventType: eventType,
      grade: `Grade ${grade}`,
      venue: venue,
      postcode: extractPostcode(venue) || "BN1",
      ltaCode: normalizedCode,
      date: dateStr,
      month: `${fullMonth} ${year}`,
      category: currentCategory,
      organiserEmail: email,
      deadlineCD: cd,
      deadlineWD: wd
    });
  }

  return tournaments;
}

function extractPostcode(text: string): string | null {
  const postcodeRegex = /[A-Z]{1,2}\s*[0-9]\s*[A-Z0-9]?\s*[0-9]\s*[A-Z]\s*[A-Z]/i;
  const match = text.match(postcodeRegex);
  return match ? match[0].replace(/\s+/g, ' ').toUpperCase() : null;
}
