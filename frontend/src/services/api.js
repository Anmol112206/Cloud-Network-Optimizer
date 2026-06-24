/**
 * API Service
 * Wraps endpoint fetches from backend
 */

function getNetworkId() {
  let networkId = localStorage.getItem("networkId");
  if (!networkId) {
    networkId = crypto.randomUUID();
    localStorage.setItem("networkId", networkId);
  }
  return networkId;
}

async function apiFetch(url, options = {}) {
  const networkId = getNetworkId();
  const headers = {
    ...options.headers,
    'X-Network-Id': networkId
  };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(url, {
    ...options,
    headers
  });
}

export async function fetchNetworkStats() {
  const response = await apiFetch('/api/network/stats');
  if (!response.ok) throw new Error('Failed to fetch network stats');
  return response.json();
}

export async function fetchLiveMetrics() {
  const response = await apiFetch('/api/metrics');
  if (!response.ok) throw new Error('Failed to fetch live metrics');
  return response.json();
}

export async function fetchCongestionStats() {
  const response = await apiFetch('/api/congestion');
  if (!response.ok) throw new Error('Failed to fetch congestion stats');
  return response.json();
}

export async function fetchBottlenecks() {
  const response = await apiFetch('/api/bottlenecks');
  if (!response.ok) throw new Error('Failed to fetch bottlenecks');
  return response.json();
}

export async function fetchSnapshots() {
  const response = await apiFetch('/api/snapshots');
  if (!response.ok) throw new Error('Failed to fetch snapshots');
  return response.json();
}

export async function createRouter(id, capacity, processingRate) {
  const response = await apiFetch('/api/network/routers', {
    method: 'POST',
    body: JSON.stringify({ id, capacity, processingRate })
  });
  if (!response.ok) throw new Error(`Failed to create router: ${id}`);
  return response.json();
}

export async function createLink(id, source, target, bandwidth, latency) {
  const response = await apiFetch('/api/network/links', {
    method: 'POST',
    body: JSON.stringify({ id, source, target, bandwidth, latency })
  });
  if (!response.ok) throw new Error(`Failed to create link: ${id}`);
  return response.json();
}

export async function updateTrafficSettings(packetRate, packetSizeMin, packetSizeMax, enabled = true, source = null, destination = null) {
  const response = await apiFetch('/api/network/traffic', {
    method: 'POST',
    body: JSON.stringify({ packetRate, packetSizeMin, packetSizeMax, enabled, source, destination })
  });
  if (!response.ok) throw new Error('Failed to update traffic settings');
  return response.json();
}

export async function resetNetworkTopology() {
  const response = await apiFetch('/api/network/reset', {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to reset network topology');
  return response.json();
}

export async function fetchRealNetworkLive() {
  const response = await apiFetch('/api/network/live');
  if (!response.ok) throw new Error('Failed to fetch live PC network metrics');
  return response.json();
}

export async function fetchRealNetworkHistory() {
  const response = await apiFetch('/api/network/history');
  if (!response.ok) throw new Error('Failed to fetch historical PC network metrics');
  return response.json();
}



