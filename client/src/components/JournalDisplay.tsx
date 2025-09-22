import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JournalDisplayProps {
  journalContent: string;
  onContentChange?: (content: string) => void;
  readOnly?: boolean;
}

export default function JournalDisplay({ 
  journalContent, 
  onContentChange, 
  readOnly = false 
}: JournalDisplayProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(journalContent);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Your journal entries have been copied to the clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onContentChange?.(e.target.value);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Journal Entries</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={!journalContent.trim()}
          data-testid="button-copy-clipboard"
          className="flex items-center gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </Button>
      </div>
      
      <Textarea
        value={journalContent}
        onChange={handleChange}
        readOnly={readOnly}
        placeholder="Your journal entries will appear here as you speak..."
        className="min-h-[400px] resize-none font-mono text-sm leading-relaxed"
        data-testid="textarea-journal-content"
      />
      
      {journalContent.trim() && (
        <div className="text-xs text-muted-foreground text-right">
          {journalContent.split('\n').filter(line => line.trim()).length} lines • {journalContent.length} characters
        </div>
      )}
    </div>
  );
}