# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start development server (Vite with HMR)
npm run build    # TypeScript compile + Vite production build
npm run lint     # Run ESLint
npm run preview  # Preview production build locally
```

## Tech Stack

- **React 18** + **TypeScript** + **Vite** for the application framework
- **Fabric.js 6** for canvas manipulation and graphics rendering
- **Tailwind CSS** for styling

## Architecture

This is a blog thumbnail generator application with a single-component architecture in `src/App.tsx`.

**UI Layout**: Left panel (canvas preview) + Right panel (controls)

**Canvas System**: Uses Fabric.js to render a 1280x670px thumbnail with:
- Editable main title (supports vertical/horizontal text)
- Highlight rectangle behind title
- Scattered text segments with collision detection to avoid title area
- Interactive drag/resize on all canvas elements
- PNG export at full resolution

**Key State**:
- Title text, font size (60-180px), and orientation
- Colors for background, title, highlight, and segments
- Content segments (one per line in textarea)
- Scattered text parameters (min/max font size, vertical ratio)

**Text Rendering**: Japanese font stack (Hiragino Kaku Gothic ProN, Meiryo, sans-serif)
