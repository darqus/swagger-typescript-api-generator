import {
  ParsedSpec,
  ApiSchema,
  ApiEndpoint,
  TypeDefinitions,
  TypeDefinition,
} from './types'

/**
 * Generates TypeScript definitions from a parsed Swagger/OpenAPI specification
 * @param parsedSpec The parsed Swagger/OpenAPI specification
 * @returns Generated TypeScript definitions
 */
export function generateTypeDefinitions(
  parsedSpec: ParsedSpec,
): TypeDefinitions {
  const typeDefinitions: TypeDefinitions = {
    interfaces: [],
    types: [],
    enums: [],
    apiClasses: [],
  } // Process schemas from components
  for (const [name, schema] of Object.entries(parsedSpec.components.schemas)) {
    processSchema(schema, typeDefinitions)
  }

  // Process API endpoints
  const endpointsByTag = groupEndpointsByTag(parsedSpec)

  for (const [tag, endpoints] of Object.entries(endpointsByTag)) {
    const apiClassName = toPascalCase(tag) + 'Api'
    const apiClassContent = generateApiClass(
      apiClassName,
      endpoints as ApiEndpoint[],
    )

    typeDefinitions.apiClasses.push({
      name: apiClassName,
      content: apiClassContent,
      dependencies: [],
    })
  }

  return typeDefinitions
}

/**
 * Groups API endpoints by tag
 * @param parsedSpec The parsed Swagger/OpenAPI specification
 * @returns A record of tag to list of endpoints
 */
function groupEndpointsByTag(
  parsedSpec: ParsedSpec,
): Record<string, ApiEndpoint[]> {
  const endpointsByTag: Record<string, ApiEndpoint[]> = {}

  // Collect all endpoints from all paths
  const allEndpoints: ApiEndpoint[] = []
  for (const path of Object.values(parsedSpec.paths)) {
    allEndpoints.push(...path.endpoints)
  }

  // Group by tag
  for (const endpoint of allEndpoints) {
    const tags = endpoint.tags.length > 0 ? endpoint.tags : ['default']

    for (const tag of tags) {
      if (!endpointsByTag[tag]) {
        endpointsByTag[tag] = []
      }

      endpointsByTag[tag].push(endpoint)
    }
  }

  return endpointsByTag
}

/**
 * Processes a schema and adds the corresponding TypeScript definitions
 * @param schema The API schema to process
 * @param typeDefinitions The collection of TypeScript definitions
 * @returns The TypeScript type name for the schema
 */
function processSchema(
  schema: ApiSchema,
  typeDefinitions: TypeDefinitions,
): string {
  if (schema.reference) {
    return schema.reference
  }

  // Check if this schema is already processed
  const existingType = findExistingType(schema.name, typeDefinitions)
  if (existingType) {
    return existingType
  }

  if (schema.enum && schema.enum.length > 0) {
    return processEnumSchema(schema, typeDefinitions)
  } else if (
    schema.type === 'object' ||
    Object.keys(schema.properties).length > 0
  ) {
    return processObjectSchema(schema, typeDefinitions)
  } else if (schema.type === 'array' && schema.items) {
    return processArraySchema(schema, typeDefinitions)
  } else if (schema.allOf && schema.allOf.length > 0) {
    return processAllOfSchema(schema, typeDefinitions)
  } else if (schema.oneOf && schema.oneOf.length > 0) {
    return processOneOfSchema(schema, typeDefinitions)
  } else if (schema.anyOf && schema.anyOf.length > 0) {
    return processAnyOfSchema(schema, typeDefinitions)
  } else {
    return toTsType(schema.type, schema.format)
  }
}

/**
 * Finds an existing TypeScript definition for a schema
 * @param name The name of the schema
 * @param typeDefinitions The collection of TypeScript definitions
 * @returns The name of the existing type, or null if not found
 */
function findExistingType(
  name: string,
  typeDefinitions: TypeDefinitions,
): string | null {
  for (const definition of [
    ...typeDefinitions.interfaces,
    ...typeDefinitions.types,
    ...typeDefinitions.enums,
  ]) {
    if (definition.name === name) {
      return definition.name
    }
  }

  return null
}

/**
 * Processes an enum schema and adds it to the TypeScript definitions
 * @param schema The enum schema to process
 * @param typeDefinitions The collection of TypeScript definitions
 * @returns The TypeScript type name for the schema
 */
function processEnumSchema(
  schema: ApiSchema,
  typeDefinitions: TypeDefinitions,
): string {
  const name = sanitizeTypeName(schema.name)
  const enumValues = schema.enum || []
  const isStringEnum = enumValues.every((value) => typeof value === 'string')

  let enumContent = ''

  if (isStringEnum) {
    enumContent = `export enum ${name} {\n`
    enumValues.forEach((value) => {
      // Create a valid enum key from the value
      const key = String(value).replace(/[^a-zA-Z0-9_]/g, '_')
      enumContent += `  ${key} = "${value}",\n`
    })
    enumContent += '}'
  } else {
    enumContent = `export type ${name} = ${enumValues
      .map((value) => JSON.stringify(value))
      .join(' | ')};`
  }

  typeDefinitions.enums.push({
    name,
    content: enumContent,
    dependencies: [],
  })

  return name
}

/**
 * Processes an object schema and adds it to the TypeScript definitions
 * @param schema The object schema to process
 * @param typeDefinitions The collection of TypeScript definitions
 * @returns The TypeScript type name for the schema
 */
function processObjectSchema(
  schema: ApiSchema,
  typeDefinitions: TypeDefinitions,
): string {
  const name = sanitizeTypeName(schema.name)
  let interfaceContent = `export interface ${name} {\n`
  const dependencies: string[] = []
  for (const [propName, propSchemaRaw] of Object.entries(schema.properties)) {
    const propSchema = propSchemaRaw as ApiSchema
    const propType = processSchema(propSchema, typeDefinitions)
    const isRequired = schema.required.includes(propName)
    const nullable = propSchema.nullable ? ' | null' : ''

    interfaceContent += `  ${propName}${
      isRequired ? '' : '?'
    }: ${propType}${nullable};\n`

    if (!isBasicType(propType)) {
      dependencies.push(propType)
    }
  }

  interfaceContent += '}'

  typeDefinitions.interfaces.push({
    name,
    content: interfaceContent,
    dependencies,
  })

  return name
}

/**
 * Processes an array schema and adds it to the TypeScript definitions
 * @param schema The array schema to process
 * @param typeDefinitions The collection of TypeScript definitions
 * @returns The TypeScript type name for the schema
 */
function processArraySchema(
  schema: ApiSchema,
  typeDefinitions: TypeDefinitions,
): string {
  if (!schema.items) {
    return 'any[]'
  }

  const itemType = processSchema(schema.items, typeDefinitions)
  const name = sanitizeTypeName(schema.name)

  const dependencies: string[] = []
  if (!isBasicType(itemType)) {
    dependencies.push(itemType)
  }

  const arrayTypeContent = `export type ${name} = ${itemType}[];`

  typeDefinitions.types.push({
    name,
    content: arrayTypeContent,
    dependencies,
  })

  return name
}

/**
 * Processes an allOf schema and adds it to the TypeScript definitions
 * @param schema The allOf schema to process
 * @param typeDefinitions The collection of TypeScript definitions
 * @returns The TypeScript type name for the schema
 */
function processAllOfSchema(
  schema: ApiSchema,
  typeDefinitions: TypeDefinitions,
): string {
  if (!schema.allOf) {
    return 'any'
  }

  const name = sanitizeTypeName(schema.name)
  const dependencies: string[] = []

  const componentTypes = schema.allOf.map((component) => {
    const componentType = processSchema(component, typeDefinitions)
    if (!isBasicType(componentType)) {
      dependencies.push(componentType)
    }
    return componentType
  })

  // Create an intersection type
  const typeContent = `export type ${name} = ${componentTypes.join(' & ')};`

  typeDefinitions.types.push({
    name,
    content: typeContent,
    dependencies,
  })

  return name
}

/**
 * Processes a oneOf schema and adds it to the TypeScript definitions
 * @param schema The oneOf schema to process
 * @param typeDefinitions The collection of TypeScript definitions
 * @returns The TypeScript type name for the schema
 */
function processOneOfSchema(
  schema: ApiSchema,
  typeDefinitions: TypeDefinitions,
): string {
  if (!schema.oneOf) {
    return 'any'
  }

  const name = sanitizeTypeName(schema.name)
  const dependencies: string[] = []

  const componentTypes = schema.oneOf.map((component) => {
    const componentType = processSchema(component, typeDefinitions)
    if (!isBasicType(componentType)) {
      dependencies.push(componentType)
    }
    return componentType
  })

  // Create a union type
  const typeContent = `export type ${name} = ${componentTypes.join(' | ')};`

  typeDefinitions.types.push({
    name,
    content: typeContent,
    dependencies,
  })

  return name
}

/**
 * Processes an anyOf schema and adds it to the TypeScript definitions
 * @param schema The anyOf schema to process
 * @param typeDefinitions The collection of TypeScript definitions
 * @returns The TypeScript type name for the schema
 */
function processAnyOfSchema(
  schema: ApiSchema,
  typeDefinitions: TypeDefinitions,
): string {
  if (!schema.anyOf) {
    return 'any'
  }

  const name = sanitizeTypeName(schema.name)
  const dependencies: string[] = []

  const componentTypes = schema.anyOf.map((component) => {
    const componentType = processSchema(component, typeDefinitions)
    if (!isBasicType(componentType)) {
      dependencies.push(componentType)
    }
    return componentType
  })

  // Create a union type (same as oneOf in TypeScript)
  const typeContent = `export type ${name} = ${componentTypes.join(' | ')};`

  typeDefinitions.types.push({
    name,
    content: typeContent,
    dependencies,
  })

  return name
}

/**
 * Generates an API class for a group of endpoints
 * @param apiClassName The name of the API class
 * @param endpoints The endpoints to include in the API class
 * @returns The generated API class content
 */
function generateApiClass(
  apiClassName: string,
  endpoints: ApiEndpoint[],
): string {
  let content = `export class ${apiClassName} {\n`
  content += `  private baseUrl: string;\n\n`

  content += `  constructor(baseUrl: string = '') {\n`
  content += `    this.baseUrl = baseUrl;\n`
  content += `  }\n\n`

  for (const endpoint of endpoints) {
    content += generateEndpointMethod(endpoint)
    content += '\n'
  }

  content += `}\n`
  return content
}

/**
 * Generates a method for an API endpoint
 * @param endpoint The API endpoint
 * @returns The generated method content
 */
function generateEndpointMethod(endpoint: ApiEndpoint): string {
  const methodName = endpoint.operationId
  const path = endpoint.path
  const method = endpoint.method.toUpperCase()

  // Build parameters
  const queryParams = endpoint.parameters.filter((p) => p.in === 'query')
  const pathParams = endpoint.parameters.filter((p) => p.in === 'path')
  const headerParams = endpoint.parameters.filter((p) => p.in === 'header')

  let methodParams = ''
  let methodJsDoc = `  /**\n`
  methodJsDoc += `   * ${endpoint.summary}\n`
  if (endpoint.description) {
    methodJsDoc += `   * ${endpoint.description}\n`
  }

  // Add path parameters
  if (pathParams.length > 0) {
    methodParams += pathParams
      .map((p) => {
        methodJsDoc += `   * @param ${p.name} ${p.description}\n`
        const tsType = p.schema
          ? toTsType(p.schema.type, p.schema.format)
          : 'any'
        return `${p.name}: ${tsType}`
      })
      .join(', ')
  }

  // Add query parameters
  if (queryParams.length > 0) {
    if (methodParams) methodParams += ', '
    methodJsDoc += `   * @param queryParams Query parameters\n`
    methodParams += `queryParams: { ${queryParams
      .map((p) => {
        const tsType = p.schema
          ? toTsType(p.schema.type, p.schema.format)
          : 'any'
        return `${p.name}${p.required ? '' : '?'}: ${tsType}`
      })
      .join('; ')} }`
  }

  // Add request body parameter
  if (endpoint.requestBody) {
    if (methodParams) methodParams += ', '
    methodJsDoc += `   * @param data Request body data\n`
    methodParams += `data: any` // We'll refine this later
  }

  // Add headers parameter
  if (headerParams.length > 0) {
    if (methodParams) methodParams += ', '
    methodJsDoc += `   * @param headers Custom headers\n`
    methodParams += `headers?: Record<string, string>`
  }

  // Add options parameter
  if (methodParams) methodParams += ', '
  methodJsDoc += `   * @param options Request options\n`
  methodParams += `options?: RequestOptions`

  methodJsDoc += `   */\n`

  // Build method signature
  let methodContent = `${methodJsDoc}  async ${toCamelCase(
    methodName,
  )}(${methodParams}): Promise<any> {\n`

  // URL construction
  methodContent += `    let url = this.baseUrl + '${path}';\n`

  // Replace path parameters
  if (pathParams.length > 0) {
    methodContent += `\n    // Replace path parameters\n`
    for (const param of pathParams) {
      methodContent += `    url = url.replace('{${param.name}}', encodeURIComponent(String(${param.name})));\n`
    }
  }

  // Add query parameters
  if (queryParams.length > 0) {
    methodContent += `\n    // Add query parameters\n`
    methodContent += `    const searchParams = new URLSearchParams();\n`
    for (const param of queryParams) {
      methodContent += `    if (queryParams.${param.name} !== undefined) {\n`
      methodContent += `      searchParams.append('${param.name}', String(queryParams.${param.name}));\n`
      methodContent += `    }\n`
    }
    methodContent += `    const queryString = searchParams.toString();\n`
    methodContent += `    if (queryString) {\n`
    methodContent += `      url += \`?\${queryString}\`;\n`
    methodContent += `    }\n`
  }

  // Prepare request options
  methodContent += `\n    // Prepare request options\n`
  methodContent += `    const fetchOptions: RequestInit = {\n`
  methodContent += `      method: '${method}',\n`
  methodContent += `      ...options,\n`
  methodContent += `      headers: {\n`
  methodContent += `        'Content-Type': 'application/json',\n`

  // Add header parameters
  if (headerParams.length > 0) {
    for (const param of headerParams) {
      if (param.required) {
        methodContent += `        '${param.name}': headers?.['${param.name}'] || '',\n`
      } else {
        methodContent += `        ...(headers?.['${param.name}'] ? { '${param.name}': headers['${param.name}'] } : {}),\n`
      }
    }
  }

  methodContent += `        ...headers,\n`
  methodContent += `      },\n`

  // Add request body
  if (endpoint.requestBody) {
    methodContent += `      body: JSON.stringify(data),\n`
  }

  methodContent += `    };\n\n`

  // Make fetch request
  methodContent += `    // Make request\n`
  methodContent += `    const response = await fetch(url, fetchOptions);\n`
  methodContent += `    const contentType = response.headers.get('Content-Type') || '';\n\n`

  // Handle response
  methodContent += `    // Handle response\n`
  methodContent += `    if (!response.ok) {\n`
  methodContent += `      throw new Error(\`API error: \${response.status} \${await response.text()}\`);\n`
  methodContent += `    }\n\n`

  // Parse response body
  methodContent += `    // Parse response body\n`
  methodContent += `    if (contentType.includes('application/json')) {\n`
  methodContent += `      return await response.json();\n`
  methodContent += `    } else {\n`
  methodContent += `      return await response.text();\n`
  methodContent += `    }\n`

  methodContent += `  }\n`
  return methodContent
}

/**
 * Converts a Swagger/OpenAPI type to a TypeScript type
 * @param type The Swagger/OpenAPI type
 * @param format The Swagger/OpenAPI format
 * @returns The corresponding TypeScript type
 */
function toTsType(type?: string, format?: string): string {
  if (!type) return 'any'

  switch (type.toLowerCase()) {
    case 'integer':
    case 'number':
      return format === 'int64' ? 'bigint' : 'number'
    case 'string':
      if (format === 'date' || format === 'date-time') return 'Date'
      if (format === 'binary') return 'Blob'
      return 'string'
    case 'boolean':
      return 'boolean'
    case 'array':
      return 'any[]'
    case 'object':
    default:
      return 'Record<string, any>'
  }
}

/**
 * Checks if a TypeScript type is a basic type
 * @param typeName The TypeScript type name
 * @returns True if the type is a basic type, false otherwise
 */
function isBasicType(typeName: string): boolean {
  const basicTypes = [
    'string',
    'number',
    'boolean',
    'any',
    'Date',
    'void',
    'null',
    'undefined',
    'Blob',
  ]

  // Check for array types like string[], number[], etc.
  if (typeName.endsWith('[]')) {
    return isBasicType(typeName.slice(0, -2))
  }

  return basicTypes.includes(typeName)
}

/**
 * Converts a string to Pascal case
 * @param str The input string
 * @returns The Pascal case string
 */
function toPascalCase(str: string): string {
  // Handle strings that already have mixed casing
  // Check if the string already contains uppercase letters
  const containsUppercase = /[A-Z]/.test(str)

  if (containsUppercase) {
    // Split string by delimiters but preserve existing case within words
    return str
      .split(/[-_\s]/)
      .map((word) => {
        // If the word is already in PascalCase or UPPERCASE, keep it as is
        if (/^[A-Z]/.test(word)) {
          return word
        }
        return word.charAt(0).toUpperCase() + word.slice(1)
      })
      .join('')
  }

  // Standard pascal case conversion for lowercase strings
  return str
    .split(/[-_\s]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

/**
 * Converts a string to camel case
 * @param str The input string
 * @returns The camel case string
 */
function toCamelCase(str: string): string {
  const pascal = toPascalCase(str)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

/**
 * Sanitizes a name to use as a TypeScript type name
 * @param name The name to sanitize
 * @returns The sanitized name
 */
function sanitizeTypeName(name: string): string {
  // Special case handling to prevent case distortion
  // For names that contain uppercase letters and "DTO" suffix, preserve the exact case
  if (/DTO$/.test(name) || /[A-Z][a-z]+[A-Z]/.test(name)) {
    return name.replace(/[^\w]/g, '')
  }

  // If the name already follows PascalCase convention with uppercase letters, preserve it
  if (/^[A-Z]/.test(name)) {
    return name.replace(/[^\w]/g, '')
  }

  // Otherwise apply standard PascalCase conversion
  let sanitized = name.replace(/[^\w\s]/g, '')
  return toPascalCase(sanitized)
}
