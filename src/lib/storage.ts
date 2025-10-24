import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface TestResult {
  id: string;
  createdAt: string;
  server: { id: string; name: string; region: string; url: string };
  client: { userAgent: string; platform: string; connectionType?: string };
  testConfig: { mode: "quick" | "standard" | "advanced"; durationSec: number; concurrency: number };
  download: { avgMbps: number; peakMbps: number; p95WindowMbps: number; stabilityScore: number; samples: [number, number][] };
  upload: { avgMbps: number; peakMbps: number; p95WindowMbps: number; stabilityScore: number; samples: [number, number][] };
  latency: {
    idle: { medianMs: number; p95Ms: number; maxMs: number; jitterMs: number; lossPct: number; samples: [number, number][] };
    loaded: { medianMs: number; p95Ms: number; maxMs: number; jitterMs: number; lossPct: number; samples: [number, number][] };
  };
  qoe: { streaming: string; calls: string; gaming: string };
  diagnostics: { bufferbloatGrade: string; ipv6: string; dns?: { cloudflareMs?: number; googleMs?: number }; natType?: string };
  notes?: string;
}

interface SpeedTestDB extends DBSchema {
  results: {
    key: string;
    value: TestResult;
    indexes: { 'by-date': string };
  };
}

let dbInstance: IDBPDatabase<SpeedTestDB> | null = null;

async function getDB() {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<SpeedTestDB>('speedtest-db', 1, {
    upgrade(db) {
      const store = db.createObjectStore('results', { keyPath: 'id' });
      store.createIndex('by-date', 'createdAt');
    },
  });
  
  return dbInstance;
}

export async function saveResult(result: TestResult): Promise<void> {
  const db = await getDB();
  await db.put('results', result);
}

export async function getResult(id: string): Promise<TestResult | undefined> {
  const db = await getDB();
  return await db.get('results', id);
}

export async function getAllResults(): Promise<TestResult[]> {
  const db = await getDB();
  const results = await db.getAllFromIndex('results', 'by-date');
  return results.reverse(); // newest first
}

export async function deleteResult(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('results', id);
}

export async function clearAllResults(): Promise<void> {
  const db = await getDB();
  await db.clear('results');
}
