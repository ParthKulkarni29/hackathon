import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MapView from './components/MapView';
import PassengerView from './components/PassengerView';
import DriverView from './components/DriverView';
import AdminView from './components/AdminView';
import BenchmarkModal from './components/BenchmarkModal';
import RejectionModal from './components/RejectionModal';
import LoginPage from './components/LoginPage';
import { api, socket } from './api';

export default function App() {
  const [currentRole, setRole] = useState('passenger'); // 'passenger' | 'driver' | 'admin'
  const [milestones, setMilestones] = useState([]);
  const [rides, setRides] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [isBenchmarkOpen, setBenchmarkOpen] = useState(false);
  const [isRejectionOpen, setRejectionOpen] = useState(false);
  const [isLoginOpen, setLoginOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Persistent Commuter Profile
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('fairpool_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      name: 'Rahul Sharma',
      role: 'Passenger',
      email: 'rahul.sharma@pune-tech.org',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80'
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('fairpool_user', JSON.stringify(currentUser));
    } catch (e) {}
  }, [currentUser]);

  // Initial Data Fetching
  useEffect(() => {
    loadAllData();

    // Socket.IO event listeners for live updates
    socket.on('ride:created', (newRide) => {
      setRides(prev => [newRide, ...prev.filter(r => r.id !== newRide.id)]);
      showToast(`New ride request from ${newRide.passenger_name || newRide.rider_id}`);
    });

    socket.on('ride:cancelled', (cancelledRide) => {
      setRides(prev => prev.map(r => r.id === cancelledRide.id ? cancelledRide : r));
      showToast(`Ride #${cancelledRide.id.slice(-4)} cancelled`);
    });

    socket.on('driver:updated', (updatedDriver) => {
      setDrivers(prev => prev.map(d => d.id === updatedDriver.id ? updatedDriver : d));
    });

    socket.on('trip:updated', (updatedTrip) => {
      setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
      setActiveTrip(updatedTrip);
    });

    socket.on('dispatch:completed', ({ trips_created }) => {
      if (trips_created && trips_created.length > 0) {
        setTrips(prev => [...trips_created, ...prev]);
        setActiveTrip(trips_created[0]);
        loadAllData();
        showToast(`Dispatched ${trips_created.length} new pooled vehicle(s)!`);
      }
    });

    socket.on('demo:reset', () => {
      loadAllData();
      showToast('System reset to deterministic seed state');
    });

    socket.on('demo:golden_corridor', (trip) => {
      loadAllData();
      setActiveTrip(trip);
      showToast('Golden Corridor Dispatched: Rahul, Priya, Aman pooled with 0 deficit!');
    });

    return () => {
      socket.off('ride:created');
      socket.off('ride:cancelled');
      socket.off('driver:updated');
      socket.off('trip:updated');
      socket.off('dispatch:completed');
      socket.off('demo:reset');
      socket.off('demo:golden_corridor');
    };
  }, []);

  async function loadAllData() {
    try {
      const [nodesData, ridesData, driversData, tripsData] = await Promise.all([
        api.getCorridorNodes(),
        api.getRides(),
        api.getDrivers(),
        api.getTrips()
      ]);

      setMilestones(nodesData.milestones || []);
      setRides(ridesData || []);
      setDrivers(driversData || []);
      setTrips(tripsData || []);

      const active = (tripsData || []).find(t => ['IN_PROGRESS', 'SCHEDULED'].includes(t.status)) || tripsData[0];
      if (active) setActiveTrip(active);
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  }

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  }

  async function handleRunGoldenCorridor() {
    try {
      const res = await api.runGoldenCorridorDemo();
      await loadAllData();
      if (res.trip) setActiveTrip(res.trip);
      showToast('Golden Corridor Dispatched: Rahul ₹504, Priya ₹728, Aman ₹868. Zero Deficit!');
    } catch (e) {
      alert(`Golden corridor error: ${e.message}`);
    }
  }

  async function handleResetDemo() {
    try {
      localStorage.removeItem('fairpool_active_ride_id');
      await api.resetDemo();
      await loadAllData();
      setActiveTrip(null);
      showToast('State reset to clean deterministic seed data.');
    } catch (e) {
      alert(`Reset error: ${e.message}`);
    }
  }

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        currentRole={currentRole}
        setRole={setRole}
        onRunGoldenCorridor={handleRunGoldenCorridor}
        onRunRejectionDemo={() => setRejectionOpen(true)}
        onOpenBenchmark={() => setBenchmarkOpen(true)}
        onResetDemo={handleResetDemo}
        currentUser={currentUser}
        onOpenLogin={() => setLoginOpen(true)}
      />

      {/* Main Stage */}
      {currentRole === 'admin' ? (
        <AdminView
          rides={rides}
          drivers={drivers}
          trips={trips}
          activeTrip={activeTrip}
          setActiveTrip={setActiveTrip}
          milestones={milestones}
          onDispatchTriggered={(res) => {
            loadAllData();
            showToast(`Batch completed: ${res.batches_formed} pooled trip(s) dispatched!`);
          }}
          onOpenBenchmark={() => setBenchmarkOpen(true)}
          onOpenRejection={() => setRejectionOpen(true)}
          onRunGoldenCorridor={handleRunGoldenCorridor}
          onResetDemo={handleResetDemo}
          showToast={showToast}
        />
      ) : (
        <main className="main-stage">
          <MapView
            milestones={milestones}
            activeTrip={activeTrip}
            pendingRides={rides.filter(r => r.status === 'PENDING')}
          />

          {currentRole === 'passenger' && (
            <PassengerView
              milestones={milestones}
              activeTrip={activeTrip}
              currentUser={currentUser}
              onOpenLogin={() => setLoginOpen(true)}
              onRideCreated={(r) => {
                setRides(prev => [r, ...prev]);
                showToast(`Ride booked! Waiting for sliding-window batch.`);
              }}
              onRideCancelled={(id) => {
                setRides(prev => prev.map(r => r.id === id ? { ...r, status: 'CANCELLED' } : r));
                showToast(`Ride cancelled`);
              }}
            />
          )}

          {currentRole === 'driver' && (
            <DriverView
              drivers={drivers}
              trips={trips}
              onDriverUpdated={(d) => setDrivers(prev => prev.map(item => item.id === d.id ? d : item))}
              onTripUpdated={(t) => {
                setTrips(prev => prev.map(item => item.id === t.id ? t : item));
                setActiveTrip(t);
              }}
            />
          )}
        </main>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'rgba(16, 22, 34, 0.95)',
            border: '1px solid var(--primary)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0, 229, 255, 0.25)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>⚡</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setBenchmarkOpen(false)}
      />

      <RejectionModal
        isOpen={isRejectionOpen}
        onClose={() => setRejectionOpen(false)}
      />

      {/* Login & Contact Support Modal */}
      {isLoginOpen && (
        <LoginPage
          currentUser={currentUser}
          onLogin={(user) => {
            setCurrentUser(user);
            setLoginOpen(false);
            showToast(`Logged in as ${user.name}`);
          }}
          onClose={() => setLoginOpen(false)}
        />
      )}
    </div>
  );
}
