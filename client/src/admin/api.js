export const UNAUTHORIZED_EVENT = 'usbonds:admin-unauthorized'

const request = async (path, { method = 'GET', body, signal } = {}) => {
  const response = await fetch(`/api/admin${path}`, {
    method,
    signal,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data =
    response.status === 204
      ? {}
      : await response.json().catch((error) => {
          if (error.name === 'AbortError') throw error
          return {}
        })
  if (response.status === 401 && path !== '/session') window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  if (!response.ok) throw Object.assign(new Error(data.error || `HTTP ${response.status}`), { status: response.status, body: data })
  return data
}

const timeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export const STREAM_URL = '/api/admin/stream'

export const adminApi = {
  session: () => request('/session'),
  login: (password) => request('/session', { method: 'POST', body: { password } }),
  logout: () => request('/session', { method: 'DELETE' }),
  forgotPassword: (locale) => request('/password/forgot', { method: 'POST', body: { locale } }),
  verifyReset: (token) => request('/password/verify', { method: 'POST', body: { token } }),
  resetPassword: (token, password, confirm) => request('/password/reset', { method: 'POST', body: { token, password, confirm } }),
  changePassword: (current, password, confirm) => request('/password/change', { method: 'POST', body: { current, password, confirm } }),
  stats: (signal) => request(`/stats?tz=${encodeURIComponent(timeZone())}`, { signal }),
  applications: (params, signal) => request(`/registrations?${new URLSearchParams(params)}`, { signal }),
  application: (id, signal) => request(`/registrations/${encodeURIComponent(id)}`, { signal }),
  setStatus: (id, status) => request(`/registrations/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } }),
  notifications: (filter, signal) => request(`/notifications?filter=${filter}&limit=60`, { signal }),
  readAll: () => request('/notifications/read', { method: 'POST', body: { all: true } }),
  setRead: (id, read) => request(`/notifications/${encodeURIComponent(id)}`, { method: 'PATCH', body: { read } }),
}
