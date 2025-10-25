import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-card">
      <Card className="max-w-lg w-full p-8 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => navigate(-1)}
            variant="outline"
            className="gap-2"
            aria-label="Go back to previous page"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Go Back
          </Button>
          <Button 
            onClick={() => navigate("/")}
            className="gap-2"
            aria-label="Go to home page"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Home
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotFound;
