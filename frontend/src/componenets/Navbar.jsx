import { useState } from 'react';

function Navbar() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!username || !password) {
            setMessage('Please enter both username and password');
            return;
        }

        setIsLoading(true);
        setMessage('');

        try {
            const response = await fetch('http://127.0.0.1:5000/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: username, password: password}),
            });

            const data = await response.json();
            
            if (data.success) {
                setMessage(data.message);
            } else {
                setMessage(data.message);
            }
        } catch (error) {
            setMessage('Error connecting to server. Make sure the backend is running.');
            console.error('Login error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!username || !password) {
            setMessage('Please enter both username and password');
            return;
        }

        setIsLoading(true);
        setMessage('');

        try {
            const response = await fetch('http://127.0.0.1:5000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
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

    return (
        <nav>
            <div className="title">Hardware Project Manager</div>
            <div className="right-section">
                <input 
                    type="text" 
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input 
                    type="password" 
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                    onClick={handleLogin}
                    disabled={isLoading}
                >
                    {isLoading ? 'Logging in...' : 'Login'}
                </button>
                <button
                    onClick={handleRegister}
                    disabled={isLoading}
                >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
                {message && (
                    <div className="message">
                        {message}
                    </div>
                )}
            </div>
        </nav>
    );
}

export default Navbar;