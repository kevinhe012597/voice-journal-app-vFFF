import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Settings } from 'lucide-react';
import { AssemblyAIService, createAssemblyAIService } from '@/utils/assemblyAIService';

interface SpeechToTextButtonProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  onRawTextCaptured?: (text: string) => void; // New callback for raw speech text review
  // TODO: Add prop to switch between Web Speech API and AssemblyAI
  useAssemblyAI?: boolean;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function SpeechToTextButton({ 
  onTranscript, 
  onError, 
  onRawTextCaptured,
  useAssemblyAI = false 
}: SpeechToTextButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [assemblyAIAvailable, setAssemblyAIAvailable] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const assemblyAIServiceRef = useRef<AssemblyAIService | null>(null);
  const isMouseDownRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    
    const initializeServices = async () => {
      if (useAssemblyAI) {
        // Initialize AssemblyAI service first and check availability
        assemblyAIServiceRef.current = createAssemblyAIService();
        
        try {
          const available = await assemblyAIServiceRef.current.checkConnection();
          
          if (!mounted) return;
          
          setAssemblyAIAvailable(available);
          
          if (!available) {
            onError?.('AssemblyAI is not configured. Add ASSEMBLYAI_API_KEY to use enhanced transcription.');
            // Initialize Web Speech API as fallback only if AssemblyAI is not available
            initializeWebSpeechAPI();
          }
          // If AssemblyAI is available, we don't need to initialize Web Speech API
        } catch (error) {
          if (!mounted) return;
          
          console.error('AssemblyAI check failed:', error);
          setAssemblyAIAvailable(false);
          // Initialize Web Speech API as fallback
          initializeWebSpeechAPI();
        }
      } else {
        // User explicitly chose Web Speech API
        initializeWebSpeechAPI();
      }
    };

    initializeServices();

    function initializeWebSpeechAPI() {
      // Check if Web Speech API is supported
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        setIsSupported(false);
        onError?.('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
        return;
      }

      // Initialize speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        // If there's a raw text callback, use review workflow, otherwise process directly
        if (onRawTextCaptured) {
          onRawTextCaptured(transcript);
        } else {
          onTranscript(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        onError?.(`Speech recognition error: ${event.error}`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    // Spacebar shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && e.target === document.body) {
        e.preventDefault();
        startListening();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        stopListening();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      mounted = false;
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [onTranscript, onError, onRawTextCaptured, useAssemblyAI]); // Removed assemblyAIAvailable from deps

  const startListening = async () => {
    if (isListening) return;
    
    try {
      // TODO: Choose between Web Speech API and AssemblyAI based on useAssemblyAI prop
      if (useAssemblyAI && assemblyAIAvailable && assemblyAIServiceRef.current) {
        await startAssemblyAIRecording();
      } else {
        startWebSpeechRecognition();
      }
      setIsListening(true);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      onError?.('Failed to start speech recognition');
    }
  };

  const stopListening = async () => {
    if (!isListening) return;
    
    try {
      // TODO: Stop appropriate service based on what's currently running
      if (useAssemblyAI && mediaRecorderRef.current) {
        await stopAssemblyAIRecording();
      } else if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      onError?.('Failed to stop speech recognition');
    }
  };

  // TODO: Implement AssemblyAI recording functions
  const startAssemblyAIRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        // Use the actual MediaRecorder mimeType with better fallback
        const actualMimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        
        if (assemblyAIServiceRef.current) {
          // TODO: Send audio to AssemblyAI for transcription
          const result = await assemblyAIServiceRef.current.transcribeAudio(audioBlob);
          
          if (result.status === 'completed' && result.text) {
            // If there's a raw text callback, use review workflow, otherwise process directly
            if (onRawTextCaptured) {
              onRawTextCaptured(result.text);
            } else {
              onTranscript(result.text);
            }
          } else if (result.status === 'error') {
            onError?.(result.error || 'AssemblyAI transcription failed');
          }
        }
        
        // Clean up audio stream
        stream.getTracks().forEach(track => track.stop());
        setIsListening(false);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
    } catch (error) {
      console.error('Error starting AssemblyAI recording:', error);
      onError?.('Failed to access microphone for AssemblyAI recording');
    }
  };

  const stopAssemblyAIRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const startWebSpeechRecognition = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.start();
  };

  const handleMouseDown = () => {
    isMouseDownRef.current = true;
    startListening();
  };

  const handleMouseUp = () => {
    if (isMouseDownRef.current) {
      isMouseDownRef.current = false;
      stopListening();
    }
  };

  const handleClick = () => {
    // Toggle mode for click
    if (!isMouseDownRef.current) {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    }
  };

  if (!isSupported) {
    return (
      <Button variant="destructive" disabled data-testid="button-speech-unsupported">
        <MicOff className="w-4 h-4 mr-2" />
        Speech Not Supported
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* TODO: Add service indicator */}
      <div className="flex items-center gap-2 mb-2">
        <Badge variant={useAssemblyAI ? "default" : "secondary"} className="text-xs">
          {useAssemblyAI ? 'AssemblyAI' : 'Web Speech API'}
        </Badge>
        {useAssemblyAI && !assemblyAIAvailable && (
          <Badge variant="destructive" className="text-xs">
            Not Configured
          </Badge>
        )}
        {useAssemblyAI && assemblyAIAvailable && (
          <Badge variant="default" className="text-xs">
            Enhanced Mode
          </Badge>
        )}
      </div>

      <Button
        size="lg"
        variant={isListening ? "default" : "outline"}
        className={`w-32 h-32 rounded-full text-lg font-medium transition-all duration-200 ${
          isListening ? 'animate-pulse bg-primary hover:bg-primary/90' : ''
        }`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        data-testid="button-hold-to-talk"
      >
        <div className="flex flex-col items-center gap-2">
          <Mic className={`w-8 h-8 ${isListening ? 'text-primary-foreground' : ''}`} />
          <span className={`text-sm ${isListening ? 'text-primary-foreground' : ''}`}>
            {isListening ? 'Listening...' : 'Hold to Talk'}
          </span>
        </div>
      </Button>
      
      {isListening && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          {useAssemblyAI ? 'Recording for AssemblyAI...' : 'Recording...'} (Release to stop)
        </div>
      )}
      
      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground max-w-xs">
          Hold the button or press spacebar to record. Click to toggle recording.
        </p>
        {useAssemblyAI && (
          <p className="text-xs text-primary max-w-xs">
            TODO: Using enhanced AssemblyAI transcription for better accuracy
          </p>
        )}
      </div>
    </div>
  );
}