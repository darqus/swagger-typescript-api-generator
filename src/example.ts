// Обратите внимание: файл api-types.ts будет создан после запуска генератора
// Таким образом этот файл является только примером использования
// Этот импорт закомментирован, чтобы избежать ошибок компиляции
// import { ApiClient } from './generated/api-types'

// Заглушка для примера
interface RequestOptions extends RequestInit {
  timeout?: number
}

class ApiClient {
  constructor(baseUrl: string = '') {}
}

/**
 * Example of using the generated API client with Fake REST API
 */
const main = async() => {
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
