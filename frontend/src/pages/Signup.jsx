import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Signup.css';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signup } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signup(username, password, 'User'); // Defaulting to User, everyone can create but only owners can edit
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    }
  };

  return (
    <div className="signup-wrapper">
      <div className="container">

        {/* LEFT SIDE */}
        <div className="left">
          <div className="overlay"></div>

          <div className="left-content">
            <h1>JOIN <span>CRICSCORE</span></h1>
            <p>Create your account and start scoring live matches with your friends.</p>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="right">
          <div className="card">

            <h2>Sign Up</h2>
            <p className="subtitle">Create your account</p>

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
              <input 
                type="password" 
                placeholder="Enter password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />

              <button type="submit">Sign Up</button>
            </form>

            <p className="login-link">
              Already have an account? <Link to="/login">Login</Link>
            </p>

          </div>
        </div>

      </div>
    </div>
  );
}
