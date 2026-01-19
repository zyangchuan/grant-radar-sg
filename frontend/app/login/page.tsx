"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Search, Sparkles, Target, Zap, ArrowRight, CheckCircle } from "lucide-react";

// Animated step component for the explainer
const ExplainerStep = ({
  icon: Icon,
  title,
  description,
  delay,
  isActive
}: {
  icon: any;
  title: string;
  description: string;
  delay: number;
  isActive: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: isActive ? 1 : 0.3, x: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-500 ${isActive ? 'bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg' : ''
      }`}
  >
    <div className={`p-3 rounded-xl ${isActive ? 'bg-white' : 'bg-white/5'}`}>
      <Icon className={`w-6 h-6 ${isActive ? 'text-black' : 'text-white/50'}`} />
    </div>
    <div className="flex-1">
      <h3 className={`font-semibold mb-1 ${isActive ? 'text-white' : 'text-white/50'}`}>{title}</h3>
      <p className={`text-sm ${isActive ? 'text-white/80' : 'text-white/30'}`}>{description}</p>
    </div>
  </motion.div>
);

// Floating particles background
const FloatingParticle = ({ delay }: { delay: number }) => (
  <motion.div
    className="absolute w-2 h-2 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full opacity-20"
    initial={{
      x: Math.random() * 100 + "%",
      y: "120%",
      scale: Math.random() * 0.5 + 0.5
    }}
    animate={{
      y: "-20%",
      x: `${Math.random() * 100}%`
    }}
    transition={{
      duration: Math.random() * 10 + 15,
      delay,
      repeat: Infinity,
      ease: "linear"
    }}
  />
);

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, hasProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [checkingRedirect, setCheckingRedirect] = useState(true);
  const [isLogout, setIsLogout] = useState(false);

  // Check if user just logged out on mount
  useEffect(() => {
    if (window.location.search.includes('logout=true')) {
      setIsLogout(true);
      // Clear the URL parameter to prevent it from persisting after OAuth redirect
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  const steps = [
    { icon: Search, title: "Describe Your Project", description: "Tell us about your initiative, funding needs, and impact goals" },
    { icon: Sparkles, title: "AI-Powered Matching", description: "Our engine scans 60+ Singapore grants with semantic search" },
    { icon: Target, title: "Get Personalized Results", description: "Receive ranked recommendations with fit scores and insights" },
  ];

  // With popup-based auth, we don't need to check for redirect results
  // Just mark as ready immediately
  useEffect(() => {
    setCheckingRedirect(false);
  }, []);



  // Only redirect if:
  // 1. User exists
  // 2. Auth loading is complete (hasProfile has been checked)
  // 3. Not checking local redirect state
  // 4. Not just logged out
  useEffect(() => {
    // Wait for auth loading to complete before redirecting
    if (authLoading) {
      console.log("[LoginPage] Waiting for auth loading to complete...");
      return;
    }

    if (user && !checkingRedirect && !isLogout) {
      console.log("[LoginPage] Redirecting to / (auth complete, user present, hasProfile:", hasProfile, ")");
      router.push("/");
    } else {
      console.log("[LoginPage] Waiting to redirect:", { user: !!user, authLoading, checkingRedirect, isLogout });
    }
  }, [user, authLoading, hasProfile, router, checkingRedirect, isLogout]);



  // Cycle through steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [steps.length]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      console.log("[LoginPage] Starting popup sign-in...");
      const result = await signInWithPopup(auth, provider);
      console.log("[LoginPage] Popup sign-in success:", result.user?.email);
      // The useAuth hook will automatically update with the user
      // and the useEffect below will handle the redirect
      setIsLogout(false);
    } catch (err: unknown) {
      console.error("[LoginPage] Login failed", err);
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/popup-closed-by-user") {
        // User closed the popup, not really an error
        setError(null);
      } else {
        setError("Failed to sign in with Google. Please try again.");
      }
      setLoading(false);
    }
  };

  // Show a simple loading state while checking for redirect result
  if (checkingRedirect) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (

    <div className="min-h-screen w-full bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden relative">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <FloatingParticle key={i} delay={i * 0.5} />
        ))}
      </div>

      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-[128px] animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gray-400/10 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 px-6 py-12">

        {/* Left side - Animated Explainer */}
        <motion.div
          className="flex-1 max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Logo & Tagline */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              <span className="text-white">
                GrantRadar
              </span>
              <span className="text-gray-500">.sg</span>
            </h1>
            <p className="text-xl text-white/70">
              Find the perfect grant for your initiative in seconds
            </p>
          </motion.div>

          {/* Progress indicator */}
          <div className="flex gap-2 mb-6">
            {steps.map((_, i) => (
              <motion.div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${i === activeStep ? 'bg-white' : 'bg-white/20'
                  }`}
                animate={i === activeStep ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 0.5 }}
              />
            ))}
          </div>

          {/* Animated Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <ExplainerStep
                key={index}
                icon={step.icon}
                title={step.title}
                description={step.description}
                delay={index * 0.15}
                isActive={index === activeStep}
              />
            ))}
          </div>

          {/* Stats */}
          <motion.div
            className="mt-8 flex gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-white">60+</div>
              <div className="text-xs text-white/50">Grants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">$500M+</div>
              <div className="text-xs text-white/50">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">&lt;10s</div>
              <div className="text-xs text-white/50">Search Time</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right side - Login Card */}
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
            {/* Card Header */}
            <div className="text-center mb-8">
              <motion.div
                className="w-16 h-16 mx-auto mb-4 bg-white rounded-2xl flex items-center justify-center"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Zap className="w-8 h-8 text-black" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">Get Started</h2>
              <p className="text-white/60">
                Sign in to discover grants tailored to your organization
              </p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6"
                >
                  <div className="flex items-center gap-2 rounded-xl bg-red-500/20 border border-red-500/30 p-4 text-sm text-red-300">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Google Sign In Button */}
            <motion.button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <motion.div
                  className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full"

                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </>
              )}
            </motion.button>

            {/* Divider */}

          </div>
        </motion.div>
      </div>
    </div>
  );
}
