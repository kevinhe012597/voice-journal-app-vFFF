// AssemblyAI integration service
// TODO: Implement AssemblyAI integration for enhanced speech recognition

export interface AssemblyAIConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface TranscriptionResult {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  confidence?: number;
  error?: string;
}

export class AssemblyAIService {
  private config: AssemblyAIConfig;
  private baseUrl: string;

  constructor(config: AssemblyAIConfig = {}) {
    this.config = config;
    this.baseUrl = config.baseUrl || '/api/assemblyai';
  }

  /**
   * Check if AssemblyAI API key is configured
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/token`);
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.hasApiKey === true;
    } catch (error) {
      console.error('AssemblyAI connection check failed:', error);
      return false;
    }
  }

  /**
   * Upload audio blob and start transcription
   */
  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    try {
      // Send audio as FormData instead of base64 JSON to avoid payload size issues
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.' + this.getFileExtension(audioBlob.type));

      // Upload and start transcription
      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary for FormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      // Poll for completion
      const completedResult = await this.pollTranscription(result.transcript_id);
      return completedResult;
    } catch (error: any) {
      console.error('AssemblyAI transcription failed:', error);
      return {
        id: 'error',
        status: 'error',
        error: error.message || 'AssemblyAI transcription failed'
      };
    }
  }

  /**
   * Poll for transcription completion
   */
  async pollTranscription(transcriptId: string, maxAttempts = 30): Promise<TranscriptionResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/transcript/${transcriptId}`);
        
        if (!response.ok) {
          throw new Error(`Polling failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'completed') {
          return {
            id: result.id,
            status: 'completed',
            text: result.text,
            confidence: result.confidence
          };
        } else if (result.status === 'error') {
          return {
            id: result.id,
            status: 'error',
            error: result.error || 'Transcription failed'
          };
        }
        
        // Still processing, wait before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error('Polling attempt failed:', error);
        
        // If this is the last attempt, return error
        if (attempt === maxAttempts - 1) {
          return {
            id: transcriptId,
            status: 'error',
            error: error.message || 'Polling failed'
          };
        }
      }
    }
    
    return {
      id: transcriptId,
      status: 'error',
      error: 'Transcription timeout - took too long to complete'
    };
  }

  /**
   * Get file extension from MIME type (internal helper)
   */
  private getFileExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'audio/wav': 'wav',
      'audio/webm': 'webm',
      'audio/ogg': 'ogg',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/webm;codecs=opus': 'webm'
    };
    
    return mimeToExt[mimeType.toLowerCase()] || 'webm';
  }
}

// Utility function to convert MediaRecorder blob to format suitable for AssemblyAI
export function prepareAudioForAssemblyAI(audioBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // TODO: Convert audio to format supported by AssemblyAI (WAV, MP3, MP4, etc.)
    // For now, just return the original blob
    resolve(audioBlob);
  });
}

// Factory function to create AssemblyAI service instance
export function createAssemblyAIService(): AssemblyAIService {
  return new AssemblyAIService();
}