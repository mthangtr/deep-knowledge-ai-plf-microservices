# Project Structure Overview

## Root Directory
```
deep-knowledge-ai-plf-microservices/
├── .cursor/                    # Cursor IDE configuration
├── api-gateway/               # API Gateway service (Node.js)
├── backend-main/              # Main backend service (Node.js)
├── deep-knowledge-ai-platform/ # Frontend application (Next.js)
├── langchain-python-service/  # AI service (Python/FastAPI)
├── rules/                     # Workflow rules and documentation
├── docker-compose.yml         # Docker orchestration
├── README.md                  # Project documentation
└── DATABASE.md               # Database schema documentation
```

## Frontend Structure (`deep-knowledge-ai-platform/`)
```
├── app/                       # Next.js 15 App Router
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page
│   ├── auth/                 # Authentication pages
│   ├── learning/             # Learning features
│   ├── mindmap/              # Mind map visualization
│   └── profile/              # User profile
├── components/               # Reusable React components
│   ├── ui/                   # Shadcn/UI components
│   ├── forms/                # Form components
│   ├── layout/               # Layout components
│   └── providers/            # Context providers
├── hooks/                    # Custom React hooks
├── lib/                      # Utility libraries
├── types/                    # TypeScript type definitions
└── constants/                # Application constants
```

## Backend Structure (`backend-main/`)
```
src/
├── index.ts                  # Application entry point
├── config/                   # Configuration files
│   ├── jwt.ts               # JWT configuration
│   └── supabase.ts          # Supabase client setup
├── middleware/               # Express middleware
│   ├── auth.middleware.ts   # Authentication middleware
│   └── error.middleware.ts  # Error handling middleware
├── routes/                   # API route handlers
│   ├── auth.routes.ts       # Authentication routes
│   ├── chat.routes.ts       # Chat functionality
│   ├── topic.routes.ts      # Learning topics
│   └── tree.routes.ts       # Knowledge trees
├── services/                 # Business logic services
├── types/                    # TypeScript definitions
└── utils/                    # Utility functions
```

## AI Service Structure (`langchain-python-service/`)
```
app/
├── main.py                   # FastAPI application entry
├── routes/                   # API endpoint definitions
├── services/                 # AI processing services
├── models/                   # Data models
├── config/                   # Configuration management
└── prompts/                  # LangChain prompt templates
```

## Key Configuration Files
- `docker-compose.yml` - Multi-service orchestration
- `package.json` - Node.js dependencies and scripts
- `requirements.txt` - Python dependencies
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `next.config.mjs` - Next.js configuration