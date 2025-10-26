import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Square, History, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { saveResult } from "@/lib/storage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestMetrics } from "./test/TestMetrics";
import { TestCharts } from "./test/TestCharts";
import { TestResults } from "./test/TestResults";

type TestPhase = "idle" | "download" | "upload" | "loaded-latency" | "complete";
type TestMode = "quick" | "standard" | "advanced";

interface Server {
  id: string;
  name: string;
  region: string;
  url: string;
}

const servers: Server[] = [
  { id: "auto", name: "Auto Select", region: "Auto", url: "" },
  { id: "us-east", name: "US East", region: "Virginia", url: "" },
  { id: "us-west", name: "US West", region: "California", url: "" },
  { id: "eu-west", name: "EU West", region: "Ireland", url: "" },
  { id: "asia-east", name: "Asia East", region: "Tokyo", url: "" },
];

interface WorkerResult {
  downloadMbps: number;
  downloadP95: number;
  uploadMbps: number;
  uploadP95: number;
  idleLatencyMs: number;
  idleLatencyP95: number;
  idleJitterMs: number;
  loadedLatencyMs: number;
  loadedLatencyP95: number;
  loadedJitterMs: number;
  stabilityScore: number;
  confidenceInterval: { lower: number; upper: number };
  downloadSamples: Array<{ timeMs: number; mbps: number }>;
  uploadSamples: Array<{ timeMs: number; mbps: number }>;
  idleLatencySamples: Array<{ timeMs: number; rttMs: number }>;
  loadedLatencySamples: Array<{ timeMs: number; rttMs: number }>;
  bufferbloatRatio: number;
}

export const SpeedTest = () => {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<TestPhase>("idle");
  const [mode, setMode] = useState<TestMode>("standard");
  const [selectedServer, setSelectedServer] = useState<Server>(servers[0]);
  const [result, setResult] = useState<WorkerResult | null>(null);
  const [currentDownload, setCurrentDownload] = useState(0);
  const [currentUpload, setCurrentUpload] = useState(0);
  const [currentLatency, setCurrentLatency] = useState(0);
  const [downloadSamples, setDownloadSamples] = useState<Array<{ timeMs: number; mbps: number }>>([]);
  const [uploadSamples, setUploadSamples] = useState<Array<{ timeMs: number; mbps: number }>>([]);
  const [latencySamples, setLatencySamples] = useState<Array<{ timeMs: number; rttMs: number }>>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL("../workers/speedTest.worker.ts", import.meta.url),
        { type: "module" }
      );

      workerRef.current.onmessage = (e) => {
      const { type, phase: newPhase, result: testResult, ...progress } = e.data;

      if (type === "progress") {
        setPhase(newPhase);
        if (typeof progress.downloadMbps === 'number') setCurrentDownload(progress.downloadMbps);
        if (typeof progress.uploadMbps === 'number') setCurrentUpload(progress.uploadMbps);
        if (typeof progress.idleLatencyMs === 'number') setCurrentLatency(progress.idleLatencyMs);
        if (typeof progress.loadedLatencyMs === 'number') setCurrentLatency(progress.loadedLatencyMs);
        if (progress.downloadSamples) setDownloadSamples(progress.downloadSamples);
        if (progress.uploadSamples) setUploadSamples(progress.uploadSamples);
        if (progress.idleLatencySamples) setLatencySamples(progress.idleLatencySamples);
        if (progress.loadedLatencySamples) setLatencySamples(progress.loadedLatencySamples);
      } else if (type === "complete") {
        setResult(testResult);
        setPhase("complete");
        setIsRunning(false);
        
        const qoe = calculateQoE(testResult);
        const bufferbloatGrade = getBufferbloatGrade(testResult.bufferbloatRatio);
        
        const fullResult = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          server: selectedServer.id === "auto" 
            ? { ...selectedServer, url: window.location.origin }
            : selectedServer,
          client: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            connectionType: (navigator as any).connection?.effectiveType,
          },
          testConfig: {
            mode,
            durationSec: mode === "quick" ? 15 : mode === "standard" ? 30 : 60,
            concurrency: mode === "quick" ? 4 : mode === "standard" ? 6 : 8,
          },
          download: {
            avgMbps: testResult.downloadMbps,
            peakMbps: Math.max(...testResult.downloadSamples.map(s => s.mbps)),
            p95WindowMbps: testResult.downloadP95,
            stabilityScore: testResult.stabilityScore,
            samples: testResult.downloadSamples.map(s => [s.timeMs, s.mbps] as [number, number]),
          },
          upload: {
            avgMbps: testResult.uploadMbps,
            peakMbps: Math.max(...testResult.uploadSamples.map(s => s.mbps)),
            p95WindowMbps: testResult.uploadP95,
            stabilityScore: testResult.stabilityScore,
            samples: testResult.uploadSamples.map(s => [s.timeMs, s.mbps] as [number, number]),
          },
          latency: {
            idle: {
              medianMs: testResult.idleLatencyMs,
              p95Ms: testResult.idleLatencyP95,
              maxMs: Math.max(...testResult.idleLatencySamples.map(s => s.rttMs)),
              jitterMs: testResult.idleJitterMs,
              lossPct: 0,
              samples: testResult.idleLatencySamples.map(s => [s.timeMs, s.rttMs] as [number, number]),
            },
            loaded: {
              medianMs: testResult.loadedLatencyMs,
              p95Ms: testResult.loadedLatencyP95,
              maxMs: Math.max(...testResult.loadedLatencySamples.map(s => s.rttMs)),
              jitterMs: testResult.loadedJitterMs,
              lossPct: 0,
              samples: testResult.loadedLatencySamples.map(s => [s.timeMs, s.rttMs] as [number, number]),
            },
          },
          qoe,
          diagnostics: {
            bufferbloatGrade: bufferbloatGrade.grade,
            ipv6: "Unknown",
          },
        };
        
        saveResult(fullResult).then(() => {
          toast.success("Speed test completed and saved!");
        });
      } else if (type === "error") {
        toast.error(`Test error: ${e.data.error}`);
        setIsRunning(false);
        setPhase("idle");
      }
    };

      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error);
        toast.error('Test worker failed to initialize');
        setIsRunning(false);
        setPhase("idle");
      };
    } catch (error) {
      console.error('Failed to create worker:', error);
      toast.error('Failed to initialize speed test worker');
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, [selectedServer, mode]);

  const calculateQoE = (result: WorkerResult) => {
    const streaming = result.downloadMbps >= 25 && result.idleLatencyMs < 50 ? "4K Ready" :
                      result.downloadMbps >= 10 && result.idleLatencyMs < 100 ? "HD Ready" :
                      result.downloadMbps >= 5 ? "SD Ready" : "Limited";
    
    const calls = result.uploadMbps >= 3 && result.idleLatencyMs < 50 && result.idleJitterMs < 30 ? "Excellent" :
                  result.uploadMbps >= 1.5 && result.idleLatencyMs < 100 ? "Good" :
                  result.uploadMbps >= 0.5 ? "Fair" : "Poor";
    
    const gaming = result.idleLatencyMs < 30 && result.idleJitterMs < 10 ? "Competitive" :
                   result.idleLatencyMs < 50 && result.idleJitterMs < 20 ? "Casual" :
                   result.idleLatencyMs < 100 ? "Playable" : "Limited";
    
    return { streaming, calls, gaming };
  };

  const getBufferbloatGrade = (ratio: number) => {
    if (ratio <= 1.3) return { grade: "A", color: "hsl(var(--chart-3))", desc: "Excellent" };
    if (ratio <= 1.6) return { grade: "B", color: "hsl(var(--primary))", desc: "Good" };
    if (ratio <= 2.0) return { grade: "C", color: "hsl(var(--chart-4))", desc: "Fair" };
    if (ratio <= 3.0) return { grade: "D", color: "hsl(var(--chart-4))", desc: "Poor" };
    if (ratio <= 4.0) return { grade: "E", color: "hsl(var(--destructive))", desc: "Bad" };
    return { grade: "F", color: "hsl(var(--destructive))", desc: "Critical" };
  };

  const startTest = () => {
    if (!workerRef.current) {
      toast.error('Test worker not initialized. Please refresh the page.');
      return;
    }

    setIsRunning(true);
    setPhase("idle");
    setResult(null);
    setCurrentDownload(0);
    setCurrentUpload(0);
    setCurrentLatency(0);
    setDownloadSamples([]);
    setUploadSamples([]);
    setLatencySamples([]);

    const baseUrl = `https://ivbkofpclxcczgkwbrri.functions.supabase.co/functions/v1`;

    try {
      workerRef.current.postMessage({
        type: "start",
        config: {
          mode,
          concurrency: mode === "quick" ? 4 : mode === "standard" ? 6 : 8,
          durationSec: mode === "quick" ? 15 : mode === "standard" ? 30 : 60,
          baseUrl,
        },
      });
    } catch (error) {
      console.error('Failed to start test:', error);
      toast.error('Failed to start test. Please try again.');
      setIsRunning(false);
      setPhase("idle");
    }
  };

  const stopTest = () => {
    workerRef.current?.postMessage({ type: "stop" });
    setIsRunning(false);
    setPhase("idle");
  };

  const getPhaseText = () => {
    switch (phase) {
      case "idle": return "Measuring baseline latency...";
      case "download": return "Testing download speed...";
      case "upload": return "Testing upload speed...";
      case "loaded-latency": return "Measuring bufferbloat (loaded latency)...";
      case "complete": return "Test complete!";
      default: return "Ready to test";
    }
  };

  const progressValue = phase === "idle" ? 25 : phase === "download" ? 50 : phase === "upload" ? 75 : phase === "loaded-latency" ? 90 : 100;
  const bufferbloat = result ? getBufferbloatGrade(result.bufferbloatRatio) : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-card">
      <div className="w-full max-w-7xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Speed Test Pro
            </h1>
            <Button variant="outline" onClick={() => navigate("/history")} className="gap-2">
              <History className="h-4 w-4" />
              History
            </Button>
          </div>
          <p className="text-muted-foreground text-lg">
            Professional-grade network performance testing with real-time analytics
          </p>
        </div>

        {/* Configuration */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Tabs value={mode} onValueChange={(v) => !isRunning && setMode(v as TestMode)} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quick" disabled={isRunning}>Quick (15s)</TabsTrigger>
              <TabsTrigger value="standard" disabled={isRunning}>Standard (30s)</TabsTrigger>
              <TabsTrigger value="advanced" disabled={isRunning}>Advanced (60s)</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select
            value={selectedServer.id}
            onValueChange={(v) => !isRunning && setSelectedServer(servers.find(s => s.id === v) || servers[0])}
            disabled={isRunning}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {servers.map(server => (
                <SelectItem key={server.id} value={server.id}>
                  {server.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Main Card */}
        <Card className="p-6 md:p-8 bg-card/50 backdrop-blur border-border/50 shadow-[var(--shadow-elegant)]">
          <TestMetrics
            phase={phase}
            isRunning={isRunning}
            currentDownload={currentDownload}
            currentUpload={currentUpload}
            currentLatency={currentLatency}
            result={result}
          />

          {isRunning && downloadSamples.length > 0 && (
            <TestCharts
              phase={phase}
              downloadSamples={downloadSamples}
              uploadSamples={uploadSamples}
              latencySamples={latencySamples}
            />
          )}

          {result && bufferbloat && (
            <TestResults result={result} bufferbloat={bufferbloat} qoe={calculateQoE(result)} />
          )}

          {isRunning && (
            <div className="mb-6 mt-6">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>{getPhaseText()}</span>
                <span>{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>
          )}

          {/* Control Button */}
          <div className="text-center space-y-4 mt-6">
            <Button
              onClick={isRunning ? stopTest : startTest}
              size="lg"
              className={`relative px-12 py-6 text-lg font-semibold transition-all duration-300 ${
                isRunning
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-gradient-to-r from-primary to-accent hover:opacity-90"
              }`}
              style={!isRunning ? { boxShadow: 'var(--shadow-glow)' } : {}}
              aria-label={isRunning ? "Stop speed test" : `Start ${mode} speed test`}
            >
              {isRunning ? (
                <>
                  <Square className="mr-2 h-6 w-6" aria-hidden="true" />
                  Stop Test
                </>
              ) : (
                <>
                  <Play className="mr-2 h-6 w-6" aria-hidden="true" />
                  Start {mode === "quick" ? "Quick" : mode === "standard" ? "Standard" : "Advanced"} Test
                </>
              )}
            </Button>
          </div>

          {result && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Confidence Interval (95%): {result.confidenceInterval.lower.toFixed(1)} - {result.confidenceInterval.upper.toFixed(1)} Mbps
              </div>
            </div>
          )}
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Tests run in Web Workers for smooth performance • Results saved locally with IndexedDB</p>
        </div>
      </div>
    </div>
  );
};
