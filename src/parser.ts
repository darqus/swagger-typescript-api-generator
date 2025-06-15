import {
  OpenAPISpec,
  ParsedSpec,
  ApiEndpoint,
  ApiPath,
  ApiParameter,
  ApiSchema,
  ApiResponse,
} from './types'

/**
 * Parses the Swagger/OpenAPI specification into a more workable format
 * @param spec The Swagger/OpenAPI specification
 * @returns A parsed representation of the specification
 */
export function parseSwaggerSpec(spec: OpenAPISpec): ParsedSpec {
  const parsedSpec: ParsedSpec = {
    info: {
      title: spec.info?.title || 'API',
      version: spec.info?.version || '1.0.0',
      description: spec.info?.description || '',
    },
    servers:
      spec.servers?.map((server) => ({
        url: server.url,
        description: server.description || '',
      })) || [],
    basePath: spec.basePath || '',
    paths: {},
    components: {
      schemas: {},
    },
  }

  // Parse paths
  for (const [path, pathItem] of Object.entries(spec.paths || {})) {
    parsedSpec.paths[path] = parsePath(path, pathItem as any)
  }

  // Parse definitions/components
  if (spec.components?.schemas) {
    for (const [name, schema] of Object.entries(spec.components.schemas)) {
      // Preserve original name casing for component schemas
      parsedSpec.components.schemas[name] = parseSchema(schema as any, name)
    }
  } else if (spec.definitions) {
    // Handle Swagger 2.0 definitions
    for (const [name, schema] of Object.entries(spec.definitions)) {
      // Preserve original name casing for definitions
      parsedSpec.components.schemas[name] = parseSchema(schema as any, name)
    }
  }

  return parsedSpec
}

/**
 * Parses a path item from the Swagger/OpenAPI spec
 * @param path The path string
 * @param pathItem The path item from the spec
 * @returns A parsed path object
 */
function parsePath(path: string, pathItem: any): ApiPath {
  const apiPath: ApiPath = { endpoints: [] }

  const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head']

  for (const method of methods) {
    if (pathItem[method]) {
      const endpoint = parseEndpoint(path, method, pathItem[method])
      apiPath.endpoints.push(endpoint)
    }
  }

  return apiPath
}

/**
 * Parses an endpoint (operation) from the Swagger/OpenAPI spec
 * @param path The path string
 * @param method The HTTP method
 * @param operation The operation object from the spec
 * @returns A parsed endpoint object
 */
function parseEndpoint(
  path: string,
  method: string,
  operation: any,
): ApiEndpoint {
  const endpoint: ApiEndpoint = {
    path,
    method,
    operationId:
      operation.operationId || `${method}${path.replace(/[^a-zA-Z0-9]/g, '')}`,
    summary: operation.summary || '',
    description: operation.description || '',
    parameters: [],
    requestBody: null,
    responses: {},
    tags: operation.tags || [],
  }

  // Parse parameters
  if (operation.parameters) {
    endpoint.parameters = operation.parameters.map((param: any) =>
      parseParameter(param),
    )
  }

  // Parse request body (OpenAPI 3.0)
  if (operation.requestBody) {
    const contentType =
      operation.requestBody.content &&
      Object.keys(operation.requestBody.content)[0]
    if (contentType) {
      const content = operation.requestBody.content[contentType]
      if (content.schema) {
        endpoint.requestBody = {
          required: operation.requestBody.required || false,
          contentType,
          schema: parseSchema(content.schema, `${endpoint.operationId}Request`),
        }
      }
    }
  }

  // Parse responses
  if (operation.responses) {
    for (const [statusCode, rawResponse] of Object.entries(
      operation.responses,
    )) {
      // TypeScript needs explicit type casting here
      const response = rawResponse as any

      const apiResponse: ApiResponse = {
        description: response.description || '',
        schema: null,
      }

      // OpenAPI 3.0 response schema
      if (response.content) {
        const contentType = Object.keys(response.content)[0]
        if (contentType && response.content[contentType].schema) {
          apiResponse.schema = parseSchema(
            response.content[contentType].schema,
            `${endpoint.operationId}Response${statusCode}`,
          )
        }
      }
      // Swagger 2.0 response schema
      else if (response.schema) {
        apiResponse.schema = parseSchema(
          response.schema,
          `${endpoint.operationId}Response${statusCode}`,
        )
      }

      endpoint.responses[statusCode] = apiResponse
    }
  }

  return endpoint
}

/**
 * Parses a parameter from the Swagger/OpenAPI spec
 * @param param The parameter object from the spec
 * @returns A parsed parameter object
 */
function parseParameter(param: any): ApiParameter {
  return {
    name: param.name,
    in: param.in,
    required: param.required || false,
    description: param.description || '',
    schema: param.schema ? parseSchema(param.schema, param.name) : null,
  }
}

/**
 * Parses a schema from the Swagger/OpenAPI spec
 * @param schema The schema object from the spec
 * @param name A name to use for the schema
 * @returns A parsed schema object
 */
function parseSchema(schema: any, name: string): ApiSchema {
  const apiSchema: ApiSchema = {
    name,
    type: schema.type || (schema.enum ? 'enum' : 'object'),
    format: schema.format,
    enum: schema.enum,
    nullable: schema.nullable || false,
    properties: {},
    required: schema.required || [],
    items: null,
    allOf: null,
    oneOf: null,
    anyOf: null,
    reference: null,
  }

  // Handle reference ($ref)
  if (schema.$ref) {
    apiSchema.reference = schema.$ref.split('/').pop()
    return apiSchema
  }

  // Handle properties for objects
  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      apiSchema.properties[propName] = parseSchema(
        propSchema as any,
        `${name}${capitalizeFirstLetter(propName)}`,
      )
    }
  }

  // Handle array items
  if (schema.type === 'array' && schema.items) {
    apiSchema.items = parseSchema(schema.items, `${name}Item`)
  }

  // Handle allOf
  if (schema.allOf) {
    apiSchema.allOf = schema.allOf.map((s: any, index: number) =>
      parseSchema(s, `${name}AllOf${index}`),
    )
  }

  // Handle oneOf
  if (schema.oneOf) {
    apiSchema.oneOf = schema.oneOf.map((s: any, index: number) =>
      parseSchema(s, `${name}OneOf${index}`),
    )
  }

  // Handle anyOf
  if (schema.anyOf) {
    apiSchema.anyOf = schema.anyOf.map((s: any, index: number) =>
      parseSchema(s, `${name}AnyOf${index}`),
    )
  }

  return apiSchema
}

/**
 * Capitalizes the first letter of a string
 * @param str The input string
 * @returns The string with the first letter capitalized
 */
function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
