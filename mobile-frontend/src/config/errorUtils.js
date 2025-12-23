export function parseAxiosError(error) {
  // Returns an object { message, status, isNetwork }
  if (!error) return { message: 'Unknown error', status: null, isNetwork: false };

  // Axios network error (no response)
  if (error.request && !error.response) {
    const msg = error.message || 'Network error - no response from server';
    return { message: msg, status: null, isNetwork: true };
  }

  // Axios response error
  if (error.response) {
    const status = error.response.status;
    let message = 'Server error';
    const data = error.response.data;
    if (data) {
      if (typeof data === 'string') message = data;
      else if (data.message) message = data.message;
      else if (data.error) message = data.error;
    }
    return { message, status, isNetwork: false };
  }

  // Fallback
  return { message: error.message || 'Unknown error', status: null, isNetwork: false };
}
