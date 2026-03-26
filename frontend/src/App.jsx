import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import LiveMatch from './pages/LiveMatch';

const PrivateRoute = ({ children }) => {
  const { user, loading } = React.useContext(AuthContext);
  
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#020617', color: '#a3e635' }}>
      <div className="animate-pulse font-bold text-xl">AUTHENTICATING...</div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" />;
  return children;
};

const AdminRedirect = () => {
  const { id } = React.useRouterDom ? React.useRouterDom.useParams() : { id: '' }; // Just import useParams
  // better:
  return <Navigate to={`/match/${window.location.pathname.split('/').pop()}`} replace />;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/match/:id" element={<PrivateRoute><LiveMatch /></PrivateRoute>} />
            <Route path="/admin/match/:id" element={<Navigate to={`/match/${window.location.pathname.split('/').pop()}`} replace />} />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
