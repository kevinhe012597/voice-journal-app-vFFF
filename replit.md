# Speech-to-Text Journaling App

## Overview

A minimal browser-based speech-to-text journaling app that converts voice recordings into formatted bullet journal entries. The app captures spoken input through either the Web Speech API (default) or AssemblyAI (enhanced mode), processes the speech into concise bullet points using OpenAI for text synthesis, and organizes entries by date in a clean, readable format.

The core user flow is simple: hold button → speak → release button → app converts speech to formatted bullets and auto-appends under today's date.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system following productivity app aesthetics (Notion/Linear inspired)
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React hooks with localStorage persistence for journal data
- **Data Fetching**: TanStack Query for server state management

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **API Design**: RESTful endpoints for speech synthesis and future AssemblyAI integration
- **Database**: Configured for PostgreSQL with Drizzle ORM (schema defined but minimal usage)
- **Session Management**: Prepared for user authentication with connect-pg-simple

### Speech Processing Pipeline
1. **Input Capture**: Web Speech API (browser native) or AssemblyAI (cloud-based, higher accuracy)
2. **Text Synthesis**: OpenAI GPT-5 processes raw speech into concise bullet points
3. **Content Processing**: Custom text processing pipeline that:
   - Splits speech into logical bullets
   - Removes conversational filler and redundancy
   - Formats bullets with proper capitalization
   - Removes unnecessary personal pronouns
4. **Date Organization**: Automatic date headers (M.D.YYYY format) with smart content appending

### Data Storage Strategy
- **Local Storage**: Primary storage for journal entries (localStorage-based persistence)
- **Database**: PostgreSQL schema ready for multi-user expansion
- **File Management**: No file uploads - pure text-based storage

### Text Processing Logic
- **Splitter Regex**: Breaks speech on natural pause indicators (periods, semicolons, "and then", "then")
- **Content Cleaning**: Removes personal pronouns, filler words, and conversational padding
- **Smart Formatting**: Capitalizes first letters, removes trailing punctuation, maintains readability

### Authentication System
- **Current State**: User schema defined but not actively used (single-user mode)
- **Future Ready**: Session management and user authentication infrastructure prepared
- **Storage**: In-memory user storage with database schema ready for expansion

## External Dependencies

### Third-Party APIs
- **OpenAI API**: GPT-5 model for intelligent speech synthesis and bullet point extraction
- **AssemblyAI API**: Enhanced speech-to-text recognition (optional upgrade from Web Speech API)
- **Web Speech API**: Browser-native speech recognition (primary input method)

### Database Services
- **Neon Database**: PostgreSQL hosting service for production deployment
- **Drizzle ORM**: Type-safe database queries and schema management

### UI and Styling
- **Radix UI**: Headless component primitives for accessibility and behavior
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **Google Fonts**: Inter font family for typography

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Bundle optimization for production builds
- **Drizzle Kit**: Database migration and schema management tools

### Voice and Audio
- **MediaRecorder API**: Audio capture for AssemblyAI integration
- **DOM Speech Recognition Types**: TypeScript definitions for Web Speech API

The architecture prioritizes simplicity and progressive enhancement - starting with basic Web Speech API functionality and providing a clear upgrade path to AssemblyAI for users requiring higher accuracy transcription.