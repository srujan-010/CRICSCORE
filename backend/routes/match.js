const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

const isAuthenticated = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Failed to authenticate token' });
    console.log('Decoded token:', decoded);
    req.user = decoded;
    next();
  });
};

router.post('/create', isAuthenticated, async (req, res) => {
  try {
    console.log('Creating match:', req.body, 'by user:', req.user.userId, 'Type:', typeof req.user.userId);
    const { teamA, teamB, totalOvers, totalWickets, wideRuns, noBallRuns, battingFirst, teamAPlayers, teamBPlayers } = req.body;
    const battingFirstTeam = battingFirst || teamA;
    const roster = (battingFirstTeam === teamA ? teamAPlayers : teamBPlayers) || [];
    
    const newMatch = new Match({ 
      teamA, teamB, totalOvers,
      totalWickets: totalWickets || 10,
      wideRuns: wideRuns || 1,
      noBallRuns: noBallRuns || 1,
      battingFirst: battingFirstTeam,
      teamAPlayers: teamAPlayers || [],
      teamBPlayers: teamBPlayers || [],
      score: {
        runs: 0, wickets: 0, overs: 0, balls: 0, thisOver: [], oversHistory: [],
        players: roster.map(name => ({
          name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false,
          overs: 0, bowlingRuns: 0, wickets: 0, maidens: 0
        })),
        striker: '', nonStriker: '', bowler: ''
      },
      createdBy: req.user.userId
    });
    await newMatch.save();
    res.status(201).json(newMatch);
  } catch (error) {
    console.error('Match Create Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const matches = await Match.find({ createdBy: req.user.userId }).sort({ createdAt: -1 });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    
    // Check if user is the creator
    const creatorId = match.createdBy ? match.createdBy.toString() : null;
    if (creatorId && creatorId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this match' });
    }
    
    await Match.findByIdAndDelete(req.params.id);
    res.json({ message: 'Match deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
