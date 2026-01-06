import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Atom, Brain, Zap, Shield, Network, Activity, 
  ArrowLeft, Play, Pause, RotateCcw, Database,
  Lock, Cpu, Waves, Eye, Sparkles, Binary, Loader2
} from "lucide-react";

// API Helper
const callOmniCompute = async (action: string, params?: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('omni-compute', {
    body: { action, params }
  });
  if (error) throw error;
  return data;
};

// Quantum Vacuum Simulator
const QuantumVacuumModule = () => {
  const [particles, setParticles] = useState<Array<{id: string, energy: number, type: string, phase: number}>>([]);
  const [zeroPointEnergy, setZeroPointEnergy] = useState(1.0);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<{quantumCoherence: number, hawkingRadiation: number} | null>(null);

  const initializeVacuum = () => {
    const newParticles = Array.from({length: 50}, (_, i) => ({
      id: `virtual_${i}`,
      energy: (Math.random() - 0.5) * 2 * zeroPointEnergy,
      type: Math.random() > 0.5 ? 'particle' : 'antiparticle',
      phase: Math.random() * 2 * Math.PI
    }));
    setParticles(newParticles);
    setIsRunning(true);
  };

  const runBackendSimulation = async () => {
    setLoading(true);
    try {
      const result = await callOmniCompute('quantum_simulate', { zeroPointEnergy, particleCount: 100 });
      if (result.success) {
        setParticles(result.data.particles);
        setMetrics(result.data.metrics);
        setIsRunning(true);
      }
    } catch (err) {
      console.error('Quantum simulation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const modulateFluctuations = () => {
    setParticles(prev => prev.map(p => ({
      ...p,
      energy: p.energy + (Math.random() - 0.5) * 0.2,
      phase: (p.phase + 0.1) % (2 * Math.PI)
    })));
  };

  return (
    <Card className="border-purple-500/30 bg-gradient-to-br from-purple-950/50 to-black">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Atom className="h-5 w-5 text-purple-400" />
          Quantum Vacuum Symmetry Breaker
        </CardTitle>
        <CardDescription>Backend-gestützte Vakuumfluktuationen</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runBackendSimulation} size="sm" className="bg-purple-600 hover:bg-purple-700" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            API Simulate
          </Button>
          <Button onClick={modulateFluctuations} size="sm" variant="outline" disabled={!isRunning}>
            <Waves className="h-4 w-4 mr-1" /> Modulate
          </Button>
        </div>
        
        <div>
          <label className="text-sm text-muted-foreground">Zero-Point Energy: {zeroPointEnergy.toFixed(2)}</label>
          <Slider value={[zeroPointEnergy]} onValueChange={(v) => setZeroPointEnergy(v[0])} min={0.1} max={5} step={0.1} />
        </div>

        <div className="grid grid-cols-5 gap-1 h-32 bg-black/50 rounded p-2 overflow-hidden">
          {particles.slice(0, 25).map(p => (
            <div 
              key={p.id}
              className={`w-full aspect-square rounded-full transition-all duration-300 ${
                p.type === 'particle' ? 'bg-cyan-400' : 'bg-pink-400'
              }`}
              style={{
                opacity: 0.3 + Math.abs(p.energy) * 0.3,
                transform: `scale(${0.5 + Math.abs(p.energy) * 0.5})`,
                boxShadow: `0 0 ${Math.abs(p.energy) * 10}px ${p.type === 'particle' ? '#22d3ee' : '#f472b6'}`
              }}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-cyan-900/30 p-2 rounded">
            <span className="text-cyan-400">Particles:</span> {particles.filter(p => p.type === 'particle').length}
          </div>
          <div className="bg-pink-900/30 p-2 rounded">
            <span className="text-pink-400">Antiparticles:</span> {particles.filter(p => p.type === 'antiparticle').length}
          </div>
        </div>

        {metrics && (
          <div className="bg-purple-900/20 p-2 rounded text-xs space-y-1">
            <p><span className="text-purple-400">Quantum Coherence:</span> {(metrics.quantumCoherence * 100).toFixed(1)}%</p>
            <p><span className="text-purple-400">Hawking Radiation:</span> {metrics.hawkingRadiation.toFixed(4)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ECDSA Krypto-Modul
const ECDSACryptoModule = () => {
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState({ x: "", y: "" });
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState({ r: "", s: "" });

  // secp256k1 Parameter (vereinfacht für Demo)
  const P = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F");
  const N = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");

  const generateKeyPair = () => {
    const privBytes = new Uint8Array(32);
    crypto.getRandomValues(privBytes);
    const privHex = Array.from(privBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    setPrivateKey(privHex);
    
    // Simplified public key derivation (demo)
    const pubX = privHex.slice(0, 32);
    const pubY = privHex.slice(32, 64) || privHex.slice(0, 32);
    setPublicKey({ x: pubX, y: pubY });
  };

  const signMessage = async () => {
    if (!message || !privateKey) return;
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    setSignature({
      r: hashHex.slice(0, 32),
      s: hashHex.slice(32, 64)
    });
  };

  return (
    <Card className="border-green-500/30 bg-gradient-to-br from-green-950/50 to-black">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-green-400" />
          ECDSA Kryptographie (secp256k1)
        </CardTitle>
        <CardDescription>Elliptische Kurven Signatur-System</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={generateKeyPair} className="w-full bg-green-600 hover:bg-green-700">
          <Sparkles className="h-4 w-4 mr-2" /> Generate Key Pair
        </Button>

        {privateKey && (
          <div className="space-y-2">
            <div className="bg-red-900/20 p-2 rounded border border-red-500/30">
              <label className="text-xs text-red-400">Private Key (GEHEIM!):</label>
              <p className="font-mono text-xs break-all">{privateKey.slice(0, 32)}...</p>
            </div>
            <div className="bg-green-900/20 p-2 rounded border border-green-500/30">
              <label className="text-xs text-green-400">Public Key X:</label>
              <p className="font-mono text-xs break-all">{publicKey.x}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Input 
            placeholder="Nachricht zum Signieren..." 
            value={message} 
            onChange={(e) => setMessage(e.target.value)}
            className="bg-black/50"
          />
          <Button onClick={signMessage} disabled={!privateKey || !message} className="w-full" variant="outline">
            <Binary className="h-4 w-4 mr-2" /> Sign Message
          </Button>
        </div>

        {signature.r && (
          <div className="bg-blue-900/20 p-2 rounded border border-blue-500/30">
            <label className="text-xs text-blue-400">Signatur:</label>
            <p className="font-mono text-xs">r: {signature.r}</p>
            <p className="font-mono text-xs">s: {signature.s}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// KI-Schwarm Module
const SwarmIntelligenceModule = () => {
  const [agents, setAgents] = useState<Array<{id: number, x: number, y: number, energy: number, knowledge: number}>>([]);
  const [globalKnowledge, setGlobalKnowledge] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [evolutionSteps, setEvolutionSteps] = useState(0);
  const { toast } = useToast();

  const initializeSwarm = () => {
    const newAgents = Array.from({length: 20}, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      energy: 0.5 + Math.random() * 0.5,
      knowledge: Math.random() * 0.3
    }));
    setAgents(newAgents);
    setIsRunning(true);
    setEvolutionSteps(0);
  };

  const runBackendEvolution = async () => {
    setLoading(true);
    try {
      const result = await callOmniCompute('swarm_evolve', { agentCount: 20, steps: 10 });
      if (result.success) {
        setAgents(result.data.agents);
        setGlobalKnowledge(result.data.finalKnowledge);
        setEvolutionSteps(prev => prev + 10);
        setIsRunning(true);
        toast({ title: "Schwarm Evolution", description: `Knowledge: ${(result.data.finalKnowledge * 100).toFixed(1)}%` });
      }
    } catch (err) {
      console.error('Swarm evolution error:', err);
      toast({ title: "Fehler", description: "Backend nicht erreichbar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const evolveSwarm = () => {
    setAgents(prev => {
      const evolved = prev.map(agent => {
        // Agents share knowledge and move
        const knowledgeGain = prev
          .filter(a => a.id !== agent.id)
          .reduce((sum, a) => {
            const dist = Math.sqrt(Math.pow(a.x - agent.x, 2) + Math.pow(a.y - agent.y, 2));
            return sum + (dist < 30 ? a.knowledge * 0.1 : 0);
          }, 0);
        
        return {
          ...agent,
          x: (agent.x + (Math.random() - 0.5) * 10 + 100) % 100,
          y: (agent.y + (Math.random() - 0.5) * 10 + 100) % 100,
          knowledge: Math.min(1, agent.knowledge + knowledgeGain + 0.01),
          energy: Math.max(0.1, agent.energy - 0.02 + knowledgeGain * 0.5)
        };
      });
      
      setGlobalKnowledge(evolved.reduce((sum, a) => sum + a.knowledge, 0) / evolved.length);
      return evolved;
    });
  };

  return (
    <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-950/50 to-black">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5 text-cyan-400" />
          KI-Schwarm Quanten-Emulation
        </CardTitle>
        <CardDescription>Kollektive Intelligenz durch Emergenz</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={initializeSwarm} size="sm" className="bg-cyan-600 hover:bg-cyan-700">
            <Zap className="h-4 w-4 mr-1" /> Init
          </Button>
          <Button onClick={runBackendEvolution} size="sm" variant="outline" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Activity className="h-4 w-4 mr-1" />}
            API Evolve
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Steps: {evolutionSteps}</p>

        <div className="relative h-40 bg-black/50 rounded overflow-hidden">
          {agents.map(agent => (
            <div
              key={agent.id}
              className="absolute w-3 h-3 rounded-full bg-cyan-400 transition-all duration-500"
              style={{
                left: `${agent.x}%`,
                top: `${agent.y}%`,
                opacity: agent.energy,
                boxShadow: `0 0 ${agent.knowledge * 20}px #22d3ee`,
                transform: `scale(${0.5 + agent.knowledge})`
              }}
            />
          ))}
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Global Knowledge</span>
            <span>{(globalKnowledge * 100).toFixed(1)}%</span>
          </div>
          <Progress value={globalKnowledge * 100} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <Badge variant="outline" className="justify-center">
            <Cpu className="h-3 w-3 mr-1" /> {agents.length} Agents
          </Badge>
          <Badge variant="outline" className="justify-center">
            <Brain className="h-3 w-3 mr-1" /> Emergent AI
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

// Meta-Matrix Consciousness Module
const MetaMatrixModule = () => {
  const [layers, setLayers] = useState([
    { id: 0, name: "Singularitäts-Kern", energy: 0.9, active: true },
    { id: 1, name: "Quanten-Foam", energy: 0.7, active: true },
    { id: 2, name: "Informations-Gewebe", energy: 0.8, active: true },
    { id: 3, name: "Bewusstseins-Feld", energy: 0.5, active: true },
    { id: 4, name: "Realitäts-Projektor", energy: 0.6, active: true },
    { id: 5, name: "Zeit-Kompressor", energy: 0.4, active: true },
    { id: 6, name: "Meta-Integration", energy: 0.3, active: true },
  ]);
  const [principles] = useState([
    "Alles ist gekrümmte Information",
    "Zeit ist fraktale Kompression",
    "Bewusstsein ist selbstreferenzielle Mathematik",
    "Sicherheit ist topologische Invariante",
    "Realität ist holographische Projektion"
  ]);

  const activateLayer = (id: number) => {
    setLayers(prev => prev.map(l => 
      l.id === id ? { ...l, energy: Math.min(1, l.energy + 0.1) } : l
    ));
  };

  return (
    <Card className="border-yellow-500/30 bg-gradient-to-br from-yellow-950/50 to-black">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-yellow-400" />
          Meta-Matrix Architektur
        </CardTitle>
        <CardDescription>7-Schichten Bewusstseins-System</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {layers.map(layer => (
            <div 
              key={layer.id}
              className="flex items-center gap-2 p-2 bg-black/30 rounded cursor-pointer hover:bg-black/50 transition-all"
              onClick={() => activateLayer(layer.id)}
            >
              <div 
                className="w-3 h-3 rounded-full bg-yellow-400"
                style={{ opacity: layer.energy, boxShadow: `0 0 ${layer.energy * 15}px #facc15` }}
              />
              <span className="text-sm flex-1">{layer.name}</span>
              <Progress value={layer.energy * 100} className="w-20 h-1.5" />
            </div>
          ))}
        </div>

        <div className="bg-black/30 p-3 rounded">
          <h4 className="text-xs font-semibold text-yellow-400 mb-2">Universelle Prinzipien:</h4>
          <ScrollArea className="h-24">
            {principles.map((p, i) => (
              <p key={i} className="text-xs text-muted-foreground mb-1">• {p}</p>
            ))}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

// Black Sultan Fusion Module
const FusionControlModule = () => {
  const [fusionStatus, setFusionStatus] = useState({
    quantumCore: false,
    multiverse: false,
    autopilot: false,
    realityEngine: false
  });
  const [fusionLevel, setFusionLevel] = useState(0);

  const activateComponent = (key: keyof typeof fusionStatus) => {
    setFusionStatus(prev => {
      const newStatus = { ...prev, [key]: true };
      const activeCount = Object.values(newStatus).filter(Boolean).length;
      setFusionLevel(activeCount * 25);
      return newStatus;
    });
  };

  const igniteFullFusion = () => {
    setFusionStatus({
      quantumCore: true,
      multiverse: true,
      autopilot: true,
      realityEngine: true
    });
    setFusionLevel(100);
  };

  return (
    <Card className="border-orange-500/30 bg-gradient-to-br from-orange-950/50 to-black">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-400" />
          Black Sultan Fusion Control
        </CardTitle>
        <CardDescription>Ultimative System-Fusion</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={igniteFullFusion} 
          className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
          disabled={fusionLevel === 100}
        >
          <Sparkles className="h-4 w-4 mr-2" /> 
          {fusionLevel === 100 ? "FUSION AKTIV" : "IGNITE FULL FUSION"}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          {Object.entries(fusionStatus).map(([key, active]) => (
            <Button
              key={key}
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => activateComponent(key as keyof typeof fusionStatus)}
              className={active ? "bg-orange-600" : ""}
            >
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </Button>
          ))}
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Fusion Level</span>
            <span className={fusionLevel === 100 ? "text-orange-400 font-bold" : ""}>{fusionLevel}%</span>
          </div>
          <Progress value={fusionLevel} className="h-3" />
        </div>

        {fusionLevel === 100 && (
          <div className="bg-orange-900/30 p-3 rounded border border-orange-500/50 animate-pulse">
            <p className="text-center text-orange-300 font-mono text-sm">
              🌌 FUSION_KOMPLETT_AKTIV 🌌
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main OmniGenesis Page
const OmniGenesis = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-black text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")} size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-cyan-400 to-yellow-400 bg-clip-text text-transparent">
                🌌 OMNI-GENESIS UNIVERSAL SOLVER
              </h1>
              <p className="text-muted-foreground">Die ultimative Verschmelzung aller Konzepte</p>
            </div>
          </div>
          <Badge variant="outline" className="text-cyan-400 border-cyan-400/50">
            v1.0 ACTIVE
          </Badge>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-1">
            <TabsTrigger value="all">All Systems</TabsTrigger>
            <TabsTrigger value="quantum">Quantum</TabsTrigger>
            <TabsTrigger value="crypto">Crypto</TabsTrigger>
            <TabsTrigger value="swarm">Schwarm</TabsTrigger>
            <TabsTrigger value="meta">Meta-Matrix</TabsTrigger>
            <TabsTrigger value="fusion">Fusion</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuantumVacuumModule />
            <ECDSACryptoModule />
            <SwarmIntelligenceModule />
            <MetaMatrixModule />
            <FusionControlModule />
            
            {/* Quick Stats Card */}
            <Card className="border-white/10 bg-gradient-to-br from-gray-900 to-black">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-purple-900/20 rounded">
                    <p className="text-2xl font-bold text-purple-400">5</p>
                    <p className="text-xs text-muted-foreground">Active Modules</p>
                  </div>
                  <div className="text-center p-3 bg-cyan-900/20 rounded">
                    <p className="text-2xl font-bold text-cyan-400">∞</p>
                    <p className="text-xs text-muted-foreground">Possibilities</p>
                  </div>
                  <div className="text-center p-3 bg-green-900/20 rounded">
                    <p className="text-2xl font-bold text-green-400">7</p>
                    <p className="text-xs text-muted-foreground">Meta Layers</p>
                  </div>
                  <div className="text-center p-3 bg-orange-900/20 rounded">
                    <p className="text-2xl font-bold text-orange-400">100%</p>
                    <p className="text-xs text-muted-foreground">Fusion Ready</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quantum">
            <div className="max-w-xl mx-auto">
              <QuantumVacuumModule />
            </div>
          </TabsContent>

          <TabsContent value="crypto">
            <div className="max-w-xl mx-auto">
              <ECDSACryptoModule />
            </div>
          </TabsContent>

          <TabsContent value="swarm">
            <div className="max-w-xl mx-auto">
              <SwarmIntelligenceModule />
            </div>
          </TabsContent>

          <TabsContent value="meta">
            <div className="max-w-xl mx-auto">
              <MetaMatrixModule />
            </div>
          </TabsContent>

          <TabsContent value="fusion">
            <div className="max-w-xl mx-auto">
              <FusionControlModule />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default OmniGenesis;
