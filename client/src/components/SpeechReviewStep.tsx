import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit3, Wand2, RotateCcw, AlertTriangle } from 'lucide-react';
import { TextProcessor } from '@/utils/textProcessor';

interface SpeechReviewStepProps {
  capturedText: string;
  onProcessText: (text: string) => void;
  onReRecord: () => void;
  isProcessing: boolean;
  journalContent?: string; // Optional: for showing overwrite warnings
}

export default function SpeechReviewStep({ 
  capturedText, 
  onProcessText, 
  onReRecord, 
  isProcessing,
  journalContent = ''
}: SpeechReviewStepProps) {
  const [editedText, setEditedText] = useState(capturedText);
  const [isEditing, setIsEditing] = useState(false);
  const [potentialConflicts, setPotentialConflicts] = useState<string[]>([]);

  const handleProcess = () => {
    onProcessText(editedText);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedText(capturedText);
    setIsEditing(false);
  };

  // Check for potential conflicts when text changes
  useEffect(() => {
    if (editedText && journalContent) {
      try {
        // Enhanced check: simulate basic processing to detect multi-date scenarios
        const processedBasic = TextProcessor.processText(editedText);
        let potentialDates: string[] = [];
        
        // Check if the text might contain date references for multi-date processing
        const datePatterns = [
          /\b(\d{1,2})[\/\.-](\d{1,2})\b/g, // MM/DD, MM-DD, MM.DD patterns
          /\b(yesterday|today|tomorrow)\b/gi,
          /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
          /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi
        ];
        
        const hasDateReferences = datePatterns.some(pattern => pattern.test(editedText));
        
        if (hasDateReferences) {
          // Might be multi-date - check broader range
          const today = TextProcessor.formatDateHeader();
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayFormatted = `${yesterday.getMonth() + 1}.${yesterday.getDate()}.${yesterday.getFullYear()}`;
          
          potentialDates = [today, yesterdayFormatted];
        } else {
          // Single date - just today
          potentialDates = [TextProcessor.formatDateHeader()];
        }
        
        const existingDates = TextProcessor.getExistingDates(journalContent, potentialDates);
        setPotentialConflicts(existingDates);
      } catch (error) {
        console.error('Error checking conflicts:', error);
        setPotentialConflicts([]);
      }
    } else {
      setPotentialConflicts([]);
    }
  }, [editedText, journalContent]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            Review Captured Speech
            <Badge variant="secondary" className="text-xs">
              {capturedText.length} characters
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReRecord}
            disabled={isProcessing}
            data-testid="button-re-record"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Re-record
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Display captured text */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Captured Speech:
          </h4>
          
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                placeholder="Edit your captured speech here..."
                className="min-h-32 resize-none"
                data-testid="textarea-edit-speech"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} data-testid="button-save-edit">
                  Save Changes
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit} data-testid="button-cancel-edit">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-muted rounded-md border">
                <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-captured-speech">
                  {editedText || "No speech captured yet..."}
                </p>
              </div>
              
              {editedText && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  disabled={isProcessing}
                  data-testid="button-edit-text"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Text
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isEditing && editedText && (
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleProcess}
              disabled={isProcessing || !editedText.trim()}
              className="flex-1"
              data-testid="button-process-to-bullets"
            >
              {isProcessing ? (
                <>
                  <Wand2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Process into Bullet Points
                </>
              )}
            </Button>
          </div>
        )}

        {/* Conflict warning */}
        {!isEditing && potentialConflicts.length > 0 && (
          <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md">
            <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Existing entries detected
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                You have existing entries for {potentialConflicts.join(', ')}. Processing will ask if you want to overwrite them.
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Review your captured speech above. You can edit the text if needed, then click "Process into Bullet Points" to convert it into organized journal entries.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}