import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ProfileProvider } from '@/lib/ProfileContext';
import BrandLoader from '@/components/thiscord/BrandLoader';
// Add page imports here
import Login from '@/pages/Login';
import ThisCord from '@/pages/ThisCord';

const Shop = lazy(() => import('@/pages/Shop'));
const Games = lazy(() => import('@/pages/Games'));
const GamePlayer = lazy(() => import('@/pages/GamePlayer'));
const Admin = lazy(() => import('@/pages/Admin'));
const Leaderboard = lazy(() => import('@/pages/Leaderboard'));
const Appearance = lazy(() => import('@/pages/Appearance'));
const Friends = lazy(() => import('@/pages/Friends'));
const UserSettings = lazy(() => import('@/pages/UserSettings'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingAuth) {
    return <BrandLoader label="booting this-cord" />;
  }

  if (authError?.type === 'device_banned') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Device banned</h1>
        <p className="max-w-sm text-sm text-muted-foreground">This device has been banned from This-Cord.</p>
      </div>
    );
  }

  // Render the main app
  return (
    <Suspense fallback={<BrandLoader label="loading" />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<ProfileProvider />}>
          <Route path="/" element={<ThisCord />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/:gameId" element={<GamePlayer />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/appearance" element={<Appearance />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/settings" element={<UserSettings />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App