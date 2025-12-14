import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Zap } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/admin");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/admin");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleQuickLogin = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInAnonymously();

      if (error) throw error;

      toast({
        title: "Willkommen!",
        description: "Du bist jetzt eingeloggt.",
      });
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">OMEGA System</CardTitle>
          <CardDescription>Administrator-Zugang</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleQuickLogin} 
            className="w-full h-16 text-lg" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                Wird geladen...
              </>
            ) : (
              <>
                <Zap className="h-6 w-6 mr-2" />
                Sofort Einloggen
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground text-center mt-4">
            Ein Klick - und du bist drin.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
