import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Zap, 
  Upload, 
  Download, 
  Play, 
  Pause, 
  Bitcoin, 
  Key,
  Wallet,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  brainWalletHash, 
  getAddressStats, 
  satsToBTC,
  getQuantumRandom,
  N_CURVE,
  KEYS_PER_PAGE,
  intToHex,
  intToWif,
  deriveAddressFromPrivKey
} from '@/lib/bitcoin-crypto';

interface FoundWallet {
  passphrase?: string;
  privateKey: string;
  address: string;
  wif: string;
  balance: string;
  timestamp: number;
  source: 'brainwallet' | 'sequential' | 'random';
}

interface HuntStats {
  checked: number;
  found: number;
  currentPhrase?: string;
  currentPage?: string;
  startTime: number;
}

const COMMON_BRAIN_WALLET_PHRASES = [
  'password', 'bitcoin', 'satoshi', 'nakamoto', '123456', 'test', 
  'hello', 'password123', 'qwerty', 'letmein', 'admin', 'welcome',
  'monkey', 'dragon', 'master', 'abc123', 'login', 'passw0rd',
  'sunshine', 'princess', 'iloveyou', 'trustno1', 'shadow', 'ashley',
  'football', 'jesus', 'michael', 'ninja', 'mustang', 'password1',
  'swordfish', 'god', 'love', 'secret', 'sex', 'money',
  'correct horse battery staple', 'the quick brown fox',
  'brainwallet', 'bitcoin123', 'satoshi123', 'nakamoto123'
];

export default function BrainWalletHunter() {
  const [isHunting, setIsHunting] = useState(false);
  const [foundWallets, setFoundWallets] = useState<FoundWallet[]>([]);
  const [stats, setStats] = useState<HuntStats>({ checked: 0, found: 0, startTime: 0 });
  const [customPhrase, setCustomPhrase] = useState('');
  const [huntMode, setHuntMode] = useState<'brainwallet' | 'sequential' | 'quantum'>('brainwallet');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const huntingRef = useRef(false);

  const checkBrainWallet = useCallback(async (passphrase: string) => {
    try {
      const privKeyHex = await brainWalletHash(passphrase);
      const address = await deriveAddressFromPrivKey(privKeyHex);
      
      if (!address) {
        console.error('Could not derive address');
        return false;
      }
      
      const stats = await getAddressStats(address);
      
      if (stats.unspent > 0 || stats.txcount > 0) {
        const privInt = BigInt('0x' + privKeyHex);
        const wif = await intToWif(privInt);
        
        const wallet: FoundWallet = {
          passphrase,
          privateKey: privKeyHex,
          address,
          wif,
          balance: satsToBTC(stats.unspent),
          timestamp: Date.now(),
          source: 'brainwallet'
        };
        
        setFoundWallets(prev => {
          if (!prev.some(w => w.address === address)) {
            toast.success(`Wallet gefunden! Balance: ${wallet.balance} BTC`);
            return [...prev, wallet];
          }
          return prev;
        });
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking brain wallet:', error);
      return false;
    }
  }, []);

  const startBrainWalletHunt = useCallback(async () => {
    huntingRef.current = true;
    setIsHunting(true);
    setStats({ checked: 0, found: 0, startTime: Date.now() });
    
    for (let i = 0; i < COMMON_BRAIN_WALLET_PHRASES.length && huntingRef.current; i++) {
      const phrase = COMMON_BRAIN_WALLET_PHRASES[i];
      setStats(prev => ({ ...prev, checked: i + 1, currentPhrase: phrase }));
      
      const found = await checkBrainWallet(phrase);
      if (found) {
        setStats(prev => ({ ...prev, found: prev.found + 1 }));
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsHunting(false);
    huntingRef.current = false;
    toast.info('Brain Wallet Suche abgeschlossen');
  }, [checkBrainWallet]);

  const startQuantumHunt = useCallback(async () => {
    huntingRef.current = true;
    setIsHunting(true);
    setStats({ checked: 0, found: 0, startTime: Date.now() });
    
    const totalPages = N_CURVE / KEYS_PER_PAGE;
    const startRange = totalPages / 10n; // 10%
    const endRange = totalPages / 4n; // 25%
    
    let checked = 0;
    while (huntingRef.current && checked < 50) {
      try {
        const randomPage = await getQuantumRandom(startRange, endRange);
        setStats(prev => ({ ...prev, checked: checked + 1, currentPage: randomPage.toString().substring(0, 20) + '...' }));
        
        // Check keys on this page
        const startInt = (randomPage - 1n) * KEYS_PER_PAGE + 1n;
        
        for (let i = 0n; i < KEYS_PER_PAGE && huntingRef.current; i++) {
          const privInt = startInt + i;
          const hex = intToHex(privInt);
          const address = await deriveAddressFromPrivKey(hex);
          
          if (!address) continue;
          
          const addrStats = await getAddressStats(address);
          
          if (addrStats.unspent > 0) {
            const wif = await intToWif(privInt);
            const wallet: FoundWallet = {
              privateKey: hex,
              address,
              wif,
              balance: satsToBTC(addrStats.unspent),
              timestamp: Date.now(),
              source: 'random'
            };
            
            setFoundWallets(prev => {
              if (!prev.some(w => w.address === address)) {
                toast.success(`Wallet gefunden! Balance: ${wallet.balance} BTC`);
                return [...prev, wallet];
              }
              return prev;
            });
            setStats(prev => ({ ...prev, found: prev.found + 1 }));
          }
          
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        checked++;
      } catch (error) {
        console.error('Quantum hunt error:', error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsHunting(false);
    huntingRef.current = false;
    toast.info('Quantum Suche abgeschlossen');
  }, []);

  const stopHunting = () => {
    huntingRef.current = false;
    setIsHunting(false);
  };

  const checkCustomPhrase = async () => {
    if (!customPhrase.trim()) {
      toast.error('Bitte gib eine Passphrase ein');
      return;
    }
    
    setIsHunting(true);
    const found = await checkBrainWallet(customPhrase);
    setIsHunting(false);
    
    if (!found) {
      toast.info('Keine Balance auf dieser Adresse gefunden');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const phrases = content.split('\n').filter(line => line.trim());
        
        toast.info(`${phrases.length} Phrasen geladen`);
        
        huntingRef.current = true;
        setIsHunting(true);
        setStats({ checked: 0, found: 0, startTime: Date.now() });
        
        for (let i = 0; i < phrases.length && huntingRef.current; i++) {
          const phrase = phrases[i].trim();
          setStats(prev => ({ ...prev, checked: i + 1, currentPhrase: phrase }));
          
          const found = await checkBrainWallet(phrase);
          if (found) {
            setStats(prev => ({ ...prev, found: prev.found + 1 }));
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        setIsHunting(false);
        huntingRef.current = false;
      } catch (err) {
        toast.error('Fehler beim Parsen der Datei');
      }
    };
    reader.readAsText(file);
  };

  const exportResults = () => {
    const data = JSON.stringify({ 
      foundWallets, 
      stats,
      exportedAt: new Date().toISOString() 
    }, null, 2);
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brain-wallet-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const elapsedTime = stats.startTime ? Math.floor((Date.now() - stats.startTime) / 1000) : 0;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-orange-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Bitcoin className="h-8 w-8 text-orange-400" />
              <div>
                <p className="text-sm text-muted-foreground">Gefunden</p>
                <p className="text-2xl font-bold text-orange-400">{foundWallets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Search className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-sm text-muted-foreground">Geprüft</p>
                <p className="text-2xl font-bold text-blue-400">{stats.checked}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-bold text-purple-400">
                  {isHunting ? 'Aktiv' : 'Bereit'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-sm text-muted-foreground">Laufzeit</p>
                <p className="text-2xl font-bold text-green-400">{elapsedTime}s</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-yellow-400" />
              Hunt Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Custom Phrase Check */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Eigene Passphrase testen</label>
              <div className="flex gap-2">
                <Input
                  value={customPhrase}
                  onChange={(e) => setCustomPhrase(e.target.value)}
                  placeholder="z.B. password123"
                  disabled={isHunting}
                />
                <Button 
                  onClick={checkCustomPhrase} 
                  disabled={isHunting}
                  size="icon"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Hunt Mode Buttons */}
            <div className="space-y-2">
              <Button
                onClick={isHunting ? stopHunting : startBrainWalletHunt}
                className="w-full"
                variant={isHunting && huntMode === 'brainwallet' ? 'destructive' : 'default'}
              >
                {isHunting && huntMode === 'brainwallet' ? (
                  <><Pause className="mr-2 h-4 w-4" /> Stop</>
                ) : (
                  <><Play className="mr-2 h-4 w-4" /> Brain Wallet Suche</>
                )}
              </Button>
              
              <Button
                onClick={isHunting ? stopHunting : startQuantumHunt}
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={isHunting && huntMode !== 'quantum'}
              >
                {isHunting && huntMode === 'quantum' ? (
                  <><Pause className="mr-2 h-4 w-4" /> Stop</>
                ) : (
                  <><Zap className="mr-2 h-4 w-4" /> Quantum Random Hunt</>
                )}
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
                disabled={isHunting}
              >
                <Upload className="mr-2 h-4 w-4" />
                Wortliste laden
              </Button>
            </div>

            {/* Export */}
            {foundWallets.length > 0 && (
              <Button onClick={exportResults} variant="secondary" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Ergebnisse exportieren
              </Button>
            )}

            {/* Current Status */}
            {isHunting && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <p className="text-xs text-muted-foreground">Aktuell prüfend:</p>
                <p className="text-sm font-mono truncate text-foreground">
                  {stats.currentPhrase || stats.currentPage || '...'}
                </p>
                <Progress value={(stats.checked / (COMMON_BRAIN_WALLET_PHRASES.length || 100)) * 100} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Found Wallets */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-400" />
              Gefundene Wallets
              {foundWallets.length > 0 && (
                <Badge variant="secondary" className="ml-2">{foundWallets.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {foundWallets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Noch keine Wallets mit Balance gefunden</p>
                <p className="text-sm">Starte eine Suche um Brain Wallets zu finden</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {foundWallets.map((wallet, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/30"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="text-green-400 border-green-400">
                        {wallet.source}
                      </Badge>
                      <span className="text-lg font-bold text-green-400">
                        {wallet.balance} BTC
                      </span>
                    </div>
                    {wallet.passphrase && (
                      <p className="text-sm mb-1">
                        <span className="text-muted-foreground">Phrase:</span>{' '}
                        <span className="font-mono">{wallet.passphrase}</span>
                      </p>
                    )}
                    <p className="text-sm mb-1">
                      <span className="text-muted-foreground">Address:</span>{' '}
                      <span className="font-mono text-xs">{wallet.address}</span>
                    </p>
                    <p className="text-sm mb-1">
                      <span className="text-muted-foreground">WIF:</span>{' '}
                      <span className="font-mono text-xs">{wallet.wif}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Gefunden: {new Date(wallet.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
