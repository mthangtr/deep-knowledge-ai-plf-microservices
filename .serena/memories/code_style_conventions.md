# Code Style and Conventions

## Frontend (Next.js/React/TypeScript)
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS + Shadcn/UI components
- **UI Library**: Radix UI primitives
- **File Structure**: App Router convention (`app/` directory)
- **Component Pattern**: Functional components with hooks
- **State Management**: React hooks + context where needed
- **Form Handling**: React Hook Form với validation

## Backend (Node.js/TypeScript)
- **Language**: TypeScript với strict configuration
- **Framework**: Express.js
- **File Structure**: 
  - `src/index.ts` - Main entry point
  - `src/routes/` - API route handlers
  - `src/middleware/` - Custom middleware
  - `src/services/` - Business logic
  - `src/utils/` - Utility functions
  - `src/types/` - Type definitions
- **Error Handling**: Centralized error middleware
- **Authentication**: JWT tokens với Supabase
- **Validation**: express-validator for input validation

## AI Service (Python)
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **AI Framework**: LangChain
- **Code Style**: PEP 8 compliance
- **File Structure**:
  - `app/main.py` - FastAPI app entry
  - `app/routes/` - API endpoints
  - `app/services/` - Business logic
  - `app/models/` - Data models
  - `app/config/` - Configuration

## General Conventions
- **Naming**: camelCase for JavaScript/TypeScript, snake_case for Python
- **Files**: kebab-case for file names
- **Components**: PascalCase for React components
- **Constants**: UPPER_SNAKE_CASE
- **Environment Variables**: UPPER_SNAKE_CASE với .env files
- **Comments**: JSDoc for functions, inline comments for complex logic
- **Imports**: Absolute imports using path mapping where possible