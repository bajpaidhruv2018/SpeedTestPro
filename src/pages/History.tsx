import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Upload, Activity, Trash2, TrendingUp, BarChart3 } from "lucide-react";
import { getAllResults, deleteResult, TestResult } from "@/lib/storage";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function History() {
  const navigate = useNavigate();
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());

  const loadResults = async () => {
    setLoading(true);
    const data = await getAllResults();
    setResults(data);
    setLoading(false);
  };

  useEffect(() => {
    loadResults();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this result?")) {
      await deleteResult(id);
      toast.success("Result deleted");
      loadResults();
    }
  };

  const toggleResultSelection = (id: string) => {
    const newSelection = new Set(selectedResults);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      if (newSelection.size < 5) {
        newSelection.add(id);
      } else {
        toast.error("Maximum 5 results can be compared");
      }
    }
    setSelectedResults(newSelection);
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

  const trendData = results.slice(0, 10).reverse().map((r, i) => ({
    test: `#${i + 1}`,
    download: r.download.avgMbps,
    upload: r.upload.avgMbps,
    latency: r.latency.idle.medianMs,
  }));

  const comparisonResults = Array.from(selectedResults)
    .map(id => results.find(r => r.id === id))
    .filter(Boolean) as TestResult[];

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background via-background to-card">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Test
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Test History & Analytics
          </h1>
          <div className="w-[140px]" /> {/* Spacer for center alignment */}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading history...</div>
        ) : results.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-muted-foreground mb-4">No test results yet</div>
            <Button onClick={() => navigate("/")}>Run Your First Test</Button>
          </Card>
        ) : (
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-6">
              <TabsTrigger value="list">Results</TabsTrigger>
              <TabsTrigger value="trends">
                <TrendingUp className="h-4 w-4 mr-2" />
                Trends
              </TabsTrigger>
              <TabsTrigger value="compare" disabled={selectedResults.size < 2}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Compare ({selectedResults.size})
              </TabsTrigger>
            </TabsList>

            {/* List View */}
            <TabsContent value="list" className="space-y-4">
              {selectedResults.size > 0 && (
                <Card className="p-4 bg-primary/10 border-primary">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      {selectedResults.size} result{selectedResults.size > 1 ? 's' : ''} selected for comparison
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedResults(new Set())}>
                      Clear Selection
                    </Button>
                  </div>
                </Card>
              )}

              {results.map((result) => (
                <Card
                  key={result.id}
                  className={`p-6 cursor-pointer hover:bg-accent/50 transition-all duration-300 ${
                    selectedResults.has(result.id) ? 'ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => navigate(`/results/${result.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <input
                          type="checkbox"
                          checked={selectedResults.has(result.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleResultSelection(result.id);
                          }}
                          className="h-4 w-4 rounded border-border"
                        />
                        <div className="text-sm text-muted-foreground">
                          {new Date(result.createdAt).toLocaleString()}
                        </div>
                        <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded capitalize">
                          {result.testConfig.mode}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-xs text-muted-foreground">Download</div>
                            <div className="font-semibold">{result.download.avgMbps.toFixed(1)} Mbps</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-xs text-muted-foreground">Upload</div>
                            <div className="font-semibold">{result.upload.avgMbps.toFixed(1)} Mbps</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-xs text-muted-foreground">Latency</div>
                            <div className="font-semibold">{result.latency.idle.medianMs.toFixed(0)} ms</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Bufferbloat</div>
                          <div className={`font-semibold text-2xl ${getBufferbloatColor(result.diagnostics.bufferbloatGrade)}`}>
                            {result.diagnostics.bufferbloatGrade}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(result.id, e)}
                      className="ml-4"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Trends View */}
            <TabsContent value="trends">
              <div className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Download Speed Trend</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="test" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" label={{ value: "Mbps", angle: -90, position: "insideLeft" }} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                      <Line type="monotone" dataKey="download" stroke="hsl(var(--chart-1))" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Upload Speed Trend</h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="test" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                        <Line type="monotone" dataKey="upload" stroke="hsl(var(--chart-2))" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Latency Trend</h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="test" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                        <Line type="monotone" dataKey="latency" stroke="hsl(var(--chart-3))" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Statistics Summary</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-background/50">
                      <div className="text-sm text-muted-foreground mb-1">Avg Download</div>
                      <div className="text-2xl font-bold text-primary">
                        {(results.reduce((sum, r) => sum + r.download.avgMbps, 0) / results.length).toFixed(1)} Mbps
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50">
                      <div className="text-sm text-muted-foreground mb-1">Avg Upload</div>
                      <div className="text-2xl font-bold text-primary">
                        {(results.reduce((sum, r) => sum + r.upload.avgMbps, 0) / results.length).toFixed(1)} Mbps
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50">
                      <div className="text-sm text-muted-foreground mb-1">Avg Latency</div>
                      <div className="text-2xl font-bold text-primary">
                        {(results.reduce((sum, r) => sum + r.latency.idle.medianMs, 0) / results.length).toFixed(0)} ms
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50">
                      <div className="text-sm text-muted-foreground mb-1">Total Tests</div>
                      <div className="text-2xl font-bold text-primary">{results.length}</div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Comparison View */}
            <TabsContent value="compare">
              {comparisonResults.length >= 2 && (
                <div className="space-y-6">
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Speed Comparison</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-3 text-muted-foreground">Date</th>
                            <th className="text-right p-3 text-muted-foreground">Download</th>
                            <th className="text-right p-3 text-muted-foreground">Upload</th>
                            <th className="text-right p-3 text-muted-foreground">Latency</th>
                            <th className="text-right p-3 text-muted-foreground">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparisonResults.map((result) => (
                            <tr key={result.id} className="border-b border-border/50 hover:bg-accent/30">
                              <td className="p-3 text-sm">{new Date(result.createdAt).toLocaleDateString()}</td>
                              <td className="p-3 text-right font-semibold">{result.download.avgMbps.toFixed(1)} Mbps</td>
                              <td className="p-3 text-right font-semibold">{result.upload.avgMbps.toFixed(1)} Mbps</td>
                              <td className="p-3 text-right font-semibold">{result.latency.idle.medianMs.toFixed(0)} ms</td>
                              <td className="p-3 text-right">
                                <span className={`text-xl font-bold ${getBufferbloatColor(result.diagnostics.bufferbloatGrade)}`}>
                                  {result.diagnostics.bufferbloatGrade}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {comparisonResults.map((result) => (
                      <Card key={result.id} className="p-6">
                        <div className="text-sm text-muted-foreground mb-3">
                          {new Date(result.createdAt).toLocaleString()}
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs text-muted-foreground">Download</div>
                            <div className="text-2xl font-bold text-primary">{result.download.avgMbps.toFixed(1)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Upload</div>
                            <div className="text-2xl font-bold text-primary">{result.upload.avgMbps.toFixed(1)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Latency</div>
                            <div className="text-2xl font-bold text-primary">{result.latency.idle.medianMs.toFixed(0)}</div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
