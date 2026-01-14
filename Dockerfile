# PRODUCTION DOCKERFILE
FROM node:18-alpine

# Set node environment
ENV NODE_ENV=production

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --only=production

# Bundle app source
COPY . .

# Build TypeScript
RUN npm install typescript -g
RUN tsc

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3000/api/v1/portal/health || exit 1

# Start server
CMD [ "node", "dist/server.js" ]
