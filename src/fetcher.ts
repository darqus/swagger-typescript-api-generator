import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import { URL } from 'url'

/**
 * Fetches the Swagger/OpenAPI specification from a URL or local file
 * @param urlOrPath URL or file path to the Swagger specification
 * @returns The parsed Swagger specification as a JavaScript object
 */
export async function fetchSwaggerSpec(urlOrPath: string): Promise<any> {
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return fetchFromUrl(urlOrPath)
  } else {
    return fetchFromFile(urlOrPath)
  }
}

/**
 * Fetches the Swagger specification from a URL
 * @param url URL to the Swagger specification
 * @returns The parsed Swagger specification as a JavaScript object
 */
async function fetchFromUrl(url: string): Promise<any> {
  const parsedUrl = new URL(url)
  const client = parsedUrl.protocol === 'https:' ? https : http

  return new Promise((resolve, reject) => {
    const req = client.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(
          new Error(`Failed to fetch Swagger spec: HTTP ${res.statusCode}`),
        )
        return
      }

      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve(parsed)
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          reject(new Error(`Failed to parse Swagger spec: ${errorMessage}`))
        }
      })
    })

    req.on('error', (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      reject(new Error(`Failed to fetch Swagger spec: ${errorMessage}`))
    })

    req.end()
  })
}

/**
 * Fetches the Swagger specification from a local file
 * @param filePath Path to the local Swagger specification file
 * @returns The parsed Swagger specification as a JavaScript object
 */
async function fetchFromFile(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    fs.readFile(path.resolve(filePath), 'utf8', (err, data) => {
      if (err) {
        reject(new Error(`Failed to read Swagger spec file: ${err.message}`))
        return
      }

      try {
        const parsed = JSON.parse(data)
        resolve(parsed)
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        reject(new Error(`Failed to parse Swagger spec file: ${errorMessage}`))
      }
    })
  })
}
