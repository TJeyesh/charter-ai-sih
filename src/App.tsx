import { useState, useEffect, Suspense, lazy } from 'react';
import { Ship, AlertTriangle, LayoutDashboard, Loader2 } from 'lucide-react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { getHealth } from './api';

const VoyagePlanner = lazy(() => import('./pages/VoyagePlanner'));

// Layout Component
const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    getHealth()
      .then(data => {
        if (data.sih_demo_mode) {
          setDemoMode(true);
        }
      })
      .catch(err => console.error("Health check failed", err));
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  ];

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Ship className="logo-icon" size={24} />
            DockInsights
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.name} 
                to={item.path} 
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div className="page-title">
            {navItems.find(item => item.path === location.pathname)?.name || 'DockInsights'}
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              JD
            </div>
          </div>
        </header>
        
        {demoMode && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem 1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertTriangle size={18} />
            SIH Demo Mode Active: The current environment is using synthetic [DEMO/SYNTHETIC] database values for vessels, ports, and economics to avoid external API dependencies.
          </div>
        )}
        
        <div className="content-area">
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={
            <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="spinner" /></div>}>
              <VoyagePlanner />
            </Suspense>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
