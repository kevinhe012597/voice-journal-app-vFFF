// Text processing pipeline for converting speech to formatted bullet journal entries

export interface ProcessedText {
  bullets: string[];
  dateHeader: string;
  synthesized?: boolean;
  originalLength?: number;
  summarizedLength?: number;
}

export interface SynthesisResult {
  events: string[];
  originalLength: number;
  summarizedLength: number;
  fallback?: boolean;
  error?: string;
}

export interface DateSection {
  date: string;
  events: string[];
}

export interface MultiDateSynthesisResult {
  dateSections: DateSection[];
  originalLength: number;
  summarizedLength: number;
  fallback?: boolean;
  error?: string;
}

export class TextProcessor {
  // Splitter regex for breaking speech into bullet points
  private static SPLITTER_REGEX = /\.(?:\s|$)|;|(?:,?\s*(?:and then|then)\s+)/i;

  // Prefixes to remove from bullets
  private static PREFIXES_TO_REMOVE = [
    /^I\s+/i,
    /^I'm\s+/i, 
    /^I\s+went\s+and\s+/i,
    /^I\s+had\s+/i,
    /^I\s+was\s+/i,
    /^I\s+did\s+/i,
    /^then\s+I\s+/i,
    /^and\s+I\s+/i,
    /^so\s+I\s+/i,
    /^after\s+that\s+I\s+/i
  ];

  /**
   * Formats current date as M.D.YYYY (no leading zeros)
   */
  static formatDateHeader(): string {
    const today = new Date();
    return `${today.getMonth() + 1}.${today.getDate()}.${today.getFullYear()}`;
  }

  /**
   * Splits speech text into individual bullet points
   */
  static splitIntoBullets(text: string): string[] {
    return text
      .split(this.SPLITTER_REGEX)
      .map(bullet => bullet.trim())
      .filter(bullet => bullet.length > 0);
  }

  /**
   * Cleans a single bullet point
   */
  static cleanBullet(bullet: string): string {
    let cleaned = bullet.trim();
    
    // Remove prefixes
    for (const prefix of this.PREFIXES_TO_REMOVE) {
      cleaned = cleaned.replace(prefix, '');
    }
    
    // Capitalize first letter
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    
    // Remove trailing punctuation
    cleaned = cleaned.replace(/[.!?]+$/, '');
    
    return cleaned.trim();
  }

  /**
   * Processes speech text into formatted bullets (legacy method for basic processing)
   */
  static processText(speechText: string): ProcessedText {
    const dateHeader = this.formatDateHeader();
    const rawBullets = this.splitIntoBullets(speechText);
    const bullets = rawBullets
      .map(bullet => this.cleanBullet(bullet))
      .filter(bullet => bullet.length > 0)
      .map(bullet => `- ${bullet}`);

    return {
      bullets,
      dateHeader,
      synthesized: false
    };
  }

  /**
   * Synthesizes speech text using OpenAI to extract key events organized by dates
   */
  static async synthesizeText(speechText: string): Promise<ProcessedText> {
    try {
      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: speechText }),
      });

      if (!response.ok) {
        throw new Error(`Synthesis failed: ${response.statusText}`);
      }

      const result: MultiDateSynthesisResult = await response.json();
      
      // Convert multi-date result to organized bullet format
      const allBullets: string[] = [];
      
      for (const section of result.dateSections) {
        if (section.events.length > 0) {
          allBullets.push(''); // Add spacing between dates
          allBullets.push(section.date);
          allBullets.push(...section.events.map(event => `- ${event.trim()}`));
        }
      }

      // Remove leading empty line if present
      if (allBullets[0] === '') {
        allBullets.shift();
      }

      return {
        bullets: allBullets,
        dateHeader: '', // Not used for multi-date format
        synthesized: !result.fallback,
        originalLength: result.originalLength,
        summarizedLength: result.summarizedLength
      };
    } catch (error) {
      console.error('Multi-date synthesis failed, falling back to basic processing:', error);
      
      // Fallback to single-date processing
      return this.synthesizeTextSingleDate(speechText);
    }
  }

  /**
   * Synthesizes speech text using basic processing (fallback when multi-date fails)
   */
  static async synthesizeTextSingleDate(speechText: string): Promise<ProcessedText> {
    // Use basic text processing directly instead of calling API again
    // since /api/synthesize now returns MultiDateSynthesisResult format
    return this.processText(speechText);
  }

  /**
   * Checks if date header already exists in journal content
   */
  static hasDateHeader(journalContent: string, dateHeader: string): boolean {
    const lines = journalContent.split('\n');
    return lines.some(line => line.trim() === dateHeader);
  }

  /**
   * Extracts all dates that would be affected by new bullets
   */
  static getAffectedDates(newBullets: string[]): string[] {
    const affectedDatesSet = new Set<string>();
    
    // Check if newBullets contains multiple date sections (multi-date format)
    const hasMultipleDates = newBullets.some(bullet => 
      /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(bullet.trim())
    );

    if (hasMultipleDates) {
      // Extract all date headers from newBullets (deduplicated)
      for (const bullet of newBullets) {
        const trimmed = bullet.trim();
        if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(trimmed)) {
          affectedDatesSet.add(trimmed);
        }
      }
    } else {
      // Single date format - use today's date
      affectedDatesSet.add(this.formatDateHeader());
    }

    return Array.from(affectedDatesSet);
  }

  /**
   * Checks which of the affected dates already have content in the journal
   */
  static getExistingDates(journalContent: string, affectedDates: string[]): string[] {
    return affectedDates.filter(date => this.hasDateHeader(journalContent, date));
  }

  /**
   * Gets a preview of content that would be lost if overwriting for specific dates
   */
  static getContentToBeOverwritten(journalContent: string, datesToOverwrite: string[]): { [date: string]: string[] } {
    const result: { [date: string]: string[] } = {};
    const lines = journalContent.split('\n');
    
    for (const date of datesToOverwrite) {
      const dateIndex = lines.findIndex(line => line.trim() === date);
      if (dateIndex === -1) continue;
      
      const contentLines: string[] = [];
      let i = dateIndex + 1;
      
      // Collect all bullet points under this date until we hit another date or end
      while (i < lines.length) {
        const line = lines[i].trim();
        
        // Stop if we hit another date header
        if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(line)) {
          break;
        }
        
        // Add bullet points and non-empty lines
        if (line.startsWith('- ') || (line !== '' && !line.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/))) {
          contentLines.push(line);
        }
        
        i++;
      }
      
      result[date] = contentLines;
    }
    
    return result;
  }

  /**
   * Appends new bullets to journal content, handling date headers properly
   */
  static appendToJournal(currentContent: string, newBullets: string[]): string {
    if (newBullets.length === 0) return currentContent;

    // Check if newBullets contains multiple date sections (multi-date format)
    const hasMultipleDates = newBullets.some(bullet => 
      /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(bullet.trim())
    );

    if (hasMultipleDates) {
      // Multi-date format - merge intelligently
      return this.mergeMultiDateContent(currentContent, newBullets);
    } else {
      // Single date format - use original logic
      const dateHeader = this.formatDateHeader();
      const hasDate = this.hasDateHeader(currentContent, dateHeader);
      
      let result = currentContent.trim();
      
      if (!hasDate) {
        // Add date header if it doesn't exist
        if (result.length > 0) {
          result += '\n\n';
        }
        result += dateHeader + '\n';
      } else if (result.length > 0 && !result.endsWith('\n')) {
        // Ensure we have a newline before adding bullets
        result += '\n';
      }
      
      // Add the new bullets
      result += newBullets.join('\n');
      
      return result;
    }
  }

  /**
   * Merges multi-date content intelligently
   */
  static mergeMultiDateContent(currentContent: string, newBullets: string[]): string {
    let result = currentContent.trim();
    
    let currentDate = '';
    const dateEvents: { [date: string]: string[] } = {};
    
    // Parse new bullets into date sections
    for (const bullet of newBullets) {
      const trimmed = bullet.trim();
      if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(trimmed)) {
        // This is a date header
        currentDate = trimmed;
        if (!dateEvents[currentDate]) {
          dateEvents[currentDate] = [];
        }
      } else if (trimmed.startsWith('- ') && currentDate) {
        // This is an event under the current date
        dateEvents[currentDate].push(trimmed);
      }
    }

    // Merge each date section
    for (const [date, events] of Object.entries(dateEvents)) {
      if (events.length === 0) continue;
      
      const hasDate = this.hasDateHeader(result, date);
      
      if (!hasDate) {
        // Add new date section
        if (result.length > 0) {
          result += '\n\n';
        }
        result += date + '\n' + events.join('\n');
      } else {
        // Append to existing date section
        // Find the date and append after its last bullet
        const lines = result.split('\n');
        let dateIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim() === date) {
            dateIndex = i;
            break;
          }
        }
        
        if (dateIndex !== -1) {
          // Find the end of this date section
          let insertIndex = dateIndex + 1;
          while (insertIndex < lines.length && 
                 (lines[insertIndex].startsWith('- ') || lines[insertIndex].trim() === '')) {
            insertIndex++;
          }
          
          // Insert new events
          lines.splice(insertIndex, 0, ...events);
          result = lines.join('\n');
        }
      }
    }
    
    return result;
  }

  /**
   * Overwrites journal content for specific dates instead of appending
   */
  static overwriteJournal(currentContent: string, newBullets: string[], datesToOverwrite: string[]): string {
    if (newBullets.length === 0) return currentContent;

    // Check if newBullets contains multiple date sections (multi-date format)
    const hasMultipleDates = newBullets.some(bullet => 
      /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(bullet.trim())
    );

    if (hasMultipleDates) {
      // Multi-date format - overwrite specific dates
      return this.overwriteMultiDateContent(currentContent, newBullets, datesToOverwrite);
    } else {
      // Single date format - overwrite today's content only if selected
      const dateHeader = this.formatDateHeader();
      if (datesToOverwrite.includes(dateHeader)) {
        return this.overwriteSingleDate(currentContent, newBullets, dateHeader);
      } else {
        // User chose not to overwrite today - append normally
        return this.appendToJournal(currentContent, newBullets);
      }
    }
  }

  /**
   * Overwrites content for a single date
   */
  static overwriteSingleDate(currentContent: string, newBullets: string[], dateToOverwrite: string): string {
    const lines = currentContent.split('\n');
    const dateIndex = lines.findIndex(line => line.trim() === dateToOverwrite);
    
    if (dateIndex === -1) {
      // Date doesn't exist, just append normally
      return this.appendToJournal(currentContent, [dateToOverwrite, ...newBullets]);
    }
    
    // Find the end of this date section
    let endIndex = dateIndex + 1;
    while (endIndex < lines.length) {
      const line = lines[endIndex].trim();
      // Stop if we hit another date header or non-bullet content
      if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(line)) {
        break;
      }
      endIndex++;
    }
    
    // Replace the content between dateIndex and endIndex
    const before = lines.slice(0, dateIndex + 1);
    const after = lines.slice(endIndex);
    
    return [...before, ...newBullets, ...after].join('\n');
  }

  /**
   * Overwrites multi-date content for specific dates only
   */
  static overwriteMultiDateContent(currentContent: string, newBullets: string[], datesToOverwrite: string[]): string {
    let result = currentContent;
    
    // Parse new bullets into date sections
    let currentDate = '';
    const dateEvents: { [date: string]: string[] } = {};
    
    for (const bullet of newBullets) {
      const trimmed = bullet.trim();
      if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(trimmed)) {
        currentDate = trimmed;
        if (!dateEvents[currentDate]) {
          dateEvents[currentDate] = [];
        }
      } else if (trimmed.startsWith('- ') && currentDate) {
        dateEvents[currentDate].push(trimmed);
      }
    }

    // For each date section, decide whether to overwrite or append
    for (const [date, events] of Object.entries(dateEvents)) {
      if (events.length === 0) continue;
      
      if (datesToOverwrite.includes(date)) {
        // Overwrite this date's content
        result = this.overwriteSingleDate(result, events, date);
      } else {
        // Append to this date (existing logic)
        const dateHasBullets = [date, ...events];
        result = this.appendToJournal(result, dateHasBullets);
      }
    }
    
    return result;
  }
}

// LocalStorage persistence
export class JournalStorage {
  private static STORAGE_KEY = 'stt_journal_v1';

  static save(content: string): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, content);
    } catch (error) {
      console.error('Failed to save journal to localStorage:', error);
    }
  }

  static load(): string {
    try {
      return localStorage.getItem(this.STORAGE_KEY) || '';
    } catch (error) {
      console.error('Failed to load journal from localStorage:', error);
      return '';
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear journal from localStorage:', error);
    }
  }
}