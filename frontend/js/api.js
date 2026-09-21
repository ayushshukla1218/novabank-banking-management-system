// Base URL of the backend API. Change this if your backend runs elsewhere.
const API_BASE = 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('bms_token');
}
function getUser() {
  const raw = localStorage.getItem('bms_user');
  return raw ? JSON.parse(raw) : null;
}
function saveSession(token, user) {
  localStorage.setItem('bms_token', token);
  localStorage.setItem('bms_user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('bms_token');
  localStorage.removeItem('bms_user');
}
function requireLogin() {
  if (!getToken()) window.location.href = 'index.html';
}
function logout() {
  clearSession();
  window.location.href = 'index.html';
}

async function apiRequest(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error('Could not reach the server. Is the backend running?');
  }

  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    // no JSON body
  }

  if (res.status === 401) {
    clearSession();
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
      window.location.href = 'index.html';
    }
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function formatMoney(amount, currency = 'INR') {
  const symbols = { INR: '₹', USD: '$', EUR: '€' };
  const symbol = symbols[currency] || '';
  return symbol + Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
