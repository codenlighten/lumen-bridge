# Use Alpine-based Node.js image
FROM node:20-alpine

# Install bash for terminal execution; tini for proper signal handling
RUN apk add --no-cache bash tini

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production deps; deterministic via ci when lockfile present
RUN npm ci --omit=dev || npm install --omit=dev

# Copy application source
COPY . .

# Drop root
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

ENV NODE_ENV=production

EXPOSE 3000

# tini = PID 1; forwards SIGTERM cleanly to node (graceful shutdown works)
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "start"]
