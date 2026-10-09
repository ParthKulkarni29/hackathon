import { Zap, Users, Car, Sliders, RefreshCw, AlertTriangle, BarChart3, UserCheck, HelpCircle } from 'lucide-react';

export default function Navbar({ 
  currentRole, 
  setRole, 
  onRunGoldenCorridor, 
  onRunRejectionDemo, 
  onOpenBenchmark, 
  onResetDemo,
  currentUser,
  onOpenLogin,
  isLive = true
}) {
  return (
    <header className="navbar">
      <div className="nav-brand">
        <div className="brand-icon">
          <Zap size={20} />
        </div>
        <div>
          <div className="brand-title">FairPool</div>
          <div className="brand-subtitle">Algorithmic Ride-Pooling & Fair Pricing</div>
        </div>
      </div>

      {/* Role Switcher Pill Bar (Reference Image 3 segmented control) */}
      <nav className="role-segmented-control" aria-label="Role Switcher">
        <button
          className={`role-tab ${currentRole === 'passenger' ? 'active' : ''}`}
          onClick={() => setRole('passenger')}
        >
          <Users size={16} />
          Passenger
        </button>
        <button
          className={`role-tab ${currentRole === 'driver' ? 'active' : ''}`}
          onClick={() => setRole('driver')}
        >
          <Car size={16} />
          Driver
        </button>
        <button
          className={`role-tab ${currentRole === 'admin' ? 'active' : ''}`}
          onClick={() => setRole('admin')}
        >
          <Sliders size={16} />
          Dispatch Operator
        </button>
      </nav>

      {/* Quick Demo Scenarios & Reset Actions */}
      <div className="nav-actions">
        {/* User Persona / Login Pill */}
        <button
          type="button"
          onClick={onOpenLogin}
          className="pill-btn flex items-center gap-2 border-primary/30 bg-primary/10 hover:bg-primary/20 text-foreground"
          title="Switch demo persona or get help"
        >
          <img 
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80'} 
            alt="Avatar" 
            className="w-5 h-5 rounded-full object-cover" 
          />
          <span className="text-xs font-bold text-primary">{currentUser?.name?.split(' ')[0] || 'Demo Login'}</span>
        </button>

        <button
          className="pill-btn primary"
          title="Dispatch Rahul (₹504), Priya (₹728), Aman (₹868) with 0 deficit"
          onClick={onRunGoldenCorridor}
        >
          <Zap size={14} />
          Golden Corridor
        </button>

        <button
          className="pill-btn amber"
          title="Simulate Vikram insertion triggering Priya's 18.1% detour rejection"
          onClick={onRunRejectionDemo}
        >
          <AlertTriangle size={14} />
          Detour Rejection
        </button>

        <button
          className="pill-btn"
          title="Run 100-commuter peak corridor simulation scorecard"
          onClick={onOpenBenchmark}
        >
          <BarChart3 size={14} />
          100 Sim
        </button>

        <button
          className="pill-btn"
          title="Reset back to deterministic seed data"
          onClick={onResetDemo}
        >
          <RefreshCw size={14} />
          Reset
        </button>
      </div>
    </header>
  );
}
