import { Wifi, Video, Phone, Gamepad2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TestResultsProps {
  result: any;
  bufferbloat: { grade: string; color: string; desc: string };
  qoe: { streaming: string; calls: string; gaming: string };
}

export const TestResults = ({ result, bufferbloat, qoe }: TestResultsProps) => {
  const getQoEColor = (value: string) => {
    if (value.includes("Excellent") || value.includes("4K") || value.includes("Competitive"))
      return "hsl(var(--chart-3))";
    if (value.includes("Good") || value.includes("HD") || value.includes("Casual"))
      return "hsl(var(--primary))";
    if (value.includes("Fair") || value.includes("SD") || value.includes("Playable"))
      return "hsl(var(--chart-4))";
    return "hsl(var(--destructive))";
  };

  return (
    <>
      {/* Bufferbloat Card */}
      <Card className="mb-8 p-6 bg-gradient-to-br from-background/80 to-background/40 border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-2">BUFFERBLOAT GRADE</div>
            <div className="flex items-center gap-4">
              <span
                className="text-7xl font-bold transition-all duration-500"
                style={{ color: bufferbloat.color }}
              >
                {bufferbloat.grade}
              </span>
              <div>
                <div className="text-2xl font-semibold">{bufferbloat.desc}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Loaded: {result.loadedLatencyMs.toFixed(0)}ms | Idle: {result.idleLatencyMs.toFixed(0)}ms
                </div>
                <div className="text-xs text-muted-foreground">
                  Ratio: {result.bufferbloatRatio.toFixed(2)}x
                </div>
              </div>
            </div>
          </div>
          <Wifi className="h-20 w-20 transition-all duration-500" style={{ color: bufferbloat.color }} />
        </div>
      </Card>

      {/* QoE Badges */}
      <Card className="p-6 bg-gradient-to-br from-background/80 to-background/40 border-border/50">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          Quality of Experience
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-lg border border-border bg-background/50 hover:bg-background/70 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <Video className="h-5 w-5" style={{ color: getQoEColor(qoe.streaming) }} />
              <div className="text-sm text-muted-foreground">Streaming</div>
            </div>
            <Badge
              variant="outline"
              className="text-base font-semibold border-2"
              style={{ borderColor: getQoEColor(qoe.streaming), color: getQoEColor(qoe.streaming) }}
            >
              {qoe.streaming}
            </Badge>
          </div>

          <div className="p-5 rounded-lg border border-border bg-background/50 hover:bg-background/70 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <Phone className="h-5 w-5" style={{ color: getQoEColor(qoe.calls) }} />
              <div className="text-sm text-muted-foreground">Video Calls</div>
            </div>
            <Badge
              variant="outline"
              className="text-base font-semibold border-2"
              style={{ borderColor: getQoEColor(qoe.calls), color: getQoEColor(qoe.calls) }}
            >
              {qoe.calls}
            </Badge>
          </div>

          <div className="p-5 rounded-lg border border-border bg-background/50 hover:bg-background/70 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <Gamepad2 className="h-5 w-5" style={{ color: getQoEColor(qoe.gaming) }} />
              <div className="text-sm text-muted-foreground">Gaming</div>
            </div>
            <Badge
              variant="outline"
              className="text-base font-semibold border-2"
              style={{ borderColor: getQoEColor(qoe.gaming), color: getQoEColor(qoe.gaming) }}
            >
              {qoe.gaming}
            </Badge>
          </div>
        </div>
      </Card>
    </>
  );
};
