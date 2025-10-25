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
  const samples: ThroughputSample[] = [];
  const fileSize = 5_000_000; // 5MB per connection
  const startTime = performance.now();
  let totalBytes = 0;
  let lastSampleTime = startTime;
  let lastSampleBytes = 0;

  const connections = Array.from({ length: config.concurrency }, async () => {
    const response = await fetch(
      `${config.baseUrl}/speed-download?size=${fileSize}&rid=${Math.random()}`,
      { cache: 'no-store' }
    );
    
    const reader = response.body?.getReader();
    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      totalBytes += value.length;
      
      const now = performance.now();
      if (now - lastSampleTime >= 200) {
        const elapsedSec = (now - lastSampleTime) / 1000;
        const bytesDelta = totalBytes - lastSampleBytes;
        const mbps = (bytesDelta * 8) / (elapsedSec * 1_000_000);
        
        samples.push({
          timeMs: now - startTime,
          mbps,
        });
        
        lastSampleTime = now;
        lastSampleBytes = totalBytes;
        
        self.postMessage({
          type: 'progress',
          phase: 'download',
          downloadMbps: mbps,
          downloadSamples: samples,
        });
      }
    }
  });

  await Promise.all(connections);
  return samples;
}

// Measure upload speed
async function measureUpload(config: TestConfig): Promise<ThroughputSample[]> {
  const samples: ThroughputSample[] = [];
  const chunkSize = 5_000_000; // 5MB per connection
  const startTime = performance.now();

  const connections = Array.from({ length: config.concurrency }, async () => {
    // Create upload payload; fill with random bytes in 64KB chunks to respect Web Crypto limits
    const data = new Uint8Array(chunkSize);
    for (let offset = 0; offset < chunkSize; offset += 65536) {
      const len = Math.min(65536, chunkSize - offset);
      crypto.getRandomValues(data.subarray(offset, offset + len));
    }
    const blob = new Blob([data.buffer], { type: 'application/octet-stream' });

    const uploadStart = performance.now();
    await fetch(`${config.baseUrl}/speed-upload`, {
      method: 'POST',
      body: blob,
      cache: 'no-store',
    });
    const uploadEnd = performance.now();

    const elapsedSec = (uploadEnd - uploadStart) / 1000;
    const mbps = (chunkSize * 8) / (elapsedSec * 1_000_000);

    samples.push({
      timeMs: uploadEnd - startTime,
      mbps,
    });

    self.postMessage({
      type: 'progress',
      phase: 'upload',
      uploadMbps: mbps,
      uploadSamples: samples,
    });
  });

  await Promise.all(connections);
  return samples;
}

// Measure idle latency via WebSocket
async function measureIdleLatency(config: TestConfig): Promise<LatencySample[]> {
  return new Promise((resolve) => {
    const samples: LatencySample[] = [];
    const wsUrl = config.baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    
    wsConnection = new WebSocket(`${wsUrl}/speed-ping`);
    const startTime = performance.now();
    let pingCount = 0;
    const maxPings = config.mode === 'quick' ? 10 : config.mode === 'standard' ? 20 : 30;
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
      }, 200) as unknown as number;
    };

    wsConnection.onmessage = (event) => {
      const receivedTime = performance.now();
      try {
        const data = JSON.parse(event.data);
        const rtt = receivedTime - data.clientTime;
        
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
  
  return new Promise((resolve) => {
    wsConnection = new WebSocket(`${wsUrl}/speed-ping`);
    const startTime = performance.now();
    let pingCount = 0;
    const maxPings = config.mode === 'quick' ? 15 : config.mode === 'standard' ? 25 : 40;
    let pingInterval: number;

    // Start saturation traffic
    const saturationPromise = Promise.all([
      measureDownload(config),
      measureUpload(config),
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
      }, 250) as unknown as number;
    };

    wsConnection.onmessage = (event) => {
      const receivedTime = performance.now();
      try {
        const data = JSON.parse(event.data);
        const rtt = receivedTime - data.clientTime;
        
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
    console.log('[Worker] Starting speed test:', config);

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
