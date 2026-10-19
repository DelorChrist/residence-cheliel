import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ClientHome } from './pages/ClientHome';

const ChambresPage = lazy(() => import('./pages/ChambresPage').then(m => ({ default: m.ChambresPage })));
const ChambreDetail = lazy(() => import('./pages/ChambreDetail').then(m => ({ default: m.ChambreDetail })));
const AProposPage = lazy(() => import('./pages/AProposPage').then(m => ({ default: m.AProposPage })));
const MesReservationsPage = lazy(() => import('./pages/MesReservationsPage').then(m => ({ default: m.MesReservationsPage })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

const PageLoader = () => (
  <div className="min-h-screen bg-[#faf9f8] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<ClientHome />} />
          <Route path="/chambres" element={<ChambresPage />} />
          <Route path="/chambres/:id" element={<ChambreDetail />} />
          <Route path="/a-propos" element={<AProposPage />} />
          <Route path="/mes-reservations" element={<MesReservationsPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
