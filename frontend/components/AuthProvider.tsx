"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

import { getOrganization } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  hasProfile: boolean | null; // null means not checked yet
  checkProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  hasProfile: null,
  checkProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const checkProfile = async () => {
    if (!user) return;
    try {
        const org = await getOrganization();
        setHasProfile(!!org);
    } catch (e) {
        console.error("Failed to check profile", e);
        // keep previous state or set false? Safe to keep previous if error is transient
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
            const org = await getOrganization();
            setHasProfile(!!org);
        } catch (e) {
            console.error("Failed to check profile", e);
            setHasProfile(false);
        }
      } else {
        setHasProfile(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, hasProfile, checkProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
