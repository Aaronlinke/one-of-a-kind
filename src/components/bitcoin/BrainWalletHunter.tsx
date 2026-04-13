import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Zap, Upload, Download, Play, Pause, Bitcoin, Key, Wallet, TrendingUp,
  Hash, Sigma, Binary, Atom
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  brainWalletHash, getAddressStats, satsToBTC, getQuantumRandom,
  N_CURVE, KEYS_PER_PAGE, intToHex, intToWif, deriveAddressFromPrivKey
} from '@/lib/bitcoin-crypto';

interface FoundWallet {
  passphrase?: string;
  privateKey: string;
  address: string;
  wif: string;
  balance: string;
  timestamp: number;
  source: string;
}

interface HuntStats {
  checked: number;
  found: number;
  currentPhrase?: string;
  currentPage?: string;
  startTime: number;
  speed: number;
}

// =================== MASSIVE PASSPHRASE LIST ===================
const COMMON_BRAIN_WALLET_PHRASES = [
  // Classic passwords
  'password', 'bitcoin', 'satoshi', 'nakamoto', '123456', 'test', 'hello',
  'password123', 'qwerty', 'letmein', 'admin', 'welcome', 'monkey', 'dragon',
  'master', 'abc123', 'login', 'passw0rd', 'sunshine', 'princess', 'iloveyou',
  'trustno1', 'shadow', 'ashley', 'football', 'jesus', 'michael', 'ninja',
  'mustang', 'password1', 'swordfish', 'god', 'love', 'secret', 'sex', 'money',
  // Famous phrases
  'correct horse battery staple', 'the quick brown fox', 'brainwallet',
  'bitcoin123', 'satoshi123', 'nakamoto123', 'to the moon', 'hodl',
  'in bitcoin we trust', 'be your own bank', 'not your keys not your coins',
  // Numbers & patterns
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13',
  '100', '1000', '12345', '123456789', '1234567890', '111111', '000000',
  'a', 'b', 'c', 'aa', 'bb', 'cc', 'aaa', 'aaaa', 'aaaaa', 'aaaaaa',
  // Crypto-related
  'blockchain', 'ethereum', 'litecoin', 'dogecoin', 'crypto', 'mining',
  'hash', 'sha256', 'wallet', 'seed', 'private key', 'public key',
  'genesis block', 'merkle tree', 'proof of work', 'decentralized',
  // German
  'passwort', 'geheim', 'hallo', 'schatz', 'liebe', 'geld', 'sicher',
  // Leet speak
  'p4ssw0rd', 'b1tc01n', 's4t0sh1', 'l33t', 'h4ck3r', 'r00t',
  // Pop culture
  'matrix', 'starwars', 'gandalf', 'batman', 'superman', 'spiderman',
  'harry potter', 'lord of the rings', 'game of thrones',
  // Simple keyboard patterns
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1qaz2wsx', 'qweasdzxc',
  // Empty and whitespace
  '', ' ', '  ', '\t', '\n',
  // Single chars extended
  '!', '@', '#', '$', '%', '^', '&', '*',
  // Common names
  'alice', 'bob', 'charlie', 'dave', 'eve', 'satoshi nakamoto',
  'hal finney', 'nick szabo', 'adam back', 'wei dai', 'david chaum',
  // Known weak brain wallets that had funds
  'cat', 'dog', 'fish', 'bird', 'cow', 'pig', 'horse', 'sheep',
  'the', 'of', 'and', 'is', 'it', 'for', 'on', 'are', 'was', 'with',
  'just found the private key',
  'say hello to my little friend',
  'to be or not to be',
  'i am satoshi nakamoto',
  'bitcoin is the future',
];

// =================== MATHEMATICAL KEY GENERATORS ===================

/** Fibonacci sequence keys */
function* fibonacciKeys(limit: number): Generator<bigint> {
  let a = 1n, b = 1n;
  for (let i = 0; i < limit; i++) {
    if (a > 0n && a < N_CURVE) yield a;
    [a, b] = [b, a + b];
  }
}

/** Powers of 2 */
function* powersOf2(limit: number): Generator<bigint> {
  for (let i = 0; i < limit; i++) {
    const val = 1n << BigInt(i);
    if (val < N_CURVE) yield val;
  }
}

/** Powers of 2 minus 1 (Mersenne-style) */
function* mersenneLike(limit: number): Generator<bigint> {
  for (let i = 1; i < limit; i++) {
    const val = (1n << BigInt(i)) - 1n;
    if (val > 0n && val < N_CURVE) yield val;
  }
}

/** Known Bitcoin puzzle ranges (keys 1-256 bits) */
function* puzzleRangeKeys(): Generator<{ key: bigint; label: string }> {
  // Known solved puzzle keys
  const knownPuzzleKeys: [string, bigint][] = [
    ['Puzzle #1', 1n],
    ['Puzzle #2', 3n],
    ['Puzzle #3', 7n],
    ['Puzzle #4', 8n],
    ['Puzzle #5', 21n],
    ['Puzzle #6', 49n],
    ['Puzzle #7', 76n],
    ['Puzzle #8', 224n],
    ['Puzzle #9', 467n],
    ['Puzzle #10', 514n],
    ['Puzzle #15', 26867n],
    ['Puzzle #20', 1048387n],
    ['Puzzle #25', 33554432n],
    ['Puzzle #30', 1073741789n],
    ['Puzzle #35', 34359738311n],
    ['Puzzle #40', 1099511627551n],
  ];
  for (const [label, key] of knownPuzzleKeys) {
    yield { key, label };
  }
}

/** Sequential low-entropy keys (1, 2, 3, ...) */
function* sequentialKeys(start: bigint, count: number): Generator<bigint> {
  for (let i = 0n; i < BigInt(count); i++) {
    const val = start + i;
    if (val > 0n && val < N_CURVE) yield val;
  }
}

/** Repeated byte patterns */
function* repeatedByteKeys(): Generator<{ key: bigint; label: string }> {
  for (let b = 0; b < 256; b++) {
    // 32 bytes all same value
    const hex = b.toString(16).padStart(2, '0').repeat(32);
    yield { key: BigInt('0x' + hex), label: `0x${b.toString(16).padStart(2, '0')} repeated` };
  }
  // Alternating patterns
  for (let a = 0; a < 16; a++) {
    for (let b = 0; b < 16; b++) {
      if (a === b) continue;
      const hex = (a.toString(16) + b.toString(16)).repeat(32);
      yield { key: BigInt('0x' + hex), label: `${a.toString(16)}${b.toString(16)} alternating` };
    }
  }
}

/** Prime numbers as keys */
function* primeKeys(limit: number): Generator<bigint> {
  const primes = [2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n,41n,43n,47n,53n,59n,61n,67n,71n,
    73n,79n,83n,89n,97n,101n,103n,107n,109n,113n,127n,131n,137n,139n,149n,151n,157n,163n,167n,173n,
    179n,181n,191n,193n,197n,199n,211n,223n,227n,229n,233n,239n,241n,251n,257n,263n,269n,271n,277n,
    281n,283n,293n,307n,311n,313n,317n,331n,337n,347n,349n,353n,359n,367n,373n,379n,383n,389n,397n,
    401n,409n,419n,421n,431n,433n,439n,443n,449n,457n,461n,463n,467n,479n,487n,491n,499n,503n,509n,
    521n,523n,541n,547n,557n,563n,569n,571n,577n,587n,593n,599n,601n,607n,613n,617n,619n,631n,641n,
    643n,647n,653n,659n,661n,673n,677n,683n,691n,701n,709n,719n,727n,733n,739n,743n,751n,757n,761n,
    769n,773n,787n,797n,809n,811n,821n,823n,827n,829n,839n,853n,857n,859n,863n,877n,881n,883n,887n];
  for (let i = 0; i < Math.min(limit, primes.length); i++) {
    yield primes[i];
  }
}

/** Factorial keys */
function* factorialKeys(limit: number): Generator<bigint> {
  let f = 1n;
  for (let i = 1; i <= limit; i++) {
    f *= BigInt(i);
    if (f > 0n && f < N_CURVE) yield f;
  }
}

/** Powers of 10 */
function* powersOf10(limit: number): Generator<bigint> {
  let val = 1n;
  for (let i = 0; i < limit; i++) {
    if (val < N_CURVE) yield val;
    val *= 10n;
  }
}

/** Golden ratio approximations as hex keys */
function* goldenRatioKeys(limit: number): Generator<bigint> {
  // φ = (1+√5)/2 ≈ 1.618033988749895
  // Generate keys based on golden ratio multiples
  const phi = 1.618033988749895;
  for (let i = 1; i <= limit; i++) {
    const val = Math.floor(Math.pow(phi, i));
    if (val > 0 && val < Number.MAX_SAFE_INTEGER) {
      yield BigInt(val);
    }
  }
}

type HuntMode = 'brainwallet' | 'sequential' | 'quantum' | 'fibonacci' | 'powers2' | 'mersenne' | 'primes' | 'factorial' | 'patterns' | 'puzzle' | 'golden' | 'powers10';

export default function BrainWalletHunter() {
  const [isHunting, setIsHunting] = useState(false);
  const [foundWallets, setFoundWallets] = useState<FoundWallet[]>([]);
  const [stats, setStats] = useState<HuntStats>({ checked: 0, found: 0, startTime: 0, speed: 0 });
  const [customPhrase, setCustomPhrase] = useState('');
  const [huntMode, setHuntMode] = useState<HuntMode>('brainwallet');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const huntingRef = useRef(false);
  const checkedCountRef = useRef(0);

  const addFoundWallet = useCallback((wallet: FoundWallet) => {
    setFoundWallets(prev => {
      if (!prev.some(w => w.address === wallet.address)) {
        toast.success(`💰 Wallet gefunden! ${wallet.balance} BTC`);
        return [...prev, wallet];
      }
      return prev;
    });
    setStats(prev => ({ ...prev, found: prev.found + 1 }));
  }, []);

  const checkKeyDirect = useCallback(async (privInt: bigint, source: string, label?: string): Promise<boolean> => {
    try {
      if (privInt <= 0n || privInt >= N_CURVE) return false;
      const hex = intToHex(privInt);
      const address = await deriveAddressFromPrivKey(hex);
      if (!address) return false;

      const addrStats = await getAddressStats(address);
      if (addrStats.unspent > 0 || addrStats.txcount > 0) {
        const wif = await intToWif(privInt);
        addFoundWallet({
          passphrase: label,
          privateKey: hex,
          address, wif,
          balance: satsToBTC(addrStats.unspent),
          timestamp: Date.now(),
          source,
        });
        return true;
      }
      return false;
    } catch { return false; }
  }, [addFoundWallet]);

  const checkBrainWallet = useCallback(async (passphrase: string) => {
    try {
      const privKeyHex = await brainWalletHash(passphrase);
      const address = await deriveAddressFromPrivKey(privKeyHex);
      if (!address) return false;
      const s = await getAddressStats(address);
      if (s.unspent > 0 || s.txcount > 0) {
        const privInt = BigInt('0x' + privKeyHex);
        const wif = await intToWif(privInt);
        addFoundWallet({
          passphrase, privateKey: privKeyHex, address, wif,
          balance: satsToBTC(s.unspent), timestamp: Date.now(), source: 'brainwallet',
        });
        return true;
      }
      return false;
    } catch { return false; }
  }, [addFoundWallet]);

  const updateSpeed = useCallback((startTime: number) => {
    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed > 0) {
      setStats(prev => ({ ...prev, speed: Math.round(checkedCountRef.current / elapsed) }));
    }
  }, []);

  // =================== HUNT STARTERS ===================

  const startBrainWalletHunt = useCallback(async () => {
    huntingRef.current = true;
    setIsHunting(true);
    setHuntMode('brainwallet');
    const startTime = Date.now();
    checkedCountRef.current = 0;
    setStats({ checked: 0, found: 0, startTime, speed: 0 });

    for (let i = 0; i < COMMON_BRAIN_WALLET_PHRASES.length && huntingRef.current; i++) {
      const phrase = COMMON_BRAIN_WALLET_PHRASES[i];
      checkedCountRef.current = i + 1;
      setStats(prev => ({ ...prev, checked: i + 1, currentPhrase: phrase }));
      await checkBrainWallet(phrase);
      updateSpeed(startTime);
      // Reduced delay for speed - 100ms instead of 500ms
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsHunting(false);
    huntingRef.current = false;
    toast.info(`Brain Wallet Scan fertig: ${COMMON_BRAIN_WALLET_PHRASES.length} geprüft`);
  }, [checkBrainWallet, updateSpeed]);

  const startMathHunt = useCallback(async (mode: HuntMode) => {
    huntingRef.current = true;
    setIsHunting(true);
    setHuntMode(mode);
    const startTime = Date.now();
    checkedCountRef.current = 0;
    setStats({ checked: 0, found: 0, startTime, speed: 0 });

    let generator: Generator<bigint | { key: bigint; label: string }>;
    let source = mode;

    switch (mode) {
      case 'fibonacci': generator = fibonacciKeys(300); break;
      case 'powers2': generator = powersOf2(256); break;
      case 'mersenne': generator = mersenneLike(256); break;
      case 'primes': generator = primeKeys(200); break;
      case 'factorial': generator = factorialKeys(50); break;
      case 'patterns': generator = repeatedByteKeys(); break;
      case 'puzzle': generator = puzzleRangeKeys(); break;
      case 'golden': generator = goldenRatioKeys(80); break;
      case 'powers10': generator = powersOf10(77); break;
      case 'sequential': generator = sequentialKeys(1n, 500); break;
      default: return;
    }

    for (const item of generator) {
      if (!huntingRef.current) break;
      
      const key = typeof item === 'bigint' ? item : item.key;
      const label = typeof item === 'bigint' ? `${mode}:${key.toString().substring(0, 20)}` : item.label;
      
      checkedCountRef.current++;
      setStats(prev => ({ ...prev, checked: checkedCountRef.current, currentPhrase: label }));
      
      await checkKeyDirect(key, source, label);
      updateSpeed(startTime);
      
      // 50ms delay - fast but respectful to API
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    setIsHunting(false);
    huntingRef.current = false;
    toast.info(`${mode} Scan abgeschlossen: ${checkedCountRef.current} Keys geprüft`);
  }, [checkKeyDirect, updateSpeed]);

  const startQuantumHunt = useCallback(async () => {
    huntingRef.current = true;
    setIsHunting(true);
    setHuntMode('quantum');
    const startTime = Date.now();
    checkedCountRef.current = 0;
    setStats({ checked: 0, found: 0, startTime, speed: 0 });

    const totalPages = N_CURVE / KEYS_PER_PAGE;
    const startRange = totalPages / 10n;
    const endRange = totalPages / 4n;

    let checked = 0;
    while (huntingRef.current && checked < 100) {
      try {
        const randomPage = await getQuantumRandom(startRange, endRange);
        const startInt = (randomPage - 1n) * KEYS_PER_PAGE + 1n;

        for (let i = 0n; i < KEYS_PER_PAGE && huntingRef.current; i++) {
          const privInt = startInt + i;
          checkedCountRef.current++;
          setStats(prev => ({ ...prev, checked: checkedCountRef.current, currentPage: randomPage.toString().substring(0, 20) + '...' }));
          await checkKeyDirect(privInt, 'quantum');
          updateSpeed(startTime);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        checked++;
      } catch (error) {
        console.error('Quantum hunt error:', error);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setIsHunting(false);
    huntingRef.current = false;
    toast.info('Quantum Suche abgeschlossen');
  }, [checkKeyDirect, updateSpeed]);

  const stopHunting = () => {
    huntingRef.current = false;
    setIsHunting(false);
  };

  const checkCustomPhrase = async () => {
    if (!customPhrase.trim()) { toast.error('Bitte Passphrase eingeben'); return; }
    setIsHunting(true);
    const found = await checkBrainWallet(customPhrase);
    setIsHunting(false);
    if (!found) toast.info('Keine Balance auf dieser Adresse');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const phrases = content.split('\n').filter(line => line.trim());
      toast.info(`${phrases.length} Phrasen geladen - Speed Scan!`);
      huntingRef.current = true;
      setIsHunting(true);
      setHuntMode('brainwallet');
      const startTime = Date.now();
      checkedCountRef.current = 0;
      setStats({ checked: 0, found: 0, startTime, speed: 0 });
      for (let i = 0; i < phrases.length && huntingRef.current; i++) {
        checkedCountRef.current = i + 1;
        setStats(prev => ({ ...prev, checked: i + 1, currentPhrase: phrases[i].trim() }));
        await checkBrainWallet(phrases[i].trim());
        updateSpeed(startTime);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      setIsHunting(false);
      huntingRef.current = false;
    };
    reader.readAsText(file);
  };

  const exportResults = () => {
    const data = JSON.stringify({ foundWallets, stats, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brain-wallet-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const elapsedTime = stats.startTime ? Math.floor((Date.now() - stats.startTime) / 1000) : 0;

  const MATH_MODES: { mode: HuntMode; icon: React.ReactNode; label: string; desc: string }[] = [
    { mode: 'sequential', icon: <Binary className="h-4 w-4" />, label: 'Sequential (1-500)', desc: 'Erste 500 Keys' },
    { mode: 'fibonacci', icon: <Sigma className="h-4 w-4" />, label: 'Fibonacci', desc: '300 Fibonacci-Zahlen' },
    { mode: 'powers2', icon: <Hash className="h-4 w-4" />, label: '2^n Powers', desc: 'Zweierpotenzen 0-255' },
    { mode: 'mersenne', icon: <Hash className="h-4 w-4" />, label: 'Mersenne (2^n-1)', desc: 'Mersenne-Zahlen' },
    { mode: 'primes', icon: <Atom className="h-4 w-4" />, label: 'Primzahlen', desc: 'Erste 200 Primes' },
    { mode: 'factorial', icon: <Sigma className="h-4 w-4" />, label: 'Fakultät n!', desc: '1! bis 50!' },
    { mode: 'powers10', icon: <Hash className="h-4 w-4" />, label: '10^n', desc: 'Zehnerpotenzen' },
    { mode: 'golden', icon: <Atom className="h-4 w-4" />, label: 'Golden Ratio φ^n', desc: 'Goldener Schnitt' },
    { mode: 'patterns', icon: <Binary className="h-4 w-4" />, label: 'Byte-Muster', desc: 'Wiederholte Bytes' },
    { mode: 'puzzle', icon: <Key className="h-4 w-4" />, label: 'Puzzle Keys', desc: 'Bekannte Puzzle-Keys' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-orange-500/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Bitcoin className="h-6 w-6 text-orange-400" />
              <div>
                <p className="text-xs text-muted-foreground">Gefunden</p>
                <p className="text-xl font-bold text-orange-400">{foundWallets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Search className="h-6 w-6 text-blue-400" />
              <div>
                <p className="text-xs text-muted-foreground">Geprüft</p>
                <p className="text-xl font-bold text-blue-400">{stats.checked}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-purple-400" />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-bold text-purple-400">{isHunting ? 'Aktiv' : 'Bereit'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-400" />
              <div>
                <p className="text-xs text-muted-foreground">Laufzeit</p>
                <p className="text-xl font-bold text-green-400">{elapsedTime}s</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-cyan-400" />
              <div>
                <p className="text-xs text-muted-foreground">Keys/s</p>
                <p className="text-xl font-bold text-cyan-400">{stats.speed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <Card className="lg:col-span-1 bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="h-5 w-5 text-yellow-400" />
              Hunt Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Custom Phrase */}
            <div className="flex gap-2">
              <Input value={customPhrase} onChange={(e) => setCustomPhrase(e.target.value)}
                placeholder="Passphrase testen..." disabled={isHunting} className="text-sm" />
              <Button onClick={checkCustomPhrase} disabled={isHunting} size="icon" variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Brain Wallet + Quantum */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={isHunting ? stopHunting : startBrainWalletHunt} size="sm"
                variant={isHunting && huntMode === 'brainwallet' ? 'destructive' : 'default'} className="text-xs">
                {isHunting && huntMode === 'brainwallet' ? <Pause className="mr-1 h-3 w-3" /> : <Play className="mr-1 h-3 w-3" />}
                Brain Wallets
              </Button>
              <Button onClick={isHunting ? stopHunting : startQuantumHunt} size="sm"
                className="text-xs bg-purple-600 hover:bg-purple-700"
                disabled={isHunting && huntMode !== 'quantum'}>
                {isHunting && huntMode === 'quantum' ? <Pause className="mr-1 h-3 w-3" /> : <Zap className="mr-1 h-3 w-3" />}
                Quantum
              </Button>
            </div>

            {/* Math Strategies */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-semibold">⚡ Mathematische Strategien</p>
              <div className="grid grid-cols-2 gap-1.5">
                {MATH_MODES.map(({ mode, icon, label }) => (
                  <Button key={mode} onClick={isHunting ? stopHunting : () => startMathHunt(mode)} size="sm"
                    variant={isHunting && huntMode === mode ? 'destructive' : 'outline'}
                    className="text-xs justify-start h-8" disabled={isHunting && huntMode !== mode}>
                    {isHunting && huntMode === mode ? <Pause className="mr-1 h-3 w-3" /> : <span className="mr-1">{icon}</span>}
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* File + Export */}
            <div className="grid grid-cols-2 gap-2">
              <input ref={fileInputRef} type="file" accept=".txt,.json" onChange={handleFileUpload} className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" disabled={isHunting} className="text-xs">
                <Upload className="mr-1 h-3 w-3" /> Wortliste
              </Button>
              {foundWallets.length > 0 && (
                <Button onClick={exportResults} variant="secondary" size="sm" className="text-xs">
                  <Download className="mr-1 h-3 w-3" /> Export
                </Button>
              )}
            </div>

            {/* Status */}
            {isHunting && (
              <div className="p-2 bg-muted/50 rounded-lg space-y-1">
                <p className="text-xs text-muted-foreground">Prüfe: <span className="font-mono text-foreground">{stats.currentPhrase || stats.currentPage || '...'}</span></p>
                <Progress value={Math.min((stats.checked / 200) * 100, 100)} className="h-1.5" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Found Wallets */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-5 w-5 text-green-400" />
              Gefundene Wallets
              {foundWallets.length > 0 && <Badge variant="secondary">{foundWallets.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {foundWallets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Noch keine Wallets gefunden</p>
                <p className="text-sm">Starte einen Scan mit Brain Wallets oder Math-Strategien</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {foundWallets.map((wallet, idx) => (
                  <div key={idx} className="p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/30">
                    <div className="flex justify-between items-start mb-1">
                      <Badge variant="outline" className="text-green-400 border-green-400 text-xs">{wallet.source}</Badge>
                      <span className="text-lg font-bold text-green-400">{wallet.balance} BTC</span>
                    </div>
                    {wallet.passphrase && (
                      <p className="text-xs"><span className="text-muted-foreground">Phrase:</span> <span className="font-mono">{wallet.passphrase}</span></p>
                    )}
                    <p className="text-xs"><span className="text-muted-foreground">Addr:</span> <span className="font-mono">{wallet.address}</span></p>
                    <p className="text-xs"><span className="text-muted-foreground">WIF:</span> <span className="font-mono">{wallet.wif}</span></p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(wallet.timestamp).toLocaleString()}
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
