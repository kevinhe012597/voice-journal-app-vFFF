import { useState, useEffect } from 'react';
import SpeechToTextButton from '@/components/SpeechToTextButton';
import SpeechReviewStep from '@/components/SpeechReviewStep';
import OverwriteConfirmation from '@/components/OverwriteConfirmation';
import JournalDisplay from '@/components/JournalDisplay';
import GitHubSaver from '@/components/GitHubSaver';
import { TextProcessor, JournalStorage } from '@/utils/textProcessor';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trash2, Download, RefreshCw } from 'lucide-react';

export default function Journal() {
  const [journalContent, setJournalContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [useAssemblyAI, setUseAssemblyAI] = useState(false); // TODO: Add toggle for AssemblyAI
  const [capturedText, setCapturedText] = useState('');
  const [showReviewStep, setShowReviewStep] = useState(false);
  const [showOverwriteConfirmation, setShowOverwriteConfirmation] = useState(false);
  const [pendingBullets, setPendingBullets] = useState<string[]>([]);
  const [affectedDates, setAffectedDates] = useState<string[]>([]);
  const [contentToBeOverwritten, setContentToBeOverwritten] = useState<{ [date: string]: string[] }>({});
  const { toast } = useToast();

  // Load journal content from localStorage on mount
  useEffect(() => {
    const savedContent = JournalStorage.load();
    setJournalContent(savedContent);
  }, []);

  // Save to localStorage whenever content changes
  useEffect(() => {
    JournalStorage.save(journalContent);
  }, [journalContent]);

  // Handle raw text capture for review step
  const handleRawTextCaptured = (speechText: string) => {
    setCapturedText(speechText);
    setShowReviewStep(true);
    
    toast({
      title: "Speech captured",
      description: "Review and edit your speech before processing into bullet points.",
    });
  };

  // Handle final processing after review - checks for conflicts first
  const handleProcessReviewedText = async (reviewedText: string) => {
    setIsProcessing(true);
    
    try {
      // Use OpenAI to synthesize key events
      const processed = await TextProcessor.synthesizeText(reviewedText);
      
      // Check for existing content that would be overwritten
      const datesThatWouldBeAffected = TextProcessor.getAffectedDates(processed.bullets);
      const existingDates = TextProcessor.getExistingDates(journalContent, datesThatWouldBeAffected);
      
      if (existingDates.length > 0) {
        // There are conflicts - show confirmation dialog
        const contentPreview = TextProcessor.getContentToBeOverwritten(journalContent, existingDates);
        
        setPendingBullets(processed.bullets);
        setAffectedDates(existingDates);
        setContentToBeOverwritten(contentPreview);
        setShowOverwriteConfirmation(true);
        setIsProcessing(false);
        
        toast({
          title: "Existing entries found",
          description: `You have existing entries for ${existingDates.length} date${existingDates.length === 1 ? '' : 's'}. Choose whether to overwrite them.`,
        });
      } else {
        // No conflicts - proceed normally
        await processWithoutConflicts(processed);
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
      toast({
        title: "Processing failed", 
        description: "Failed to process your speech. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  // Helper function to process without conflicts
  const processWithoutConflicts = async (processed: any) => {
    const updatedContent = TextProcessor.appendToJournal(journalContent, processed.bullets);
    
    setJournalContent(updatedContent);
    setShowReviewStep(false);
    setCapturedText('');
    
    const description = processed.synthesized 
      ? `Synthesized ${processed.bullets.length} key event${processed.bullets.length === 1 ? '' : 's'} from your speech.`
      : `Added ${processed.bullets.length} bullet point${processed.bullets.length === 1 ? '' : 's'} using basic processing.`;
    
    toast({
      title: processed.synthesized ? "Events synthesized" : "Entry added (fallback)",
      description,
    });
    setIsProcessing(false);
  };

  // Handle overwrite confirmation
  const handleOverwriteConfirm = async (datesToOverwrite: string[]) => {
    setIsProcessing(true);
    
    try {
      let updatedContent: string;
      
      if (datesToOverwrite.length === 0) {
        // User chose not to overwrite anything - append normally
        updatedContent = TextProcessor.appendToJournal(journalContent, pendingBullets);
      } else {
        // Overwrite selected dates
        updatedContent = TextProcessor.overwriteJournal(journalContent, pendingBullets, datesToOverwrite);
      }
      
      setJournalContent(updatedContent);
      setShowReviewStep(false);
      setShowOverwriteConfirmation(false);
      setCapturedText('');
      setPendingBullets([]);
      setAffectedDates([]);
      setContentToBeOverwritten({});
      
      const actionDescription = datesToOverwrite.length > 0 
        ? `Overwrote entries for ${datesToOverwrite.length} date${datesToOverwrite.length === 1 ? '' : 's'}`
        : "Added entries without overwriting existing content";
      
      toast({
        title: "Processing complete",
        description: actionDescription,
      });
    } catch (error) {
      console.error('Error during overwrite processing:', error);
      toast({
        title: "Processing failed", 
        description: "Failed to process the overwrite. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle overwrite cancellation - append instead of overwrite
  const handleOverwriteCancel = async () => {
    try {
      // Append without overwriting as promised in the UI
      const updatedContent = TextProcessor.appendToJournal(journalContent, pendingBullets);
      
      setJournalContent(updatedContent);
      setShowReviewStep(false);
      setShowOverwriteConfirmation(false);
      setCapturedText('');
      setPendingBullets([]);
      setAffectedDates([]);
      setContentToBeOverwritten({});
      
      toast({
        title: "Entries added",
        description: "Your new entries were added without overwriting existing content.",
      });
    } catch (error) {
      console.error('Error during append after cancel:', error);
      toast({
        title: "Processing failed", 
        description: "Failed to add entries. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle direct processing (legacy workflow for backwards compatibility)
  const handleTranscript = async (speechText: string) => {
    setIsProcessing(true);
    
    try {
      // Use OpenAI to synthesize key events instead of verbatim transcription
      const processed = await TextProcessor.synthesizeText(speechText);
      const updatedContent = TextProcessor.appendToJournal(journalContent, processed.bullets);
      
      setJournalContent(updatedContent);
      
      const description = processed.synthesized 
        ? `Synthesized ${processed.bullets.length} key event${processed.bullets.length === 1 ? '' : 's'} from your speech.`
        : `Added ${processed.bullets.length} bullet point${processed.bullets.length === 1 ? '' : 's'} using basic processing.`;
      
      toast({
        title: processed.synthesized ? "Events synthesized" : "Entry added (fallback)",
        description,
      });
    } catch (error) {
      console.error('Error processing transcript:', error);
      toast({
        title: "Processing failed", 
        description: "Failed to process your speech. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle re-recording from review step
  const handleReRecord = () => {
    setShowReviewStep(false);
    setCapturedText('');
    
    toast({
      title: "Ready to record",
      description: "You can now record your speech again.",
    });
  };

  const handleError = (error: string) => {
    toast({
      title: "Speech recognition error",
      description: error,
      variant: "destructive",
    });
  };

  const handleClearJournal = () => {
    setJournalContent('');
    JournalStorage.clear();
    toast({
      title: "Journal cleared",
      description: "All journal entries have been removed.",
    });
  };

  const handleDownload = () => {
    if (!journalContent.trim()) {
      toast({
        title: "Nothing to download",
        description: "Your journal is empty.",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([journalContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: "Your journal has been downloaded as a text file.",
    });
  };

  const handleRefresh = () => {
    const savedContent = JournalStorage.load();
    setJournalContent(savedContent);
    toast({
      title: "Journal refreshed",
      description: "Reloaded journal from local storage.",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Voice Journal</h1>
            <p className="text-muted-foreground">
              Speak your thoughts and watch them transform into organized bullet points
            </p>
          </div>
          
          {/* Save to GitHub */}
          <div className="flex justify-center">
            <GitHubSaver />
          </div>
        </div>

        {/* Recording Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Record Entry</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            {/* TODO: Add AssemblyAI toggle */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="assemblyai-mode"
                  checked={useAssemblyAI}
                  onCheckedChange={setUseAssemblyAI}
                  data-testid="switch-assemblyai-mode"
                />
                <label htmlFor="assemblyai-mode" className="text-sm font-medium cursor-pointer">
                  Enhanced Mode (AssemblyAI)
                </label>
              </div>
              <Badge variant="outline" className="text-xs">
                {useAssemblyAI ? 'Better accuracy, requires API key' : 'Browser-based, works offline'}
              </Badge>
            </div>

            <SpeechToTextButton 
              onTranscript={handleTranscript} 
              onRawTextCaptured={handleRawTextCaptured}
              onError={handleError}
              useAssemblyAI={useAssemblyAI}
            />
            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Synthesizing key events from your speech...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Speech Review Step */}
        {showReviewStep && !showOverwriteConfirmation && (
          <SpeechReviewStep
            capturedText={capturedText}
            onProcessText={handleProcessReviewedText}
            onReRecord={handleReRecord}
            isProcessing={isProcessing}
            journalContent={journalContent}
          />
        )}

        {/* Overwrite Confirmation Step */}
        {showOverwriteConfirmation && (
          <OverwriteConfirmation
            affectedDates={affectedDates}
            contentToBeOverwritten={contentToBeOverwritten}
            onConfirm={handleOverwriteConfirm}
            onCancel={handleOverwriteCancel}
            isProcessing={isProcessing}
          />
        )}

        {/* Journal Display */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Your Journal</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  data-testid="button-refresh-journal"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={!journalContent.trim()}
                  data-testid="button-download-journal"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearJournal}
                  disabled={!journalContent.trim()}
                  data-testid="button-clear-journal"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <JournalDisplay 
              journalContent={journalContent}
              onContentChange={setJournalContent}
              readOnly={false}
            />
          </CardContent>
        </Card>

        {/* TODO: Add AssemblyAI integration */}
        {/* TODO: Add export to different formats */}
        {/* TODO: Add search and filtering capabilities */}
        
        {/* Instructions */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">How to use:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Hold the record button while speaking, then release to process</li>
              <li>• Click the button to toggle recording mode</li>
              <li>• Use spacebar as a shortcut to start/stop recording</li>
              <li>• Your entries are automatically organized by date</li>
              <li>• <strong>AI-powered:</strong> Speech is synthesized into key events, not verbatim transcription</li>
              <li>• Everything is saved locally in your browser</li>
              {useAssemblyAI && (
                <li>• <strong>Enhanced Mode:</strong> Better accuracy with AssemblyAI (requires API key setup)</li>
              )}
            </ul>
            
            {/* TODO: Add AssemblyAI setup instructions */}
            {useAssemblyAI && (
              <div className="mt-4 p-3 bg-primary/10 rounded-md border">
                <h4 className="font-medium text-sm mb-2">AssemblyAI Setup:</h4>
                <p className="text-xs text-muted-foreground">
                  To use enhanced mode, add your AssemblyAI API key as <code className="bg-muted px-1 rounded">ASSEMBLYAI_API_KEY</code> 
                  environment variable. Get your API key from{' '}
                  <a href="https://www.assemblyai.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    AssemblyAI.com
                  </a>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}