import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { isConfigured } from './lib/supabase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExpensesProvider } from './context/ExpensesContext';
import RetryScreen from './components/RetryScreen';
import UpdatePrompt from './components/UpdatePrompt';

// Cada pantalla se baja cuando hace falta: quien ya tiene sesión no descarga el login, y al revés.
const AuthScreen = lazy(() => import('./screens/AuthScreen'));
const OnboardingScreen = lazy(() => import('./screens/OnboardingScreen'));
const NewPasswordScreen = lazy(() => import('./screens/NewPasswordScreen'));
const Dashboard = lazy(() => import('./screens/Dashboard'));

const Spinner = () => (
  <div className="flex min-h-dvh items-center justify-center bg-surface">
    <Loader2 size={24} className="animate-spin text-slate-400" />
  </div>
);

/** Sesión → familia → panel. */
function Gate() {
  const { loading, user, membership, membershipError, retryMembership, refreshMembership, recovery } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <AuthScreen />;
  if (recovery) return <NewPasswordScreen />;
  if (membershipError) return <RetryScreen message={membershipError} onRetry={retryMembership} />;
  if (!membership) return <OnboardingScreen />;

  return (
    <ExpensesProvider key={membership.household_id} householdId={membership.household_id} myRole={membership.role} userId={user.id} onMembershipLost={refreshMembership}>
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
      <Suspense fallback={<Spinner />}>
        <Gate />
      </Suspense>
      <UpdatePrompt />
    </AuthProvider>
  );
}
