FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Create debug-logs directory
RUN mkdir -p debug-logs

# Build
RUN npm run build

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"] 