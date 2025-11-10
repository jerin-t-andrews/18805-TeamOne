import { useState } from 'react';

const BASE_URL = 'http://127.0.0.1:5000';

function Navbar({ onLoginSuccess, onLogout, isAuthenticated, username }) {
  const [localUsername, setLocalUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const uname = localUsername.trim();
    if (!uname || !password) {
      setMessage('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname, password }),
      });
      const data = await response.json();
      if (data.success) {
        setMessage(data.message);
        onLoginSuccess?.(uname);
      } else {
        setMessage(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage('Error connecting to server. Make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    const uname = localUsername.trim();
    if (!uname || !password) {
      setMessage('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname, password }),
      });
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      console.error('Register error:', error);
      setMessage('Error connecting to server. Make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const doLogout = () => {
    onLogout?.();
    setLocalUsername('');
    setPassword('');
    setMessage('');
  };

  return (
    <nav>
      <div className="title">Hardware Project Manager</div>
      <div className="right-section">
        {isAuthenticated ? (
          <>
            <span>Signed in as <strong>{username}</strong></span>
            <button onClick={doLogout}>Logout</button>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Username"
              value={localUsername}
              onChange={(e) => setLocalUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={handleLogin} disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
            <button onClick={handleRegister} disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </>
        )}
        {message && <div className="message">{message}</div>}
      </div>
    </nav>
  );
}

export default Navbar;

