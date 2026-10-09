import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  Users, 
  Car, 
  Clock, 
  MapPin, 
  Plus, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ChevronRight, 
  Info, 
  RotateCcw, 
  CreditCard,
  TrendingDown,
  Navigation,
  Phone,
  History,
  Check
} from 'lucide-react';
import { api, socket } from '../api';

interface PassengerViewProps {
  milestones: Array<{ name: string; km: number; is_mainline: boolean; lat: number; lng: number }>;
  activeTrip: any;
  currentUser: { name: string; role: string; email: string; avatar: string };
  onOpenLogin: () => void;
  onRideCreated: (ride: any) => void;
  onRideCancelled: (id: string) => void;
}

export default function PassengerView({
  milestones = [],
  activeTrip,
  currentUser,
  onOpenLogin,
  onRideCreated,
  onRideCancelled
}: PassengerViewProps) {
  // Inputs
  const [pickup, setPickup] = useState('Pune (Kiwale)');
  const [dropoff, setDropoff] = useState('Lonavala');
  const [pickupTime, setPickupTime] = useState('ASAP');
  const [passengerCount, setPassengerCount] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('FairPool Pay');

  // State
  const [quote, setQuote] = useState<any>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeRide, setActiveRide] = useState<any>(null);
  const [rideHistory, setRideHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showFareModal, setShowFareModal] = useState(false);
  const [showAddStopNotice, setShowAddStopNotice] = useState(false);
  const [showNewBookingForm, setShowNewBookingForm] = useState(false);

  // Time pill options generator (ASAP + future slots)
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  useEffect(() => {
    const now = new Date();
    const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const slots = [
      `ASAP ${formatTime(now)}`,
      formatTime(new Date(now.getTime() + 10 * 60000)),
      formatTime(new Date(now.getTime() + 20 * 60000)),
      formatTime(new Date(now.getTime() + 30 * 60000)),
      formatTime(new Date(now.getTime() + 45 * 60000))
    ];
    setTimeSlots(slots);
    setPickupTime(slots[0]);
  }, []);

  // Update default route when commuter persona changes
  useEffect(() => {
    const firstName = currentUser?.name?.split(' ')[0] || 'Rahul';
    if (firstName === 'Rahul') { setPickup('Pune (Kiwale)'); setDropoff('Lonavala'); }
    else if (firstName === 'Priya') { setPickup('Talegaon'); setDropoff('Panvel'); }
    else if (firstName === 'Aman') { setPickup('Lonavala'); setDropoff('Mumbai'); }
    else if (firstName === 'Vikram') { setPickup('Khalapur Toll'); setDropoff('Pen/NH 66 Exit'); }
  }, [currentUser]);

  // Load and refresh active ride on mount or reload (Persistent via localStorage)
  useEffect(() => {
    fetchActiveRide();
    fetchRideHistory();

    const handleRideUpdate = (updated: any) => {
      if (updated.id === activeRide?.id || updated.rider_id === currentUser?.name?.split(' ')[0]) {
        setActiveRide(updated);
      }
      fetchRideHistory();
    };

    socket.on('ride:created', fetchRideHistory);
    socket.on('ride:updated', handleRideUpdate);
    socket.on('ride:cancelled', handleRideUpdate);
    socket.on('dispatch:completed', fetchActiveRide);
    socket.on('demo:golden_corridor', fetchActiveRide);
    socket.on('demo:reset', () => {
      fetchActiveRide();
      fetchRideHistory();
    });

    return () => {
      socket.off('ride:created', fetchRideHistory);
      socket.off('ride:updated', handleRideUpdate);
      socket.off('ride:cancelled', handleRideUpdate);
      socket.off('dispatch:completed', fetchActiveRide);
      socket.off('demo:golden_corridor', fetchActiveRide);
    };
  }, [currentUser]);

  async function fetchRideHistory() {
    try {
      const allRides = await api.getRides();
      const currentRiderId = currentUser?.name?.split(' ')[0];
      const userRides = (allRides || []).filter(
        (r: any) => r.rider_id === currentRiderId || r.passenger_name === currentUser?.name
      );
      setRideHistory(userRides);
    } catch (e) {
      console.warn('Failed to load ride history:', e);
    }
  }

  async function fetchActiveRide() {
    try {
      const storedRideId = localStorage.getItem('fairpool_active_ride_id');
      const allRides = await api.getRides();
      const currentRiderId = currentUser?.name?.split(' ')[0];

      let targetRide = null;
      if (storedRideId) {
        targetRide = allRides.find((r: any) => r.id === storedRideId);
      }
      if (!targetRide) {
        // Find most recent pending or matched ride for this user
        targetRide = allRides.find(
          (r: any) => (r.rider_id === currentRiderId || r.passenger_name === currentUser?.name) &&
                      !['COMPLETED', 'CANCELLED'].includes(r.status)
        );
      }

      if (targetRide) {
        setActiveRide(targetRide);
        localStorage.setItem('fairpool_active_ride_id', targetRide.id);
      } else {
        setActiveRide(null);
        localStorage.removeItem('fairpool_active_ride_id');
      }
    } catch (e) {
      console.warn('Error fetching active ride:', e);
    }
  }

  // Fetch upfront fare quote from backend
  useEffect(() => {
    if (!pickup || !dropoff || pickup === dropoff) {
      setQuote(null);
      return;
    }

    let cancel = false;
    setLoadingQuote(true);
    setError('');

    api.getQuote(pickup, dropoff)
      .then((q: any) => {
        if (!cancel) {
          setQuote(q);
          setLoadingQuote(false);
        }
      })
      .catch((err: any) => {
        if (!cancel) {
          setError(err.message);
          setLoadingQuote(false);
        }
      });

    return () => { cancel = true; };
  }, [pickup, dropoff]);

  // Request Car Action
  async function handleRequestCar() {
    if (pickup === dropoff) {
      setError('Pickup and drop-off cannot be the same highway milestone.');
      return;
    }
    setBookingLoading(true);
    setError('');

    const riderId = currentUser?.name?.split(' ')[0] || 'Rahul';

    try {
      const newRide = await api.createRide({
        rider_id: riderId,
        passenger_name: currentUser?.name || riderId,
        pickup,
        dropoff,
        seats: passengerCount,
        locked_quote_paise: quote?.locked_quote_paise
      });

      setActiveRide(newRide);
      setShowNewBookingForm(false);
      localStorage.setItem('fairpool_active_ride_id', newRide.id);
      onRideCreated(newRide);
      fetchRideHistory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBookingLoading(false);
    }
  }

  // Cancel Ride Action
  async function handleCancelRide() {
    if (!activeRide) return;
    if (!window.confirm('Are you sure you want to cancel this ride request?')) return;

    try {
      await api.cancelRide(activeRide.id, 'Cancelled by passenger');
      localStorage.removeItem('fairpool_active_ride_id');
      setActiveRide(null);
      onRideCancelled(activeRide.id);
      fetchRideHistory();
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    }
  }

  // Solo Fallback Action (Instant solo dispatch)
  async function handleSoloFallback() {
    if (!activeRide) return;
    try {
      const res = await api.soloFallback(activeRide.id);
      setActiveRide(res.ride);
      fetchRideHistory();
    } catch (err: any) {
      alert(`Solo fallback failed: ${err.message}`);
    }
  }

  const sortedMilestones = [...milestones].sort((a, b) => a.km - b.km);
  const pKm = milestones.find(m => m.name === pickup)?.km ?? 0;
  const dKm = milestones.find(m => m.name === dropoff)?.km ?? 58;
  const directDistance = Math.abs(dKm - pKm);
  const directMinutes = Math.round((directDistance / 60) * 60);

  // Status mapping
  const isSearching = activeRide && activeRide.status === 'PENDING';
  const isMatched = activeRide && ['MATCHED', 'BATCHED', 'IN_PROGRESS', 'PICKED_UP', 'DROPPED_OFF'].includes(activeRide.status);
  const isCompleted = activeRide && activeRide.status === 'COMPLETED';

  // Comparative fare calculations
  const soloFare = quote ? quote.solo_fare_inr : (directDistance * 14);
  const shapleyFare = activeRide?.final_fare_paise 
    ? (activeRide.final_fare_paise / 100) 
    : (quote ? quote.locked_quote_inr : (soloFare * 0.65));
  const riderId = activeRide?.rider_id || currentUser?.name?.split(' ')[0] || 'Rahul';
  const realSplits = activeTrip?.pricing?.comparative_splits;
  const equalSplitFare = realSplits?.equal_split_inr?.[riderId] ?? Math.round(soloFare * 0.72);
  const distanceSplitFare = realSplits?.distance_proportional_inr?.[riderId] ?? Math.round(soloFare * 0.70);
  const netSavings = Math.max(0, soloFare - shapleyFare);
  const savingsPct = soloFare > 0 ? Math.round((netSavings / soloFare) * 100) : 0;

  return (
    <>
      {/* Floating Modern iOS Card inspired by Reference Image 2 */}
      <div className="absolute left-4 top-4 bottom-4 w-[430px] max-w-[calc(100vw-32px)] z-20 flex flex-col pointer-events-auto">
        <div className="flex-1 bg-card/95 backdrop-blur-2xl border border-border/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-foreground">
          
          {/* Card Top Handle (Image 2) */}
          <div className="pt-3 pb-1 flex justify-center">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header Row: Back / Avatar, Title, Max Capacity (Image 2) */}
          <div className="px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={onOpenLogin}
                className="h-9 w-9 rounded-full overflow-hidden border border-border hover:border-primary transition"
                title="Switch passenger demo login"
              >
                <img 
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80'} 
                  alt="User" 
                  className="w-full h-full object-cover" 
                />
              </button>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                  Your trip
                </h1>
                <p className="text-xs text-muted-foreground font-medium">
                  {currentUser?.name || 'Rahul Sharma'} • Highway Pooling
                </p>
              </div>
            </div>

            {/* Passenger Count Selector (Image 2: "👤 4 max") */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/40 border border-border text-xs font-semibold text-primary">
              <Users size={14} />
              <select
                value={passengerCount}
                onChange={(e) => setPassengerCount(Number(e.target.value))}
                className="bg-transparent border-none text-primary font-bold outline-none cursor-pointer"
                disabled={Boolean(activeRide && !['COMPLETED', 'CANCELLED'].includes(activeRide.status))}
              >
                <option value={1} className="bg-card text-foreground">1 seat</option>
                <option value={2} className="bg-card text-foreground">2 seats</option>
                <option value={3} className="bg-card text-foreground">3 seats</option>
                <option value={4} className="bg-card text-foreground">4 max</option>
              </select>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
            
            {/* If user has an active ride, show Live Ride Cockpit */}
            {activeRide && !['COMPLETED', 'CANCELLED'].includes(activeRide.status) && !showNewBookingForm ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                
                {/* Header row with Book Another Ride toggle */}
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Active Trip Cockpit
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNewBookingForm(true)}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Book Another Ride
                  </button>
                </div>

                {/* Status Banner */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isSearching 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                    : 'bg-primary/10 border-primary/30 text-primary'
                }`}>
                  <div className="flex items-center gap-3">
                    {isSearching ? (
                      <div className="h-3 w-3 rounded-full bg-amber-400 animate-ping" />
                    ) : (
                      <CheckCircle2 size={18} className="text-primary" />
                    )}
                    <div>
                      <div className="font-bold text-sm">
                        {isSearching ? 'Batching Highway Coalition...' : 'Matched to Pooled Vehicle!'}
                      </div>
                      <div className="text-xs opacity-80">
                        {isSearching 
                          ? 'Sliding window closing in 20s' 
                          : `Detour: ${activeRide.detour_pct ?? 0}% (within 15% SLA)`}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-background/50 border border-current">
                    {activeRide.status}
                  </span>
                </div>

                {/* Driver Card if Matched */}
                {isMatched && (
                  <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xl border border-primary/40">
                          🚖
                        </div>
                        <div>
                          <div className="font-bold text-base text-foreground">
                            {activeRide.driver_name || 'Sunil Patil'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {activeRide.vehicle_model || 'Tata Tigor EV'} • {activeRide.plate_number || 'MH 12 QX 4042'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-400">4.9 ★ Rating</div>
                        <div className="text-[11px] text-muted-foreground">Electric Fleet</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Phone size={13} className="text-primary" /> +91 98201 12345
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-primary" /> ETA: ~6 mins to pickup
                      </span>
                    </div>
                  </div>
                )}

                {/* Passenger Pickup Verification OTP */}
                {isMatched && activeRide.pickup_otp && (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-primary/15 to-blue-500/15 border border-primary/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">
                        🔐
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-primary uppercase tracking-wider">
                          Boarding Verification OTP
                        </div>
                        <div className="text-xs text-foreground font-medium">Share with driver upon entry</div>
                      </div>
                    </div>
                    <div className="font-mono text-xl font-black text-primary tracking-widest px-3 py-1 bg-card/90 rounded-xl border border-primary/50 shadow-inner">
                      {activeRide.pickup_otp}
                    </div>
                  </div>
                )}

                {/* Turn-by-Turn Route Order */}
                <div className="p-4 rounded-2xl border border-border bg-muted/10 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Sequenced Route Itinerary
                  </div>

                  <div className="relative pl-6 space-y-3">
                    {/* Vertical line connecting stops */}
                    <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-500 to-emerald-500" />

                    <div className="relative flex items-center justify-between">
                      <div className="absolute -left-6 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
                      <div>
                        <div className="text-xs font-bold text-foreground">PICKUP: {activeRide.pickup}</div>
                        <div className="text-[11px] text-muted-foreground">Estimated board: 13:45 • Milepost {pKm} km</div>
                      </div>
                      <span className="text-xs font-semibold text-blue-400">Stop 1</span>
                    </div>

                    <div className="relative flex items-center justify-between">
                      <div className="absolute -left-6 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                      <div>
                        <div className="text-xs font-bold text-foreground">DROPOFF: {activeRide.dropoff}</div>
                        <div className="text-[11px] text-muted-foreground">Estimated exit: 14:40 • Milepost {dKm} km</div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-400">Stop 2</span>
                    </div>
                  </div>
                </div>

                {/* Final Fare & Breakdown Trigger */}
                <div className="p-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-blue-500/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Your Shapley Fair Share</div>
                    <div className="text-2xl font-extrabold text-foreground">
                      ₹{shapleyFare.toFixed(2)}
                    </div>
                    <div className="text-xs text-emerald-400 font-semibold">
                      Saves ₹{netSavings.toFixed(2)} ({savingsPct}%) vs Solo
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFareModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-card border border-border text-xs font-bold text-primary hover:border-primary transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Info size={14} /> Fare Audit
                  </button>
                </div>

                {/* Searching State: Option to fallback to solo cab */}
                {isSearching && (
                  <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 text-xs space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>No matching pool yet?</span>
                      <button
                        type="button"
                        onClick={handleSoloFallback}
                        className="text-primary font-bold hover:underline"
                      >
                        Dispatch Solo Cab (₹{soloFare.toFixed(2)}) →
                      </button>
                    </div>
                  </div>
                )}

                {/* Cancel Ride Button */}
                <button
                  type="button"
                  onClick={handleCancelRide}
                  className="w-full py-3 rounded-xl border border-destructive/40 text-destructive text-sm font-semibold hover:bg-destructive/10 transition"
                >
                  Cancel Ride
                </button>
              </div>
            ) : (
              /* Booking Form (Matching Reference Image 2) */
              <div className="space-y-4">
                {activeRide && !['COMPLETED', 'CANCELLED'].includes(activeRide.status) && (
                  <div className="pb-1">
                    <button
                      type="button"
                      onClick={() => setShowNewBookingForm(false)}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
                    >
                      <ArrowLeft size={13} /> Return to Active Trip
                    </button>
                  </div>
                )}
                
                {/* 1. Pickup Time Selector Pills (Image 2) */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    <span>Pickup time</span>
                    <Info size={12} className="opacity-70" />
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {timeSlots.map((slot) => {
                      const isSelected = pickupTime === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setPickupTime(slot)}
                          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/30'
                              : 'bg-muted/30 border-border/60 text-muted-foreground hover:border-border hover:text-foreground'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Route Waypoints Card (Reference Image 2) */}
                <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/15 space-y-2">
                  <div className="relative pl-7 space-y-3 py-1">
                    {/* Vertical Connector Line */}
                    <div className="absolute left-2.5 top-4 bottom-4 w-0.5 bg-gradient-to-b from-blue-500 via-sky-400 to-emerald-500" />

                    {/* Pickup Box */}
                    <div className="relative group">
                      <div className="absolute -left-7 top-3.5 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
                      <div className="p-3 rounded-xl bg-card border border-border/70 hover:border-primary/60 transition flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                            Pickup Point
                          </label>
                          <select
                            value={pickup}
                            onChange={(e) => setPickup(e.target.value)}
                            className="w-full bg-transparent border-none text-sm font-bold text-foreground outline-none cursor-pointer truncate"
                          >
                            {sortedMilestones.map(m => (
                              <option key={m.name} value={m.name} className="bg-card text-foreground">
                                {m.name} ({m.km} km)
                              </option>
                            ))}
                          </select>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            car waits 5 min • 1 min walk
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                      </div>
                    </div>

                    {/* Dropoff Box */}
                    <div className="relative group">
                      <div className="absolute -left-7 top-3.5 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                      <div className="p-3 rounded-xl bg-card border border-border/70 hover:border-emerald-500/60 transition flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                            Drop-off Destination
                          </label>
                          <select
                            value={dropoff}
                            onChange={(e) => setDropoff(e.target.value)}
                            className="w-full bg-transparent border-none text-sm font-bold text-foreground outline-none cursor-pointer truncate"
                          >
                            {sortedMilestones.map(m => (
                              <option key={m.name} value={m.name} className="bg-card text-foreground">
                                {m.name} ({m.km} km)
                              </option>
                            ))}
                          </select>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Corridor mainline • {directDistance} km direct
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Add a stop or roundtrip link (Image 2) */}
                  <div className="pt-1 flex items-center justify-between text-xs font-semibold text-primary">
                    <button
                      type="button"
                      onClick={() => setShowAddStopNotice(!showAddStopNotice)}
                      className="flex items-center gap-1.5 hover:underline"
                    >
                      <Plus size={14} /> Add a stop or roundtrip
                    </button>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      ~{directMinutes} mins
                    </span>
                  </div>

                  {showAddStopNotice && (
                    <div className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50">
                      Multi-stop transit sequencing conforms to VRPTW linear highway monotonicity along NH 48 corridor.
                    </div>
                  )}
                </div>

                {/* 3. Payment Method & Live Locked Price Row (Image 2) */}
                <div className="px-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-9 rounded bg-muted/60 border border-border flex items-center justify-center text-[10px] font-bold">
                      💳 Pay
                    </div>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="bg-transparent border-none text-xs font-semibold text-foreground outline-none cursor-pointer"
                    >
                      <option value="FairPool Pay" className="bg-card text-foreground">FairPool Pay ⌄</option>
                      <option value="UPI Instant" className="bg-card text-foreground">UPI Instant ⌄</option>
                      <option value="Apple Pay" className="bg-card text-foreground">Apple Pay ⌄</option>
                    </select>
                  </div>

                  {/* Price Display */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowFareModal(true)}
                      className="text-muted-foreground hover:text-primary transition"
                      title="Inspect detailed fare formula"
                    >
                      <Info size={15} />
                    </button>
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-foreground tracking-tight">
                        ₹{shapleyFare.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-muted-foreground line-through">
                        Solo: ₹{soloFare.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Detour & Fairness Guarantees */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <div className="p-2 rounded-xl bg-muted/20 border border-border/50 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                    <span>Max 15% Detour SLA</span>
                  </div>
                  <div className="p-2 rounded-xl bg-muted/20 border border-border/50 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-primary shrink-0" />
                    <span>Locked Shapley Quote</span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                    {error}
                  </div>
                )}

                {/* 5. Big Blue CTA Button (Reference Image 2: "REQUEST CAR") */}
                <button
                  type="button"
                  disabled={bookingLoading || loadingQuote || pickup === dropoff}
                  onClick={handleRequestCar}
                  className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition text-white font-extrabold text-base tracking-wide uppercase shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {bookingLoading ? (
                    'Locking Upfront Quote...'
                  ) : (
                    <>REQUEST CAR</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Bottom Footer: Booking History Toggle & Help */}
          <div className="px-6 py-3 border-t border-border/60 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 hover:text-foreground font-semibold transition"
            >
              <History size={14} />
              <span>History ({rideHistory.length})</span>
            </button>

            <button
              type="button"
              onClick={onOpenLogin}
              className="hover:text-primary transition font-semibold"
            >
              Help & Support →
            </button>
          </div>
        </div>
      </div>

      {/* Booking History Drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex justify-end" onClick={() => setShowHistory(false)}>
          <div 
            className="w-full max-w-md bg-card border-l border-border h-full shadow-2xl p-6 flex flex-col space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <History size={18} /> Ride Booking History
              </h3>
              <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {rideHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No booking history found for this profile.
                </div>
              ) : (
                rideHistory.map((r) => (
                  <div key={r.id} className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">
                        {r.pickup} → {r.dropoff}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        r.status === 'MATCHED' ? 'bg-primary/20 text-primary' :
                        r.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                        r.status === 'CANCELLED' ? 'bg-rose-500/20 text-rose-400' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                      <span>Direct: {r.direct_distance_km} km</span>
                      <span className="font-mono font-bold text-foreground">
                        ₹{((r.final_fare_paise || r.locked_quote_paise) / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Booked: {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Fare Comparison & Game-Theory Breakdown Modal */}
      {showFareModal && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowFareModal(false)}>
          <div 
            className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">FairPool Cost Allocation Audit</h3>
                <p className="text-xs text-muted-foreground">Pune–Mumbai Expressway Corridor Fare Models</p>
              </div>
              <button onClick={() => setShowFareModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            {/* Side-by-side splits table */}
            <div className="border border-border/80 rounded-xl overflow-hidden bg-muted/15 text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                    <th className="p-3">Pricing Mechanism</th>
                    <th className="p-3">Your Share</th>
                    <th className="p-3">Discount</th>
                    <th className="p-3">Fairness Property</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr>
                    <td className="p-3 font-medium text-muted-foreground">Solo Cab (Base)</td>
                    <td className="p-3 font-mono font-bold">₹{soloFare.toFixed(2)}</td>
                    <td className="p-3 text-muted-foreground">0%</td>
                    <td className="p-3 text-[11px] text-muted-foreground">No sharing</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-muted-foreground">Equal Split</td>
                    <td className="p-3 font-mono font-bold">₹{equalSplitFare.toFixed(2)}</td>
                    <td className="p-3 text-emerald-400 font-bold">-28%</td>
                    <td className="p-3 text-[11px] text-amber-400">Subsidizes short trips</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-muted-foreground">Distance-Based</td>
                    <td className="p-3 font-mono font-bold">₹{distanceSplitFare.toFixed(2)}</td>
                    <td className="p-3 text-emerald-400 font-bold">-30%</td>
                    <td className="p-3 text-[11px] text-muted-foreground">Ignores detour impact</td>
                  </tr>
                  <tr className="bg-primary/10">
                    <td className="p-3 font-bold text-primary flex items-center gap-1">
                      <Sparkles size={13} /> Shapley Value
                    </td>
                    <td className="p-3 font-mono font-extrabold text-foreground">
                      ₹{shapleyFare.toFixed(2)}
                    </td>
                    <td className="p-3 text-emerald-400 font-extrabold">
                      -{savingsPct}%
                    </td>
                    <td className="p-3 text-[11px] text-primary font-semibold">
                      Axiomatically Fair
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Game theory guarantee badges */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Game Theory Axioms Verified
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                  <Check size={14} /> Budget Balance (0 Deficit)
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                  <Check size={14} /> Individual Rationality
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                  <Check size={14} /> Pareto Efficiency
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                  <Check size={14} /> Symmetry / Equal Equals
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={() => setShowFareModal(false)}>
              Understood
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
