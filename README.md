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
import { ApiClient } from './generated/api-types'

const main = async () => {
  // Initialize the API client with Fake REST API base URL
  const api = new ApiClient('https://fakerestapi.azurewebsites.net')

  try {
    // Example API call using the generated client
    // This is just an example - replace with actual endpoints from Fake REST API
    // const activities = await api.activitiesApi.getActivities()
    // console.log('Activities:', activities)

    // const books = await api.booksApi.getBooks()
    // console.log('Books:', books)

    // const authors = await api.authorsApi.getAuthors()
    // console.log('Authors:', authors)

    console.log('Fake REST API client initialized successfully')
    console.log('Available API categories:')

    // List all available API categories
    Object.keys(api).forEach((key) => {
      if (key.endsWith('Api')) {
        console.log(`- ${key}`)
      }
    })

    console.log('\nReady to make API calls to Fake REST API!')
  } catch (error: unknown) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error),
    )
  }
}

main()
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
