# Use Alpine-based Node.js image
FROM node:20-alpine

# Install bash for terminal execution
RUN apk add --no-cache bash

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application source
COPY . .

# Expose port (adjust if needed)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
