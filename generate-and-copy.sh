#!/bin/bash

# Exit on error
set -e

# Variables
SWAGGER_URL=${1:-"https://fakerestapi.azurewebsites.net/swagger/v1/swagger.json"}
OUTPUT_DIR="./src/generated"
OUTPUT_FILE="$OUTPUT_DIR/api-types.ts"
TARGET_DIR="../landing-mylara/src/types"

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Check if target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${YELLOW}Target directory does not exist. Creating: ${TARGET_DIR}${NC}"
    mkdir -p "$TARGET_DIR"
fi

echo -e "${GREEN}Generating API types from Fake REST API: ${SWAGGER_URL}${NC}"

# Run the generator
npm run generate -- "$SWAGGER_URL" "$OUTPUT_FILE"

echo -e "${GREEN}Copying API types to: ${TARGET_DIR}${NC}"

# Copy the generated file to the target directory
cp "$OUTPUT_FILE" "$TARGET_DIR/"

echo -e "${GREEN}Successfully generated and copied API types to: ${TARGET_DIR}/api-types.ts${NC}"
