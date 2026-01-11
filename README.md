# SafetyFirst Extinguisher Tracker - CMS

A content management system for tracking fire extinguisher inspections and maintenance.

## Prerequisites

- **Node.js** (version 18 or higher recommended)
- **npm** or **yarn** package manager

## Setup Instructions

### 1. Install Dependencies

Open a terminal in the project directory and run:

```bash
npm install
```

This will install all required dependencies including:
- React 19
- Vite (build tool)
- TypeScript
- Lucide React (icons)
- Google Generative AI
- And other dependencies

### 2. Run the Development Server

After dependencies are installed, start the development server:

```bash
npm run dev
```

This will:
- Start the Vite development server
- Open your browser automatically at `http://localhost:3000`
- Enable hot module replacement (changes reflect immediately)

### 3. Access the Application

The application will be available at:
- **Local URL**: `http://localhost:3000`

The browser should open automatically. If not, manually navigate to the URL shown in the terminal.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Notes

- **DO NOT** open `index.html` directly in the browser. The project requires a development server to handle TypeScript compilation and module bundling.
- All data is stored locally in your browser's localStorage.
- The application works offline after the initial load.

## Troubleshooting

### Directory Name Warning
**IMPORTANT**: If your project directory contains a "#" character (like `NEW CSM #1 (2)`), Vite may have trouble resolving files. Consider renaming the directory to remove special characters:

```bash
# Rename the directory (example)
mv "NEW CSM #1 (2)" "NEW-CSM-1-2"
```

Then run `npm run dev` again from the renamed directory.

### Port Already in Use
If port 3000 is already in use, Vite will automatically try the next available port (3001, 3002, etc.). Check the terminal output for the actual URL.

### "Failed to load url /index.tsx" Error
If you see errors like "Failed to load url /index.tsx", this is usually caused by:
1. **Directory name with "#" character** - Rename the directory (see above)
2. **File path issues** - Ensure `index.tsx` exists in the project root
3. **Vite cache** - Try clearing Vite cache: `rm -rf node_modules/.vite`

### Module Import Errors
If you see import errors related to `@google/genai` or `GoogleGenAI`, the code may need to be updated. The package installed is `@google/generative-ai`, which exports `GoogleGenerativeAI` (note the different class name). This may require updating the import statement in `services/geminiService.ts`.

### Installation Issues
If you encounter installation errors:
1. Make sure you have Node.js 18+ installed: `node --version`
2. Clear npm cache: `npm cache clean --force`
3. Delete `node_modules` folder and `package-lock.json`, then run `npm install` again

## Project Structure

- `components/` - React components
- `services/` - Business logic and API integrations
- `hooks/` - Custom React hooks
- `types.ts` - TypeScript type definitions
- `App.tsx` - Main application component
- `index.tsx` - Application entry point
- `index.html` - HTML template

## Development

The project uses:
- **Vite** for fast development and building
- **React 19** for the UI framework
- **TypeScript** for type safety
- **Tailwind CSS** (via CDN) for styling
- **Lucide React** for icons

Happy coding! 🔥
