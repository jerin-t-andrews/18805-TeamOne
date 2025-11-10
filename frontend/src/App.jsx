import { useState } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import ProjectsPanel from './components/ProjectsPanel';
import HardwarePanel from './components/HardwarePanel';
import LoginScreen from './components/LoginScreen';

function App() {
  const [username, setUsername] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const handleLoginSuccess = (uname) => {
    setUsername(uname);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername(null);
    setSelectedProjectId('');
  };

  return (
    <>
      <Navbar onLogout={handleLogout} isAuthenticated={isAuthenticated} username={username} />
      <div className="content">
        {isAuthenticated ? (
          <div className="panels">
            <ProjectsPanel
              username={username}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
            />
            <HardwarePanel selectedProjectId={selectedProjectId} username={username} />
          </div>
        ) : (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        )}
      </div>
    </>
  );
}

export default App;
