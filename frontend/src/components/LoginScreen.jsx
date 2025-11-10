import { useState } from 'react';

const BASE_URL = 'http://127.0.0.1:5000';

function LoginScreen({ onLoginSuccess }) {
  const [localUsername, setLocalUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!localUsername || !password) {
      setMessage('Please enter both username and password');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: localUsername, password }),
      });
      const data = await response.json();
      if (data.success) onLoginSuccess(localUsername);
      setMessage(data.message);
    } catch {
      setMessage('Error connecting to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!localUsername || !password) {
      setMessage('Please enter both username and password');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: localUsername, password }),
      });
      const data = await response.json();
      setMessage(data.message);
    } catch {
      setMessage('Error connecting to server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <h2>Welcome</h2>
      <p>Please log in or create an account to continue.</p>
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
      <div className="buttons">
        <button onClick={handleLogin} disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
        <button onClick={handleRegister} disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Account'}
        </button>
      </div>
      {message && <div className="message">{message}</div>}
    </div>
  );
}

export default LoginScreen;
