FROM node:18-slim

WORKDIR /app

# Install Playwright dependencies for Debian/Ubuntu-based systems
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxext6 \
    libxrender1 \
    libxss1 \
    fonts-liberation \
    libappindicator3-1 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libharfbuzz0b \
    libjpeg62-turbo \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxkbcommon0 \
    libasound2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install --production

# Install Playwright browsers
RUN npx playwright install

# Copy application files
COPY scrape_website.js ./

# Create checkpoint directory
RUN mkdir -p /data/checkpoints

# Set checkpoint directory as volume mount point
VOLUME ["/data/checkpoints"]

# Set environment variable for checkpoint
ENV CHECKPOINT_DIR=/data/checkpoints

# Run the script
CMD ["node", "scrape_website.js"]
