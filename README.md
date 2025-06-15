# Swagger TypeScript API Generator for Fake REST API

A tool to generate TypeScript API types from Fake REST API's Swagger/OpenAPI specification.

## Overview

This tool fetches the OpenAPI specification from Fake REST API, parses it, and generates TypeScript interfaces, types, and API client classes. The generated code can be used to interact with the Fake REST API in a type-safe manner.

## Features

- Fetches OpenAPI specification from Fake REST API
- Generates TypeScript interfaces for all models
- Generates TypeScript API client classes for all endpoints
- Supports path, query, and header parameters
- Handles request bodies and responses

## Usage

### Generate API Types

```bash
# Using default Fake REST API URL
npm run generate

# Using a custom URL
npm run generate -- "https://custom-url-to-swagger.json" "./output/path.ts"

# Using the generate-and-copy script
./generate-and-copy.sh
```

### Example Usage of Generated API Client

```typescript
import { ApiClient } from './generated/api-types';

async function main() {
  // Initialize the API client with Fake REST API base URL
  const api = new ApiClient('https://fakerestapi.azurewebsites.net');

  try {
    // Get all activities
    const activities = await api.activitiesApi.getActivities();
    console.log('Activities:', activities);
    
    // Get a specific book
    const book = await api.booksApi.getBook(1);
    console.log('Book 1:', book);
    
    // Create a new author
    const newAuthor = await api.authorsApi.createAuthor({
      id: 0,
      idBook: 1,
      firstName: "John",
      lastName: "Doe"
    });
    console.log('Created author:', newAuthor);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

## Available Fake REST API Endpoints

The generated API client provides access to all Fake REST API endpoints:

- Activities: `/api/v1/Activities`
- Authors: `/api/v1/Authors`
- Books: `/api/v1/Books`
- CoverPhotos: `/api/v1/CoverPhotos`
- Users: `/api/v1/Users`

## Development

### Project Structure

- `src/fetcher.ts`: Fetches the OpenAPI specification
- `src/parser.ts`: Parses the OpenAPI specification
- `src/generator.ts`: Generates TypeScript definitions
- `src/writer.ts`: Writes the generated definitions to a file
- `src/index.ts`: Main entry point
- `src/example.ts`: Example usage of the generated API client

### Building

```bash
npm run build
```

### Running

```bash
npm run start
```

## License

MIT