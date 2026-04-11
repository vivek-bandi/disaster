import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Dashboard/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import VolunteersPage from './pages/VolunteersPage';
import SheltersPage from './pages/SheltersPage';
import HelpRequestsPage from './pages/HelpRequestsPage';
import PredictionsPage from './pages/PredictionsPage';
import ResourcesPage from './pages/ResourcesPage';
import AdminPage from './pages/AdminPage';
import AlertsPage from './pages/AlertsPage';
import ProfilePage from './pages/ProfilePage';
import MapPage from './pages/MapPage';
import SafetyAdvisoryPage from './pages/SafetyAdvisoryPage';
import ResourceAllocationPage from './pages/ResourceAllocationPage';
import SettingsPage from './pages/SettingsPage';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-surface-50 dark:bg-[#070b14]">
      <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"   element={<DashboardPage />} />
          <Route path="map"         element={<MapPage />} />
          <Route path="incidents"   element={<IncidentsPage />} />
          <Route path="volunteers"  element={<ProtectedRoute roles={['volunteer','admin']}><VolunteersPage /></ProtectedRoute>} />
          <Route path="shelters"    element={<SheltersPage />} />
          <Route path="help-requests" element={<HelpRequestsPage />} />
          <Route path="predictions" element={<PredictionsPage />} />
          <Route path="safety"      element={<SafetyAdvisoryPage />} />
          <Route path="resources"   element={<ResourcesPage />} />
          <Route path="allocate"    element={<ProtectedRoute roles={['admin']}><ResourceAllocationPage /></ProtectedRoute>} />
          <Route path="alerts"      element={<AlertsPage />} />
          <Route path="admin"       element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />
          <Route path="profile"     element={<ProfilePage />} />
          <Route path="settings"    element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
