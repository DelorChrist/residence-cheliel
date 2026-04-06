import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ClientHome } from './pages/ClientHome';
import { AdminDashboard } from './pages/AdminDashboard';
import { ChambresPage } from './pages/ChambresPage';
import { ChambreDetail } from './pages/ChambreDetail';
import { AProposPage } from './pages/AProposPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ClientHome />} />
        <Route path="/chambres" element={<ChambresPage />} />
        <Route path="/chambres/:id" element={<ChambreDetail />} />
        <Route path="/a-propos" element={<AProposPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
