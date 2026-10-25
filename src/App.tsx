import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Library from './screens/Library/Library';
import Reader from './screens/Reader/Reader';
import Knowledge from './screens/Knowledge/Knowledge';
import Settings from './screens/Settings/Settings';

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/read/:documentId" element={<Reader />} />
        <Route path="/reader/:documentId" element={<Reader />} />
        <Route path="/knowledge" element={<Knowledge />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  );
}
