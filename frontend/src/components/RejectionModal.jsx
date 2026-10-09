import { useState, useEffect } from 'react';
import { AlertTriangle, ShieldCheck, XCircle, ArrowRight, UserX } from 'lucide-react';
import { api } from '../api';

export default function RejectionModal({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRejection();
    }
  }, [isOpen]);

  async function loadRejection() {
    setLoading(true);
    try {
      const res = await api.runRejectionDemo();
      setData(res);
    } catch (e) {
      alert(`Rejection error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={22} color="#f59e0b" />
            <div>
              <h3>Candidate Rejection Simulation</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                15.0% Passenger Detour SLA Protection
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Simulating candidate insertion and detour analysis...</p>
            </div>
          ) : data ? (
            <>
              <div 
                style={{ 
                  padding: '16px', 
                  background: 'rgba(244, 63, 94, 0.1)', 
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <UserX size={24} color="#fb7185" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ color: '#fb7185', fontSize: '1rem', fontWeight: 700 }}>
                    Candidate {data.candidate_id} Rejected From Coalition
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#f8fafc', marginTop: '4px', lineHeight: '1.45' }}>
                    {data.rejection_reason}
                  </p>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-box-title">Violating Impact on</div>
                  <div className="stat-box-value" style={{ color: '#fbbf24' }}>
                    {data.violating_rider}
                  </div>
                  <div className="stat-box-sub">Original solo time: {data.priya_direct_time_min}m</div>
                </div>

                <div className="stat-box">
                  <div className="stat-box-title">Observed Detour</div>
                  <div className="stat-box-value" style={{ color: '#ef4444' }}>
                    {data.observed_detour_pct}%
                  </div>
                  <div className="stat-box-sub" style={{ color: '#ef4444' }}>
                    Exceeds 15.0% SLA (+{data.detour_delay_minutes} min)
                  </div>
                </div>
              </div>

              <div className="trip-card">
                <div className="section-label">Automated System Action</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: '#34d399' }}>
                  <ShieldCheck size={18} />
                  <span>
                    Existing passengers (Rahul, Priya, Aman) remain undisturbed. Candidate Vikram dispatched via dedicated solo cab.
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
