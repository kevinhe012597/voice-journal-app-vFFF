import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Calendar, FileText } from 'lucide-react';

interface OverwriteConfirmationProps {
  affectedDates: string[];
  contentToBeOverwritten: { [date: string]: string[] };
  onConfirm: (datesToOverwrite: string[]) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export default function OverwriteConfirmation({ 
  affectedDates, 
  contentToBeOverwritten, 
  onConfirm, 
  onCancel, 
  isProcessing 
}: OverwriteConfirmationProps) {
  const [selectedDates, setSelectedDates] = useState<string[]>(affectedDates);
  const [showPreview, setShowPreview] = useState(false);

  const handleDateToggle = (date: string, checked: boolean) => {
    if (checked) {
      setSelectedDates(prev => [...prev, date]);
    } else {
      setSelectedDates(prev => prev.filter(d => d !== date));
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedDates);
  };

  const totalExistingEntries = Object.values(contentToBeOverwritten).reduce(
    (sum, entries) => sum + entries.filter(entry => entry.startsWith('- ')).length, 
    0
  );

  return (
    <Card className="w-full border-orange-200 dark:border-orange-800">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <div className="space-y-1">
            <CardTitle className="text-lg">Overwrite Existing Entries?</CardTitle>
            <p className="text-sm text-muted-foreground">
              You have existing journal entries for {affectedDates.length} date{affectedDates.length === 1 ? '' : 's'}. 
              Choose which entries to overwrite.
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Affected dates with content preview */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Dates with existing content:
          </h4>
          
          {affectedDates.map(date => {
            const existingEntries = contentToBeOverwritten[date] || [];
            const bulletCount = existingEntries.filter(entry => entry.startsWith('- ')).length;
            
            return (
              <div key={date} className="flex items-start space-x-3 p-3 bg-muted rounded-md">
                <Checkbox
                  id={`date-${date}`}
                  checked={selectedDates.includes(date)}
                  onCheckedChange={(checked) => handleDateToggle(date, !!checked)}
                  data-testid={`checkbox-overwrite-${date}`}
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor={`date-${date}`} className="font-medium cursor-pointer">
                      {date}
                    </label>
                    <Badge variant="secondary" className="text-xs">
                      {bulletCount} existing {bulletCount === 1 ? 'entry' : 'entries'}
                    </Badge>
                  </div>
                  
                  {existingEntries.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {existingEntries.slice(0, 2).map((entry, idx) => (
                        <div key={idx}>{entry}</div>
                      ))}
                      {existingEntries.length > 2 && (
                        <div>...and {existingEntries.length - 2} more</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Show preview toggle */}
        {totalExistingEntries > 0 && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-preview"
              checked={showPreview}
              onCheckedChange={setShowPreview}
              data-testid="checkbox-show-preview"
            />
            <label htmlFor="show-preview" className="text-sm cursor-pointer">
              Show content that will be lost
            </label>
          </div>
        )}

        {/* Content preview */}
        {showPreview && totalExistingEntries > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Content that will be overwritten:
            </h4>
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md max-h-40 overflow-y-auto">
              {affectedDates.map(date => {
                const entries = contentToBeOverwritten[date] || [];
                if (entries.length === 0 || !selectedDates.includes(date)) return null;
                
                return (
                  <div key={date} className="mb-3 last:mb-0">
                    <div className="font-medium text-sm mb-1">{date}</div>
                    {entries.map((entry, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground ml-2">
                        {entry}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Warning message */}
        <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md">
          <p className="text-sm text-orange-700 dark:text-orange-300">
            <strong>Warning:</strong> Overwriting cannot be undone. Selected dates will have their content completely replaced with your new entries.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || selectedDates.length === 0}
            variant="destructive"
            className="flex-1"
            data-testid="button-confirm-overwrite"
          >
            {isProcessing ? 'Processing...' : `Overwrite ${selectedDates.length} Date${selectedDates.length === 1 ? '' : 's'}`}
          </Button>
          
          <Button
            onClick={onCancel}
            disabled={isProcessing}
            variant="outline"
            className="flex-1"
            data-testid="button-cancel-overwrite"
          >
            Cancel
          </Button>
        </div>

        {/* Alternative action */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Or you can cancel and your new entries will be added without overwriting existing content.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}