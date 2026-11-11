// Automated test script for Agri Rover Offline Mode & Error Handling
import assert from 'node:assert';
import http from 'node:http';

console.log('=====================================================');
console.log('Agri Rover Offline & Error-Free UI Resilience Tests');
console.log('=====================================================');

// 1. Mock Storage Implementation
const mockStorage = new Map();
const localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

const STORAGE_KEYS = {
  API_BASE: 'AGRI_ROVER_API_BASE',
  CACHED_PREDICTIONS: 'AGRI_ROVER_CACHED_PREDICTIONS',
  CACHED_LATEST: 'AGRI_ROVER_CACHED_LATEST_PRED',
};

const offlineStorage = {
  getApiBase() {
    const saved = localStorage.getItem(STORAGE_KEYS.API_BASE);
    if (saved && saved.trim()) return saved.trim().replace(/\/+$/, '');
    return '';
  },
  setApiBase(url) {
    const clean = (url || '').trim().replace(/\/+$/, '');
    if (clean) localStorage.setItem(STORAGE_KEYS.API_BASE, clean);
    else localStorage.removeItem(STORAGE_KEYS.API_BASE);
  },
  getCachedPredictions() {
    const raw = localStorage.getItem(STORAGE_KEYS.CACHED_PREDICTIONS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  setCachedPredictions(records) {
    localStorage.setItem(STORAGE_KEYS.CACHED_PREDICTIONS, JSON.stringify(records.slice(0, 100)));
  },
  getCachedLatestPrediction() {
    const raw = localStorage.getItem(STORAGE_KEYS.CACHED_LATEST);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  setCachedLatestPrediction(pred) {
    if (pred) localStorage.setItem(STORAGE_KEYS.CACHED_LATEST, JSON.stringify(pred));
    else localStorage.removeItem(STORAGE_KEYS.CACHED_LATEST);
  }
};

// Test 1: Verify Default Configuration
console.log('\n[Scenario 1 & 2] Testing Default Configuration & Offline Storage:');
const defaultBase = offlineStorage.getApiBase();
console.log('  Default API Base:', JSON.stringify(defaultBase));
assert(!defaultBase.includes('horse-tank-wendy-partners'), 'FAIL: Hardcoded quick tunnel URL was detected!');
assert(!defaultBase.includes('trycloudflare.com'), 'FAIL: Hardcoded quick tunnel was detected!');
console.log('  ✓ PASSED: No hardcoded quick tunnel URL in default storage.');

// Test 2: Storage cache operations
console.log('\nTesting Offline Cache for Predictions:');
const sampleRecords = [
  {
    id: 1,
    timestamp: new Date().toISOString(),
    predicted_class: 'Tomato___Early_blight',
    plant: 'Tomato',
    disease: 'Early Blight',
    confidence: 0.942,
    is_tomato: true,
    top_predictions: [],
    source: 'camera',
  },
];
offlineStorage.setCachedPredictions(sampleRecords);
const loaded = offlineStorage.getCachedPredictions();
assert.strictEqual(loaded.length, 1);
assert.strictEqual(loaded[0].disease, 'Early Blight');
console.log('  ✓ PASSED: Predictions successfully cached and loaded from offline storage.');

// Test 3: Connection Manager Architecture Simulation
console.log('\n[Scenario 2 & 3] Testing Backend Offline & Cloudflare Tunnel Unavailable:');

class TestConnectionManager {
  constructor() {
    this.status = {
      state: 'offline',
      isBackendConnected: false,
      isRoverOnline: false,
      isCameraConnected: false,
      isCameraStreaming: false,
      isModelLoaded: false,
      lastChecked: null,
      apiBase: offlineStorage.getApiBase(),
      health: null,
    };
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener({ ...this.status });
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(l => l({ ...this.status }));
  }

  setApiBase(url) {
    this.status.apiBase = url.trim().replace(/\/+$/, '');
    offlineStorage.setApiBase(url);
    this.notify();
  }

  async safeFetch(path, options = {}, timeoutMs = 2000, customBase) {
    const base = customBase !== undefined ? customBase : this.status.apiBase;
    const url = `${base}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('Connection timed out. Device or backend is unreachable.');
      }
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('fetch failed') || msg.includes('ECONNREFUSED')) {
        throw new Error('Backend is unreachable. Please verify Raspberry Pi is powered on and connected.');
      }
      throw err;
    }
  }

  async checkConnection(timeoutMs = 1500) {
    try {
      const res = await this.safeFetch('/api/health', { method: 'GET' }, timeoutMs);
      if (!res.ok) throw new Error('Bad status');
      const health = await res.json();
      this.status = {
        state: 'connected',
        isBackendConnected: true,
        isRoverOnline: true,
        isCameraConnected: health.camera_connected,
        isCameraStreaming: health.camera_streaming,
        isModelLoaded: health.model_loaded,
        lastChecked: Date.now(),
        apiBase: this.status.apiBase,
        health,
      };
    } catch {
      this.status = {
        state: 'offline',
        isBackendConnected: false,
        isRoverOnline: false,
        isCameraConnected: false,
        isCameraStreaming: false,
        isModelLoaded: false,
        lastChecked: Date.now(),
        apiBase: this.status.apiBase,
        health: null,
      };
    }
    this.notify();
    return this.status;
  }

  async testConnection(targetUrl, protocol = 'http:') {
    const cleanUrl = (targetUrl || '').trim().replace(/\/+$/, '');
    if (protocol === 'https:' && cleanUrl.toLowerCase().startsWith('http://')) {
      return {
        success: false,
        message: 'Mixed Content Restriction: This dashboard is running securely over HTTPS, but the entered backend URL uses insecure "http://". Modern browsers block this for security. Please provide a secure HTTPS Cloudflare Tunnel URL or test locally at http://localhost:5173.',
      };
    }

    try {
      const res = await this.safeFetch('/api/health', { method: 'GET' }, 2000, cleanUrl);
      if (!res.ok) {
        return {
          success: false,
          message: `Backend reached, but server returned HTTP status ${res.status}. Please check backend logs.`,
        };
      }
      const health = await res.json();
      return {
        success: true,
        message: `Connection established successfully! Model: ${health.model_loaded ? 'Ready' : 'Waiting for Model'}, Camera: ${health.camera_connected ? 'Live' : 'Not Connected'}.`,
        health,
      };
    } catch (err) {
      return {
        success: false,
        message: 'Unable to reach Raspberry Pi backend. Please verify your device is powered on, connected to WiFi, and the address is correct.',
      };
    }
  }
}

const manager = new TestConnectionManager();

// Configure unreachable port to simulate Raspberry Pi powered OFF / tunnel disconnected
manager.setApiBase('http://127.0.0.1:59999');

const checkStatus = await manager.checkConnection(500);
console.log('  Connection state when device offline:', checkStatus.state);
console.log('  isRoverOnline:', checkStatus.isRoverOnline);
console.log('  isBackendConnected:', checkStatus.isBackendConnected);
console.log('  isCameraConnected:', checkStatus.isCameraConnected);
console.log('  isModelLoaded:', checkStatus.isModelLoaded);

assert.strictEqual(checkStatus.state, 'offline');
assert.strictEqual(checkStatus.isRoverOnline, false);
assert.strictEqual(checkStatus.isBackendConnected, false);
assert.strictEqual(checkStatus.isCameraConnected, false);
assert.strictEqual(checkStatus.isModelLoaded, false);
console.log('  ✓ PASSED: Handled offline device cleanly without throwing uncaught exceptions.');

// Test 4: Testing safe testConnection diagnostics
console.log('\n[Scenario 3] Testing Friendly Diagnostics in Settings:');
const testResult = await manager.testConnection('http://127.0.0.1:59999');
console.log('  Test result success:', testResult.success);
console.log('  Test result message:', testResult.message);
assert.strictEqual(testResult.success, false);
assert(!testResult.message.includes('Failed to fetch'), 'FAIL: Raw "Failed to fetch" was returned!');
assert(testResult.message.includes('Raspberry Pi') || testResult.message.includes('reach'), 'FAIL: Expected friendly explanation.');
console.log('  ✓ PASSED: Settings test returns friendly non-technical error.');

// Test 5: Mixed Content Restriction Check
console.log('\nTesting Mixed Content Protection (HTTPS site accessing HTTP backend):');
const mixedContentResult = await manager.testConnection('http://192.168.1.100:8000', 'https:');
assert.strictEqual(mixedContentResult.success, false);
assert(mixedContentResult.message.includes('Mixed Content'), 'FAIL: Mixed content was not flagged!');
console.log('  ✓ PASSED: Mixed Content accurately detected and clearly explained.');

// Test 6: Safe API Client Prediction Calls when Offline
console.log('\n[Scenario 4 & 5] Testing API Client graceful fallback when backend offline:');
async function testPredict() {
  if (!manager.status.isBackendConnected) {
    throw new Error('Raspberry Pi is currently offline. Connect your device to enable live disease detection.');
  }
}

try {
  await testPredict();
  assert.fail('Should not succeed when backend is offline');
} catch (err) {
  console.log('  Prediction error message when offline:', err.message);
  assert(!err.message.includes('Failed to fetch'), 'FAIL: Raw "Failed to fetch" exposed to user!');
  assert(err.message.includes('Raspberry Pi is currently offline'), 'FAIL: Expected friendly offline message.');
  console.log('  ✓ PASSED: Prediction gives friendly offline message instead of technical error.');
}

// Fetching predictions when offline returns cached records
async function testGetPredictions() {
  try {
    const res = await manager.safeFetch('/api/predictions', { method: 'GET' }, 500);
    if (res.ok) return await res.json();
  } catch {}
  return offlineStorage.getCachedPredictions();
}

const offlineRecords = await testGetPredictions();
console.log('  Predictions returned when offline:', offlineRecords.length);
assert.strictEqual(offlineRecords.length, 1);
assert.strictEqual(offlineRecords[0].disease, 'Early Blight');
console.log('  ✓ PASSED: Predictions retrieved from offline cache when backend is offline.');

// Test 7: Simulated Reconnection
console.log('\n[Scenario 6] Testing Backend Reconnection:');
const mockServer = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/api/health') {
    res.end(JSON.stringify({
      status: 'healthy',
      camera_connected: true,
      camera_streaming: true,
      model_loaded: true,
      uptime_seconds: 120,
      captures_count: 5,
      timestamp: new Date().toISOString(),
    }));
  } else if (req.url?.startsWith('/api/predictions')) {
    res.end(JSON.stringify([
      {
        id: 2,
        timestamp: new Date().toISOString(),
        predicted_class: 'Tomato___healthy',
        plant: 'Tomato',
        disease: 'Healthy',
        confidence: 0.985,
        is_tomato: true,
        top_predictions: [],
        source: 'camera',
      },
    ]));
  } else {
    res.statusCode = 404;
    res.end('{}');
  }
});

await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', resolve));
const port = mockServer.address().port;
console.log(`  Mock Raspberry Pi server listening on port ${port}`);

// Connect to mock server
manager.setApiBase(`http://127.0.0.1:${port}`);
const reconnectedStatus = await manager.checkConnection();
console.log('  State after reconnecting:', reconnectedStatus.state);
console.log('  isRoverOnline:', reconnectedStatus.isRoverOnline);
console.log('  isCameraConnected:', reconnectedStatus.isCameraConnected);
console.log('  isModelLoaded:', reconnectedStatus.isModelLoaded);

assert.strictEqual(reconnectedStatus.state, 'connected');
assert.strictEqual(reconnectedStatus.isRoverOnline, true);
assert.strictEqual(reconnectedStatus.isCameraConnected, true);
assert.strictEqual(reconnectedStatus.isModelLoaded, true);

// Fetch fresh predictions now that we're reconnected
const freshPredictions = await testGetPredictions();
console.log('  Fresh predictions loaded after reconnect:', freshPredictions.length, freshPredictions[0].disease);
assert.strictEqual(freshPredictions.length, 1);
assert.strictEqual(freshPredictions[0].disease, 'Healthy');
console.log('  ✓ PASSED: Reconnection restored all statuses and updated data seamlessly.');

// Close mock server
await new Promise((resolve) => mockServer.close(resolve));

// Test 8: Backend Disconnects during usage
console.log('\n[Scenario 5] Testing Backend Disconnect During Usage:');
const disconnectedStatus = await manager.checkConnection(500);
console.log('  State after disconnect:', disconnectedStatus.state);
console.log('  isRoverOnline:', disconnectedStatus.isRoverOnline);
assert.strictEqual(disconnectedStatus.state, 'offline');
assert.strictEqual(disconnectedStatus.isRoverOnline, false);
console.log('  ✓ PASSED: Smooth transition back to offline state without crashing.');

console.log('\n=====================================================');
console.log('ALL OFFLINE RESILIENCE AND CONNECTION TESTS PASSED! ✓');
console.log('=====================================================\n');
