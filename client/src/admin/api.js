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
  login: (password, email) => request('/session', { method: 'POST', body: email ? { password, email } : { password } }),
  logout: () => request('/session', { method: 'DELETE' }),
  forgotPassword: (locale) => request('/password/forgot', { method: 'POST', body: { locale } }),
  verifyReset: (token) => request('/password/verify', { method: 'POST', body: { token } }),
  resetPassword: (token, password, confirm) => request('/password/reset', { method: 'POST', body: { token, password, confirm } }),
  changePassword: (current, password, confirm) => request('/password/change', { method: 'POST', body: { current, password, confirm } }),
  stats: (signal) => request(`/stats?tz=${encodeURIComponent(timeZone())}`, { signal }),
  applications: (params, signal) => request(`/registrations?${new URLSearchParams(params)}`, { signal }),
  application: (id, signal) => request(`/registrations/${encodeURIComponent(id)}`, { signal }),
  setStatus: (id, status) => request(`/registrations/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } }),
  setNotes: (id, notes) => request(`/registrations/${encodeURIComponent(id)}`, { method: 'PATCH', body: { notes } }),
  deleteApplication: (id) => request(`/registrations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  stories: (signal) => request('/stories', { signal }),
  saveStory: (story) => request(story.id ? `/stories/${encodeURIComponent(story.id)}` : '/stories', { method: story.id ? 'PATCH' : 'POST', body: story }),
  deleteStory: (id) => request(`/stories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  notifications: (filter, signal) => request(`/notifications?filter=${filter}&limit=60`, { signal }),
  readAll: () => request('/notifications/read', { method: 'POST', body: { all: true } }),
  setRead: (id, read) => request(`/notifications/${encodeURIComponent(id)}`, { method: 'PATCH', body: { read } }),
  summary: (signal) => request('/ops/summary', { signal }),
  search: (q, signal) => request(`/ops/search?q=${encodeURIComponent(q)}`, { signal }),
  missions: (status, signal) => request(`/ops/missions${status ? `?status=${encodeURIComponent(status)}` : ''}`, { signal }),
  saveMission: (mission) => request(mission.id ? `/ops/missions/${encodeURIComponent(mission.id)}` : '/ops/missions', { method: mission.id ? 'PATCH' : 'POST', body: mission }),
  ledger: (params, signal) => request(`/ops/ledger?${new URLSearchParams(params)}`, { signal }),
  setOpening: (opening) => request('/ops/book', { method: 'POST', body: { opening } }),
  addEntry: (entry) => request('/ops/ledger', { method: 'POST', body: entry }),
  approveEntry: (id) => request(`/ops/ledger/${encodeURIComponent(id)}/approve`, { method: 'POST', body: {} }),
  reverseEntry: (id, reason) => request(`/ops/ledger/${encodeURIComponent(id)}/reverse`, { method: 'POST', body: { reason } }),
  audit: (q, signal) => request(`/ops/audit?q=${encodeURIComponent(q || '')}`, { signal }),
  staff: (signal) => request('/ops/staff', { signal }),
  saveStaff: (account) => request(account.id ? `/ops/staff/${encodeURIComponent(account.id)}` : '/ops/staff', { method: account.id ? 'PATCH' : 'POST', body: account }),
  openWhatsApp: (id, message, force = false) => request(`/registrations/${encodeURIComponent(id)}/whatsapp`, { method: 'POST', body: { message, force } }),
  registrationWindow: (signal) => request('/registration-window', { signal }),
  saveRegistrationWindow: (body) => request('/registration-window', { method: 'PUT', body }),
}
