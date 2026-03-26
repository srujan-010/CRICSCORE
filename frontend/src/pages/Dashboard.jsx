import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [overs, setOvers] = useState(20);
  const [totalWickets, setTotalWickets] = useState(10);
  const [wideRuns, setWideRuns] = useState(1);
  const [noBallRuns, setNoBallRuns] = useState(1);
  const [battingChoice, setBattingChoice] = useState('A');
  const [addPlayers, setAddPlayers] = useState(false);
  const [teamAPlayerNames, setTeamAPlayerNames] = useState(Array(11).fill(''));
  const [teamBPlayerNames, setTeamBPlayerNames] = useState(Array(11).fill(''));

  useEffect(() => {
    if (token) fetchMatches();
  }, [token]);

  const fetchMatches = async () => {
    if (!token) return;
    try {
      const res = await axios.get('http://localhost:5000/api/match', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMatches(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        teamA, teamB, totalOvers: Number(overs), totalWickets: Number(totalWickets) - 1, wideRuns: Number(wideRuns), noBallRuns: Number(noBallRuns),
        battingFirst: battingChoice === 'A' ? teamA : teamB
      };
      if (addPlayers) {
        payload.teamAPlayers = teamAPlayerNames.filter(name => name.trim() !== '');
        payload.teamBPlayers = teamBPlayerNames.filter(name => name.trim() !== '');
      }
      await axios.post('http://localhost:5000/api/match/create', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsModalOpen(false);
      setTeamA(''); setTeamB(''); setOvers(20); setTotalWickets(10); setWideRuns(1); setNoBallRuns(1); setBattingChoice('A');
      setAddPlayers(false);
      setTeamAPlayerNames(Array(11).fill(''));
      setTeamBPlayerNames(Array(11).fill(''));
      fetchMatches();
    } catch (err) {
      console.error('Create error:', err.response?.data || err);
      alert('Failed to create match: ' + (err.response?.data?.error || 'Server error'));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteMatch = async (id) => {
    if (!window.confirm('Are you sure you want to delete this match permanently?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/match/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMatches();
    } catch (err) {
      console.error(err);
      alert('Failed to delete match');
    }
  };

  const handleViewDetails = (match) => {
    navigate(`/match/${match._id}`);
  };

  if (loading) return <div style={{color:'white', textAlign:'center', marginTop:'50px'}}>Loading Matches...</div>;

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard">

        {/* HEADER */}
        <div className="header">
          <h2>CRICSCORE</h2>

          <div className="user">
            Logged in as: <span>{user?.username || 'Guest'}</span>
            <button className="logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {/* TITLE + BUTTON */}
        <div className="top-bar">
          <div>
            <h1>MY MATCHES</h1>
            <p>Manage your hosted cricket matches</p>
          </div>

          {user && (
            <button className="create-btn" onClick={() => setIsModalOpen(true)}>+ Create Match</button>
          )}
        </div>

        {/* MATCH LIST */}
        <div className="matches">

          {matches.length === 0 ? (
            <div className="empty">
              No matches found. Create one to get started!
            </div>
          ) : (
            matches.map(match => {
              const runRate = match.score.overs > 0 ? (match.score.runs / match.score.overs).toFixed(2) : '0.00';
              return (
                <div className="card" key={match._id}>
                  {match.status === 'Live' && <div className="live">LIVE</div>}

                  <h3>{match.teamA} vs {match.teamB}</h3>
                  <p>{match.totalOvers} Overs Match</p>

                  <div className="score">{match.score.runs}/{match.score.wickets}</div>
                  <div className="details">{match.score.overs} overs | RR: {runRate}</div>

                  <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                    <button onClick={() => handleViewDetails(match)} style={{margin: 0, flex: 1}}>View Details →</button>
                    {match.createdBy === user?.id && (
                      <button onClick={() => handleDeleteMatch(match._id)} style={{margin: 0, background: '#7f1d1d', width: 'auto'}} title="Delete Match">
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

        </div>

      </div>

      {/* CREATE MATCH MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2 style={{marginBottom: '20px', color: 'white'}}>Create Match</h2>
            <form onSubmit={handleCreateMatch}>
              <p style={{fontSize:'12px', color:'#9ca3af', marginBottom:'5px', textTransform: 'uppercase', fontWeight: 600}}>Team A</p>
              <input required type="text" value={teamA} onChange={e=>setTeamA(e.target.value)} placeholder="Enter Team A"/>
              
              <p style={{fontSize:'12px', color:'#9ca3af', marginBottom:'5px', textTransform: 'uppercase', fontWeight: 600}}>Team B</p>
              <input required type="text" value={teamB} onChange={e=>setTeamB(e.target.value)} placeholder="Enter Team B"/>
              
              <p style={{fontSize:'12px', color:'#9ca3af', marginBottom:'5px', textTransform: 'uppercase', fontWeight: 600}}>Batting First</p>
              <select style={{width: '100%', padding: '12px', borderRadius: '10px', background: '#020617', color: 'white', border: '1px solid #374151', outline: 'none', marginBottom: '15px'}} value={battingChoice} onChange={e=>setBattingChoice(e.target.value)}>
                <option value="A">Team A {teamA ? `(${teamA})` : ''}</option>
                <option value="B">Team B {teamB ? `(${teamB})` : ''}</option>
              </select>

              <p style={{fontSize:'12px', color:'#9ca3af', marginBottom:'5px', textTransform: 'uppercase', fontWeight: 600}}>Total Overs</p>
              <input required type="number" min="1" max="50" value={overs} onChange={e=>setOvers(e.target.value)}/>
              
              <p style={{fontSize:'12px', color:'#9ca3af', marginBottom:'5px', textTransform: 'uppercase', fontWeight: 600}}>Players per Team</p>
              <input required type="number" min="2" max="12" value={totalWickets} onChange={e=>setTotalWickets(e.target.value)}/>
              
              <div style={{ margin: '20px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={addPlayers} onChange={e => setAddPlayers(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                  Do you want to add player names now?
                </label>
              </div>

              {addPlayers && (
                <div className="players-input-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', maxHeight: '300px', overflowY: 'auto', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#a3e635', marginBottom: '10px', fontWeight: 'bold' }}>TEAM A PLAYERS</p>
                    {Array.from({ length: Number(totalWickets) }).map((_, i) => (
                      <input 
                        key={i} 
                        type="text" 
                        placeholder={`Player ${i + 1}`} 
                        value={teamAPlayerNames[i] || ''} 
                        onChange={e => {
                          const newNames = [...teamAPlayerNames];
                          newNames[i] = e.target.value;
                          setTeamAPlayerNames(newNames);
                        }}
                        style={{ marginBottom: '8px', padding: '8px' }}
                      />
                    ))}
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#a3e635', marginBottom: '10px', fontWeight: 'bold' }}>TEAM B PLAYERS</p>
                    {Array.from({ length: Number(totalWickets) }).map((_, i) => (
                      <input 
                        key={i} 
                        type="text" 
                        placeholder={`Player ${i + 1}`} 
                        value={teamBPlayerNames[i] || ''} 
                        onChange={e => {
                          const newNames = [...teamBPlayerNames];
                          newNames[i] = e.target.value;
                          setTeamBPlayerNames(newNames);
                        }}
                        style={{ marginBottom: '8px', padding: '8px' }}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              <div className="modal-row" style={{ marginTop: '20px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{flex: 1, padding:'12px', background:'#1f2937', color:'white', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight: 'bold'}}>Cancel</button>
                <button type="submit" className="create-btn" style={{flex: 1}}>Create Match</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
