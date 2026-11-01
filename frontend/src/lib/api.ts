const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchEvents(location: string = 'Bengaluru', category: string = 'Hackathons', refresh: boolean = false) {
  const res = await fetch(`${API_BASE}/events?location=${encodeURIComponent(location)}&category=${encodeURIComponent(category)}&refresh=${refresh}`);
  return res.json();
}

export async function fetchEventDetails(eventId: string) {
  const res = await fetch(`${API_BASE}/events/${eventId}`);
  return res.json();
}

export async function askResearchAgent(eventId: string, question: string) {
  const res = await fetch(`${API_BASE}/events/${eventId}/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });
  return res.json();
}

export async function interpretNaturalFilter(naturalQuery: string) {
  const res = await fetch(`${API_BASE}/filters/interpret`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ natural_query: naturalQuery })
  });
  return res.json();
}

export async function applyStructuredFilter(criteria: any, searchText?: string) {
  const res = await fetch(`${API_BASE}/filters/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ criteria, search_text: searchText })
  });
  return res.json();
}

export async function fetchUserFilters(userId?: string) {
  const res = await fetch(`${API_BASE}/filters${userId ? `?user_id=${userId}` : ''}`);
  return res.json();
}

export async function saveUserFilter(name: string, naturalQuery: string, criteria: any, userId?: string) {
  const res = await fetch(`${API_BASE}/filters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, natural_query: naturalQuery, structured_criteria: criteria, user_id: userId })
  });
  return res.json();
}

export async function deleteUserFilter(filterId: string, userId?: string) {
  const res = await fetch(`${API_BASE}/filters/${filterId}${userId ? `?user_id=${userId}` : ''}`, {
    method: 'DELETE'
  });
  return res.json();
}

export async function fetchUserProfile(userId?: string) {
  const res = await fetch(`${API_BASE}/profile${userId ? `?user_id=${userId}` : ''}`);
  return res.json();
}

export async function updateUserProfile(profile: any) {
  const res = await fetch(`${API_BASE}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });
  return res.json();
}

export async function fetchSavedEvents(userId?: string) {
  const res = await fetch(`${API_BASE}/saved-events${userId ? `?user_id=${userId}` : ''}`);
  return res.json();
}

export async function toggleSaveEvent(eventId: string, isSaved: boolean, userId?: string) {
  if (isSaved) {
    const res = await fetch(`${API_BASE}/saved-events/${eventId}${userId ? `?user_id=${userId}` : ''}`, {
      method: 'DELETE'
    });
    return res.json();
  } else {
    const res = await fetch(`${API_BASE}/saved-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, user_id: userId })
    });
    return res.json();
  }
}

export async function prepareRegistration(eventId: string, userId?: string) {
  const res = await fetch(`${API_BASE}/registrations/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: eventId, user_id: userId })
  });
  return res.json();
}

export async function confirmRegistration(auditId: string, userId?: string) {
  const res = await fetch(`${API_BASE}/registrations/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audit_id: auditId, user_id: userId })
  });
  return res.json();
}

export async function developIdea(eventId: string, ideaConcept: string, userId?: string) {
  const res = await fetch(`${API_BASE}/ideas/develop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: eventId, idea_concept: ideaConcept, user_id: userId })
  });
  return res.json();
}

export function getPresentationDownloadUrl(workspaceId: string) {
  return `${API_BASE}/ideas/${workspaceId}/presentation`;
}

export async function subscribeMonitoring(eventId: string, userId?: string) {
  const res = await fetch(`${API_BASE}/monitoring/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: eventId, user_id: userId })
  });
  return res.json();
}

export async function runMonitoringCycle() {
  const res = await fetch(`${API_BASE}/monitoring/run-cycle`, { method: 'POST' });
  return res.json();
}

export async function fetchNotifications(userId?: string) {
  const res = await fetch(`${API_BASE}/notifications${userId ? `?user_id=${userId}` : ''}`);
  return res.json();
}

