import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { 
  Car, 
  Shield, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  LogOut, 
  Plus, 
  Upload,
  ChevronRight,
  ClipboardList,
  User as UserIcon,
  Search,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from './lib/utils';
import { User, Claim, Document as DocType } from './types';
import { analyzeClaim } from './services/aiService';

// --- Components ---

const Button = ({ className, variant = 'primary', ...props }: any) => {
  const variants = {
    primary: 'bg-orange-600 text-white hover:bg-orange-700',
    secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
    outline: 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800',
    ghost: 'text-zinc-400 hover:text-white hover:bg-zinc-800',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };
  return (
    <button 
      className={cn('px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50', variants[variant as keyof typeof variants], className)} 
      {...props} 
    />
  );
};

const Card = ({ children, className }: any) => (
  <div className={cn('bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden', className)}>
    {children}
  </div>
);

const Input = ({ className, ...props }: any) => (
  <input 
    className={cn('w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-600/50 transition-all', className)} 
    {...props} 
  />
);

// --- Pages ---

const Login = ({ setUser }: { setUser: (u: User) => void }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'user' | 'assessor'>('user');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, name })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        navigate('/');
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-600/10 text-orange-600 mb-4">
            <Shield size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AutoClaim AI</h1>
          <p className="text-zinc-500 mt-2">Intelligent Insurance Management</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Full Name</label>
                <Input value={name} onChange={(e: any) => setName(e.target.value)} required />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Email Address</label>
              <Input type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
              <Input type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} required />
            </div>
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">I am a...</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    className={cn('py-2 rounded-lg border transition-all', role === 'user' ? 'bg-orange-600/10 border-orange-600 text-orange-600' : 'border-zinc-800 text-zinc-500')}
                  >
                    Policyholder
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('assessor')}
                    className={cn('py-2 rounded-lg border transition-all', role === 'assessor' ? 'bg-orange-600/10 border-orange-600 text-orange-600' : 'border-zinc-800 text-zinc-500')}
                  >
                    Assessor
                  </button>
                </div>
              </div>
            )}
            <Button type="submit" className="w-full py-3 mt-4" disabled={loading}>
              {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-zinc-500 hover:text-orange-600 transition-colors"
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

const DocumentUploadModal = ({ isOpen, onClose, onUpload, initialType }: { isOpen: boolean, onClose: () => void, onUpload: (data: any) => void, initialType?: string }) => {
  const [type, setType] = useState(initialType || 'Insurance Policy');
  const [expiryDate, setExpiryDate] = useState('');
  const [file, setFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFile(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onUpload({ type, expiryDate, fileUrl: file });
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Upload Document</h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-white"><XCircle size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Document Type</label>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-600/50"
              >
                <option>Insurance Policy</option>
                <option>Driving License</option>
                <option>Vehicle Registration</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Expiry Date</label>
              <Input type="date" value={expiryDate} onChange={(e: any) => setExpiryDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Document Image</label>
              <label className="w-full h-32 rounded-lg border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-600 hover:border-orange-600/50 hover:text-orange-600 transition-all cursor-pointer overflow-hidden">
                {file ? (
                  <img src={file} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload size={24} className="mb-2" />
                    <span className="text-xs font-medium">Select File</span>
                  </>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} required={!file} />
              </label>
            </div>
            <Button type="submit" className="w-full py-3 mt-4" disabled={loading}>
              {loading ? 'Uploading...' : 'Save Document'}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

const UserDashboard = ({ user }: { user: User }) => {
  const [docs, setDocs] = useState<DocType[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | undefined>();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [docsRes, claimsRes] = await Promise.all([
        fetch('/api/documents', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/claims', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      setDocs(await docsRes.json());
      setClaims(await claimsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpload = async (data: any) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isExpiringSoon = (date: string) => {
    const expiry = new Date(date);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // 30 days
  };

  const isExpired = (date: string) => {
    const expiry = new Date(date);
    const now = new Date();
    return expiry.getTime() < now.getTime();
  };

  const expiredDocs = docs.filter(d => isExpired(d.expiryDate));

  return (
    <div className="space-y-8">
      <DocumentUploadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onUpload={handleUpload}
        initialType={selectedType}
      />

      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white">Welcome, {user.name}</h2>
          <p className="text-zinc-500">Manage your documents and insurance claims.</p>
        </div>
        <Button onClick={() => navigate('/claim/new')} className="flex items-center gap-2">
          <Plus size={18} /> File New Claim
        </Button>
      </header>

      {expiredDocs.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-start gap-4"
        >
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-red-500 font-bold text-sm">Action Required: Expired Documents</h4>
            <p className="text-zinc-400 text-xs mt-1">
              The following documents have expired: {expiredDocs.map(d => d.type).join(', ')}. 
              Please update them immediately to ensure your insurance coverage remains active.
            </p>
          </div>
        </motion.div>
      )}

      <section>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="text-orange-600" size={20} />
          <h3 className="text-xl font-semibold text-white">Your Documents</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Insurance Policy', 'Driving License', 'Vehicle Registration'].map(type => {
            const doc = docs.find(d => d.type === type);
            const expired = doc && isExpired(doc.expiryDate);
            const soon = doc && isExpiringSoon(doc.expiryDate);

            return (
              <Card key={type} className={cn("p-6 flex flex-col justify-between min-h-[160px]", expired && "border-red-500/50")}>
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-zinc-200">{type}</h4>
                    {expired ? (
                      <div className="flex items-center gap-1 text-[10px] text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full font-bold uppercase">
                        <AlertCircle size={10} /> Expired
                      </div>
                    ) : soon ? (
                      <div className="flex items-center gap-1 text-[10px] text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full font-bold uppercase">
                        <AlertCircle size={10} /> Expiring Soon
                      </div>
                    ) : doc ? (
                      <div className="flex items-center gap-1 text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full font-bold uppercase">
                        <CheckCircle size={10} /> Uploaded
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-500/10 px-2 py-0.5 rounded-full font-bold uppercase">
                        <XCircle size={10} /> Missing
                      </div>
                    )}
                  </div>
                  {doc ? (
                    <p className={cn("text-sm", expired ? "text-red-400" : "text-zinc-500")}>
                      Expires: {formatDate(doc.expiryDate)}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-600 italic">Please upload this document</p>
                  )}
                </div>
                <div className="mt-4">
                  <Button 
                    variant={doc ? "outline" : "secondary"} 
                    className="w-full text-xs"
                    onClick={() => {
                      setSelectedType(type);
                      setIsModalOpen(true);
                    }}
                  >
                    {doc ? 'Update Document' : 'Upload Now'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="text-orange-600" size={20} />
          <h3 className="text-xl font-semibold text-white">Recent Claims</h3>
        </div>
        <Card>
          {claims.length === 0 ? (
            <div className="p-12 text-center text-zinc-600">
              <ClipboardList size={48} className="mx-auto mb-4 opacity-20" />
              <p>No claims filed yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {claims.map(claim => (
                <div key={claim.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/claim/${claim.id}`)}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      claim.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                      claim.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                      'bg-orange-500/10 text-orange-500'
                    )}>
                      {claim.status === 'approved' ? <CheckCircle size={20} /> :
                       claim.status === 'rejected' ? <XCircle size={20} /> :
                       <AlertCircle size={20} />}
                    </div>
                    <div>
                      <h4 className="font-medium text-zinc-200">Claim #{claim.id.slice(-6)}</h4>
                      <p className="text-xs text-zinc-500">{formatDate(claim.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={cn(
                        "text-sm font-medium capitalize",
                        claim.status === 'approved' ? 'text-green-500' :
                        claim.status === 'rejected' ? 'text-red-500' :
                        'text-orange-500'
                      )}>
                        {claim.status}
                      </p>
                      {claim.aiAnalysis && (
                        <p className="text-[10px] text-zinc-600">AI Estimated: ${claim.aiAnalysis.estimatedAmount}</p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-zinc-700" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
};

const AssessorDashboard = ({ user }: { user: User }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/claims', { headers: { 'Authorization': `Bearer ${token}` } });
        setClaims(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClaims();
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-white">Assessor Dashboard</h2>
        <p className="text-zinc-500">Review and process pending insurance claims.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Claims', value: claims.length, icon: ClipboardList, color: 'text-zinc-400' },
          { label: 'Pending', value: claims.filter(c => c.status === 'pending').length, icon: AlertCircle, color: 'text-orange-500' },
          { label: 'Approved', value: claims.filter(c => c.status === 'approved').length, icon: CheckCircle, color: 'text-green-500' },
          { label: 'Rejected', value: claims.filter(c => c.status === 'rejected').length, icon: XCircle, color: 'text-red-500' },
        ].map(stat => (
          <Card key={stat.label} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <stat.icon className={stat.color} size={20} />
            </div>
          </Card>
        ))}
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Incoming Claims</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
            <Input className="pl-10 py-1.5 text-sm w-64" placeholder="Search by ID or Name..." />
          </div>
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Claim ID</th>
                  <th className="px-6 py-4 font-semibold">Policyholder</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">AI Risk</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {claims.map(claim => (
                  <tr key={claim.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-zinc-300">#{claim.id.slice(-6)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                          {claim.userName?.[0]}
                        </div>
                        <span className="text-sm text-zinc-200">{claim.userName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">{formatDate(claim.createdAt)}</td>
                    <td className="px-6 py-4">
                      {claim.aiAnalysis ? (
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                          claim.aiAnalysis.fraudRisk === 'Low' ? 'bg-green-500/10 text-green-500' :
                          claim.aiAnalysis.fraudRisk === 'Medium' ? 'bg-orange-500/10 text-orange-500' :
                          'bg-red-500/10 text-red-500'
                        )}>
                          {claim.aiAnalysis.fraudRisk} Risk
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-700">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-xs capitalize",
                        claim.status === 'approved' ? 'text-green-500' :
                        claim.status === 'rejected' ? 'text-red-500' :
                        'text-orange-500'
                      )}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        className="p-2"
                        onClick={() => navigate(`/claim/${claim.id}`)}
                      >
                        <Eye size={18} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
};

const NewClaim = () => {
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [firCopy, setFirCopy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFirUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setFirCopy(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. AI Analysis
      const aiResult = await analyzeClaim(description, images, firCopy || undefined);
      
      // 2. Submit Claim
      const token = localStorage.getItem('token');
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description,
          images,
          firCopy,
          aiAnalysis: aiResult
        })
      });
      
      if (res.ok) {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit claim. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-8">
        <button onClick={() => navigate(-1)} className="text-zinc-500 hover:text-white mb-4 flex items-center gap-1 text-sm">
          <ChevronRight size={16} className="rotate-180" /> Back to Dashboard
        </button>
        <h2 className="text-3xl font-bold text-white">File a New Claim</h2>
        <p className="text-zinc-500">Provide details about the incident for AI-assisted verification.</p>
      </header>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Accident Description</label>
            <textarea 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-600/50 min-h-[120px]"
              placeholder="Describe what happened in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Damage Images</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((img, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden border border-zinc-800 relative group">
                  <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button 
                    type="button"
                    onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 bg-black/50 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XCircle size={16} className="text-white" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-lg border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-600 hover:border-orange-600/50 hover:text-orange-600 transition-all cursor-pointer">
                <Upload size={24} className="mb-2" />
                <span className="text-xs font-medium">Upload Image</span>
                <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">FIR Copy (Optional)</label>
            {firCopy ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border border-zinc-800 group">
                <img src={firCopy} className="w-full h-full object-contain bg-zinc-950" referrerPolicy="no-referrer" />
                <button 
                  type="button"
                  onClick={() => setFirCopy(null)}
                  className="absolute top-2 right-2 bg-black/50 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XCircle size={20} className="text-white" />
                </button>
              </div>
            ) : (
              <label className="w-full h-32 rounded-lg border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-600 hover:border-orange-600/50 hover:text-orange-600 transition-all cursor-pointer">
                <FileText size={24} className="mb-2" />
                <span className="text-xs font-medium">Upload FIR Document (Image)</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleFirUpload} />
              </label>
            )}
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full py-4 flex items-center justify-center gap-2" disabled={loading}>
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AI is analyzing your claim...
                </>
              ) : (
                'Submit Claim for Verification'
              )}
            </Button>
            <p className="text-[10px] text-zinc-600 text-center mt-4 uppercase tracking-widest">
              Powered by Multi-Model AI (BERT + CNN Equivalent)
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
};

const ClaimDetail = ({ user }: { user: User }) => {
  const [claim, setClaim] = useState<Claim | null>(null);
  const [feedback, setFeedback] = useState('');
  const [finalAmount, setFinalAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { id } = useNavigate() as any; // Mocking params for brevity in this single-file structure

  // Since I'm using a single file for the whole app, I'll extract ID from URL
  const claimId = window.location.pathname.split('/').pop();

  useEffect(() => {
    const fetchClaim = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/claims', { headers: { 'Authorization': `Bearer ${token}` } });
        const allClaims = await res.json();
        const found = allClaims.find((c: any) => c.id === claimId);
        setClaim(found);
        if (found?.aiAnalysis) setFinalAmount(found.aiAnalysis.estimatedAmount);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClaim();
  }, [claimId]);

  const handleAction = async (status: 'approved' | 'rejected') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status, 
          assessorFeedback: feedback,
          finalAmount: status === 'approved' ? finalAmount : 0
        })
      });
      if (res.ok) navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-12 text-center text-zinc-500">Loading claim details...</div>;
  if (!claim) return <div className="p-12 text-center text-zinc-500">Claim not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex justify-between items-start">
        <div>
          <button onClick={() => navigate(-1)} className="text-zinc-500 hover:text-white mb-4 flex items-center gap-1 text-sm">
            <ChevronRight size={16} className="rotate-180" /> Back
          </button>
          <h2 className="text-3xl font-bold text-white">Claim #{claim.id.slice(-6)}</h2>
          <p className="text-zinc-500">Submitted by {claim.userName} on {formatDate(claim.createdAt)}</p>
        </div>
        <div className={cn(
          "px-4 py-2 rounded-lg font-bold uppercase text-xs tracking-widest",
          claim.status === 'approved' ? 'bg-green-500/10 text-green-500' :
          claim.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
          'bg-orange-500/10 text-orange-500'
        )}>
          {claim.status}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h3 className="text-lg font-semibold text-white mb-4">Incident Details</h3>
            <Card className="p-6">
              <p className="text-zinc-300 leading-relaxed">{claim.description}</p>
            </Card>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-4">Evidence Images</h3>
            <div className="grid grid-cols-2 gap-4">
              {claim.images.map((img, i) => (
                <div key={i} className="aspect-video rounded-xl overflow-hidden border border-zinc-800">
                  <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          </section>

          {claim.firCopy && (
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">FIR Document</h3>
              <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 p-2">
                <img src={claim.firCopy} className="w-full h-auto max-h-[600px] object-contain" referrerPolicy="no-referrer" />
              </div>
            </section>
          )}
        </div>

        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold text-white mb-4">AI Verification Report</h3>
            <Card className="p-6 border-orange-600/20 bg-orange-600/5">
              {claim.aiAnalysis ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Consistency Score</span>
                    <span className="text-lg font-bold text-white">{claim.aiAnalysis.consistencyScore}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-orange-600 h-full transition-all duration-1000" 
                      style={{ width: `${claim.aiAnalysis.consistencyScore}%` }} 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Fraud Risk</p>
                      <p className={cn(
                        "text-sm font-bold mt-1",
                        claim.aiAnalysis.fraudRisk === 'Low' ? 'text-green-500' :
                        claim.aiAnalysis.fraudRisk === 'Medium' ? 'text-orange-500' :
                        'text-red-500'
                      )}>{claim.aiAnalysis.fraudRisk}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">AI Estimate</p>
                      <p className="text-sm font-bold text-white mt-1">${claim.aiAnalysis.estimatedAmount}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Analysis Summary</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">{claim.aiAnalysis.analysisSummary}</p>
                  </div>

                  {claim.aiAnalysis.detectedDamages && (
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Detected Damages</p>
                      <div className="flex flex-wrap gap-2">
                        {claim.aiAnalysis.detectedDamages.map(d => (
                          <span key={d} className="text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-300">{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 italic">No AI analysis available for this claim.</p>
              )}
            </Card>
          </section>

          {user.role === 'assessor' && claim.status === 'pending' && (
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">Assessor Action</h3>
              <Card className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Final Claim Amount ($)</label>
                  <Input 
                    type="number" 
                    value={finalAmount} 
                    onChange={(e: any) => setFinalAmount(Number(e.target.value))} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Feedback / Reason</label>
                  <textarea 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none min-h-[80px]"
                    placeholder="Provide feedback to the policyholder..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button variant="danger" onClick={() => handleAction('rejected')}>Reject</Button>
                  <Button onClick={() => handleAction('approved')}>Approve</Button>
                </div>
              </Card>
            </section>
          )}

          {claim.assessorFeedback && (
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">Assessor Feedback</h3>
              <Card className="p-6 border-zinc-700">
                <p className="text-sm text-zinc-300 italic">"{claim.assessorFeedback}"</p>
                {claim.finalAmount && (
                  <p className="mt-4 text-lg font-bold text-green-500">Approved Amount: ${claim.finalAmount}</p>
                )}
              </Card>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        // In a real app, we'd verify the token with the server
        // For this demo, we'll just parse the JWT or use stored user info
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          // Mocking a fetch to get full user details if needed
          setUser({ id: payload.id, email: payload.email, role: payload.role, name: payload.name || 'User' });
        } catch (e) {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Initializing...</div>;

  return (
    <Router>
      <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-orange-600/30">
        <AnimatePresence mode="wait">
          {!user ? (
            <Routes>
              <Route path="*" element={<Login setUser={setUser} />} />
            </Routes>
          ) : (
            <div className="flex flex-col min-h-screen">
              <nav className="border-b border-zinc-800 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                  <Link to="/" className="flex items-center gap-2 text-orange-600 font-bold text-xl">
                    <Shield size={24} />
                    <span className="text-white tracking-tight">AutoClaim AI</span>
                  </Link>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
                      <UserIcon size={14} className="text-zinc-500" />
                      <span className="text-xs font-medium text-zinc-300">{user.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-600/10 text-orange-600 uppercase font-bold">
                        {user.role}
                      </span>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="text-zinc-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                      <LogOut size={18} /> Sign Out
                    </button>
                  </div>
                </div>
              </nav>

              <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={user.role === 'user' ? <UserDashboard user={user} /> : <AssessorDashboard user={user} />} />
                  <Route path="/claim/new" element={user.role === 'user' ? <NewClaim /> : <Navigate to="/" />} />
                  <Route path="/claim/:id" element={<ClaimDetail user={user} />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>

              <footer className="border-t border-zinc-800 py-8 text-center text-zinc-600 text-xs">
                <p>&copy; 2026 AutoClaim AI. All rights reserved.</p>
                <p className="mt-1">Automated Insurance Verification System v1.0</p>
              </footer>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Router>
  );
}
