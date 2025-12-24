# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Copy source code and config
COPY . .

# Build the application
RUN npm run clean && npx tsc

# Stage 2: Production
FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy compiled files from build stage
COPY --from=builder /app/dist ./dist

# The app uses port 3001 by default
EXPOSE 3001

# Set environment variable to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
