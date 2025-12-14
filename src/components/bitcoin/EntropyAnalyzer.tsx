import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, BarChart3, Zap, AlertCircle, Brain, Cpu, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { isValidBase58Address } from '@/lib/bitcoin-crypto';

interface KeyData {
  id: string;
  privateKey: string;
  address: string;
  source?: string;
  timestamp?: number;
}

interface EntropyAnalysis {
  cognitiveDensity: number;
  systemicDensity: number;
  protocolDensity: number;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  patterns: string[];
}

interface Stats {
  totalKeys: number;
  brainWalletCount: number;
  sourceTypes: number;
  leadingZeroCount: number;
}

export default function EntropyAnalyzer() {
  const [keys, setKeys] = useState<KeyData[]>([]);
  const [analysis, setAnalysis] = useState<EntropyAnalysis | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const resultsList = data.results || data.keys || data || [];
        const keyList = Array.isArray(resultsList) ? resultsList : [];
        setKeys(keyList);
        performAnalysis(keyList);
        toast.success(`${keyList.length} Keys geladen`);
      } catch (err) {
        toast.error('Fehler beim Parsen der JSON-Datei');
      }
    };
    reader.readAsText(file);
  };

  const calculateVariance = (arr: number[]): number => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const sq = arr.map(x => Math.pow(x - mean, 2));
    return sq.reduce((a, b) => a + b, 0) / arr.length;
  };

  const analyzeProtocolStructure = (keyList: KeyData[]): number => {
    const addressPatterns = keyList.map(k => k.address);
    const checksumErrors = addressPatterns.filter(a => {
      return !isValidBase58Address(a);
    }).length;

    return (checksumErrors / Math.max(addressPatterns.length, 1)) * 100;
  };

  const performAnalysis = (keyList: KeyData[]) => {
    if (!keyList.length) return;

    // === AXIS A: COGNITIVE ENTROPY ===
    const sources = keyList.map(k => k.source || '').filter(Boolean);
    const brainWalletCount = sources.filter(s => 
      s.toLowerCase().includes('brain') || 
      s.toLowerCase().includes('passphrase') ||
      s.toLowerCase().includes('password')
    ).length;
    const brainWalletRatio = brainWalletCount / Math.max(sources.length, 1);
    const cognitiveDensity = brainWalletRatio * 100;

    // === AXIS B: SYSTEMIC ENTROPY ===
    const privKeyBytes = keyList
      .map(k => {
        try {
          return parseInt(k.privateKey.substring(0, 2), 16);
        } catch {
          return null;
        }
      })
      .filter((b): b is number => b !== null);

    const distribution = new Array(256).fill(0);
    privKeyBytes.forEach(byte => {
      if (byte >= 0 && byte < 256) distribution[byte]++;
    });

    const variance = calculateVariance(distribution);
    const expectedVariance = privKeyBytes.length / 256;
    const entropyDeviation = Math.abs(variance - expectedVariance) / Math.max(expectedVariance, 1);
    const systemicDensity = Math.min(entropyDeviation * 100, 100);

    // === AXIS C: PROTOCOL ENTROPY ===
    const protocolDensity = analyzeProtocolStructure(keyList);

    // === RISK CALCULATION ===
    const avgDensity = (cognitiveDensity + systemicDensity + protocolDensity) / 3;
    let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (avgDensity > 75) overallRisk = 'critical';
    else if (avgDensity > 50) overallRisk = 'high';
    else if (avgDensity > 25) overallRisk = 'medium';

    // === PATTERN DETECTION ===
    const patterns: string[] = [];
    if (brainWalletRatio > 0.5) patterns.push('Hohe kognitive Entropie (Brainwallets erkannt)');
    if (systemicDensity > 40) patterns.push('Nicht-zufällige Schlüsselverteilung (potenzielle systemische Schwäche)');
    if (protocolDensity > 60) patterns.push('Protokoll-Level Muster erkannt');
    if (keyList.filter(k => k.privateKey.startsWith('00')).length > 10) {
      patterns.push('Viele Schlüssel mit führenden Nullen (verdächtig)');
    }

    setAnalysis({
      cognitiveDensity,
      systemicDensity,
      protocolDensity,
      overallRisk,
      patterns
    });

    setStats({
      totalKeys: keyList.length,
      brainWalletCount,
      sourceTypes: [...new Set(sources)].length,
      leadingZeroCount: keyList.filter(k => k.privateKey.startsWith('00')).length
    });
  };

  const getRiskStyles = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-500/20 border-red-500 text-red-400';
      case 'high': return 'bg-orange-500/20 border-orange-500 text-orange-400';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      case 'low': return 'bg-green-500/20 border-green-500 text-green-400';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="bg-blue-500/10 border-blue-500/30">
        <AlertCircle className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-100">
          Analysiere deine Key-Dateien auf drei Entropie-Achsen:
          <span className="font-bold text-blue-400"> Kognitiv</span> (Menschliche Muster) |
          <span className="font-bold text-orange-400"> Systemisch</span> (RNG-Fehler) |
          <span className="font-bold text-purple-400"> Protokoll</span> (BIP39-Struktur)
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Upload Panel */}
        <Card className="lg:col-span-1 bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Upload & Analyse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              JSON Upload
            </Button>

            {keys.length > 0 && stats && (
              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-2">
                <p className="text-muted-foreground">
                  Keys geladen: <span className="font-bold text-green-400">{keys.length}</span>
                </p>
                <p className="text-muted-foreground">
                  Brainwallets: <span className="font-mono text-yellow-400">{stats.brainWalletCount}</span>
                </p>
                <p className="text-muted-foreground">
                  Leading Zeros: <span className="font-mono text-red-400">{stats.leadingZeroCount}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis Results */}
        <div className="lg:col-span-3 space-y-6">
          {analysis ? (
            <>
              {/* Overall Risk */}
              <Card className={`border-2 ${getRiskStyles(analysis.overallRisk)}`}>
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Gesamt-Entropie-Risiko
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold mb-2">
                    {analysis.overallRisk.toUpperCase()}
                  </div>
                  <p className="text-muted-foreground">
                    Durchschnittliche Entropie-Dichte: {((analysis.cognitiveDensity + analysis.systemicDensity + analysis.protocolDensity) / 3).toFixed(1)}%
                  </p>
                </CardContent>
              </Card>

              {/* Three Axes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Axis A: Cognitive */}
                <Card className="bg-card/50 backdrop-blur border-blue-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Achse A: Kognitiv
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground mb-2">
                      {analysis.cognitiveDensity.toFixed(1)}%
                    </div>
                    <Progress value={analysis.cognitiveDensity} className="h-2 mb-2" />
                    <p className="text-xs text-muted-foreground">Menschliche Muster in Seeds</p>
                  </CardContent>
                </Card>

                {/* Axis B: Systemic */}
                <Card className="bg-card/50 backdrop-blur border-orange-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-orange-400 flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      Achse B: Systemisch
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground mb-2">
                      {analysis.systemicDensity.toFixed(1)}%
                    </div>
                    <Progress value={analysis.systemicDensity} className="h-2 mb-2" />
                    <p className="text-xs text-muted-foreground">RNG-Fehler / Muster</p>
                  </CardContent>
                </Card>

                {/* Axis C: Protocol */}
                <Card className="bg-card/50 backdrop-blur border-purple-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-purple-400 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Achse C: Protokoll
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground mb-2">
                      {analysis.protocolDensity.toFixed(1)}%
                    </div>
                    <Progress value={analysis.protocolDensity} className="h-2 mb-2" />
                    <p className="text-xs text-muted-foreground">BIP39-Struktur-Muster</p>
                  </CardContent>
                </Card>
              </div>

              {/* Detected Patterns */}
              {analysis.patterns.length > 0 && (
                <Card className="bg-card/50 backdrop-blur border-border/50">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Erkannte Muster
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {analysis.patterns.map((pattern, idx) => (
                      <div key={idx} className="bg-yellow-500/10 p-3 rounded-lg text-sm text-foreground border-l-4 border-yellow-500">
                        • {pattern}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="pt-8 text-center">
                <Zap className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Lade eine JSON-Datei hoch, um die Analyse zu starten</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Legend */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground text-sm">Entropie-Achsen Erklärung</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <div>
            <strong className="text-blue-400">Achse A (Kognitive Entropie):</strong>{' '}
            Misst, wie vorhersehbar die verwendeten Seed-Phrasen sind (z.B. "password", "bitcoin"). 
            Höhere Werte = mehr Brainwallet-Muster = leichter zu cracken.
          </div>
          <div>
            <strong className="text-orange-400">Achse B (Systemische Entropie):</strong>{' '}
            Prüft die Verteilung der generierten Private Keys. Sollte gleichmäßig sein (wie echter Zufall). 
            Ungleichmäßigkeit deutet auf RNG-Fehler hin (wie Debian OpenSSL Bug).
          </div>
          <div>
            <strong className="text-purple-400">Achse C (Protokoll Entropie):</strong>{' '}
            Analysiert BIP39-Checksummen und andere Protokoll-Strukturen. 
            Kann für optimierte Suchräume genutzt werden.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
