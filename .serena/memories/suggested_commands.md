# Suggested Commands for Development

## Windows System Commands
```powershell
# Directory navigation
dir                    # List directory contents
cd <path>             # Change directory
mkdir <dirname>       # Create directory
type <filename>       # Display file contents
findstr <pattern> <files>  # Search in files
where <command>       # Find executable location
```

## Docker Commands
```bash
# Main development commands
docker-compose up -d --build    # Start all services
docker-compose down             # Stop all services
docker-compose logs <service>   # View service logs
docker-compose exec <service> <command>  # Execute command in service

# Individual service management
docker-compose up frontend      # Start only frontend
docker-compose restart backend-main  # Restart backend
```

## Frontend (Next.js) Commands
```bash
cd deep-knowledge-ai-platform
npm run dev           # Development server
npm run build         # Production build
npm run start         # Start production server
npm run lint          # Run ESLint
```

## Backend (Node.js) Commands
```bash
cd backend-main
npm run dev           # Development with ts-node-dev
npm run build         # TypeScript compilation
npm run start         # Start compiled JavaScript
```

## Python AI Service Commands
```bash
cd langchain-python-service
python -m venv .venv          # Create virtual environment
.venv\Scripts\activate.bat    # Activate venv (Windows)
pip install -r requirements.txt  # Install dependencies
uvicorn app.main:app --reload    # Start development server
```

## Database Commands
```bash
# PostgreSQL commands (via Docker)
docker-compose exec database psql -U postgres
\l                    # List databases
\dt                   # List tables
\d <table_name>       # Describe table structure
```

## Git Commands
```bash
git status            # Check repository status
git add .             # Stage all changes
git commit -m "message"  # Commit changes
git push              # Push to remote
git pull              # Pull from remote
```