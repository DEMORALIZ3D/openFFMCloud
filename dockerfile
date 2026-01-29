# Use Node 24 LTS (Krypton) on Debian Bookworm Slim
# "slim" images remove man pages and extra tools, saving ~800MB vs the full image
FROM node:24-bookworm-slim

# Set env to prevent apt interaction warnings
ENV DEBIAN_FRONTEND=noninteractive

# 1. Install Dependencies
# - wget/gnupg: To fetch the OpenSCAD repo key
# - xvfb: "X Virtual Framebuffer" (needed to trick OpenSCAD into thinking it has a screen)
# - libgl1/mesa: Graphics drivers required for CSG rendering
# - python3/pip: For 3MF to GLB conversion
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    ca-certificates \
    xvfb \
    libgl1-mesa-glx \
    libgl1-mesa-dri \
    libgtk-3-0 \
    libglu1-mesa \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Python libraries for 3MF conversion
RUN pip3 install --break-system-packages trimesh lxml

# 2. Add OpenSCAD Nightly Repository (Debian 12 / Bookworm)
# We use the OpenSUSE build service which hosts the official Nightlies
RUN wget -qO - https://download.opensuse.org/repositories/home:/t-paul/Debian_12/Release.key | gpg --dearmor > /etc/apt/trusted.gpg.d/openscad.gpg \
    && echo 'deb http://download.opensuse.org/repositories/home:/t-paul/Debian_12/ /' > /etc/apt/sources.list.d/openscad.list

# 3. Install OpenSCAD Nightly
# We strictly avoid "recommends" to keep the image small
# We also create a symlink because the binary is named 'openscad-nightly' but the app calls 'openscad'
RUN apt-get update && apt-get install -y --no-install-recommends \
    openscad-nightly \
    && ln -s /usr/bin/openscad-nightly /usr/bin/openscad \
    && rm -rf /var/lib/apt/lists/*

# 4. App Setup
WORKDIR /usr/src/app

# Layer Caching: Copy package files first
COPY package*.json ./
COPY client/package*.json ./client/

# Install deps (Clean install)
RUN npm install && npm cache clean --force
RUN cd client && npm install && npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Build Client
RUN cd client && npm run build

# Create directory for renders
RUN mkdir -p public/renders

# Expose API Port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
