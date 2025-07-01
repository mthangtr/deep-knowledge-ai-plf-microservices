# Base image using Node.js 18 on Alpine Linux for a small footprint
FROM node:18-alpine AS base

# Set the working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm


# --- Dependencies Stage ---
FROM base AS deps
WORKDIR /app

# Copy package management files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies using pnpm
RUN pnpm install --no-frozen-lockfile


# --- Builder Stage ---
FROM base AS builder
WORKDIR /app

# Copy dependencies from the previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
# These are needed for the Next.js build process
ENV NEXT_PUBLIC_SUPABASE_URL=https://jkykheapwyozbztnntph.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpreWtoZWFwd3lvemJ6dG5udHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NzI4NDksImV4cCI6MjA2NjI0ODg0OX0.uikqgQ3dhqEAArc92eoXQXpYEl18-POUsgkIzLmo0z0
ENV NEXTAUTH_URL=http://localhost:3000
ENV NEXTAUTH_SECRET=kNFNj0uQCVzdBoVKAbAKUUTf0JPtYqlD
ENV SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpreWtoZWFwd3lvemJ6dG5udHBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY3Mjg0OSwiZXhwIjoyMDY2MjQ4ODQ5fQ.TdKaQaagqE5kQTQrXk4NQ4xHaSFDRf6ufjUpUoc22uo
ENV OPENROUTER_API_KEY=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
ENV NODE_ENV=production

# Create .env.production file to ensure server-side vars are available
RUN echo "NEXTAUTH_URL=${NEXTAUTH_URL}" > .env.production
RUN echo "NEXTAUTH_SECRET=${NEXTAUTH_SECRET}" >> .env.production
RUN echo "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}" >> .env.production
RUN echo "OPENROUTER_API_KEY=${OPENROUTER_API_KEY}" >> .env.production
RUN echo "NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:8080" >> .env.production

# Build the Next.js application
RUN pnpm build


# --- Runner Stage ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Set runtime environment variables
ENV PORT=3000
ENV NEXTAUTH_URL=http://localhost:3000
ENV NEXTAUTH_SECRET=kNFNj0uQCVzdBoVKAbAKUUTf0JPtYqlD

# Copy built artifacts from the builder stage
COPY --from=builder /app/.env.production ./.env.production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"] 