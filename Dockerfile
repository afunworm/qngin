# Use Node.js 22 on Alpine
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy all files from the current directory to the container
COPY . .

# Install dependencies
RUN npm install

# Start the app with the specified entry file
CMD ["node", "index.mjs"]