import { useState } from 'react';
import SpeechToTextButton from '../SpeechToTextButton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

export default function SpeechToTextButtonExample() {
  const [useAssemblyAI, setUseAssemblyAI] = useState(false);

  const handleTranscript = (text: string) => {
    console.log('Transcript received:', text);
  };

  const handleError = (error: string) => {
    console.log('Speech error:', error);
  };

  return (
    <div className="p-8 flex flex-col items-center gap-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="assemblyai-toggle"
            checked={useAssemblyAI}
            onCheckedChange={setUseAssemblyAI}
          />
          <label htmlFor="assemblyai-toggle" className="text-sm font-medium cursor-pointer">
            Enhanced Mode (AssemblyAI)
          </label>
        </div>
        <Badge variant="outline" className="text-xs">
          {useAssemblyAI ? 'Better accuracy' : 'Browser-based'}
        </Badge>
      </div>
      
      <SpeechToTextButton 
        onTranscript={handleTranscript} 
        onError={handleError}
        useAssemblyAI={useAssemblyAI}
      />
    </div>
  );
}