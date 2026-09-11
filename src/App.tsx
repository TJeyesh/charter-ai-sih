import { useState, useEffect } from 'react';
import { 
  Ship, Anchor, TrendingUp, ShieldAlert, FileText, 
  Compass, Sparkles, Menu, X
} from 'lucide-react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import VoyagePlanner from './pages/VoyagePlanner';
import { getHealth } from './api';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [demoMode, setDemoMode] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modelStatus, setModelStatus] = useState<{ version: string; healthy: boolean }>({
    version: 'v2.3.0-ensemble',
    healthy: true,
  });

  useEffect(() => {
    getHealth()
      .then(data => {
        setDemoMode(Boolean(data.sih_demo_mode));
        if (data.model_version) {
          setModelStatus({ version: data.model_version, healthy: data.status === 'healthy' });
        }
      })
      .catch(err => {
        console.error('Health check notice:', err);
      });
  }, []);

  const navItems = [
    { name: 'Voyage Planner', path: '/', icon: Compass },
    { name: 'Market Intelligence', path: '/forecast', icon: TrendingUp },
    { name: 'Fleet Optimizer', path: '/optimizer', icon: Ship },
    { name: 'Port Operations', path: '/ports', icon: Anchor },
    { name: 'Risk Radar', path: '/risk', icon: ShieldAlert },
    { name: 'Contract Strategy', path: '/contracts', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Compliance & SIH Hackathon Ribbon */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold tracking-wide uppercase border border-blue-400/30">
            <Sparkles size={12} className="text-blue-400" />
            Smart India Hackathon 2026
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="text-slate-300 font-medium hidden sm:inline">
            Ministry of Ports, Shipping & Waterways
          </span>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="text-slate-400 hidden md:inline">
            Problem Statement: AI Decision-Support for Dry-Bulk Chartering
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-200 font-mono font-medium">Model: {modelStatus.version}</span>
          </span>
          {demoMode && (
            <span className="hidden lg:inline bg-slate-800 px-2 py-0.5 rounded text-amber-300 border border-amber-500/30">
              Demo Synthetic Mode Active
            </span>
          )}
        </div>
      </div>

      {/* Main Professional Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo & Tag */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
                  <Ship className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold tracking-tight text-slate-900">CharterAI</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 uppercase tracking-wider">v2.3</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                    Autonomous Freight & Voyage Optimization
                  </p>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/voyage-planner');
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/60 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                    >
                      <Icon size={15} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right Tools & User Info */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center text-xs text-slate-600 bg-slate-100/80 border border-slate-200/80 rounded-lg px-3 py-1.5 gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="font-medium text-slate-700">East Coast Corridor Active</span>
              </div>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  JD
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-none">Jury Evaluator</div>
                  <div className="text-[10px] text-slate-400 font-medium leading-none mt-1">SIH Evaluation Panel</div>
                </div>
              </div>

              {/* Mobile menu toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-md">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={16} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Main App Canvas */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {children}
      </main>

      {/* Modern Enterprise Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">CharterAI Maritime Intelligence Platform</span>
            <span>•</span>
            <span>SIH 2026 Prototype Build</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Built for Indian East Coast Ports (Dhamra, Paradip, Vizag, Gangavaram, Haldia)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<VoyagePlanner />} />
          <Route path="/voyage-planner" element={<VoyagePlanner />} />
          <Route path="/forecast" element={<VoyagePlanner focusSection="forecast" />} />
          <Route path="/optimizer" element={<VoyagePlanner focusSection="optimizer" />} />
          <Route path="/ports" element={<VoyagePlanner focusSection="ports" />} />
          <Route path="/risk" element={<VoyagePlanner focusSection="risk" />} />
          <Route path="/contracts" element={<VoyagePlanner focusSection="contracts" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
