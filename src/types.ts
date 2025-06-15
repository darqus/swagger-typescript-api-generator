/**
 * Represents a Swagger/OpenAPI specification
 */
export interface OpenAPISpec {
  openapi?: string
  swagger?: string
  info?: {
    title?: string
    version?: string
    description?: string
  }
  servers?: Array<{
    url: string
    description?: string
  }>
  basePath?: string
  paths?: Record<string, any>
  components?: {
    schemas?: Record<string, any>
  }
  definitions?: Record<string, any>
}

/**
 * Represents a parsed Swagger/OpenAPI specification
 */
export interface ParsedSpec {
  info: {
    title: string
    version: string
    description: string
  }
  servers: Array<{
    url: string
    description: string
  }>
  basePath: string
  paths: Record<string, ApiPath>
  components: {
    schemas: Record<string, ApiSchema>
  }
}

/**
 * Represents an API path from the specification
 */
export interface ApiPath {
  endpoints: ApiEndpoint[]
}

/**
 * Represents an API endpoint (operation) from the specification
 */
export interface ApiEndpoint {
  path: string
  method: string
  operationId: string
  summary: string
  description: string
  parameters: ApiParameter[]
  requestBody: {
    required: boolean
    contentType: string
    schema: ApiSchema | null
  } | null
  responses: Record<string, ApiResponse>
  tags: string[]
}

/**
 * Represents an API parameter from the specification
 */
export interface ApiParameter {
  name: string
  in: string
  required: boolean
  description: string
  schema: ApiSchema | null
}

/**
 * Represents an API response from the specification
 */
export interface ApiResponse {
  description: string
  schema: ApiSchema | null
}

/**
 * Represents an API schema from the specification
 */
export interface ApiSchema {
  name: string
  type: string
  format?: string
  enum?: any[]
  nullable: boolean
  properties: Record<string, ApiSchema>
  required: string[]
  items: ApiSchema | null
  allOf: ApiSchema[] | null
  oneOf: ApiSchema[] | null
  anyOf: ApiSchema[] | null
  reference: string | null
}

/**
 * Represents a generated TypeScript interface or type
 */
export interface TypeDefinition {
  name: string
  content: string
  dependencies: string[]
}

/**
 * Collection of TypeScript definitions to be generated
 */
export interface TypeDefinitions {
  interfaces: TypeDefinition[]
  types: TypeDefinition[]
  enums: TypeDefinition[]
  apiClasses: TypeDefinition[]
}
