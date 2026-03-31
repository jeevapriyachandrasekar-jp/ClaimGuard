export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'assessor';
}

export interface Document {
  id: string;
  userId: string;
  type: 'Insurance Policy' | 'Driving License' | 'Vehicle Registration';
  expiryDate: string;
  fileUrl?: string;
}

export interface Claim {
  id: string;
  userId: string;
  userName: string;
  description: string;
  images: string[];
  firCopy?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  aiAnalysis?: {
    consistencyScore: number;
    fraudRisk: string;
    estimatedAmount: number;
    analysisSummary: string;
    detectedDamages: string[];
  };
  assessorFeedback?: string;
  finalAmount?: number;
}
