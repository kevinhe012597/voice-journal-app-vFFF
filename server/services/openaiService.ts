import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configure model with environment variable fallback
const MODEL = process.env.OPENAI_MODEL || "gpt-5";

export interface SummarizedEvent {
  events: string[];
  originalLength: number;
  summarizedLength: number;
}

export interface DateSection {
  date: string; // M.D.YYYY format
  events: string[];
}

export interface MultiDateSummary {
  dateSections: DateSection[];
  originalLength: number;
  summarizedLength: number;
}

export class OpenAIService {
  /**
   * Synthesizes spoken content into concise bullet points organized by dates
   */
  static async synthesizeKeyEventsWithDates(spokenText: string): Promise<MultiDateSummary> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const currentYear = new Date().getFullYear();
      const prompt = `You are an expert at synthesizing spoken journal entries into concise, actionable bullet points organized by date.

Take the following spoken text and extract key events, activities, and important moments. Organize them by date if dates are mentioned, or use today's date if no specific dates are mentioned.

Guidelines for event processing:
- Focus on concrete actions, events, and outcomes
- Remove filler words, "um"s, repetitions, and conversational padding
- Combine related activities into single bullet points when appropriate
- Use active voice and clear, journal-style language
- Each bullet should be 3-15 words maximum
- Return 1-5 bullet points per date depending on content richness

Guidelines for date processing:
- Look for date mentions like "9/21", "September 21", "yesterday", "last Friday", "on Monday", etc.
- Convert all dates to M.D.YYYY format (no leading zeros: 9.21.${currentYear})
- If no date is mentioned, use today's date
- If "yesterday" is mentioned, calculate the previous day
- For day names like "Monday", estimate based on context or use current week
- Group events under their respective dates
- Maintain chronological order when possible

Spoken text: "${spokenText}"

Respond with JSON in this exact format:
{
  "dateSections": [
    {
      "date": "9.21.${currentYear}",
      "events": ["event 1", "event 2"]
    },
    {
      "date": "9.20.${currentYear}",
      "events": ["event 3", "event 4"]
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: MODEL, // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{"dateSections": []}');
      
      // Defensive parsing - ensure dateSections is an array and normalize dates
      const dateSections = Array.isArray(result.dateSections) 
        ? result.dateSections.map((section: any) => {
            const normalizedDate = this.normalizeDateFormat(section.date);
            return {
              date: normalizedDate || this.formatDateHeader(), // Only default if normalization completely fails
              events: Array.isArray(section.events) 
                ? section.events.filter((event: any) => typeof event === 'string' && event.trim().length > 0)
                : []
            };
          }).filter(section => section.events.length > 0) // Remove empty sections
        : [{ date: this.formatDateHeader(), events: [] }];

      // Deduplicate and merge sections with identical dates
      const sectionMap = new Map<string, string[]>();
      dateSections.forEach(section => {
        if (!sectionMap.has(section.date)) {
          sectionMap.set(section.date, []);
        }
        sectionMap.get(section.date)!.push(...section.events);
      });

      const deduplicatedSections: DateSection[] = Array.from(sectionMap.entries())
        .map(([date, events]) => ({ date, events }))
        .sort((a, b) => {
          const dateA = new Date(a.date.replace(/\./g, '/'));
          const dateB = new Date(b.date.replace(/\./g, '/'));
          return dateB.getTime() - dateA.getTime();
        });

      const totalEvents = dateSections.reduce((total, section) => total + section.events.length, 0);

      return {
        dateSections: deduplicatedSections,
        originalLength: spokenText.length,
        summarizedLength: deduplicatedSections.reduce((total, section) => total + section.events.join(' ').length, 0)
      };
    } catch (error) {
      console.error('OpenAI multi-date synthesis error:', error);
      throw new Error('Failed to synthesize key events with dates: ' + (error as Error).message);
    }
  }

  /**
   * Synthesizes spoken content into concise bullet points of key events (single date)
   */
  static async synthesizeKeyEvents(spokenText: string): Promise<SummarizedEvent> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const prompt = `You are an expert at synthesizing spoken journal entries into concise, actionable bullet points. 

Take the following spoken text and extract the key events, activities, and important moments. Convert them into short, clear bullet points that capture the essence of what happened, not just verbatim what was said.

Guidelines:
- Focus on concrete actions, events, and outcomes
- Remove filler words, "um"s, repetitions, and conversational padding
- Combine related activities into single bullet points when appropriate
- Use active voice and clear, journal-style language
- Each bullet should be 3-15 words maximum
- Return 1-5 bullet points depending on content richness
- Maintain chronological order when possible

Spoken text: "${spokenText}"

Respond with JSON in this exact format:
{
  "events": ["bullet point 1", "bullet point 2", "bullet point 3"]
}`;

      const response = await openai.chat.completions.create({
        model: MODEL, // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{"events": []}');
      
      // Defensive parsing - ensure events is an array of strings
      const events = Array.isArray(result.events) 
        ? result.events.filter((event: any) => typeof event === 'string' && event.trim().length > 0)
        : [];
      
      return {
        events,
        originalLength: spokenText.length,
        summarizedLength: events.join(' ').length
      };
    } catch (error) {
      console.error('OpenAI synthesis error:', error);
      throw new Error('Failed to synthesize key events: ' + (error as Error).message);
    }
  }

  /**
   * Formats current date as M.D.YYYY (no leading zeros)
   */
  static formatDateHeader(): string {
    const today = new Date();
    return `${today.getMonth() + 1}.${today.getDate()}.${today.getFullYear()}`;
  }

  /**
   * Normalizes various date formats to M.D.YYYY
   */
  static normalizeDateFormat(dateStr: string): string | null {
    if (!dateStr || typeof dateStr !== 'string') return null;

    const currentYear = new Date().getFullYear();
    const today = new Date();
    
    // Already in correct format M.D.YYYY
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateStr)) {
      return dateStr;
    }

    // Handle M/D/YYYY or M-D-YYYY
    const fullDateMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (fullDateMatch) {
      return `${parseInt(fullDateMatch[1])}.${parseInt(fullDateMatch[2])}.${fullDateMatch[3]}`;
    }

    // Handle M/D or M-D (missing year - use current year)
    const shortDateMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
    if (shortDateMatch) {
      return `${parseInt(shortDateMatch[1])}.${parseInt(shortDateMatch[2])}.${currentYear}`;
    }

    // Handle relative dates
    if (dateStr.toLowerCase().includes('today')) {
      return this.formatDateHeader();
    }
    
    if (dateStr.toLowerCase().includes('yesterday')) {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return `${yesterday.getMonth() + 1}.${yesterday.getDate()}.${yesterday.getFullYear()}`;
    }

    // Handle day names (last Monday, yesterday, etc.)
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayMatch = dateStr.toLowerCase().match(/(?:last\s+)?(\w+day)/);
    if (dayMatch) {
      const dayIndex = dayNames.findIndex(day => day.startsWith(dayMatch[1].toLowerCase()));
      if (dayIndex !== -1) {
        const targetDate = new Date(today);
        const currentDay = today.getDay();
        let daysBack = currentDay - dayIndex;
        if (daysBack <= 0) daysBack += 7; // Go to previous week
        if (dateStr.toLowerCase().includes('last')) daysBack += 7;
        targetDate.setDate(today.getDate() - daysBack);
        return `${targetDate.getMonth() + 1}.${targetDate.getDate()}.${targetDate.getFullYear()}`;
      }
    }

    // Handle month names with optional ordinal suffixes and year
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                       'july', 'august', 'september', 'october', 'november', 'december'];
    
    // Pattern: "September 19th 2025" or "September 19" or "Sep 19th"
    const monthMatch = dateStr.toLowerCase().match(/(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?/);
    if (monthMatch) {
      const monthIndex = monthNames.findIndex(month => month.startsWith(monthMatch[1].toLowerCase()));
      if (monthIndex !== -1) {
        const day = parseInt(monthMatch[2]);
        const year = monthMatch[3] ? parseInt(monthMatch[3]) : currentYear;
        return `${monthIndex + 1}.${day}.${year}`;
      }
    }

    // If all parsing attempts fail, return null (don't default to today)
    console.warn(`Could not parse date format: ${dateStr}`);
    return null;
  }

  /**
   * Alternative method for when OpenAI is not available - basic multi-date processing
   */
  static fallbackMultiDateSynthesis(spokenText: string): MultiDateSummary {
    // Comprehensive date detection for fallback that matches all formats normalizeDateFormat can handle
    const datePattern = /\b(?:(?:\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{4})?)|(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t)?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)|(?:(?:last\s+)?(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day)|(?:yesterday|today))\b/gi;
    const dateMatches = spokenText.match(datePattern) || [];
    
    if (dateMatches.length === 0) {
      // No dates detected, treat as single date
      const fallback = this.fallbackSynthesis(spokenText);
      return {
        dateSections: [{
          date: this.formatDateHeader(),
          events: fallback.events
        }],
        originalLength: fallback.originalLength,
        summarizedLength: fallback.summarizedLength
      };
    }

    // Basic multi-date processing - split by detected dates
    const sections: DateSection[] = [];
    let remainingText = spokenText;
    
    for (const dateMatch of dateMatches) {
      const parts = remainingText.split(new RegExp(dateMatch, 'i'), 2);
      if (parts.length > 1) {
        const textForDate = parts[1].split(/\b(\d{1,2}[\/\-]\d{1,2}|\w+\s+\d{1,2}|yesterday|today)\b/i)[0];
        const processed = this.fallbackSynthesis(textForDate);
        
        // Use robust date normalization for fallback too
        const normalizedDate = this.normalizeDateFormat(dateMatch) || this.formatDateHeader();
        
        sections.push({
          date: normalizedDate,
          events: processed.events
        });
        
        remainingText = parts[1];
      }
    }

    // Sort fallback sections by date (newest first) and deduplicate by date
    const sectionMap = new Map<string, string[]>();
    sections.forEach(section => {
      if (!sectionMap.has(section.date)) {
        sectionMap.set(section.date, []);
      }
      sectionMap.get(section.date)!.push(...section.events);
    });

    const sortedSections: DateSection[] = Array.from(sectionMap.entries())
      .map(([date, events]) => ({ date, events }))
      .sort((a, b) => {
        const dateA = new Date(a.date.replace(/\./g, '/'));
        const dateB = new Date(b.date.replace(/\./g, '/'));
        return dateB.getTime() - dateA.getTime();
      });

    return {
      dateSections: sortedSections.length > 0 ? sortedSections : [{
        date: this.formatDateHeader(),
        events: this.fallbackSynthesis(spokenText).events
      }],
      originalLength: spokenText.length,
      summarizedLength: sortedSections.reduce((total, section) => total + section.events.join(' ').length, 0)
    };
  }

  /**
   * Alternative method for when OpenAI is not available - basic text cleaning (single date)
   */
  static fallbackSynthesis(spokenText: string): SummarizedEvent {
    // Basic text processing as fallback
    const cleaned = spokenText
      .replace(/\b(um|uh|like|you know|so|and then)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const events = cleaned.split(/[.!?]+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 5)
      .map(sentence => {
        // Remove "I" prefixes and clean up
        const withoutPrefix = sentence.replace(/^(I|I'm|I was|I went|I did)\s+/i, '');
        const capitalized = withoutPrefix.charAt(0).toUpperCase() + withoutPrefix.slice(1);
        
        // Trim to 3-15 words to match OpenAI behavior
        const words = capitalized.split(' ');
        if (words.length > 15) {
          return words.slice(0, 15).join(' ');
        }
        return capitalized;
      })
      .filter(event => event.split(' ').length >= 3) // Ensure at least 3 words
      .slice(0, 5); // Limit to 5 events max

    return {
      events,
      originalLength: spokenText.length,
      summarizedLength: events.join(' ').length
    };
  }
}