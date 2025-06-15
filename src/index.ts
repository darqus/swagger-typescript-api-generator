import { fetchSwaggerSpec } from './fetcher'
import { parseSwaggerSpec } from './parser'
import { generateTypeDefinitions } from './generator'
import { writeTypesToFile } from './writer'

const main = async () => {
  try {
    const url =
      process.argv[2] ||
      'https://fakerestapi.azurewebsites.net/swagger/v1/swagger.json'
    console.log(`Fetching OpenAPI specification from Fake REST API: ${url}`)

    const swaggerSpec = await fetchSwaggerSpec(url)
    console.log('Successfully fetched OpenAPI specification')

    console.log('Parsing OpenAPI specification...')
    const parsedSpec = parseSwaggerSpec(swaggerSpec)

    console.log('Generating TypeScript definitions...')
    const typeDefinitions = generateTypeDefinitions(parsedSpec)

    const outputPath = process.argv[3] || './src/generated/api-types.ts'
    console.log(`Writing TypeScript definitions to: ${outputPath}`)
    await writeTypesToFile(typeDefinitions, outputPath)

    console.log('Done!')
  } catch (error: unknown) {
    console.error(
      'Error generating API types:',
      error instanceof Error ? error.message : String(error),
    )
    process.exit(1)
  }
}

main()
