import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gauge } from "lucide-react";
import { toast } from "sonner";

type TestStatus = "idle" | "ping" | "download" | "upload" | "complete";

export const SpeedTest = () => {
  const [status, setStatus] = useState<TestStatus>("idle");
  const [ping, setPing] = useState<number>(0);
  const [downloadSpeed, setDownloadSpeed] = useState<number>(0);
  const [uploadSpeed, setUploadSpeed] = useState<number>(0);

  const measurePing = async () => {
    const iterations = 5;
    let totalPing = 0;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        await fetch("https://www.google.com/generate_204", {
          mode: "no-cors",
          cache: "no-cache",
        });
        const end = performance.now();
        totalPing += end - start;
      } catch (error) {
        console.error("Ping test error:", error);
      }
    }

    return Math.round(totalPing / iterations);
  };

  const measureDownloadSpeed = async () => {
    const fileSizeInBytes = 5000000; // 5MB test file
    const testUrl = `https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80`;

    const startTime = performance.now();
    try {
      const response = await fetch(testUrl, { cache: "no-cache" });
      await response.blob();
      const endTime = performance.now();

      const durationInSeconds = (endTime - startTime) / 1000;
      const speedBps = fileSizeInBytes / durationInSeconds;
      const speedMbps = (speedBps * 8) / (1024 * 1024);

      return Math.round(speedMbps * 10) / 10;
    } catch (error) {
      console.error("Download test error:", error);
      return 0;
    }
  };

  const measureUploadSpeed = async () => {
    const data = new Uint8Array(1000000); // 1MB of data
    const startTime = performance.now();

    try {
      await fetch("https://httpbin.org/post", {
        method: "POST",
        body: data,
        cache: "no-cache",
      });
      const endTime = performance.now();

      const durationInSeconds = (endTime - startTime) / 1000;
      const speedBps = data.length / durationInSeconds;
      const speedMbps = (speedBps * 8) / (1024 * 1024);

      return Math.round(speedMbps * 10) / 10;
    } catch (error) {
      console.error("Upload test error:", error);
      return 0;
    }
  };

  const runSpeedTest = async () => {
    setPing(0);
    setDownloadSpeed(0);
    setUploadSpeed(0);

    // Ping Test
    setStatus("ping");
    const pingResult = await measurePing();
    setPing(pingResult);

    // Download Test
    setStatus("download");
    const downloadResult = await measureDownloadSpeed();
    setDownloadSpeed(downloadResult);

    // Upload Test
    setStatus("upload");
    const uploadResult = await measureUploadSpeed();
    setUploadSpeed(uploadResult);

    setStatus("complete");
    toast.success("Speed test completed!");
  };

  const getStatusText = () => {
    switch (status) {
      case "ping":
        return "Measuring ping...";
      case "download":
        return "Testing download speed...";
      case "upload":
        return "Testing upload speed...";
      case "complete":
        return "Test complete!";
      default:
        return "Ready to test";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-card">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Internet Speed Test
          </h1>
          <p className="text-muted-foreground text-lg">
            Test your connection speed instantly
          </p>
        </div>

        <Card className="p-8 bg-card/50 backdrop-blur border-border/50 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Ping */}
            <div className="text-center p-6 rounded-xl bg-background/50 border border-border/50">
              <div className="text-sm text-muted-foreground mb-2">PING</div>
              <div className={`text-4xl font-bold ${status === "ping" ? "text-primary animate-pulse" : "text-foreground"}`}>
                {ping}
                <span className="text-xl ml-1">ms</span>
              </div>
            </div>

            {/* Download */}
            <div className="text-center p-6 rounded-xl bg-background/50 border border-border/50">
              <div className="text-sm text-muted-foreground mb-2">DOWNLOAD</div>
              <div className={`text-4xl font-bold ${status === "download" ? "text-primary animate-pulse" : "text-foreground"}`}>
                {downloadSpeed}
                <span className="text-xl ml-1">Mbps</span>
              </div>
            </div>

            {/* Upload */}
            <div className="text-center p-6 rounded-xl bg-background/50 border border-border/50">
              <div className="text-sm text-muted-foreground mb-2">UPLOAD</div>
              <div className={`text-4xl font-bold ${status === "upload" ? "text-primary animate-pulse" : "text-foreground"}`}>
                {uploadSpeed}
                <span className="text-xl ml-1">Mbps</span>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <div className="text-sm text-muted-foreground">{getStatusText()}</div>
            
            <Button
              onClick={runSpeedTest}
              disabled={status !== "idle" && status !== "complete"}
              size="lg"
              className="relative px-12 py-6 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_30px_rgba(14,165,233,0.4)] hover:shadow-[0_0_40px_rgba(14,165,233,0.6)] transition-all duration-300"
            >
              <Gauge className="mr-2 h-6 w-6" />
              {status === "idle" || status === "complete" ? "Start Test" : "Testing..."}
            </Button>
          </div>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Tests may take up to 30 seconds to complete</p>
        </div>
      </div>
    </div>
  );
};
