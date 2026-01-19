"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

import { getOrganization } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  hasProfile: boolean | null; // null means not checked yet
  checkProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  hasProfile: null,
  checkProfile: async () => { },
  logout: async () => { },
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
    }
  };

  const logout = async () => {
    try {
      console.log("Logging out...");
      await signOut(auth);
      console.log("Sign out successful");
      setUser(null);
      setHasProfile(null);
    } catch (e) {
      console.error("Failed to sign out", e);
      throw e;
    }
  };


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("[AuthProvider] onAuthStateChanged fired:", currentUser?.email);

      // Important: Keep loading=true until we've completed all checks
      setUser(currentUser);

      if (currentUser) {
        console.log("[AuthProvider] User authenticated, checking for profile...");
        try {
          const org = await getOrganization(currentUser);
          console.log("[AuthProvider] getOrganization result:", !!org);
          setHasProfile(!!org);
        } catch (e) {
          console.error("[AuthProvider] Failed to check profile:", e);
          setHasProfile(false);
        }
      } else {
        // No user - reset profile state
        setHasProfile(null);
      }

      // Only set loading to false AFTER all async operations complete
      setLoading(false);
      console.log("[AuthProvider] loading set to false, hasProfile =", hasProfile);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, hasProfile, checkProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
