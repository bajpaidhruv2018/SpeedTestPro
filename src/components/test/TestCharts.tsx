import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/card";

interface TestChartsProps {
  phase: string;
  downloadSamples: Array<{ timeMs: number; mbps: number }>;
  uploadSamples: Array<{ timeMs: number; mbps: number }>;
  latencySamples: Array<{ timeMs: number; rttMs: number }>;
}

export const TestCharts = ({
  phase,
  downloadSamples,
  uploadSamples,
  latencySamples,
}: TestChartsProps) => {
  const throughputData = downloadSamples.map((d, i) => ({
    time: (d.timeMs / 1000).toFixed(1),
    download: d.mbps.toFixed(1),
    upload: uploadSamples[i]?.mbps.toFixed(1) || 0,
  }));

  const latencyData = latencySamples.map(l => ({
    time: (l.timeMs / 1000).toFixed(1),
    latency: l.rttMs.toFixed(0),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Throughput Chart */}
      <Card className="p-4 bg-background/30 border-border/50">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Throughput Over Time</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={throughputData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              label={{ value: "Time (s)", position: "insideBottom", offset: -5 }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              label={{ value: "Mbps", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="download"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={false}
              name="Download"
            />
            <Line
              type="monotone"
              dataKey="upload"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={false}
              name="Upload"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Latency Chart */}
      <Card className="p-4 bg-background/30 border-border/50">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          {phase === "loaded-latency" ? "Loaded Latency" : "Idle Latency"}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={latencyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              label={{ value: "Time (s)", position: "insideBottom", offset: -5 }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              label={{ value: "ms", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Line
              type="monotone"
              dataKey="latency"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              dot={false}
              name="Latency"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};
