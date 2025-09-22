# Speech-to-Text Journaling App Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from productivity apps like Notion and Linear for clean, minimal interfaces that prioritize content creation and organization.

## Core Design Elements

### Color Palette
**Light Mode:**
- Primary: 240 5% 9% (charcoal text)
- Background: 0 0% 98% (off-white)
- Secondary: 220 13% 91% (light gray surfaces)
- Accent: 217 91% 60% (blue for recording states)

**Dark Mode:**
- Primary: 0 0% 98% (white text)
- Background: 240 10% 4% (deep dark)
- Secondary: 240 6% 10% (dark gray surfaces)
- Accent: 217 91% 70% (lighter blue for dark mode)

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Headings**: 600 weight, sizes from text-lg to text-2xl
- **Body**: 400 weight, text-base
- **Journal entries**: 400 weight with generous line-spacing for readability

### Layout System
**Spacing Primitives**: Tailwind units of 2, 4, 6, and 8
- Micro spacing: p-2, gap-2
- Standard spacing: p-4, m-4, gap-4
- Section spacing: p-6, mb-6
- Large spacing: p-8, mt-8

### Component Library

**Core Components:**
- **Recording Button**: Large, circular button with visual recording states (idle, listening, processing)
- **Journal Entry Cards**: Clean cards with subtle borders, organized chronologically
- **Navigation**: Simple sidebar or header with minimal options
- **Text Display**: Formatted bullet points with proper hierarchy
- **Settings Panel**: Toggle for speech settings and preferences

**Visual Hierarchy:**
- Recording interface: Prominent, center-stage when active
- Journal entries: Clean list with clear date/time stamps
- Actions: Subtle, secondary buttons for edit/delete/export

### Interface Layout
**Single-Column Focus**: Center-aligned content with maximum 768px width for optimal reading
**Sections:**
1. **Header**: App title and basic navigation (h-16)
2. **Recording Interface**: Voice input controls and status (prominent when active)
3. **Journal Feed**: Chronological list of entries with search/filter
4. **Footer**: Minimal with essential links

### Interaction Design
- **Recording States**: Clear visual feedback (idle → listening → processing → complete)
- **Real-time Transcription**: Show text appearing as speech is processed
- **Entry Management**: Inline editing, simple organization tools
- **Responsive**: Mobile-first design for on-the-go journaling

### Visual Treatment
- **Minimalist**: Clean backgrounds, generous whitespace
- **Content-First**: Design serves the journaling experience
- **Subtle Animations**: Gentle transitions, recording pulse effect
- **Focus States**: Clear indication of active recording or selected entries

This design prioritizes functionality and content creation while maintaining a calming, distraction-free environment for personal reflection and journaling.