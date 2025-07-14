//
// API utility functions for Tic Tac Toe frontend.
// Handles authentication, game management, move submission, and game state retrieval.
//
const API_BASE = (process.env.REACT_APP_API_BASE || 'http://localhost:8000');

// Helper for handling requests with token management
function getSessionToken() {
  return localStorage.getItem('session_token');
}

function setSessionToken(token) {
  if (token)
    localStorage.setItem('session_token', token);
  else
    localStorage.removeItem('session_token');
}

// Helper: adds session token header/cookie if present
function sessionHeaders() {
  const headers = {};
  const token = getSessionToken();
  if (token) {
    headers['x-session-token'] = token;
  }
  return headers;
}

// PUBLIC_INTERFACE
export async function register(username, password) {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Registration failed');
  }
  return res.json();
}

// PUBLIC_INTERFACE
export async function login(username, password) {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  // grant_type needed by backend but skip if not required by backend
  params.append('grant_type', 'password');

  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok || !data.session_token) {
    throw new Error('Login failed');
  }
  setSessionToken(data.session_token);
  return data;
}

// PUBLIC_INTERFACE
export async function logout() {
  await fetch(`${API_BASE}/logout`, {
    method: 'POST',
    headers: sessionHeaders(),
    credentials: 'include',
  });
  setSessionToken(null);
}

// PUBLIC_INTERFACE
export async function getMe() {
  const res = await fetch(`${API_BASE}/me`, {
    headers: sessionHeaders(),
    credentials: 'include',
  });
  if (!res.ok) return null;
  return res.json();
}

// PUBLIC_INTERFACE
export async function listGames({ only_open = false, only_mine = false } = {}) {
  const params = [];
  if (only_open) params.push('only_open=true');
  if (only_mine) params.push('only_mine=true');
  const url = `${API_BASE}/games${params.length ? '?' + params.join('&') : ''}`;
  const res = await fetch(url, {
    headers: sessionHeaders(),
    credentials: 'include',
  });
  return res.json();
}

// PUBLIC_INTERFACE
export async function startGame() {
  const res = await fetch(`${API_BASE}/games`, {
    method: 'POST',
    headers: sessionHeaders(),
    credentials: 'include',
  });
  return res.json();
}

// PUBLIC_INTERFACE
export async function joinGame(game_id) {
  const res = await fetch(`${API_BASE}/games/join`, {
    method: 'POST',
    headers: { ...sessionHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_id }),
    credentials: 'include',
  });
  return res.json();
}

// PUBLIC_INTERFACE
export async function getGameDetail(game_id) {
  const res = await fetch(`${API_BASE}/games/${game_id}`, {
    headers: sessionHeaders(),
    credentials: 'include',
  });
  return res.json();
}

// PUBLIC_INTERFACE
export async function makeMove(game_id, position) {
  const res = await fetch(`${API_BASE}/games/${game_id}/move`, {
    method: 'POST',
    headers: { ...sessionHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ position }),
    credentials: 'include',
  });
  return res.json();
}

// PUBLIC_INTERFACE
export async function getMoveHistory(game_id) {
  const res = await fetch(`${API_BASE}/games/${game_id}/move_history`, {
    headers: sessionHeaders(),
    credentials: 'include',
  });
  return res.json();
}

// PUBLIC_INTERFACE
export async function getGameState(game_id) {
  const res = await fetch(`${API_BASE}/games/${game_id}/state`, {
    headers: sessionHeaders(),
    credentials: 'include',
  });
  return res.json();
}

export { getSessionToken, setSessionToken };
