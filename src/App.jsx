import { Loader2 } from 'lucide-react';
import { isConfigured } from './lib/supabase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExpensesProvider } from './context/ExpensesContext';
import AuthScreen from './screens/AuthScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import Dashboard from './screens/Dashboard';
import RetryScreen from './components/RetryScreen';

/** Sesión → familia → panel. */
function Gate() {
  const { loading, user, membership, membershipError, retryMembership } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }
  if (!user) return <AuthScreen />;
  if (membershipError) return <RetryScreen message={membershipError} onRetry={retryMembership} />;
  if (!membership) return <OnboardingScreen />;

  return (
    <ExpensesProvider key={membership.household_id} householdId={membership.household_id} myRole={membership.role} userId={user.id}>
      <Dashboard />
    </ExpensesProvider>
  );
}

export default function App() {
  if (!isConfigured) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface px-6 text-center text-[13px] text-slate-600">
        Falta configurar Supabase: definí SUPABASE_URL y SUPABASE_ANON_KEY (ver README).
      </div>
    );
  }
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
