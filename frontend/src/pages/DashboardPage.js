import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import CitizenDashboard from '../components/Dashboard/CitizenDashboard';
import VolunteerDashboard from '../components/Dashboard/VolunteerDashboard';
import AdminDashboard from '../components/Dashboard/AdminDashboard';

// Each role gets a completely different dashboard on login
export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === 'citizen')   return <CitizenDashboard />;
  if (user?.role === 'volunteer') return <VolunteerDashboard />;
  if (user?.role === 'admin')     return <AdminDashboard />;

  return null;
}
