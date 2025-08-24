FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clear npm cache and install
RUN npm cache clean --force
RUN npm install --verbose

# Copy source code
COPY . .

# Set environment for React dev server
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

EXPOSE 3000

CMD ["npm", "start"]