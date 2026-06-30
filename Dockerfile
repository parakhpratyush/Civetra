# Use Node 20 as base
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy everything else
COPY . .

# Build the app (Vite + Server bundle)
RUN npm run build

# Expose the dynamic port
EXPOSE 8080

# Start the server
CMD [ "npm", "start" ]
