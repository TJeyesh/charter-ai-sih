#!/usr/bin/env bash

# Colors for terminal output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting DockInsights Development Server...${NC}"
echo "Running 'npm run dev'..."

# Start the dev server
npm run dev
