/**
 * Utility function to extract and format error messages from various error types
 * @param {Error|Object} error - The error object
 * @returns {string} - Human-readable error message
 */
export function getErrorMessage(error) {
  if (!error) return 'Unknown error occurred'

  // Supabase error with message property
  if (error.message) {
    return error.message
  }

  // Supabase error with hint property
  if (error.hint) {
    return error.hint
  }

  // Supabase error with details property
  if (error.details) {
    return error.details
  }

  // Supabase error might have a 'code' property
  if (error.code) {
    return `Error ${error.code}: ${error.message || 'Unknown'}`
  }

  // PostgreSQL error with status
  if (error.status) {
    return `Database error: ${error.status}`
  }

  // Standard Error object
  if (error instanceof Error) {
    return error.toString()
  }

  // Fallback: stringify the error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

/**
 * Log error with proper formatting
 * @param {string} context - Context/location of the error
 * @param {Error|Object} error - The error object
 */
export function logError(context, error) {
  // Ignore abort signals - they are expected during navigation/unmount
  try {
    if (!error) {
      console.error(`${context}: Unknown error`, error)
      return
    }

    // Detect abort/timeout errors across different platforms and shapes
    const lower = (str) => (typeof str === 'string' ? str.toLowerCase() : '')
    const msg = error?.message || ''
    if (
      error?.name === 'AbortError' ||
      lower(msg).includes('abort') ||
      lower(String(error)).includes('signal is aborted') ||
      lower(String(error)).includes('aborted')
    ) {
      // Use info so it's visible in development without marking as an error
      console.info(`${context}: request aborted`) 
      return
    }

    const message = getErrorMessage(error)
    console.error(`${context}: ${message}`, error)
  } catch (logErr) {
    // Fallback safe log
    console.error(`${context}: error while logging error`, logErr)
  }
}

