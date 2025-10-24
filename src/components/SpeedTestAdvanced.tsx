import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gauge, Play, Square, Wifi, Upload as UploadIcon, Download as DownloadIcon, Activity, History } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { saveResult } from "@/lib/storage";

type TestPhase = "idle" | "download" | "upload" | "loaded-latency" | "complete";
type TestMode = "quick" | "advanced";

interface TestResult {
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
  bufferbloatRatio: number;
}

export const SpeedTestAdvanced = () => {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<TestPhase>("idle");
  const [mode, setMode] = useState<TestMode>("quick");
  const [result, setResult] = useState<TestResult | null>(null);
  const [currentDownload, setCurrentDownload] = useState(0);
  const [currentUpload, setCurrentUpload] = useState(0);
  const [currentLatency, setCurrentLatency] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(
      new URL("../workers/speedTest.worker.ts", import.meta.url),
      { type: "module" }
    );

    workerRef.current.onmessage = (e) => {
      const { type, phase: newPhase, result: testResult, ...progress } = e.data;

      if (type === "progress") {
        setPhase(newPhase);
        if (progress.downloadMbps) setCurrentDownload(progress.downloadMbps);
        if (progress.uploadMbps) setCurrentUpload(progress.uploadMbps);
        if (progress.idleLatencyMs) setCurrentLatency(progress.idleLatencyMs);
        if (progress.loadedLatencyMs) setCurrentLatency(progress.loadedLatencyMs);
      } else if (type === "complete") {
        const fullResult = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          server: { id: "main", name: "Main Server", region: "Auto", url: window.location.origin },
          client: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            connectionType: (navigator as any).connection?.effectiveType,
          },
          testConfig: {
            mode,
            durationSec: mode === "quick" ? 15 : 60,
            concurrency: mode === "quick" ? 4 : 8,
          },
          ...testResult,
        };
        
        setResult(fullResult);
        setPhase("complete");
        setIsRunning(false);
        
        // Save to IndexedDB
        saveResult(fullResult).then(() => {
          toast.success("Speed test completed and saved!");
        });
      } else if (type === "error") {
        toast.error(`Test error: ${e.data.error}`);
        setIsRunning(false);
        setPhase("idle");
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const startTest = () => {
    setIsRunning(true);
    setPhase("idle");
    setResult(null);
    setCurrentDownload(0);
    setCurrentUpload(0);
    setCurrentLatency(0);

    const baseUrl = `https://ivbkofpclxcczgkwbrri.supabase.co/functions/v1`;

    workerRef.current?.postMessage({
      type: "start",
      config: {
        mode,
        concurrency: mode === "quick" ? 4 : 8,
        durationSec: mode === "quick" ? 15 : 60,
        baseUrl,
      },
    });
  };

  const stopTest = () => {
    workerRef.current?.postMessage({ type: "stop" });
    setIsRunning(false);
    setPhase("idle");
  };

  const getPhaseText = () => {
    switch (phase) {
      case "idle":
        return "Measuring baseline latency...";
      case "download":
        return "Testing download speed...";
      case "upload":
        return "Testing upload speed...";
      case "loaded-latency":
        return "Measuring bufferbloat (loaded latency)...";
      case "complete":
        return "Test complete!";
      default:
        return "Ready to test";
    }
  };

  const getBufferbloatGrade = (ratio: number) => {
    if (ratio <= 1.3) return { grade: "A", color: "text-green-500", desc: "Excellent" };
    if (ratio <= 1.6) return { grade: "B", color: "text-blue-500", desc: "Good" };
    if (ratio <= 2.0) return { grade: "C", color: "text-yellow-500", desc: "Fair" };
    if (ratio <= 3.0) return { grade: "D", color: "text-orange-500", desc: "Poor" };
    if (ratio <= 4.0) return { grade: "E", color: "text-red-500", desc: "Bad" };
    return { grade: "F", color: "text-red-700", desc: "Critical" };
  };

  const bufferbloat = result ? getBufferbloatGrade(result.bufferbloatRatio) : null;
  const progressValue = phase === "idle" ? 25 : phase === "download" ? 50 : phase === "upload" ? 75 : phase === "loaded-latency" ? 90 : 100;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-card">
      <div className="w-full max-w-6xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Advanced Speed Test
            </h1>
            <Button variant="outline" onClick={() => navigate("/history")}>
              <History className="mr-2 h-4 w-4" />
              History
            </Button>
          </div>
          <p className="text-muted-foreground text-lg">
            Professional-grade network performance testing
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center gap-2 mb-6">
          <Button
            variant={mode === "quick" ? "default" : "outline"}
            onClick={() => !isRunning && setMode("quick")}
            disabled={isRunning}
          >
            Quick Test (15s)
          </Button>
          <Button
            variant={mode === "advanced" ? "default" : "outline"}
            onClick={() => !isRunning && setMode("advanced")}
            disabled={isRunning}
          >
            Advanced Test (60s)
          </Button>
        </div>

        {/* Main Test Card */}
        <Card className="p-8 bg-card/50 backdrop-blur border-border/50 shadow-xl">
          {/* Real-time Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Download */}
            <div className="text-center p-6 rounded-xl bg-background/50 border border-border/50">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <DownloadIcon className="h-4 w-4" />
                DOWNLOAD
              </div>
              <div
                className={`text-4xl font-bold ${
                  phase === "download" ? "text-primary animate-pulse" : "text-foreground"
                }`}
              >
                {result?.downloadMbps || currentDownload.toFixed(1)}
                <span className="text-xl ml-1">Mbps</span>
              </div>
              {result && (
                <div className="text-xs text-muted-foreground mt-2">
                  P95: {result.downloadP95} Mbps | Stability: {result.stabilityScore}%
                </div>
              )}
            </div>

            {/* Upload */}
            <div className="text-center p-6 rounded-xl bg-background/50 border border-border/50">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <UploadIcon className="h-4 w-4" />
                UPLOAD
              </div>
              <div
                className={`text-4xl font-bold ${
                  phase === "upload" ? "text-primary animate-pulse" : "text-foreground"
                }`}
              >
                {result?.uploadMbps || currentUpload.toFixed(1)}
                <span className="text-xl ml-1">Mbps</span>
              </div>
              {result && (
                <div className="text-xs text-muted-foreground mt-2">P95: {result.uploadP95} Mbps</div>
              )}
            </div>

            {/* Latency */}
            <div className="text-center p-6 rounded-xl bg-background/50 border border-border/50">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <Activity className="h-4 w-4" />
                LATENCY
              </div>
              <div
                className={`text-4xl font-bold ${
                  phase === "idle" || phase === "loaded-latency" ? "text-primary animate-pulse" : "text-foreground"
                }`}
              >
                {result?.idleLatencyMs || currentLatency.toFixed(0)}
                <span className="text-xl ml-1">ms</span>
              </div>
              {result && (
                <div className="text-xs text-muted-foreground mt-2">
                  Jitter: {result.idleJitterMs}ms | P95: {result.idleLatencyP95}ms
                </div>
              )}
            </div>
          </div>

          {/* Bufferbloat Card */}
          {result && bufferbloat && (
            <div className="mb-8 p-6 rounded-xl bg-background/50 border border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">BUFFERBLOAT GRADE</div>
                  <div className="flex items-center gap-3">
                    <span className={`text-5xl font-bold ${bufferbloat.color}`}>{bufferbloat.grade}</span>
                    <div>
                      <div className="text-lg font-semibold">{bufferbloat.desc}</div>
                      <div className="text-sm text-muted-foreground">
                        Loaded: {result.loadedLatencyMs}ms | Idle: {result.idleLatencyMs}ms (
                        {result.bufferbloatRatio.toFixed(2)}x)
                      </div>
                    </div>
                  </div>
                </div>
                <Wifi className={`h-16 w-16 ${bufferbloat.color}`} />
              </div>
            </div>
          )}

          {/* Progress */}
          {isRunning && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>{getPhaseText()}</span>
                <span>{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>
          )}

          {/* Control Button */}
          <div className="text-center space-y-4">
            <Button
              onClick={isRunning ? stopTest : startTest}
              size="lg"
              className={`relative px-12 py-6 text-lg font-semibold ${
                isRunning
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-primary hover:bg-primary/90"
              } text-primary-foreground shadow-[0_0_30px_rgba(14,165,233,0.4)] hover:shadow-[0_0_40px_rgba(14,165,233,0.6)] transition-all duration-300`}
            >
              {isRunning ? (
                <>
                  <Square className="mr-2 h-6 w-6" />
                  Stop Test
                </>
              ) : (
                <>
                  <Play className="mr-2 h-6 w-6" />
                  Start {mode === "quick" ? "Quick" : "Advanced"} Test
                </>
              )}
            </Button>
          </div>

          {result && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>
                Confidence Interval (95%): {result.confidenceInterval.lower.toFixed(1)} -{" "}
                {result.confidenceInterval.upper.toFixed(1)} Mbps
              </p>
            </div>
          )}
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Tests run in a Web Worker for smooth performance | Results include confidence intervals</p>
        </div>
      </div>
    </div>
  );
};
