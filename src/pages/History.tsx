import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Upload, Activity, Trash2 } from "lucide-react";
import { getAllResults, deleteResult, TestResult } from "@/lib/storage";
import { toast } from "sonner";

export default function History() {
  const navigate = useNavigate();
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background via-background to-card">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Test
          </Button>
          <h1 className="text-3xl font-bold">Test History</h1>
        </div>

        {/* Results List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading history...</div>
        ) : results.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-muted-foreground mb-4">No test results yet</div>
            <Button onClick={() => navigate("/")}>Run Your First Test</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {results.map((result) => (
              <Card
                key={result.id}
                className="p-6 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`/results/${result.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
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
          </div>
        )}
      </div>
    </div>
  );
}
