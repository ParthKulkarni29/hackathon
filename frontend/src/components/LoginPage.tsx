import React, { useState } from 'react';
import { ContactCard } from '@/components/ui/contact-card';
import { MailIcon, PhoneIcon, MapPinIcon, ShieldCheck, ArrowRight, UserCheck, Sparkles, Car } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface LoginPageProps {
  onLogin: (user: { name: string; role: string; email: string; avatar: string }) => void;
  onClose?: () => void;
  currentUser?: { name: string; role: string } | null;
}

export default function LoginPage({ onLogin, onClose, currentUser }: LoginPageProps) {
  const [tab, setTab] = useState<'login' | 'contact'>('login');
  const [name, setName] = useState('Rahul Sharma');
  const [email, setEmail] = useState('rahul.sharma@pune-tech.org');
  const [phone, setPhone] = useState('+91 98200 44556');
  const [selectedPersona, setSelectedPersona] = useState('Rahul');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const personas = [
    {
      id: 'Rahul',
      name: 'Rahul Sharma',
      role: 'Daily Commuter (Tech)',
      route: 'Pune (Kiwale) → Lonavala',
      soloFare: '₹812',
      pooledFare: '₹504',
      email: 'rahul.sharma@pune-tech.org',
      img: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80'
    },
    {
      id: 'Priya',
      name: 'Priya Nair',
      role: 'Expressway Commuter (Finance)',
      route: 'Talegaon → Panvel',
      soloFare: '₹1,106',
      pooledFare: '₹728',
      email: 'priya.nair@mumbai-fin.com',
      img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80'
    },
    {
      id: 'Aman',
      name: 'Aman Khan',
      role: 'Executive Transit',
      route: 'Lonavala → Mumbai',
      soloFare: '₹1,288',
      pooledFare: '₹994',
      email: 'aman.khan@consulting.in',
      img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80'
    },
    {
      id: 'Vikram',
      name: 'Vikram Singh',
      role: 'Detour SLA Test Passenger',
      route: 'Khalapur Toll → Pen/NH 66 Exit',
      soloFare: '₹378',
      pooledFare: 'Rejected (>15% Detour)',
      email: 'vikram.singh@pen-offgrid.in',
      img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80'
    }
  ];

  function handleSelectPersona(p: typeof personas[0]) {
    setSelectedPersona(p.id);
    setName(p.name);
    setEmail(p.email);
  }

  function handleDoLogin(e: React.FormEvent) {
    e.preventDefault();
    onLogin({
      name,
      role: 'Passenger',
      email,
      avatar: personas.find(p => p.id === selectedPersona)?.img || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80'
    });
    if (onClose) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">
              ⚡
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">FairPool Passenger Portal</h2>
              <p className="text-xs text-muted-foreground">Pune–Mumbai Expressway Ride-Pooling Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('login')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                tab === 'login' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Demo Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab('contact')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                tab === 'contact' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Help & Contact
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="ml-2 text-muted-foreground hover:text-foreground p-1 text-lg leading-none"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {tab === 'login' ? (
          <div className="p-6 md:p-8 grid md:grid-cols-2 gap-8">
            {/* Left: Quick Persona Switcher */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">Select Commuter Persona</h3>
                <p className="text-sm text-muted-foreground">
                  Pick a seeded commuter on the Golden Corridor to immediately test game-theoretic Shapley pricing.
                </p>
              </div>

              <div className="space-y-3">
                {personas.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPersona(p)}
                    className={`cursor-pointer p-4 rounded-xl border transition flex items-center justify-between ${
                      selectedPersona === p.id
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={p.img} alt={p.name} className="w-12 h-12 rounded-full object-cover border border-border" />
                      <div>
                        <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          {p.name}
                          {selectedPersona === p.id && <Sparkles size={14} className="text-primary" />}
                        </div>
                        <div className="text-xs text-muted-foreground">{p.route}</div>
                        <div className="text-xs font-mono text-primary mt-0.5">
                          Fair Share: {p.pooledFare} <span className="line-through text-muted-foreground text-[10px]">{p.soloFare}</span>
                        </div>
                      </div>
                    </div>
                    {selectedPersona === p.id && (
                      <span className="text-primary text-xs font-bold uppercase tracking-wider">Active</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border/40 bg-muted/10 p-3 text-xs text-muted-foreground flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <span>Zero platform deficit verified down to the integer paisa. Maximum 15.0% passenger detour guaranteed.</span>
              </div>
            </div>

            {/* Right: Login Form */}
            <div className="border border-border/60 rounded-xl p-6 bg-muted/20 flex flex-col justify-between">
              <form onSubmit={handleDoLogin} className="space-y-4">
                <div>
                  <h4 className="text-base font-bold text-foreground">Confirm Commuter Details</h4>
                  <p className="text-xs text-muted-foreground">Enter or adjust credentials for this session</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="commuter-name">Full Name</Label>
                  <Input
                    id="commuter-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter commuter name"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="commuter-email">Email Address</Label>
                  <Input
                    id="commuter-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@corridor.in"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="commuter-phone">Mobile Phone</Label>
                  <Input
                    id="commuter-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98XXX XXXXX"
                  />
                </div>

                <Button type="submit" className="w-full mt-4 font-bold tracking-wide">
                  Sign In as {name.split(' ')[0]} <ArrowRight size={16} className="ml-1.5" />
                </Button>
              </form>

              <div className="pt-4 text-center text-xs text-muted-foreground">
                Hackathon Demo Mode • Session stored in local browser state
              </div>
            </div>
          </div>
        ) : (
          /* Contact Card view using shadcn ContactCard component */
          <div className="p-4 md:p-6">
            {contactSubmitted ? (
              <div className="text-center py-12 space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-xl font-bold">
                  ✓
                </div>
                <h3 className="text-lg font-bold text-foreground">Message Dispatched to FairPool Transit Ops</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Thank you! Our corridor dispatch management team typically responds within 1 business hour.
                </p>
                <Button variant="outline" onClick={() => setContactSubmitted(false)}>
                  Send Another Inquiry
                </Button>
              </div>
            ) : (
              <ContactCard
                title="FairPool Support"
                description="Have questions regarding our algorithmic pooling SLA, detour caps, or Shapley billing? Drop a line to our transit operations engineers."
                contactInfo={[
                  {
                    icon: MailIcon,
                    label: 'Transit Ops Email',
                    value: 'dispatch@fairpool.transit.in',
                  },
                  {
                    icon: PhoneIcon,
                    label: 'Corridor Helpline',
                    value: '+91 20 2740 5000',
                  },
                  {
                    icon: MapPinIcon,
                    label: 'Toll Operations Base',
                    value: 'Expressway Milepost 88, Khalapur, MH',
                    className: 'col-span-2',
                  }
                ]}
              >
                <form 
                  onSubmit={(e) => { e.preventDefault(); setContactSubmitted(true); }} 
                  className="w-full space-y-4"
                >
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="c-name">Name</Label>
                    <Input id="c-name" defaultValue={name} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="c-email">Email</Label>
                    <Input id="c-email" type="email" defaultValue={email} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="c-phone">Phone</Label>
                    <Input id="c-phone" defaultValue={phone} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="c-msg">Inquiry or Feedback</Label>
                    <Textarea id="c-msg" placeholder="Tell us how we can help with your highway commute..." required />
                  </div>
                  <Button className="w-full" type="submit">
                    Send Inquiry
                  </Button>
                </form>
              </ContactCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
