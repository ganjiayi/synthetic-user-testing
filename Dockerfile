FROM node:20-slim

# Install Python + pip
RUN apt-get update && apt-get install -y python3 python3-pip --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install Python pipeline dependencies
RUN pip3 install python-docx openpyxl python-pptx --break-system-packages

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

EXPOSE 3001

CMD ["node", "src/server/index.js"]
