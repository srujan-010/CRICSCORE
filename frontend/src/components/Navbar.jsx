import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="w-full bg-[#0B1121] px-8 py-5 flex justify-between items-center border-b border-white/5 sticky top-0 z-50">
      <Link to="/" className="text-2xl font-black font-display tracking-wider flex items-center">
        <span className="text-white">CRIC</span><span className="text-lime">SCORE</span>
      </Link>
      
      <div>
        {user ? (
          <div className="flex items-center gap-6">
            <span className="text-gray-400 text-sm flex items-center gap-2">
              Logged in as: <strong className="text-white font-medium">{user.username}</strong> 
              <span className="text-[10px] bg-lime/10 text-lime px-2 py-0.5 rounded border border-lime/30 font-bold tracking-widest uppercase">
                {user.role}
              </span>
            </span>
            <button onClick={handleLogout} className="bg-[#1C253B] hover:bg-[#2A3756] border border-white/5 text-gray-300 text-sm font-bold uppercase tracking-wider py-2 px-6 rounded-full transition shadow-inner">
              Logout
            </button>
          </div>
        ) : (
          <div className="flex gap-4">
            <Link to="/login" className="text-white hover:text-lime transition font-bold text-sm uppercase tracking-wider">Login</Link>
            <Link to="/signup" className="text-lime hover:text-white transition font-bold text-sm uppercase tracking-wider">Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
