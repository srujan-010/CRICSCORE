import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import ShareModal from '../components/ShareModal';
import './LiveMatch.css';

export default function LiveMatch() {
  const { id } = useParams();
  const socket = useContext(SocketContext);
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({});
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerTeam, setNewPlayerTeam] = useState('A'); // New state for team selection
  const [isPlayerSelectOpen, setIsPlayerSelectOpen] = useState(false);
  const [selectingRole, setSelectingRole] = useState(null); // 'striker', 'nonStriker', 'bowler'
  const [isShareOpen, setIsShareOpen] = useState(false);

  const openSettings = () => {
    setSettings({
      teamA: match.teamA,
      teamB: match.teamB,
      totalOvers: match.totalOvers,
      totalWickets: match.totalWickets || 10,
      wideRuns: match.wideRuns !== undefined ? match.wideRuns : 1,
      noBallRuns: match.noBallRuns !== undefined ? match.noBallRuns : 1,
      battingFirst: match.battingFirst || match.teamA
    });
    setIsSettingsOpen(true);
  };

  useEffect(() => {
    // Initial fetch
    axios.get(`${import.meta.env.VITE_API_URL}/api/match/${id}`)
      .then(res => setMatch(res.data))
      .catch(err => console.error(err));

    if (socket) {
      socket.emit('joinMatch', id);
      socket.on('scoreUpdated', (updatedMatch) => {
        setMatch(updatedMatch);
      });
      socket.on('matchDeleted', () => {
        alert("This match was deleted by an Admin.");
        navigate('/dashboard');
      });
    }

    return () => {
      if (socket) {
        socket.off('scoreUpdated');
        socket.off('matchDeleted');
      }
    };
  }, [id, socket, navigate]);

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    
    // Determine which team list to update
    const isTeamA = newPlayerTeam === 'A';
    const updatedTeamAPlayers = isTeamA ? [...match.teamAPlayers, newPlayerName] : match.teamAPlayers;
    const updatedTeamBPlayers = !isTeamA ? [...match.teamBPlayers, newPlayerName] : match.teamBPlayers;

    const currentScore = { 
      ...match.score,
      players: match.score.players ? [...match.score.players, {
        name: newPlayerName,
        runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false,
        overs: 0, bowlingRuns: 0, wickets: 0, maidens: 0
      }] : [{
        name: newPlayerName,
        runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false,
        overs: 0, bowlingRuns: 0, wickets: 0, maidens: 0
      }]
    };

    // We need to tell the server to update rosters too
    socket.emit('updateScore', { 
        matchId: id, 
        token, 
        update: currentScore,
        teamAPlayers: updatedTeamAPlayers,
        teamBPlayers: updatedTeamBPlayers
    });

    setNewPlayerName('');
    setIsAddPlayerOpen(false);
  };

  const selectPlayerForRole = (playerName) => {
    const currentScore = { 
        ...match.score,
        players: match.score.players ? [...match.score.players] : []
    };
    
    // Ensure player exists in active players list
    let playerObj = currentScore.players.find(p => p.name === playerName);
    if (!playerObj) {
      playerObj = {
        name: playerName,
        runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false,
        overs: 0, bowlingRuns: 0, wickets: 0, maidens: 0
      };
      currentScore.players.push(playerObj);
    }

    if (selectingRole === 'striker') currentScore.striker = playerName;
    if (selectingRole === 'nonStriker') currentScore.nonStriker = playerName;
    if (selectingRole === 'bowler') currentScore.bowler = playerName;
    
    socket.emit('updateScore', { matchId: id, token, update: currentScore });
    setIsPlayerSelectOpen(false);
    setSelectingRole(null);
  };

  const hasPlayers = (match?.teamAPlayers?.length > 0 || match?.teamBPlayers?.length > 0);

  const updateScore = (type, value) => {
    if (!match || match.status === 'Completed') return;

    // MANDATORY PLAYER SELECTION CHECK
    if (type !== 'reset' && hasPlayers) {
      const missing = [];
      if (!match.score.striker) missing.push('Striker');
      if (!match.score.nonStriker) missing.push('Non-Striker');
      if (!match.score.bowler) missing.push('Bowler');
      
      if (missing.length > 0) {
        return;
      }
    }
    
    const currentScore = { 
      ...match.score,
      overs: Math.floor(match.score.overs || 0),
      balls: Math.floor(match.score.balls || 0),
      players: match.score.players ? JSON.parse(JSON.stringify(match.score.players)) : [],
      striker: match.score.striker || '',
      nonStriker: match.score.nonStriker || '',
      bowler: match.score.bowler || ''
    };
    if (!currentScore.thisOver) currentScore.thisOver = [];

    const striker = currentScore.players.find(p => p.name === currentScore.striker);
    const bowler = currentScore.players.find(p => p.name === currentScore.bowler);

    if (type === 'runs') {
      currentScore.runs += value;
      currentScore.thisOver.push(value.toString());
      if (striker) {
        striker.runs += value;
        striker.balls += 1;
        if (value === 4) striker.fours += 1;
        if (value === 6) striker.sixes += 1;
      }
      // Strike rotation
      if (value % 2 !== 0) {
        const temp = currentScore.striker;
        currentScore.striker = currentScore.nonStriker;
        currentScore.nonStriker = temp;
      }
    } else if (type === 'dot') {
      currentScore.thisOver.push('0');
      if (striker) striker.balls += 1;
    } else if (type === 'wicket') {
      currentScore.wickets += 1;
      currentScore.thisOver.push('W');
      if (striker) {
        striker.balls += 1;
        striker.isOut = true;
      }
      if (bowler) bowler.wickets += 1;
      currentScore.striker = ''; // Need to select new batsman
    } else if (type === 'wide') {
      currentScore.runs += (match.wideRuns !== undefined ? match.wideRuns : 1);
      currentScore.thisOver.push('WD');
      if (bowler) bowler.bowlingRuns += (match.wideRuns !== undefined ? match.wideRuns : 1);
    } else if (type === 'noball') {
      currentScore.runs += (match.noBallRuns !== undefined ? match.noBallRuns : 1);
      currentScore.thisOver.push('NB');
      if (bowler) bowler.bowlingRuns += (match.noBallRuns !== undefined ? match.noBallRuns : 1);
      if (striker) {
          striker.runs += value; // Assuming 'value' runs off the bat on a no-ball
          // NO balls don't count as balls faced for striker in some formats, 
          // but usually they do if they hit it. Let's keep it simple.
      }
    } else if (type === 'reset') {
      currentScore.runs = 0;
      currentScore.wickets = 0;
      currentScore.overs = 0;
      currentScore.balls = 0;
      currentScore.thisOver = [];
      currentScore.oversHistory = [];
      currentScore.players = [];
      currentScore.striker = '';
      currentScore.nonStriker = '';
      currentScore.bowler = '';
    }

    // Update bowler runs for normal balls
    if (bowler && (type === 'runs' || type === 'dot')) {
        bowler.bowlingRuns += value;
    }

    // RE-CALCULATE OVERS AND BALLS
    let totalValidBalls = (match.score.overs * 6) + match.score.balls;
    if (type !== 'reset') {
      if (type === 'runs' || type === 'dot' || type === 'wicket') {
        totalValidBalls += 1;
        if (bowler) {
            let bBalls = (bowler.overs * 6) + (bowler.overs % 1 * 10 || 0) + 1; // This is messy
            // Better to track totalBalls for bowler too
            // For now, let's just increment the balls bowled by match logic
        }
      }

      currentScore.overs = Math.floor(totalValidBalls / 6);
      currentScore.balls = totalValidBalls % 6;

      // Detect Over completion
      if (currentScore.balls === 0 && (type === 'runs' || type === 'dot' || type === 'wicket')) {
        if (!currentScore.oversHistory) currentScore.oversHistory = [];
        currentScore.oversHistory.push([...currentScore.thisOver]);
        currentScore.thisOver = [];
        
        // Strike rotation on over end
        if (hasPlayers) {
          const temp = currentScore.striker;
          currentScore.striker = currentScore.nonStriker;
          currentScore.nonStriker = temp;
          
          // Clear bowler
          currentScore.bowler = '';
        }
      }
    }

    // Innings / Match Completion Logic
    const isAllOut = currentScore.wickets >= (match.totalWickets || 10);
    const isOversDone = totalValidBalls >= match.totalOvers * 6;
    const targetScore = match.firstInnings ? match.firstInnings.runs + 1 : null;
    const isTargetChased = targetScore && currentScore.runs >= targetScore;
    
    const advanceInnings = match.currentInnings === 1 && (isAllOut || isOversDone);
    const completeMatch = match.currentInnings === 2 && (isAllOut || isOversDone || isTargetChased);

    socket.emit('updateScore', {
      matchId: id,
      token, // Important for ownership check
      update: currentScore,
      advanceInnings,
      completeMatch,
      resetMatch: type === 'reset'
    });
  };

  if (!match) return <div style={{textAlign:'center', marginTop:'50px', color:'white', fontFamily:'sans-serif'}}>Loading Match...</div>;

  const runRate = match.score.overs > 0 
    ? (match.score.runs / match.score.overs).toFixed(2) 
    : '0.00';
    
  const target = match.firstInnings ? match.firstInnings.runs + 1 : null;
  const battingFirst = match.battingFirst || match.teamA;
  const currentBattingTeam = match.currentInnings === 1 
    ? battingFirst 
    : (match.teamA === battingFirst ? match.teamB : match.teamA);

  return (
    <div className="match-wrapper">
      <div className="match-container">
        {/* BACK */}
        <div style={{display:'flex', justifyContent: 'space-between', alignItems:'center', marginBottom: '20px'}}>
            <Link to="/dashboard" className="back" style={{marginBottom: 0}}>← Back to Dashboard</Link>
            {match.status === 'Completed' && (
                <div style={{background:'red', color:'white', fontWeight:'bold', padding:'5px 15px', borderRadius:'20px', fontSize:'12px'}}>MATCH COMPLETED</div>
            )}
            <button 
              onClick={() => setIsShareOpen(true)}
              style={{background: '#1e293b', border: '1px solid #374151', color: 'white', padding: '5px 15px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer'}}
            >
              🔗 Share Match
            </button>
        </div>

        {/* MATCH TITLE */}
        <h1 className="title">{match.teamA} vs {match.teamB}</h1>
        <p className="subtitle">{match.totalOvers} Overs Match | Innings {match.currentInnings}</p>

        {/* SCORE CARD */}
        <div className="score-card">
          <p style={{color: '#9ca3af', fontWeight: 'bold', fontSize: '18px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '2px'}}>
            {currentBattingTeam} BATTING
          </p>
          <h2 className="score">{match.score.runs}/{match.score.wickets}</h2>
          
          {/* MISSING PLAYERS WARNING */}
          {hasPlayers && match.createdBy === user?.id && match.status !== 'Completed' && (
            (() => {
              const missing = [];
              if (!match.score.striker) missing.push('Striker');
              if (!match.score.nonStriker) missing.push('Non-Striker');
              if (!match.score.bowler) missing.push('Bowler');
              
              if (missing.length > 0) {
                return (
                  <div className="warning-card">
                    <span className="icon">⚠️</span>
                    <p>Selection Required: <span>Please select {missing.join(' & ')}</span></p>
                  </div>
                );
              }
              return null;
            })()
          )}

          {hasPlayers && (
            <div className="player-stats-mini">
              <div className={`batsman ${match.score.striker ? 'active' : ''}`} onClick={() => { setSelectingRole('striker'); setIsPlayerSelectOpen(true); }}>
                <span className="name">{match.score.striker || 'Select Striker'}*</span>
                <span className="val">
                  {(() => {
                    const p = match.score.players?.find(pl => pl.name === match.score.striker);
                    return p ? `${p.runs}(${p.balls})` : '0(0)';
                  })()}
                </span>
              </div>
              <div className={`batsman ${match.score.nonStriker ? 'active' : ''}`} onClick={() => { setSelectingRole('nonStriker'); setIsPlayerSelectOpen(true); }}>
                <span className="name">{match.score.nonStriker || 'Select Non-Striker'}</span>
                <span className="val">
                  {(() => {
                    const p = match.score.players?.find(pl => pl.name === match.score.nonStriker);
                    return p ? `${p.runs}(${p.balls})` : '0(0)';
                  })()}
                </span>
              </div>
              <div className="bowler-mini" onClick={() => { 
                  if (match.score.thisOver && match.score.thisOver.length > 0) {
                      alert("⚠️ Cannot change bowler mid-over. Complete the over first!");
                      return;
                  }
                  setSelectingRole('bowler'); 
                  setIsPlayerSelectOpen(true); 
              }}>
                <span className="label">BOWLER:</span>
                <span className="name">{match.score.bowler || 'Select Bowler'}</span>
                <span className="val">
                  {(() => {
                    const p = match.score.players?.find(pl => pl.name === match.score.bowler);
                    return p ? `${match.score.oversHistory?.filter(o => o.bowler === p.name).length || 0}.${match.score.balls}-${p.bowlingRuns}-${p.wickets}` : '0.0-0-0';
                  })()}
                </span>
              </div>
            </div>
          )}

          {target && (
            <p style={{color: '#a3e635', fontWeight: 'bold', marginTop: '10px'}}>
               Target: {target}
            </p>
          )}
          
          {match.status === 'Completed' && match.currentInnings === 2 && (
             <p style={{color: 'white', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px', fontSize: '24px', fontWeight: 'bold'}}>
                {match.score.runs >= target ? `${match.teamB} Won by ${match.totalWickets - match.score.wickets} wickets!` : `${match.teamA} Won by ${target - 1 - match.score.runs} runs!`}
             </p>
          )}

          <div className="stats" style={{ display: 'grid', gridTemplateColumns: match.currentInnings === 2 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '10px', marginTop: '20px' }}>
            <div>
              <p className="label">OVERS</p>
              <p>{Math.floor(match.score.overs)}.{Math.floor(match.score.balls)}</p>
            </div>

            <div>
              <p className="label">RUN RATE</p>
              <p>{runRate}</p>
            </div>

            {match.currentInnings === 2 && (
              <div>
                <p className="label" style={{ color: '#a3e635' }}>REQ. RR</p>
                <p>{(() => {
                  const runsReq = target - match.score.runs;
                  const totalBalls = match.totalOvers * 6;
                  const ballsDone = (match.score.overs * 6) + match.score.balls;
                  const ballsRem = totalBalls - ballsDone;
                  if (ballsRem <= 0) return runsReq <= 0 ? '0.00' : '∞';
                  return ((runsReq / ballsRem) * 6).toFixed(2);
                })()}</p>
              </div>
            )}
          </div>
        </div>

        {/* ADD PLAYER BUTTON */}
        {hasPlayers && match.createdBy === user?.id && match.status !== 'Completed' && (
          <div style={{display:'flex', justifyContent:'center', marginBottom: '20px'}}>
            <button 
              onClick={() => setIsAddPlayerOpen(true)}
              style={{background: '#a3e635', color: 'black', padding: '10px 20px', borderRadius: '30px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 14px 0 rgba(163, 230, 53, 0.39)'}}
            >
              + ADD PLAYER
            </button>
          </div>
        )}

        {/* THIS OVER TRACKER */}
        <div className="overs-tracker" style={{margin: '30px auto', paddingBottom: '30px'}}>
          <p className="tracker-title">THIS OVER</p>
          <div className="ball-row">
            {match.score.thisOver && match.score.thisOver.map((ball, idx) => (
              <span key={idx} className={`ball ${ball === 'W' ? 'ball-w' : ''} ${ball === 'WD' || ball === 'NB' ? 'ball-ex' : ''}`}>{ball}</span>
            ))}
            {(!match.score.thisOver || match.score.thisOver.length === 0) && (
              <span style={{color: '#9ca3af', fontSize: '14px', fontStyle: 'italic'}}>Waiting for first delivery...</span>
            )}
          </div>
        </div>

        {/* CONTROLS */}
        {match.createdBy === user?.id && match.status !== 'Completed' && (
          <div className="controls">
            <p className="control-title">Score Controls</p>

            <div className="btn-row">
              <button onClick={() => updateScore('runs', 1)}>1</button>
              <button onClick={() => updateScore('runs', 2)}>2</button>
              <button onClick={() => updateScore('runs', 3)}>3</button>
              <button onClick={() => updateScore('runs', 4)}>4</button>
              <button onClick={() => updateScore('runs', 6)}>6</button>
              <button className="dot" onClick={() => updateScore('dot', 0)}>DOT</button>
            </div>

            <div className="btn-row">
              <button className="extra" onClick={() => updateScore('wide', 1)}>WIDE</button>
              <button className="extra" onClick={() => updateScore('noball', 1)}>NO BALL</button>
              <button className="wicket" onClick={() => updateScore('wicket', 0)}>WICKET</button>
            </div>

            <div className="btn-row" style={{marginTop: '15px', gap: '15px'}}>
              <button className="reset" onClick={() => updateScore('reset', 0)} style={{flex: 1}}>RESET MATCH</button>
              <button className="undo" onClick={() => socket.emit('undoScore', { matchId: id, token })} style={{flex: 1, background: '#4b5563'}}>UNDO</button>
              <button style={{flex: 1, background: '#374151'}} onClick={openSettings}>⚙ SETTINGS</button>
            </div>
          </div>
        )}

        {/* PREVIOUS OVERS */}
        {match.score.oversHistory && match.score.oversHistory.length > 0 && (
          <div className="overs-tracker" style={{marginTop: '50px'}}>
            <div className="history-section" style={{borderTop: 'none', margin: 0, padding: 0}}>
              <p className="tracker-title">PREVIOUS OVERS</p>
              {match.score.oversHistory.slice().reverse().map((over, idx) => {
                const overTotal = over.reduce((sum, ball) => {
                  if (ball === 'WD') return sum + (match.wideRuns !== undefined ? match.wideRuns : 1);
                  if (ball === 'NB') return sum + (match.noBallRuns !== undefined ? match.noBallRuns : 1);
                  if (ball !== 'W') return sum + (parseInt(ball) || 0);
                  return sum;
                }, 0);
                
                return (
                  <div key={idx} className="history-row">
                    <span className="history-label">
                      Over {match.score.oversHistory.length - idx}
                      <span style={{color: '#9ca3af', fontWeight: 'normal', marginLeft: '8px', fontSize: '13px'}}>
                        ({overTotal} runs)
                      </span>
                    </span>
                    <div className="ball-row small-balls">
                      {over.map((ball, bIdx) => (
                        <span key={bIdx} className={`ball ${ball === 'W' ? 'ball-w' : ''} ${ball === 'WD' || ball === 'NB' ? 'ball-ex' : ''}`}>{ball}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SETTINGS MODAL */}
        {isSettingsOpen && (
          <div className="modal-overlay" style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:100, display:'flex', justifyContent:'center', alignItems:'center', backdropFilter:'blur(5px)'}}>
            <div className="modal-card" style={{width:'100%', maxWidth:'450px', padding:'30px', borderRadius:'20px', background:'#0f172a', border:'1px solid #374151', margin:'0 15px'}}>
              <h2 style={{color:'white', marginTop:0, marginBottom:'20px'}}>Match Settings</h2>
              
              <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
                <div style={{flex:1}}>
                  <p style={{fontSize:'12px', color:'#9ca3af', marginBottom:'5px', textTransform:'uppercase', fontWeight:'bold'}}>Team A</p>
                  <input type="text" value={settings.teamA} onChange={e => setSettings({...settings, teamA: e.target.value})} style={{width:'100%', padding:'12px', borderRadius:'10px', background:'#020617', border:'1px solid #374151', color:'white', outline:'none'}}/>
                </div>
                <div style={{flex:1}}>
                  <p style={{fontSize:'12px', color:'#9ca3af', marginBottom:'5px', textTransform:'uppercase', fontWeight:'bold'}}>Team B</p>
                  <input type="text" value={settings.teamB} onChange={e => setSettings({...settings, teamB: e.target.value})} style={{width:'100%', padding:'12px', borderRadius:'10px', background:'#020617', border:'1px solid #374151', color:'white', outline:'none'}}/>
                </div>
              </div>
              
              <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
                <div style={{flex:1}}>
                  <p style={{fontSize:'12px', color:'#9ca3af', marginBottom:'5px', textTransform:'uppercase', fontWeight:'bold'}}>Overs</p>
                  <input type="number" value={settings.totalOvers} onChange={e => setSettings({...settings, totalOvers: Number(e.target.value)})} style={{width:'100%', padding:'12px', borderRadius:'10px', background:'#020617', border:'1px solid #374151', color:'white', outline:'none'}}/>
                </div>
                <div style={{flex:1}}>
                  <p style={{fontSize:'12px', color:'#9ca3af', marginBottom:'5px', textTransform:'uppercase', fontWeight:'bold'}}>Players per Team</p>
                  <input type="number" value={settings.totalWickets + 1} onChange={e => setSettings({...settings, totalWickets: Number(e.target.value) - 1})} style={{width:'100%', padding:'12px', borderRadius:'10px', background:'#020617', border:'1px solid #374151', color:'white', outline:'none'}}/>
                </div>
              </div>

              <div style={{display:'flex', gap:'15px', marginBottom:'25px'}}>
                <div style={{flex:1}}>
                  <p style={{fontSize:'12px', color:'#9ca3af', marginBottom:'5px', textTransform:'uppercase', fontWeight:'bold'}}>Wide Penalty</p>
                  <input type="number" value={settings.wideRuns} onChange={e => setSettings({...settings, wideRuns: Number(e.target.value)})} style={{width:'100%', padding:'12px', borderRadius:'10px', background:'#020617', border:'1px solid #374151', color:'white', outline:'none'}}/>
                </div>
                <div style={{flex:1}}>
                  <p style={{fontSize:'12px', color:'#9ca3af', marginBottom:'5px', textTransform:'uppercase', fontWeight:'bold'}}>No-Ball Penalty</p>
                  <input type="number" value={settings.noBallRuns} onChange={e => setSettings({...settings, noBallRuns: Number(e.target.value)})} style={{width:'100%', padding:'12px', borderRadius:'10px', background:'#020617', border:'1px solid #374151', color:'white', outline:'none'}}/>
                </div>
              </div>

              <div style={{display:'flex', gap:'10px'}}>
                <button onClick={() => setIsSettingsOpen(false)} style={{padding:'12px 20px', background:'#1f2937', color:'white', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:'bold'}}>Cancel</button>
                <button onClick={() => {
                    socket.emit('updateSettings', { matchId: match._id, settings, token });
                    setIsSettingsOpen(false);
                }} style={{flex:1, background:'#a3e635', color:'black', padding:'12px', borderRadius:'10px', border:'none', fontWeight:'bold', cursor:'pointer'}}>Apply Changes</button>
              </div>
              
              <button className="reset" onClick={() => {
                if (window.confirm("WARNING: This will permanently purge this match from the entire system. Are you completely sure you want to do this?")) {
                    socket.emit('deleteMatch', { matchId: match._id, token });
                    setIsSettingsOpen(false);
                }
              }} style={{width:'100%', marginTop:'15px', background:'#7f1d1d', color:'white', padding:'12px', borderRadius:'10px', border:'none', fontWeight:'bold', cursor:'pointer'}}>DELETE MATCH</button>

            </div>
          </div>
        )}

        {/* ADD PLAYER MODAL */}
        {isAddPlayerOpen && (
          <div className="modal-overlay" style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:100, display:'flex', justifyContent:'center', alignItems:'center', backdropFilter:'blur(5px)'}}>
            <div className="modal-card" style={{width:'100%', maxWidth:'400px', padding:'30px', borderRadius:'20px', background:'#0f172a', border:'1px solid #374151', margin:'0 15px'}}>
              <h2 style={{color:'white', marginTop:0, marginBottom:'20px'}}>Add New Player</h2>
              
              <p style={{fontSize:'12px', color:'#9ca3af', marginBottom:'5px', textTransform: 'uppercase', fontWeight: 600}}>Select Team</p>
              <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                <button 
                    onClick={() => setNewPlayerTeam('A')}
                    style={{flex:1, padding:'10px', borderRadius:'10px', border:'none', background: newPlayerTeam==='A' ? '#a3e635' : '#1f2937', color: newPlayerTeam==='A' ? 'black' : 'white', fontWeight:'bold', cursor:'pointer'}}
                >
                    {match.teamA}
                </button>
                <button 
                    onClick={() => setNewPlayerTeam('B')}
                    style={{flex:1, padding:'10px', borderRadius:'10px', border:'none', background: newPlayerTeam==='B' ? '#a3e635' : '#1f2937', color: newPlayerTeam==='B' ? 'black' : 'white', fontWeight:'bold', cursor:'pointer'}}
                >
                    {match.teamB}
                </button>
              </div>

              <p style={{fontSize:'12px', color:'#9ca3af', marginBottom:'5px', textTransform:'uppercase', fontWeight:'bold'}}>Enter Name</p>
              <input 
                type="text" 
                value={newPlayerName} 
                onChange={e => setNewPlayerName(e.target.value)} 
                onKeyPress={e => e.key === 'Enter' && addPlayer()}
                placeholder="e.g. Virat Kohli"
                style={{width:'100%', padding:'12px', borderRadius:'10px', background:'#020617', border:'1px solid #374151', color:'white', outline:'none', marginBottom:'20px'}}
              />
              <div style={{display:'flex', gap:'10px'}}>
                <button onClick={() => setIsAddPlayerOpen(false)} style={{padding:'12px 20px', background:'#1f2937', color:'white', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:'bold'}}>Cancel</button>
                <button onClick={addPlayer} style={{flex:1, background:'#a3e635', color:'black', padding:'12px', borderRadius:'10px', border:'none', fontWeight:'bold', cursor:'pointer'}}>Add Player</button>
              </div>
            </div>
          </div>
        )}

        {/* DETAILED SCORECARD */}
        {hasPlayers && (
          <div style={{marginTop:'30px', background:'rgba(255,255,255,0.05)', borderRadius:'20px', padding:'20px'}}>
            <h3 style={{color:'#a3e635', marginBottom:'20px'}}>Full Scorecard</h3>
            
            <div className="batting-table" style={{width:'100%', overflowX:'auto', marginBottom: '30px'}}>
              <table style={{width:'100%', textAlign:'left', color:'white', borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #374151', color:'#9ca3af', fontSize:'12px'}}>
                    <th style={{padding:'10px'}}>BATSMAN</th>
                    <th style={{padding:'10px'}}>R</th>
                    <th style={{padding:'10px'}}>B</th>
                    <th style={{padding:'10px'}}>4s</th>
                    <th style={{padding:'10px'}}>6s</th>
                    <th style={{padding:'10px'}}>SR</th>
                  </tr>
                </thead>
                <tbody>
                  {match.score.players?.filter(p => p.runs > 0 || p.balls > 0 || p.isOut).map((p, i) => (
                    <tr key={i} style={{borderBottom:'1px solid #1f2937'}}>
                      <td style={{padding:'10px'}}>
                        <div style={{fontWeight:'bold'}}>{p.name} {p.name === match.score.striker || p.name === match.score.nonStriker ? '*' : ''}</div>
                        <div style={{fontSize:'11px', color:'#9ca3af'}}>
                          {p.isOut ? (p.dismissedBy ? `c & b ${p.dismissedBy}` : 'Out') : 'not out'}
                        </div>
                      </td>
                      <td style={{padding:'10px'}}>{p.runs}</td>
                      <td style={{padding:'10px'}}>{p.balls}</td>
                      <td style={{padding:'10px'}}>{p.fours || 0}</td>
                      <td style={{padding:'10px'}}>{p.sixes || 0}</td>
                      <td style={{padding:'10px'}}>{p.balls > 0 ? ((p.runs/p.balls)*100).toFixed(1) : '0.0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bowling-table" style={{width:'100%', overflowX:'auto'}}>
              <table style={{width:'100%', textAlign:'left', color:'white', borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #374151', color:'#9ca3af', fontSize:'12px'}}>
                    <th style={{padding:'10px'}}>BOWLER</th>
                    <th style={{padding:'10px'}}>O</th>
                    <th style={{padding:'10px'}}>M</th>
                    <th style={{padding:'10px'}}>R</th>
                    <th style={{padding:'10px'}}>W</th>
                    <th style={{padding:'10px'}}>ECON</th>
                  </tr>
                </thead>
                <tbody>
                  {match.score.players?.filter(p => p.overs > 0 || p.bowlingRuns > 0 || p.wickets > 0).map((p, i) => (
                    <tr key={i} style={{borderBottom:'1px solid #1f2937'}}>
                      <td style={{padding:'10px', fontWeight:'bold'}}>{p.name} {p.name === match.score.bowler ? '*' : ''}</td>
                      <td style={{padding:'10px'}}>{p.overs}</td>
                      <td style={{padding:'10px'}}>{p.maidens || 0}</td>
                      <td style={{padding:'10px'}}>{p.bowlingRuns}</td>
                      <td style={{padding:'10px'}}>{p.wickets}</td>
                      <td style={{padding:'10px'}}>{p.overs > 0 ? (p.bowlingRuns/p.overs).toFixed(2) : '0.00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SELECT PLAYER ROLE MODAL */}
        {isPlayerSelectOpen && (
          <div className="modal-overlay" style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:100, display:'flex', justifyContent:'center', alignItems:'center', backdropFilter:'blur(5px)'}}>
            <div className="modal-card" style={{width:'100%', maxWidth:'400px', padding:'30px', borderRadius:'20px', background:'#0f172a', border:'1px solid #374151', margin:'0 15px'}}>
              <h2 style={{color:'white', marginTop:0, marginBottom:'20px', textTransform:'capitalize'}}>Select {selectingRole}</h2>
              <div style={{maxHeight:'300px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'10px', paddingRight:'5px'}}>
                {(() => {
                  const battingFirst = match.battingFirst || match.teamA;
                  const currentBattingTeamName = match.currentInnings === 1 
                    ? battingFirst 
                    : (match.teamA === battingFirst ? match.teamB : match.teamA);
                  const currentBowlingTeamName = currentBattingTeamName === match.teamA ? match.teamB : match.teamA;

                  const isBattingRole = selectingRole === 'striker' || selectingRole === 'nonStriker';
                  const roster = isBattingRole
                    ? (currentBattingTeamName === match.teamA ? match.teamAPlayers : match.teamBPlayers)
                    : (currentBowlingTeamName === match.teamA ? match.teamAPlayers : match.teamBPlayers);

                  // Filter out players who are already out AND players already selected in other role
                  const filteredRoster = (roster || []).filter(name => {
                    if (isBattingRole) {
                        // Don't show if already in other batting role
                        if (selectingRole === 'striker' && name === match.score.nonStriker) return false;
                        if (selectingRole === 'nonStriker' && name === match.score.striker) return false;
                    }
                    const stats = match.score.players?.find(p => p.name === name);
                    return !stats || !stats.isOut || selectingRole === 'bowler';
                  });

                  if (filteredRoster.length === 0) {
                    return <p style={{color:'#9ca3af', textAlign:'center', py:'20px'}}>No players in {isBattingRole ? 'batting' : 'bowling'} roster.</p>;
                  }

                  return filteredRoster.map((playerName, idx) => (
                    <button 
                      key={idx}
                      onClick={() => selectPlayerForRole(playerName)}
                      style={{width:'100%', padding:'15px', textAlign:'left', background:'#1e293b', border:'1px solid #374151', color:'white', borderRadius:'10px', cursor:'pointer', fontWeight:'bold'}}
                    >
                      {playerName} {match.score.players?.find(p => p.name === playerName)?.isOut ? '(Out)' : ''}
                    </button>
                  ));
                })()}
              </div>
              <button 
                onClick={() => setIsPlayerSelectOpen(false)} 
                style={{width:'100%', marginTop:'20px', padding:'12px', background:'#1f2937', color:'white', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:'bold'}}
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>

      <ShareModal 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
        shareUrl={window.location.href} 
      />
    </div>
  );
}
