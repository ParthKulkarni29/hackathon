import React, { useState, useEffect } from 'react';
import { 
  Car, 
  CheckCircle2, 
  Navigation, 
  Users, 
  MapPin, 
  Phone, 
  IndianRupee, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Power,
  RotateCcw,
  Sparkles,
  KeyRound,
  History,
  TrendingUp,
  X,
  Check,
  UserCheck
} from 'lucide-react';
import { api, socket } from '../api';

interface DriverViewProps {
  drivers: any[];
  trips: any[];
  onDriverUpdated: (driver: any) => void;
  onTripUpdated: (trip: any) => void;
}

export default function DriverView({
  drivers = [],
  trips = [],
  onDriverUpdated,
  onTripUpdated
}: DriverViewProps) {
  const [selectedDriverId, setSelectedDriverId] = useState('drv_1');
  const [busy, setBusy] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpModalStopIndex, setOtpModalStopIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'cockpit' | 'earnings' | 'history'>('cockpit');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const selectedDriver = drivers.find(d => d.id === selectedDriverId) || drivers[0];

  // Active Trip handled by this driver
  const activeTrip = trips.find(t => 
    t.driver_id === selectedDriver?.id && 
    ['SCHEDULED', 'IN_PROGRESS'].includes(t.status)
  );

  // Available unassigned or offered assignment waiting for acceptance
  const offeredTrip = !activeTrip
    ? trips.find(t => 
        (t.status === 'OFFERED' || t.status === 'ASSIGNED' || t.status === 'WAITING_DRIVER') &&
        (t.driver_id === selectedDriver?.id || !t.driver_id)
      )
    : null;

  const isOnline = selectedDriver?.status !== 'OFFLINE';

  function showNotification(type: 'success' | 'error', msg: string) {
    if (type === 'success') {
      setActionSuccess(msg);
      setActionError('');
      setTimeout(() => setActionSuccess(''), 4500);
    } else {
      setActionError(msg);
      setActionSuccess('');
      setTimeout(() => setActionError(''), 5500);
    }
  }

  // Toggle Online / Offline
  async function handleToggleOnline() {
    if (!selectedDriver) return;
    const newStatus = isOnline ? 'OFFLINE' : 'AVAILABLE';
    setBusy(true);
    try {
      const updated = await api.updateDriverStatus(selectedDriver.id, newStatus);
      onDriverUpdated(updated);
      showNotification('success', `You are now ${newStatus === 'OFFLINE' ? 'OFFLINE' : 'ONLINE & READY FOR DISPATCH'}`);
    } catch (err: any) {
      showNotification('error', `Status update failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  // Accept Assignment
  async function handleAcceptAssignment(tripId: string) {
    setBusy(true);
    setActionError('');
    try {
      const res = await api.acceptTrip(tripId, selectedDriver.id);
      onTripUpdated(res.trip);
      if (res.driver) onDriverUpdated(res.driver);
      showNotification('success', `Assignment accepted! Dispatched for ${res.trip.rider_ids?.length || 3} passengers.`);
    } catch (err: any) {
      showNotification('error', `Acceptance error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  // Reject Assignment
  async function handleRejectAssignment(tripId: string) {
    if (!window.confirm('Decline this ride pool? It will be returned to dispatch for re-assignment.')) return;
    setBusy(true);
    setActionError('');
    try {
      const res = await api.rejectTrip(tripId, selectedDriver.id, 'Declined by driver');
      onTripUpdated(res.trip);
      showNotification('success', 'Assignment returned to dispatch pool.');
    } catch (err: any) {
      showNotification('error', `Decline error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  // Mark Arrived at Stop
  async function handleArrived(stopIndex: number) {
    if (!activeTrip) return;
    setBusy(true);
    setActionError('');
    try {
      const res = await api.arrivedAtStop(activeTrip.id, stopIndex);
      onTripUpdated(res.trip);
      showNotification('success', res.message);
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setBusy(false);
    }
  }

  // Submit OTP Verification for Pickup
  async function handleVerifyOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTrip || otpModalStopIndex === null) return;
    setBusy(true);
    setActionError('');
    try {
      const res = await api.verifyPickupOtp(activeTrip.id, otpModalStopIndex, otpInput);
      onTripUpdated(res.trip);
      setOtpModalStopIndex(null);
      setOtpInput('');
      showNotification('success', res.message);
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setBusy(false);
    }
  }

  // Mark Passenger Dropped Off
  async function handleDropoff(stopIndex: number) {
    if (!activeTrip) return;
    setBusy(true);
    setActionError('');
    try {
      const res = await api.dropoffPassenger(activeTrip.id, stopIndex);
      onTripUpdated(res.trip);
      showNotification('success', res.message);
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setBusy(false);
    }
  }

  // Complete Trip
  async function handleCompleteTrip() {
    if (!activeTrip) return;
    setBusy(true);
    setActionError('');
    try {
      const res = await api.completeTrip(activeTrip.id);
      onTripUpdated(res.trip);
      showNotification('success', 'Trip completed! Earnings credited to driver account.');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setBusy(false);
    }
  }

  const stops = activeTrip?.stops || [];
  const nextPendingStopIndex = stops.findIndex((s: any) => s.status !== 'COMPLETED');
  const nextStop = nextPendingStopIndex !== -1 ? stops[nextPendingStopIndex] : null;

  // Compute live current occupancy
  let liveOccupancy = 0;
  stops.forEach((s: any) => {
    if (s.status === 'COMPLETED') {
      if (s.stop_type === 'PICKUP') liveOccupancy += 1;
      else liveOccupancy -= 1;
    }
  });

  const completedStopsCount = stops.filter((s: any) => s.status === 'COMPLETED').length;
  const progressPct = stops.length > 0 ? Math.round((completedStopsCount / stops.length) * 100) : 0;

  return (
    <aside className="floating-panel wide" aria-label="Driver Workspace">
      {/* Top Header & Availability Toggle */}
      <div className="panel-header">
        <div className="panel-title-group">
          <h2>Driver Cockpit</h2>
          <p>Highway operations, boarding verification & payout manifest</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Online / Offline Toggle Button */}
          <button
            type="button"
            disabled={busy}
            onClick={handleToggleOnline}
            className={`pill-btn font-bold flex items-center gap-2 transition ${
              isOnline 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
            }`}
          >
            <Power size={14} />
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation: Cockpit, Earnings, Trip History */}
      <div className="px-6 pt-3 pb-0 border-b border-border/60 bg-muted/20 flex gap-4 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('cockpit')}
          className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'cockpit' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Navigation size={14} /> Active Cockpit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('earnings')}
          className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'earnings' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <IndianRupee size={14} /> Payout & Earnings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <History size={14} /> History ({selectedDriver?.trip_history?.length || 0})
        </button>
      </div>

      <div className="panel-body">
        {/* Notifications */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="p-3.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2 animate-in fade-in">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* 1. Driver Profile Bar (Switchable among backend seeded drivers) */}
        <div className="trip-card">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <span className="section-label">Active Vehicle & Operator Profile</span>
            <span className="text-[11px] font-mono text-muted-foreground">ID: {selectedDriver?.id}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-600/30 text-primary border border-primary/40 flex items-center justify-center font-bold text-lg">
                🚖
              </div>
              <div>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="bg-transparent font-bold text-base text-foreground outline-none cursor-pointer border-none"
                  aria-label="Switch Driver Profile"
                >
                  {drivers.map(d => (
                    <option key={d.id} value={d.id} className="bg-card text-foreground">
                      {d.name} ({d.vehicle_model})
                    </option>
                  ))}
                </select>
                <div className="text-xs text-muted-foreground">
                  {selectedDriver?.vehicle_model} • <span className="font-mono text-primary">{selectedDriver?.plate_number}</span> • {selectedDriver?.capacity} Seats Max
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-bold text-emerald-400">Rating: {selectedDriver?.rating || 4.9} ★</div>
              <div className="text-[11px] text-muted-foreground">
                Today: {selectedDriver?.today_trips_count || 0} trips
              </div>
            </div>
          </div>
        </div>

        {/* TAB 1: COCKPIT */}
        {activeTab === 'cockpit' && (
          <>
            {/* If Offline */}
            {!isOnline && (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-muted/10 space-y-3">
                <Power size={36} className="mx-auto text-muted-foreground opacity-50" />
                <h3 className="font-bold text-foreground text-base">You are currently OFFLINE</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Turn your status ONLINE to receive real-time highway ride pooling assignments along the corridor.
                </p>
                <button
                  type="button"
                  onClick={handleToggleOnline}
                  className="pill-btn primary mx-auto font-bold px-6 py-2"
                >
                  Go Online Now
                </button>
              </div>
            )}

            {/* If Online and New Assignment is Offered */}
            {isOnline && offeredTrip && !activeTrip && (
              <div className="p-5 rounded-2xl border border-primary/50 bg-gradient-to-br from-primary/15 via-blue-500/10 to-transparent space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={13} /> New Assignment Available
                  </span>
                  <span className="font-mono text-xs text-muted-foreground font-semibold">
                    Trip #{offeredTrip.id.slice(-6)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-foreground">
                      ₹{((offeredTrip.total_fare_paise || 210000) / 100).toFixed(2)}
                    </h3>
                    <div className="text-xs text-emerald-400 font-semibold">Guaranteed Driver Payout</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-foreground">
                      {offeredTrip.rider_ids?.length || 3} Commuters Pooled
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {offeredTrip.total_distance_km || 150} km direct corridor
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-card/60 border border-border/80 text-xs space-y-1.5">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Navigation size={13} className="text-primary" />
                    <span>{offeredTrip.stops?.[0]?.location || 'Pune (Kiwale)'} → {offeredTrip.stops?.[offeredTrip.stops.length - 1]?.location || 'Mumbai'}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Passengers: {offeredTrip.rider_ids?.join(', ')} • Max {offeredTrip.peak_occupancy || 2} concurrent onboard
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleAcceptAssignment(offeredTrip.id)}
                    className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wide transition shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5"
                  >
                    <Check size={16} /> Accept Assignment
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleRejectAssignment(offeredTrip.id)}
                    className="py-3 rounded-xl border border-destructive/40 text-destructive text-xs font-bold uppercase tracking-wide hover:bg-destructive/10 transition flex items-center justify-center gap-1.5"
                  >
                    <X size={16} /> Decline
                  </button>
                </div>
              </div>
            )}

            {/* If Online with Active Trip */}
            {isOnline && activeTrip && (
              <div className="space-y-4 animate-in fade-in">
                
                {/* Trip Progress Bar & Metrics */}
                <div className="trip-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Dispatched Trip #{activeTrip.id.slice(-6)}
                      </div>
                      <div className="text-lg font-black text-foreground">
                        {activeTrip.stops?.[0]?.location || 'Pune'} → {activeTrip.stops?.[activeTrip.stops.length - 1]?.location || 'Mumbai'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-primary font-mono">
                        ₹{((activeTrip.total_fare_paise || 210000) / 100).toFixed(2)}
                      </div>
                      <div className="text-[11px] text-emerald-400 font-semibold">Zero Platform Deficit</div>
                    </div>
                  </div>

                  {/* Seating Capacity Meter */}
                  <div className="capacity-meter pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">In-Vehicle Capacity</span>
                      <b className="text-foreground">{Math.max(0, liveOccupancy)} / {selectedDriver?.capacity || 4} seats filled</b>
                    </div>
                    <div className="meter-track">
                      <div
                        className={`meter-fill ${liveOccupancy >= (selectedDriver?.capacity || 4) ? 'warn' : 'normal'}`}
                        style={{ width: `${Math.min(100, (Math.max(0, liveOccupancy) / (selectedDriver?.capacity || 4)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Trip Progress */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Trip Progress</span>
                      <span>{completedStopsCount} of {stops.length} stops ({progressPct}%)</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                </div>

                {/* 2. NEXT STOP HIGHLIGHT CARD (Reference Image Spacing & Visual Hierarchy) */}
                {nextStop ? (
                  <div className="p-4 rounded-2xl border-2 border-primary bg-primary/10 shadow-lg shadow-primary/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-primary text-black font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <Navigation size={13} /> NEXT STOP: {nextStop.stop_type}
                      </span>
                      <span className="font-mono text-xs font-bold text-primary">
                        Milepost {nextStop.km_coordinate} km
                      </span>
                    </div>

                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-black text-foreground">{nextStop.location}</h3>
                        <p className="text-xs text-muted-foreground">
                          Passenger: <b className="text-foreground">{nextStop.passenger_name || nextStop.rider_id}</b>
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">ETA</div>
                        <div className="text-sm font-bold text-foreground">~4 mins</div>
                      </div>
                    </div>

                    {/* Operational Action Buttons based on Stop Status */}
                    {nextStop.status === 'PENDING' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleArrived(nextPendingStopIndex)}
                        className="w-full py-3.5 rounded-xl bg-primary hover:bg-cyan-400 active:scale-[0.99] text-black font-extrabold text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2"
                      >
                        <MapPin size={16} /> Arrived at {nextStop.location}
                      </button>
                    )}

                    {nextStop.status === 'ARRIVED' && nextStop.stop_type === 'PICKUP' && (
                      <div className="p-3 rounded-xl bg-card border border-primary/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                            <KeyRound size={14} /> Passenger Boarding Verification
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Demo Code: {nextStop.otp || '4829'}
                          </span>
                        </div>
                        <form onSubmit={handleVerifyOtpSubmit} className="flex gap-2">
                          <input
                            type="text"
                            maxLength={4}
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value)}
                            placeholder="Enter 4-digit OTP"
                            className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-center font-mono text-base font-bold text-foreground outline-none focus:border-primary"
                            required
                          />
                          <button
                            type="submit"
                            disabled={busy || otpInput.length < 4}
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wide transition flex items-center gap-1"
                          >
                            <Check size={14} /> Verify & Board
                          </button>
                        </form>
                      </div>
                    )}

                    {nextStop.status === 'ARRIVED' && nextStop.stop_type === 'DROPOFF' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDropoff(nextPendingStopIndex)}
                        className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2"
                      >
                        <UserCheck size={16} /> Confirm Drop-off for {nextStop.rider_id}
                      </button>
                    )}
                  </div>
                ) : (
                  /* All stops finished - Complete Trip Action */
                  <div className="p-5 rounded-2xl border-2 border-emerald-500/60 bg-emerald-500/10 text-center space-y-3">
                    <CheckCircle2 size={36} className="mx-auto text-emerald-400" />
                    <h3 className="text-lg font-bold text-foreground">All Itinerary Stops Completed!</h3>
                    <p className="text-xs text-muted-foreground">
                      All passengers have reached their destinations safely within the 15% detour SLA.
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleCompleteTrip}
                      className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wide transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                    >
                      <IndianRupee size={18} /> Complete Trip & Collect ₹{((activeTrip.total_fare_paise || 210000) / 100).toFixed(2)}
                    </button>
                  </div>
                )}

                {/* 3. Passenger Manifest */}
                <div className="trip-card">
                  <div className="section-label">Pooled Passenger Manifest ({activeTrip.rider_ids?.length || 0})</div>
                  <div className="space-y-2">
                    {activeTrip.rider_ids?.map((rid: string) => {
                      const pickupSt = stops.find((s: any) => s.rider_id === rid && s.stop_type === 'PICKUP');
                      const dropoffSt = stops.find((s: any) => s.rider_id === rid && s.stop_type === 'DROPOFF');
                      const isPickedUp = pickupSt?.status === 'COMPLETED';
                      const isDroppedOff = dropoffSt?.status === 'COMPLETED';

                      let stateLabel = 'Waiting for Pickup';
                      let stateClass = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                      if (isDroppedOff) {
                        stateLabel = 'Dropped Off';
                        stateClass = 'bg-slate-500/15 text-slate-400 border-slate-500/30';
                      } else if (isPickedUp) {
                        stateLabel = 'Onboard (In Cab)';
                        stateClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                      }

                      const fareShare = activeTrip.pricing?.shapley_fares_inr?.[rid] || 700;

                      return (
                        <div key={rid} className="p-3 rounded-xl bg-muted/20 border border-border/70 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-foreground">{pickupSt?.passenger_name || rid}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {pickupSt?.location} → {dropoffSt?.location}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${stateClass}`}>
                              {stateLabel}
                            </span>
                            <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                              Share: ₹{fareShare.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Full Sequenced Manifest List */}
                <div className="trip-card">
                  <div className="section-label">Linear Stop Manifest (VRPTW Order)</div>
                  <div className="space-y-2">
                    {stops.map((s: any, idx: number) => {
                      const isDone = s.status === 'COMPLETED';
                      const isNext = idx === nextPendingStopIndex;

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                            isDone 
                              ? 'bg-muted/10 border-border/40 opacity-60' 
                              : isNext 
                              ? 'bg-primary/10 border-primary font-bold' 
                              : 'bg-muted/20 border-border/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              s.stop_type === 'PICKUP' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
                            }`}>
                              {s.stop_type}
                            </span>
                            <div>
                              <div className="text-foreground">{s.passenger_name || s.rider_id} @ {s.location}</div>
                              <div className="text-[10px] text-muted-foreground">{s.km_coordinate} km milestone</div>
                            </div>
                          </div>

                          <div>
                            {isDone ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <Check size={13} /> Completed
                              </span>
                            ) : s.status === 'ARRIVED' ? (
                              <span className="text-primary font-bold">At Stop</span>
                            ) : (
                              <span className="text-muted-foreground">Pending</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* If Online and No Trips at all */}
            {isOnline && !activeTrip && !offeredTrip && (
              <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-muted/10 space-y-3">
                <div className="relative w-12 h-12 mx-auto">
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                  <div className="relative w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xl border border-primary/40">
                    🚖
                  </div>
                </div>
                <h3 className="font-bold text-foreground text-base">Waiting for Corridor Dispatch</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Vehicle is positioned at <b>{selectedDriver?.current_location?.name || 'Pune (Kiwale)'}</b>. When commuters request rides in the sliding window, assignments will appear here.
                </p>
              </div>
            )}
          </>
        )}

        {/* TAB 2: EARNINGS PANEL */}
        {activeTab === 'earnings' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-box-title">Today's Earnings</div>
                <div className="stat-box-value" style={{ color: 'var(--primary)' }}>
                  ₹{((selectedDriver?.today_earnings_paise || 210000) / 100).toFixed(2)}
                </div>
                <div className="stat-box-sub">Simulated Demo Net</div>
              </div>

              <div className="stat-box">
                <div className="stat-box-title">Completed Trips</div>
                <div className="stat-box-value">
                  {selectedDriver?.today_trips_count || 2}
                </div>
                <div className="stat-box-sub">Corridor Runs Today</div>
              </div>

              <div className="stat-box">
                <div className="stat-box-title">All-Time Balance</div>
                <div className="stat-box-value text-emerald-400">
                  ₹{((selectedDriver?.total_earnings_paise || 420000) / 100).toFixed(2)}
                </div>
                <div className="stat-box-sub">Zero Platform Deficit</div>
              </div>

              <div className="stat-box">
                <div className="stat-box-title">Hourly Avg</div>
                <div className="stat-box-value text-blue-400">
                  ₹525/hr
                </div>
                <div className="stat-box-sub">Pooled Rate Efficiency</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/20 border border-border text-xs text-muted-foreground space-y-2">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>FairPool Payout Guarantee Policy</span>
              </div>
              <p>
                Unlike surge-based commission deductions, FairPool guarantees 100% of the pooled vehicle tariff (calculated in exact integer paise via Shapley allocation) directly to the driver with zero hidden platform cuts.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: TRIP HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="section-label">Completed Highway Runs</div>
            {(!selectedDriver?.trip_history || selectedDriver.trip_history.length === 0) ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No past runs recorded today. Complete an active trip to see it logged here.
              </div>
            ) : (
              selectedDriver.trip_history.map((h: any, i: number) => (
                <div key={i} className="p-3.5 rounded-xl bg-muted/20 border border-border/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-foreground">{h.route}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Passengers: {h.passengers?.join(', ')} • {h.completed_at}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-400 text-sm">
                      +₹{h.fare_inr.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Settled</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
