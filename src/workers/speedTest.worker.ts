// Speed Test Worker
// Runs tests in background to keep UI smooth

interface TestConfig {
  mode: 'quick' | 'standard' | 'advanced';
  concurrency: number;
  durationSec: number;
  baseUrl: string;
}

interface ThroughputSample {
  timeMs: number;
  mbps: number;
}

interface LatencySample {
  timeMs: number;
  rttMs: number;
}

interface TestProgress {
  phase: 'idle' | 'download' | 'upload' | 'loaded-latency' | 'complete';
  downloadMbps: number;
  uploadMbps: number;
  idleLatencyMs: number;
  loadedLatencyMs: number;
  downloadSamples: ThroughputSample[];
  uploadSamples: ThroughputSample[];
  idleLatencySamples: LatencySample[];
  loadedLatencySamples: LatencySample[];
  stabilityScore: number;
  confidenceInterval: { lower: number; upper: number };
}

let wsConnection: WebSocket | null = null;
let latencySamples: LatencySample[] = [];
let testStartTime = 0;

// Calculate stats
function calculateStats(samples: number[]) {
  if (samples.length === 0) return { mean: 0, stdDev: 0, p95: 0, median: 0 };
  
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
  const stdDev = Math.sqrt(variance);
  const p95Index = Math.floor(samples.length * 0.95);
  const p95 = sorted[p95Index] || sorted[sorted.length - 1];
  const median = sorted[Math.floor(samples.length / 2)];
  
  return { mean, stdDev, p95, median };
}

// Measure download speed
async function measureDownload(config: TestConfig): Promise<ThroughputSample[]> {
  console.log('[Worker] Starting download test with config:', config);
  const samples: ThroughputSample[] = [];
  const fileSize = 10_000_000; // 10MB per request
  const startTime = performance.now();
  const stopAt = startTime + config.durationSec * 1000;

  // Track totals for instantaneous rate
  let totalBytes = 0;
  let lastBytes = 0;
  let lastTime = startTime;

  // Sampler for instantaneous Mbps over small window
  const sampler = setInterval(() => {
    const now = performance.now();
    const deltaBytes = totalBytes - lastBytes;
    const deltaTimeMs = now - lastTime;
    if (deltaTimeMs > 0) {
      const mbps = (deltaBytes * 8) / ((deltaTimeMs / 1000) * 1_000_000);
      samples.push({ timeMs: now - startTime, mbps });
      (self as any).postMessage({
        type: 'progress',
        phase: 'download',
        downloadMbps: mbps,
        downloadSamples: samples,
      });
      lastBytes = totalBytes;
      lastTime = now;
    }
  }, 150) as unknown as number;

  // Connection loop runner
  const connectionLoop = async (idx: number) => {
    while (performance.now() < stopAt) {
      const url = `${config.baseUrl}/speed-download?size=${fileSize}&rid=${Math.random()}`;
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const reader = res.body?.getReader();
        if (!reader) break;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalBytes += value.length;
          if (performance.now() >= stopAt) {
            try { await reader.cancel(); } catch {}
            break;
          }
        }
      } catch (err) {
        console.error('[Worker] download connection error', idx, err);
        break;
      }
    }
  };

  const connections = Array.from({ length: config.concurrency }, (_, i) => connectionLoop(i));
  await Promise.all(connections);
  clearInterval(sampler);

  // Final aggregate sample (overall average)
  const totalTimeSec = (performance.now() - startTime) / 1000;
  if (totalTimeSec > 0) {
    const avgMbps = (totalBytes * 8) / (totalTimeSec * 1_000_000);
    samples.push({ timeMs: performance.now() - startTime, mbps: avgMbps });
  }

  return samples;
}

// Measure upload speed
async function measureUpload(config: TestConfig): Promise<ThroughputSample[]> {
  const samples: ThroughputSample[] = [];
  const PIECE_SIZE = 4_000_000; // 4MB pieces to reduce HTTP overhead
  const startTime = performance.now();
  const stopAt = startTime + config.durationSec * 1000;

  // Payload filled with non-zero bytes to avoid any potential compression along the path
  const payload = new Uint8Array(PIECE_SIZE).fill(1);

  // Track bytes per connection: completed pieces and in-flight progress
  const completedPerConn = new Array<number>(config.concurrency).fill(0);
  const inflightPerConn = new Array<number>(config.concurrency).fill(0);

  let lastTotal = 0;
  let lastTime = startTime;

  // Sample instantaneous throughput every 150ms using deltas
  const sampler = setInterval(() => {
    const now = performance.now();
    const totalLoaded = completedPerConn.reduce((a, b) => a + b, 0) + inflightPerConn.reduce((a, b) => a + b, 0);
    const deltaBytes = totalLoaded - lastTotal;
    const deltaMs = now - lastTime;
    if (deltaMs > 0) {
      const mbps = (deltaBytes * 8) / ((deltaMs / 1000) * 1_000_000);
      samples.push({ timeMs: now - startTime, mbps });
      (self as any).postMessage({ type: 'progress', phase: 'upload', uploadMbps: mbps, uploadSamples: samples });
      lastTotal = totalLoaded;
      lastTime = now;
    }
  }, 150) as unknown as number;

  function runConnection(idx: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const loop = () => {
        if (performance.now() >= stopAt) return resolve();
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${config.baseUrl}/speed-upload?rid=${Math.random()}`, true);
          xhr.responseType = 'text';
          xhr.setRequestHeader('Content-Type', 'application/octet-stream');
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              inflightPerConn[idx] = e.loaded;
            }
          };
          xhr.onloadend = () => {
            completedPerConn[idx] += PIECE_SIZE;
            inflightPerConn[idx] = 0;
            // Immediately start next piece to avoid gaps
            setTimeout(loop, 0);
          };
          xhr.onerror = () => {
            // Stop this connection on error
            resolve();
          };
          xhr.send(payload);
        } catch (err) {
          resolve();
        }
      };
      loop();
    });
  }

  const connections = Array.from({ length: config.concurrency }, (_, i) => runConnection(i));
  await Promise.all(connections);
  clearInterval(sampler);

  // Final aggregate sample (overall average)
  const totalBytes = completedPerConn.reduce((a, b) => a + b, 0) + inflightPerConn.reduce((a, b) => a + b, 0);
  const totalTimeSec = (performance.now() - startTime) / 1000;
  if (totalTimeSec > 0) {
    const avgMbps = (totalBytes * 8) / (totalTimeSec * 1_000_000);
    samples.push({ timeMs: performance.now() - startTime, mbps: avgMbps });
  }

  return samples;
}

// Measure idle latency via WebSocket
async function measureIdleLatency(config: TestConfig): Promise<LatencySample[]> {
  return new Promise((resolve) => {
    const samples: LatencySample[] = [];
    const wsUrl = config.baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const fullWsUrl = `${wsUrl}/speed-ping`;
    console.log('[Worker] Connecting to WebSocket for idle latency:', fullWsUrl);
    
    wsConnection = new WebSocket(fullWsUrl);
    const startTime = performance.now();
    let pingCount = 0;
    let receivedCount = 0;
    const warmupDrops = 3;
    const maxPings = config.mode === 'quick' ? 12 : config.mode === 'standard' ? 24 : 36;
    let pingInterval: number;

    wsConnection.onopen = () => {
      console.log('[Worker] WebSocket connected for idle latency');
      
      pingInterval = setInterval(() => {
        if (pingCount >= maxPings) {
          clearInterval(pingInterval);
          wsConnection?.close();
          resolve(samples);
          return;
        }

        const sentTime = performance.now();
        wsConnection?.send(JSON.stringify({
          type: 'ping',
          clientTime: sentTime,
          seq: pingCount,
        }));
        pingCount++;
      }, 150) as unknown as number;
    };

    wsConnection.onmessage = (event) => {
      const receivedTime = performance.now();
      try {
        const data = JSON.parse(event.data);
        const rtt = receivedTime - data.clientTime;
        receivedCount++;
        if (receivedCount <= warmupDrops) return; // drop first few pings as warmup
        
        samples.push({
          timeMs: receivedTime - startTime,
          rttMs: rtt,
        });

        self.postMessage({
          type: 'progress',
          phase: 'idle',
          idleLatencyMs: rtt,
          idleLatencySamples: samples,
        });
      } catch (error) {
        console.error('[Worker] Ping parse error:', error);
      }
    };

    wsConnection.onerror = (error) => {
      console.error('[Worker] WebSocket error:', error);
      clearInterval(pingInterval);
      resolve(samples);
    };
  });
}

// Measure loaded latency (while saturating bandwidth)
async function measureLoadedLatency(
  config: TestConfig,
  downloadSamples: ThroughputSample[],
  uploadSamples: ThroughputSample[]
): Promise<LatencySample[]> {
  const samples: LatencySample[] = [];
  const wsUrl = config.baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
  const fullWsUrl = `${wsUrl}/speed-ping`;
  
  return new Promise((resolve) => {
    wsConnection = new WebSocket(fullWsUrl);
    const startTime = performance.now();
    let pingCount = 0;
    let receivedCount = 0;
    const warmupDrops = 3;
    const maxPings = config.mode === 'quick' ? 18 : config.mode === 'standard' ? 30 : 45;
    let pingInterval: number;

    const satConfig: TestConfig = { ...config, durationSec: config.mode === 'quick' ? 5 : config.mode === 'standard' ? 8 : 10 };
    const saturationPromise = Promise.all([
      measureDownload(satConfig),
      measureUpload(satConfig),
    ]);

    wsConnection.onopen = () => {
      console.log('[Worker] WebSocket connected for loaded latency');
      
      pingInterval = setInterval(() => {
        if (pingCount >= maxPings) {
          clearInterval(pingInterval);
          wsConnection?.close();
          saturationPromise.then(() => resolve(samples));
          return;
        }

        const sentTime = performance.now();
        wsConnection?.send(JSON.stringify({
          type: 'ping',
          clientTime: sentTime,
          seq: pingCount,
        }));
        pingCount++;
      }, 150) as unknown as number;
    };

    wsConnection.onmessage = (event) => {
      const receivedTime = performance.now();
      try {
        const data = JSON.parse(event.data);
        const rtt = receivedTime - data.clientTime;
        receivedCount++;
        if (receivedCount <= warmupDrops) return; // drop first few pings as warmup
        
        samples.push({
          timeMs: receivedTime - startTime,
          rttMs: rtt,
        });

        self.postMessage({
          type: 'progress',
          phase: 'loaded-latency',
          loadedLatencyMs: rtt,
          loadedLatencySamples: samples,
        });
      } catch (error) {
        console.error('[Worker] Loaded ping parse error:', error);
      }
    };

    wsConnection.onerror = () => {
      clearInterval(pingInterval);
      resolve(samples);
    };
  });
}

// Main test runner
self.onmessage = async (e) => {
  const { type, config } = e.data;

  if (type === 'start') {
    testStartTime = performance.now();
    console.log('[Worker] Starting speed test with config:', config);
    console.log('[Worker] Base URL:', config.baseUrl);

    try {
      // 1. Measure idle latency
      self.postMessage({ type: 'progress', phase: 'idle' });
      const idleLatencySamples = await measureIdleLatency(config);
      const idleStats = calculateStats(idleLatencySamples.map(s => s.rttMs));

      // 2. Measure download
      self.postMessage({ type: 'progress', phase: 'download' });
      const downloadSamples = await measureDownload(config);
      const downloadStats = calculateStats(downloadSamples.map(s => s.mbps));

      // 3. Measure upload
      self.postMessage({ type: 'progress', phase: 'upload' });
      const uploadSamples = await measureUpload(config);
      const uploadStats = calculateStats(uploadSamples.map(s => s.mbps));

      // 4. Measure loaded latency (bufferbloat test)
      self.postMessage({ type: 'progress', phase: 'loaded-latency' });
      const loadedLatencySamples = await measureLoadedLatency(config, downloadSamples, uploadSamples);
      const loadedStats = calculateStats(loadedLatencySamples.map(s => s.rttMs));

      // Calculate stability score (0-100 based on coefficient of variation)
      const cv = downloadStats.stdDev / downloadStats.mean;
      const stabilityScore = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));

      // Calculate confidence interval (95%)
      const margin = 1.96 * (downloadStats.stdDev / Math.sqrt(downloadSamples.length));
      const confidenceInterval = {
        lower: Math.max(0, downloadStats.mean - margin),
        upper: downloadStats.mean + margin,
      };

      // Send complete result
      self.postMessage({
        type: 'complete',
        result: {
          downloadMbps: Math.round(downloadStats.mean * 10) / 10,
          downloadP95: Math.round(downloadStats.p95 * 10) / 10,
          uploadMbps: Math.round(uploadStats.mean * 10) / 10,
          uploadP95: Math.round(uploadStats.p95 * 10) / 10,
          idleLatencyMs: Math.round(idleStats.median),
          idleLatencyP95: Math.round(idleStats.p95),
          idleJitterMs: Math.round(idleStats.stdDev),
          loadedLatencyMs: Math.round(loadedStats.median),
          loadedLatencyP95: Math.round(loadedStats.p95),
          loadedJitterMs: Math.round(loadedStats.stdDev),
          stabilityScore,
          confidenceInterval,
          downloadSamples,
          uploadSamples,
          idleLatencySamples,
          loadedLatencySamples,
          bufferbloatRatio: loadedStats.median / idleStats.median,
        },
      });

      console.log('[Worker] Test complete');
    } catch (error) {
      console.error('[Worker] Test error:', error);
      self.postMessage({ type: 'error', error: (error as Error).message });
    }
  } else if (type === 'stop') {
    console.log('[Worker] Stopping test');
    wsConnection?.close();
    self.postMessage({ type: 'stopped' });
  }
};

export {};
