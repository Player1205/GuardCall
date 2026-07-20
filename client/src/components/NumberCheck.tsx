import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/useSessionStore';
import { checkCommunityDB } from '../services/api';
import {
  ShieldCheck,
  Phone,
  ArrowRight,
  AlertTriangle,
  Users,
  IndianRupee,
  ScanSearch,
  Cpu,
  FileText,
  Shield,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Floating Particles Background ─── */

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

function ParticlesBackground() {
  const particles: Particle[] = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 8 + 6,
        delay: Math.random() * 4,
      })),
    []
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/[0.04] blur-[80px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/[0.03] blur-[60px]" />
    </div>
  );
}

/* ─── Stat Card ─── */

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  delay: number;
}

function StatCard({ icon, value, label, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2, scale: 1.03 }}
      className="glass-card p-3 flex flex-col items-center gap-1.5 flex-1 min-w-0"
    >
      <div className="text-primary/80">{icon}</div>
      <p className="text-sm font-bold text-textMain tracking-tight">{value}</p>
      <p className="text-[10px] text-textMain/50 text-center leading-tight">{label}</p>
    </motion.div>
  );
}

/* ─── Feature Pill ─── */

interface FeaturePillProps {
  icon: React.ReactNode;
  label: string;
  delay: number;
}

function FeaturePill({ icon, label, delay }: FeaturePillProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-textMain/60"
    >
      {icon}
      <span className="text-[11px] font-medium whitespace-nowrap">{label}</span>
    </motion.div>
  );
}

/* ─── Main Component ─── */

const NumberCheck: React.FC = () => {
  const { callerNumber, setCallerNumber } = useSessionStore();
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<{
    message: string;
    reportsCount: number;
  } | null>(null);
  const navigate = useNavigate();

  const isValidNumber = callerNumber.replace(/\D/g, '').length >= 10;

  const handleCheck = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValidNumber) return;

      setLoading(true);
      try {
        const result = await checkCommunityDB(callerNumber);
        if (result.flagged) {
          setWarning({
            message: `This number has been reported ${result.reportsCount} time${result.reportsCount !== 1 ? 's' : ''} for suspicious activity.`,
            reportsCount: result.reportsCount,
          });
        } else {
          navigate('/consent');
        }
      } finally {
        setLoading(false);
      }
    },
    [callerNumber, isValidNumber, navigate]
  );

  const handleProceed = useCallback(() => {
    navigate('/consent');
  }, [navigate]);

  /* ─── Container Animations ─── */
  const containerVariants: import('framer-motion').Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const itemVariants: import('framer-motion').Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  return (
    <div className="min-h-dvh relative flex flex-col items-center">

      <div className="animated-grid-bg" />
      <ParticlesBackground />


      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-lg mx-auto px-5 py-8 flex flex-col items-center gap-6"
      >
        {/* ─── Hero Section ─── */}
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-3 pt-4">

          <motion.div
            className="relative"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 animate-pulse-glow" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-24 h-24 rounded-full border border-primary/20"
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <ShieldCheck className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
          </motion.div>


          <h1 className="text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary via-primary-light to-emerald-300 bg-clip-text text-transparent">
              Guard
            </span>
            <span className="text-textMain">Call</span>
          </h1>
          <p className="text-textMain/50 text-sm font-medium tracking-wide">
            AI-Powered Scam Protection
          </p>
        </motion.div>

        {/* ─── Stats Row ─── */}
        <motion.div variants={itemVariants} className="w-full flex gap-3">
          <StatCard
            icon={<Users className="w-4 h-4" />}
            value="10,000+"
            label="Users Protected"
            delay={0.3}
          />
          <StatCard
            icon={<IndianRupee className="w-4 h-4" />}
            value="₹2.5Cr"
            label="Savings Shielded"
            delay={0.45}
          />
          <StatCard
            icon={<ScanSearch className="w-4 h-4" />}
            value="50,000+"
            label="Scams Detected"
            delay={0.6}
          />
        </motion.div>

        {/* ─── Phone Input ─── */}
        <motion.div
          variants={itemVariants}
          className="w-full glass-card-strong p-5 gradient-border"
        >
          <form onSubmit={handleCheck} className="flex flex-col gap-4">
            <label className="text-sm font-medium text-textMain/70">
              Enter the caller&apos;s number
            </label>


            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center pointer-events-none">
                <Phone className="w-4 h-4 text-primary/60" />
              </div>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-textMain placeholder:text-textMain/25 focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all duration-200 text-base font-medium tracking-wide"
                value={callerNumber}
                onChange={(e) => {
                  const val = e.target.value;
                  const hasPlus = val.startsWith('+');
                  let digits = val.replace(/\D/g, '');
                  
                  let formatted = '';
                  if (hasPlus && digits.startsWith('91')) {
                    const country = digits.slice(0, 2);
                    const p1 = digits.slice(2, 7);
                    const p2 = digits.slice(7, 12);
                    formatted = `+${country}`;
                    if (p1) formatted += ` ${p1}`;
                    if (p2) formatted += ` ${p2}`;
                  } else {
                    if (digits.length > 10) digits = digits.slice(0, 10);
                    if (digits.length > 5) {
                      formatted = `${digits.slice(0, 5)} ${digits.slice(5)}`;
                    } else {
                      formatted = digits;
                    }
                  }
                  
                  setCallerNumber(formatted || val);
                }}
                required
              />
            </div>


            <AnimatePresence mode="wait">
              {!warning && (
                <motion.button
                  key="check-btn"
                  type="submit"
                  disabled={loading || !isValidNumber}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.01 }}
                  className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                    isValidNumber && !loading
                      ? 'bg-gradient-to-r from-primary to-emerald-500 text-white shadow-lg shadow-primary/20 hover:shadow-primary/30'
                      : 'bg-white/[0.06] text-textMain/30 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking Database...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Check &amp; Protect</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </form>
        </motion.div>

        {/* ─── Community Warning Card ─── */}
        <AnimatePresence>
          {warning && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="w-full rounded-2xl p-[1px] animate-pulse-glow-danger"
              style={{
                background:
                  'linear-gradient(135deg, rgba(226,75,74,0.6), rgba(226,75,74,0.15), rgba(226,75,74,0.6))',
              }}
            >
              <div className="rounded-2xl bg-[#1a1020] p-5 flex flex-col gap-4">

                <div className="flex items-start gap-3">
                  <motion.div
                    animate={{ rotate: [0, -8, 8, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                    className="w-10 h-10 rounded-xl bg-danger/20 flex items-center justify-center flex-shrink-0"
                  >
                    <AlertTriangle className="w-5 h-5 text-danger" />
                  </motion.div>
                  <div>
                    <h3 className="text-danger font-semibold text-sm mb-1">
                      Community Warning
                    </h3>
                    <p className="text-textMain/70 text-xs leading-relaxed">
                      {warning.message}
                    </p>
                  </div>
                </div>


                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-full bg-danger/15 border border-danger/20 text-danger text-xs font-semibold">
                    {warning.reportsCount} report{warning.reportsCount !== 1 ? 's' : ''}
                  </div>
                  <span className="text-textMain/40 text-xs">from community members</span>
                </div>


                <motion.button
                  onClick={handleProceed}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.01 }}
                  className="w-full py-3 rounded-xl bg-danger hover:bg-danger/90 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-danger/20"
                >
                  <Shield className="w-4 h-4" />
                  Proceed with Protection
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Feature Pills ─── */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-2 pt-2 pb-4"
        >
          <FeaturePill
            icon={<Cpu className="w-3 h-3" />}
            label="Real-time AI"
            delay={0.7}
          />
          <FeaturePill
            icon={<FileText className="w-3 h-3" />}
            label="Auto Reports"
            delay={0.8}
          />
          <FeaturePill
            icon={<Shield className="w-3 h-3" />}
            label="Community Shield"
            delay={0.9}
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NumberCheck;
