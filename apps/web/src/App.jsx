import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AppLayout from './components/Layout/AppLayout';
import Navbar from './components/Navbar/Navbar';
import Toast from './components/common/Toast';
import HomePage from './pages/Home/HomePage';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { ChatRuntimeProvider } from './contexts/ChatRuntimeContext';
import { mountFrameworkPlaybookSignals } from './config/frameworkPlaybook';

const ChatPage = lazy(() => import('./pages/Chat/ChatPage'));
const AuthPage = lazy(() => import('./pages/Auth/AuthPage'));
const SetPasswordPage = lazy(() => import('./pages/Auth/SetPasswordPage'));
const KnowledgeReviewPage = lazy(() => import('./pages/Admin/KnowledgeReviewPage'));
const ProbabilityPreview = lazy(() => import('./pages/Dev/ProbabilityPreview'));

const GOOGLE_CLIENT_ID = '59540883835-shhhvumlokiqd24eb2jnjq7o6dt9rohk.apps.googleusercontent.com';

function RouteFallback() {
  return (
    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
      页面加载中...
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<RouteFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route path="/dev/probability" element={<ProbabilityPreview />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:type" element={<ChatPage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />
            {/* Admin route is auth-protected; role-based guard can be added later */}
            <Route path="/admin/knowledge/review" element={<KnowledgeReviewPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function App() {
  useEffect(() => {
    mountFrameworkPlaybookSignals();
  }, []);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <AuthProvider>
          <ChatRuntimeProvider>
            <div className="h-screen flex flex-col overflow-hidden">
              <Navbar />
              <AppLayout>
                <AnimatedRoutes />
              </AppLayout>
            </div>
            <Toast />
          </ChatRuntimeProvider>
        </AuthProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
