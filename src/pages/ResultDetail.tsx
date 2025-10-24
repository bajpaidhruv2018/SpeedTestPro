import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share2, Wifi, Activity, Upload as UploadIcon, Download as DownloadIcon } from "lucide-react";
import { getResult, TestResult } from "@/lib/storage";
import { toast } from "sonner";

export default function ResultDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    getResult(id).then((data) => {
      if (data) {
        setResult(data);
      } else {
        toast.error("Result not found");
        navigate("/history");
      }
      setLoading(false);
    });
  }, [id, navigate]);

  const handleShare = async () => {
    if (!result) return;
    
    const shareData = {
      title: "Speed Test Result",
      text: `Download: ${result.download.avgMbps.toFixed(1)} Mbps | Upload: ${result.upload.avgMbps.toFixed(1)} Mbps | Latency: ${result.latency.idle.medianMs.toFixed(0)} ms | Bufferbloat: ${result.diagnostics.bufferbloatGrade}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success("Shared successfully!");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(window.location.href);
          toast.success("Link copied to clipboard!");
        }
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleExport = () => {
    if (!result) return;
    
    const dataStr = JSON.stringify(result, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `speedtest-${result.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Result exported!");
  };

  const getBufferbloatColor = (grade: string) => {
    const colors: Record<string, string> = {
      A: "text-green-500",
      B: "text-blue-500",
      C: "text-yellow-500",
      D: "text-orange-500",
      E: "text-red-500",
      F: "text-red-700",
    };
    return colors[grade] || "text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading result...</div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background via-background to-card">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/history")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to History
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Test Info */}
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold">Test Result</h1>
              <p className="text-muted-foreground mt-1">
                {new Date(result.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Mode</div>
              <div className="font-semibold capitalize">{result.testConfig.mode}</div>
            </div>
          </div>
        </Card>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <DownloadIcon className="h-4 w-4" />
              DOWNLOAD
            </div>
            <div className="text-4xl font-bold text-primary">
              {result.download.avgMbps.toFixed(1)}
              <span className="text-xl ml-1">Mbps</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <div>Peak: {result.download.peakMbps.toFixed(1)} Mbps</div>
              <div>P95: {result.download.p95WindowMbps.toFixed(1)} Mbps</div>
              <div>Stability: {result.download.stabilityScore}%</div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <UploadIcon className="h-4 w-4" />
              UPLOAD
            </div>
            <div className="text-4xl font-bold text-primary">
              {result.upload.avgMbps.toFixed(1)}
              <span className="text-xl ml-1">Mbps</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <div>Peak: {result.upload.peakMbps.toFixed(1)} Mbps</div>
              <div>P95: {result.upload.p95WindowMbps.toFixed(1)} Mbps</div>
              <div>Stability: {result.upload.stabilityScore}%</div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Activity className="h-4 w-4" />
              LATENCY
            </div>
            <div className="text-4xl font-bold text-primary">
              {result.latency.idle.medianMs.toFixed(0)}
              <span className="text-xl ml-1">ms</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <div>Jitter: {result.latency.idle.jitterMs.toFixed(1)} ms</div>
              <div>P95: {result.latency.idle.p95Ms.toFixed(0)} ms</div>
              <div>Loss: {result.latency.idle.lossPct.toFixed(2)}%</div>
            </div>
          </Card>
        </div>

        {/* Bufferbloat */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-2">BUFFERBLOAT GRADE</div>
              <div className="flex items-center gap-4">
                <span className={`text-6xl font-bold ${getBufferbloatColor(result.diagnostics.bufferbloatGrade)}`}>
                  {result.diagnostics.bufferbloatGrade}
                </span>
                <div>
                  <div className="text-lg font-semibold">
                    {result.diagnostics.bufferbloatGrade === "A" && "Excellent"}
                    {result.diagnostics.bufferbloatGrade === "B" && "Good"}
                    {result.diagnostics.bufferbloatGrade === "C" && "Fair"}
                    {result.diagnostics.bufferbloatGrade === "D" && "Poor"}
                    {result.diagnostics.bufferbloatGrade === "E" && "Bad"}
                    {result.diagnostics.bufferbloatGrade === "F" && "Critical"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Loaded: {result.latency.loaded.medianMs.toFixed(0)}ms | Idle: {result.latency.idle.medianMs.toFixed(0)}ms
                  </div>
                </div>
              </div>
            </div>
            <Wifi className={`h-16 w-16 ${getBufferbloatColor(result.diagnostics.bufferbloatGrade)}`} />
          </div>
        </Card>

        {/* QoE Badges */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Quality of Experience</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border bg-background/50">
              <div className="text-sm text-muted-foreground mb-1">Streaming</div>
              <div className="text-lg font-semibold">{result.qoe.streaming}</div>
            </div>
            <div className="p-4 rounded-lg border border-border bg-background/50">
              <div className="text-sm text-muted-foreground mb-1">Video Calls</div>
              <div className="text-lg font-semibold">{result.qoe.calls}</div>
            </div>
            <div className="p-4 rounded-lg border border-border bg-background/50">
              <div className="text-sm text-muted-foreground mb-1">Gaming</div>
              <div className="text-lg font-semibold">{result.qoe.gaming}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
