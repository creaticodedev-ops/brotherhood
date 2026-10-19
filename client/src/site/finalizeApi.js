const request = async (path, { method = 'GET', body, headers, signal } = {}) => {
  const response = await fetch(`/api/finalize${path}`, {
    method,
    signal,
    headers: body && !(body instanceof Blob) ? { 'content-type': 'application/json', ...headers } : headers,
    body: body instanceof Blob ? body : body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error(data.error || `HTTP ${response.status}`), { status: response.status, body: data })
  return data
}

export const finalizeApi = {
  load: (token, locale, signal) => request(`/${encodeURIComponent(token)}?locale=${encodeURIComponent(locale || 'fr')}`, { signal }),
  saveInfo: (token, body) => request(`/${encodeURIComponent(token)}/info`, { method: 'PATCH', body }),
  acceptTerms: (token, body) => request(`/${encodeURIComponent(token)}/terms`, { method: 'POST', body }),
  uploadReceipt: (token, file, locale, onProgress) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `/api/finalize/${encodeURIComponent(token)}/receipt?locale=${encodeURIComponent(locale || 'fr')}`)
      xhr.setRequestHeader('content-type', file.type)
      xhr.setRequestHeader('x-file-name', file.name || 'receipt')
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(event.loaded / event.total)
      }
      xhr.onload = () => {
        let data = {}
        try {
          data = JSON.parse(xhr.responseText || '{}')
        } catch {
          data = {}
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data)
        else reject(Object.assign(new Error(data.error || `HTTP ${xhr.status}`), { status: xhr.status, body: data }))
      }
      xhr.onerror = () => reject(Object.assign(new Error('network'), { status: 0, body: {} }))
      xhr.send(file)
    }),
}
