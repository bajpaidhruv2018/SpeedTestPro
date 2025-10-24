import { Download, Upload, Activity } from "lucide-react";

interface TestMetricsProps {
  phase: string;
  isRunning: boolean;
  currentDownload: number;
  currentUpload: number;
  currentLatency: number;
  result: any;
}

export const TestMetrics = ({
  phase,
  isRunning,
  currentDownload,
  currentUpload,
  currentLatency,
  result,
}: TestMetricsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Download */}
      <div className="text-center p-6 rounded-xl bg-gradient-to-br from-background/80 to-background/40 border border-border/50 transition-all duration-300 hover:shadow-[var(--shadow-elegant)]">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
          <Download className="h-4 w-4" />
          DOWNLOAD
        </div>
        <div
          className={`text-5xl font-bold transition-all duration-300 ${
            phase === "download" && isRunning
              ? "text-primary animate-pulse scale-110"
              : "text-foreground"
          }`}
        >
          {result?.downloadMbps.toFixed(1) || currentDownload.toFixed(1)}
          <span className="text-2xl ml-1">Mbps</span>
        </div>
        {result && (
          <div className="text-xs text-muted-foreground mt-3 space-y-1">
            <div>Peak: {Math.max(...result.downloadSamples.map((s: any) => s.mbps)).toFixed(1)} Mbps</div>
            <div>P95: {result.downloadP95.toFixed(1)} Mbps</div>
            <div className="flex items-center justify-center gap-1">
              Stability: 
              <span className="font-semibold" style={{ color: result.stabilityScore > 80 ? 'hsl(var(--chart-3))' : result.stabilityScore > 60 ? 'hsl(var(--chart-4))' : 'hsl(var(--destructive))' }}>
                {result.stabilityScore}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Upload */}
      <div className="text-center p-6 rounded-xl bg-gradient-to-br from-background/80 to-background/40 border border-border/50 transition-all duration-300 hover:shadow-[var(--shadow-elegant)]">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
          <Upload className="h-4 w-4" />
          UPLOAD
        </div>
        <div
          className={`text-5xl font-bold transition-all duration-300 ${
            phase === "upload" && isRunning
              ? "text-primary animate-pulse scale-110"
              : "text-foreground"
          }`}
        >
          {result?.uploadMbps.toFixed(1) || currentUpload.toFixed(1)}
          <span className="text-2xl ml-1">Mbps</span>
        </div>
        {result && (
          <div className="text-xs text-muted-foreground mt-3 space-y-1">
            <div>Peak: {Math.max(...result.uploadSamples.map((s: any) => s.mbps)).toFixed(1)} Mbps</div>
            <div>P95: {result.uploadP95.toFixed(1)} Mbps</div>
          </div>
        )}
      </div>

      {/* Latency */}
      <div className="text-center p-6 rounded-xl bg-gradient-to-br from-background/80 to-background/40 border border-border/50 transition-all duration-300 hover:shadow-[var(--shadow-elegant)]">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
          <Activity className="h-4 w-4" />
          LATENCY
        </div>
        <div
          className={`text-5xl font-bold transition-all duration-300 ${
            (phase === "idle" || phase === "loaded-latency") && isRunning
              ? "text-primary animate-pulse scale-110"
              : "text-foreground"
          }`}
        >
          {result?.idleLatencyMs.toFixed(0) || currentLatency.toFixed(0)}
          <span className="text-2xl ml-1">ms</span>
        </div>
        {result && (
          <div className="text-xs text-muted-foreground mt-3 space-y-1">
            <div>Jitter: {result.idleJitterMs.toFixed(1)} ms</div>
            <div>P95: {result.idleLatencyP95.toFixed(0)} ms</div>
          </div>
        )}
      </div>
    </div>
  );
};
