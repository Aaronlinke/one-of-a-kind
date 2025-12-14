import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Loader2 } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/admin");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/admin");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
        },
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Email gesendet!",
        description: "Überprüfen Sie Ihre E-Mails für den Login-Link.",
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
          {emailSent ? (
            <div className="text-center space-y-4">
              <Mail className="h-16 w-16 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Prüfen Sie Ihre E-Mails</h3>
              <p className="text-muted-foreground">
                Wir haben einen Login-Link an <strong>{email}</strong> gesendet.
                Klicken Sie auf den Link, um sich anzumelden.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setEmailSent(false)}
                className="mt-4"
              >
                Andere E-Mail verwenden
              </Button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Ihre E-Mail-Adresse"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Magic Link senden
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center mt-4">
                Kein Passwort erforderlich. Sie erhalten einen sicheren Login-Link per E-Mail.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
