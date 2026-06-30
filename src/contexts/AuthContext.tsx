import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  User, 
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface UserProfile {
  docId: string;
  docCollection: 'users' | 'admin';
  uid: string;
  email: string;
  name: string;
  avatar: string;
  gender?: string;
  age?: number | string;
  mobileNumber?: string;
  phoneVerified?: boolean;
  role: 'user' | 'admin';
  badges: number[]; // Array of milestone badge integers (e.g. [1, 5, 10])
  certificates: string[]; // Array of certificate URLs or IDs
  attendedCampaigns?: string[]; // Array of campaign IDs the user attended
  createdAt: number;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (isOpen: boolean) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchUserProfile = async (user: User) => {
    try {
      // First check admin collection by email
      const adminsRef = collection(db, 'admin');
      const q = query(adminsRef, where('email', '==', user.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const adminDoc = querySnapshot.docs[0];
        const data = adminDoc.data();
        
        setUserProfile({
          ...data,
          docId: adminDoc.id,
          docCollection: 'admin',
          uid: user.uid, // Ensure uid matches the authenticated user
          role: 'admin',
          avatar: data.avatar || user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
          name: data.name || user.displayName || 'Admin',
          badges: data.badges || [],
          certificates: data.certificates || [],
          attendedCampaigns: data.attendedCampaigns || [],
          createdAt: data.createdAt || Date.now(),
        } as UserProfile);
        return;
      }

      // If not an admin, check users collection by uid
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile({
          ...data,
          docId: user.uid,
          docCollection: 'users',
          role: data.role || 'user', // Preserve existing role in case they haven't migrated yet
          badges: data.badges || [],
          certificates: data.certificates || [],
          attendedCampaigns: data.attendedCampaigns || []
        } as UserProfile);
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchUserProfile(currentUser);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    currentUser,
    userProfile,
    isAdmin: userProfile?.role === 'admin',
    loading,
    isAuthModalOpen,
    setIsAuthModalOpen,
    logout,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
