const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchStates() {
  const res = await fetch(`${API_BASE}/locations/states`);
  return res.json();
}

export async function fetchCities(stateId?: string, query?: string) {
  const params = new URLSearchParams();
  if (stateId) params.append('state_id', stateId);
  if (query) params.append('query', query);
  const res = await fetch(`${API_BASE}/locations/cities?${params.toString()}`);
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  return res.json();
}

export async function fetchProposals(status?: string) {
  const params = status ? `?status=${status}` : '';
  const res = await fetch(`${API_BASE}/admin/proposals${params}`);
  return res.json();
}

export async function reviewProposal(proposalId: string, action: string, data: any = {}) {
  const res = await fetch(`${API_BASE}/admin/proposals/${proposalId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data })
  });
  return res.json();
}

export async function fetchWeeklyReport() {
  const res = await fetch(`${API_BASE}/admin/weekly-report`);
  return res.json();
}

export async function reclassifyEvents() {
  const res = await fetch(`${API_BASE}/admin/reclassify-events`, { method: 'POST' });
  return res.json();
}

export async function fetchEvents(options: {
  location?: string;
  category?: string;
  cityIds?: string[];
  stateId?: string;
  categoryIds?: string[];
  onlyOnline?: boolean;
  includeOnline?: boolean;
  search?: string;
  refresh?: boolean;
} = {}) {
  const params = new URLSearchParams();
  if (options.location) params.append('location', options.location);
  if (options.category) params.append('category', options.category);
  if (options.cityIds && options.cityIds.length > 0) params.append('city_ids', options.cityIds.join(','));
  if (options.stateId) params.append('state_id', options.stateId);
  if (options.categoryIds && options.categoryIds.length > 0) params.append('category_ids', options.categoryIds.join(','));
  if (options.onlyOnline) params.append('only_online', 'true');
  if (options.includeOnline) params.append('include_online', 'true');
  if (options.search) params.append('search', options.search);
  if (options.refresh) params.append('refresh', 'true');

  const res = await fetch(`${API_BASE}/events?${params.toString()}`);
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

export async function updateRegistrationDetails(auditId: string, updatedFields: Record<string, string>, replaceProfile: boolean = true, userId?: string) {
  const res = await fetch(`${API_BASE}/registrations/update-details`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audit_id: auditId, updated_fields: updatedFields, replace_profile: replaceProfile, user_id: userId })
  });
  return res.json();
}

export async function runTinyFishLiveFill(auditId: string, userId?: string) {
  const res = await fetch(`${API_BASE}/registrations/tinyfish-live-fill`, {
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
