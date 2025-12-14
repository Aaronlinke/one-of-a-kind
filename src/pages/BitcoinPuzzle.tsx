import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bitcoin, Key, BarChart3, Zap, Brain, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrainWalletHunter from '@/components/bitcoin/BrainWalletHunter';
import EntropyAnalyzer from '@/components/bitcoin/EntropyAnalyzer';

const BitcoinPuzzle = () => {
  const [activeTab, setActiveTab] = useState('hunter');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-950/10 to-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500">
                  <Bitcoin className="h-6 w-6 text-black" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Bitcoin Puzzle Hunter</h1>
                  <p className="text-sm text-muted-foreground">Brain Wallet Entropie-Analyse System</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                <Target className="h-4 w-4 text-orange-400" />
                <span>Ziel: Low-Entropy Keys finden</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Brain className="h-8 w-8 text-orange-400 shrink-0" />
                <div>
                  <h3 className="font-semibold text-orange-400">Brain Wallets</h3>
                  <p className="text-sm text-muted-foreground">
                    Private Keys aus merkbaren Passphrasen - oft unsicher wegen niedriger Entropie
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Key className="h-8 w-8 text-blue-400 shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-400">Low-Entropy Keys</h3>
                  <p className="text-sm text-muted-foreground">
                    Schwache Schlüssel durch vorhersagbare Muster oder fehlerhafte RNG
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Zap className="h-8 w-8 text-purple-400 shrink-0" />
                <div>
                  <h3 className="font-semibold text-purple-400">Quantum Random</h3>
                  <p className="text-sm text-muted-foreground">
                    Echte Quantenzufälligkeit für unvorhersagbare Suchbereiche
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/50">
            <TabsTrigger value="hunter" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Brain Wallet Hunter
            </TabsTrigger>
            <TabsTrigger value="analyzer" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Entropie Analyzer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hunter">
            <BrainWalletHunter />
          </TabsContent>

          <TabsContent value="analyzer">
            <EntropyAnalyzer />
          </TabsContent>
        </Tabs>

        {/* Educational Footer */}
        <Card className="mt-8 bg-muted/30 border-border/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-400" />
              Über das Bitcoin Puzzle
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Das Bitcoin Puzzle ist eine Serie von Adressen mit steigenden Schwierigkeitsgraden, 
              die absichtlich mit Low-Entropy Private Keys erstellt wurden. Es dient als Forschungswerkzeug 
              für kryptographische Analyse.
            </p>
            <p>
              <strong className="text-foreground">Brain Wallets</strong> sind Private Keys, die aus merkbaren 
              Passphrasen generiert werden. Obwohl praktisch, sind sie oft anfällig für Wörterbuchangriffe, 
              da Menschen dazu neigen, vorhersagbare Phrasen zu wählen.
            </p>
            <p className="text-yellow-400/80">
              ⚠️ Dieses Tool dient Forschungs- und Bildungszwecken zur Analyse von Entropie-Schwächen.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BitcoinPuzzle;
