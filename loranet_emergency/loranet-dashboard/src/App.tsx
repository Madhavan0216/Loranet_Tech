import { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ToastContainer from './components/ToastContainer';

import Overview from './pages/Overview';
import LiveMap from './pages/LiveMap';
import MeshNetwork from './pages/MeshNetwork';
import EmergencyAlerts from './pages/EmergencyAlerts';
import Devices from './pages/Devices';
import Messages from './pages/Messages';
import Settings from './pages/Settings';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AppProvider>
      <HashRouter>
        <div className="min-h-screen bg-bg text-txt flex">
          {/* Persistent / Responsive Sidebar */}
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main Layout Area */}
          <div className="flex-1 md:ml-[220px] flex flex-col min-h-screen min-w-0">
            <Header onMenuClick={() => setSidebarOpen(true)} />

            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/map" element={<LiveMap />} />
                <Route path="/mesh" element={<MeshNetwork />} />
                <Route path="/alerts" element={<EmergencyAlerts />} />
                <Route path="/devices" element={<Devices />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>

          {/* Toast Notification Layer */}
          <ToastContainer />
        </div>
      </HashRouter>
    </AppProvider>
  );
}
