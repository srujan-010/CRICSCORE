import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="container">

        {/* LEFT SIDE */}
        <div className="left">
          <div className="overlay"></div>

          <div className="left-content">
            <h1>LIVE CRICKET <span>SCORING</span></h1>
            <p>Real-time match updates, creator controls, and seamless scoring experience.</p>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="right">
          <div className="card">

            <h2>Login</h2>
            <p className="subtitle">Welcome back to CricScore</p>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#ef4444', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '14px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <input 
                type="text" 
                placeholder="Enter username" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
              <div className="password-group">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Enter password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="toggle-password" 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "👁️‍🗨️" : "👁️"}
                </button>
              </div>

              <button type="submit">Login</button>
            </form>

            <p className="signup">Don't have an account? <Link to="/signup">Sign up</Link></p>

          </div>
        </div>

      </div>
    </div>
  );
}
