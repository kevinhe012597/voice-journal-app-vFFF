import { useState } from 'react';
import JournalDisplay from '../JournalDisplay';

export default function JournalDisplayExample() {
  const [content, setContent] = useState(`9.21.2025
- Woke up early and went to range
- MVP IC Meeting
- Call with Alex from Ridge Ventures
- Founder meeting with Archit and knocked it out of the park
- Washed Lil Blue

9.20.2025
- Worked on the speech-to-text journaling app
- Added Web Speech API integration
- Tested text processing pipeline`);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <JournalDisplay 
        journalContent={content}
        onContentChange={setContent}
        readOnly={false}
      />
    </div>
  );
}