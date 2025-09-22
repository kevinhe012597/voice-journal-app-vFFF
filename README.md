# Speech-to-Text Journaling App

An AI-powered journaling application that converts your speech into organized bullet points using OpenAI's advanced language model.

## Features

- **Voice Recording**: Hold-to-talk or click-to-toggle recording interface
- **AI Synthesis**: Uses OpenAI GPT-5 to extract key events from speech instead of verbatim transcription
- **Smart Organization**: Automatically organizes entries by date
- **Local Storage**: All entries saved locally in your browser
- **Keyboard Shortcuts**: Spacebar to start/stop recording
- **AssemblyAI Ready**: Enhanced transcription option with clear upgrade path

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **AI Integration**: OpenAI GPT-5 for intelligent summarization
- **Speech Recognition**: Web Speech API with AssemblyAI integration ready
- **Storage**: localStorage with optional database upgrade path

## Getting Started

1. Clone this repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `ASSEMBLYAI_API_KEY`: (Optional) For enhanced speech recognition
4. Start the development server: `npm run dev`
5. Open your browser to the provided URL

## How It Works

1. **Speak Naturally**: Record your thoughts, activities, and events
2. **AI Processing**: OpenAI analyzes your speech and extracts key events
3. **Smart Formatting**: Creates concise 3-15 word bullet points
4. **Auto Organization**: Groups entries under date headers
5. **Local Persistence**: Everything saves automatically to your browser

## Example

**Your Speech**: "I woke up early this morning and went to the gym, then I had a meeting with my team about the new project, and after that I grabbed lunch with Sarah and discussed the upcoming presentation"

**AI Output**:
- Early gym workout
- Team meeting about new project  
- Lunch with Sarah about presentation

Built with ❤️ on Replit
