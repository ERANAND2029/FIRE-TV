# Multi-stage lightweight Node.js container for Render deployment
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=10000

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application files
COPY . .

# Run build step to prepare static assets
RUN node build.js

# Expose Render standard port
EXPOSE 10000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:10000/health || exit 1

# Start the web server
CMD ["node", "server.js"]
