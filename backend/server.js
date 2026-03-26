const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const Match = require('./models/Match');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/match', require('./routes/match'));

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://srujanakulawar_db_user:qcQkiy18HsT4555l@scorecalculator.ecfzhg4.mongodb.net/?appName=scorecalculator';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinMatch', (matchId) => {
    socket.join(matchId);
    console.log(`Socket ${socket.id} joined match ${matchId}`);
  });

  socket.on('updateScore', async (data) => {
    try {
      const match = await Match.findById(data.matchId);
      if (match) {
        // Enforce ownership
        const token = data.token;
        if (!token) return;
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          const matchCreator = match.createdBy ? match.createdBy.toString() : null;
          if (matchCreator && matchCreator !== decoded.userId) return;
        } catch (err) { return; }

        if (data.resetMatch) {
          match.status = 'Live';
          match.currentInnings = 1;
          match.firstInnings = null;
          match.score = { runs: 0, wickets: 0, overs: 0, balls: 0, thisOver: [], oversHistory: [] };
          match.scoreHistory = [];
          await match.save();
          return io.to(data.matchId).emit('scoreUpdated', match);
        }

        if (match.status !== 'Completed') {
          // Save to history before update
          match.scoreHistory.push(JSON.parse(JSON.stringify(match.score)));
          if (match.scoreHistory.length > 20) match.scoreHistory.shift(); 
          
          if (data.update) match.score = data.update;
          if (data.teamAPlayers) match.teamAPlayers = data.teamAPlayers;
          if (data.teamBPlayers) match.teamBPlayers = data.teamBPlayers;
          
          if (data.advanceInnings) {
            match.firstInnings = JSON.parse(JSON.stringify(data.update));
            match.currentInnings = 2;
            const battingFirst = match.battingFirst || match.teamA;
            const secondBattingTeam = (match.teamA === battingFirst ? match.teamB : match.teamA);
            const roster = (secondBattingTeam === match.teamA ? match.teamAPlayers : match.teamBPlayers) || [];
            
            match.score = { 
              runs: 0, wickets: 0, overs: 0, balls: 0, thisOver: [], oversHistory: [],
              players: roster.map(name => ({
                name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false,
                overs: 0, bowlingRuns: 0, wickets: 0, maidens: 0
              })),
              striker: '', nonStriker: '', bowler: ''
            };
            match.scoreHistory = [];
          } else if (data.completeMatch) {
            match.status = 'Completed';
          }
          
          await match.save();
          io.to(data.matchId).emit('scoreUpdated', match);
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('undoScore', async (data) => {
    try {
      const match = await Match.findById(data.matchId);
      if (!match) return;

      const decoded = jwt.verify(data.token, JWT_SECRET);
      const matchCreator = match.createdBy ? match.createdBy.toString() : null;
      if (matchCreator && matchCreator !== decoded.userId) {
         return;
      }

      if (match.status !== 'Completed' && match.scoreHistory.length > 0) {
        const previousScore = match.scoreHistory.pop();
        match.score = previousScore;
        await match.save();
        io.to(data.matchId).emit('scoreUpdated', match);
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('updateSettings', async (data) => {
    try {
      const match = await Match.findById(data.matchId);
      if (match) {
        const decoded = jwt.verify(data.token, JWT_SECRET);
        const matchCreator = match.createdBy ? match.createdBy.toString() : null;
        if (matchCreator && matchCreator !== decoded.userId) {
           return;
        }

        const { teamA, teamB, totalOvers, totalWickets, wideRuns, noBallRuns, battingFirst } = data.settings;
        if (teamA) match.teamA = teamA;
        if (teamB) match.teamB = teamB;
        if (totalOvers !== undefined) match.totalOvers = totalOvers;
        if (totalWickets !== undefined) match.totalWickets = totalWickets;
        if (wideRuns !== undefined) match.wideRuns = wideRuns;
        if (noBallRuns !== undefined) match.noBallRuns = noBallRuns;
        if (battingFirst) match.battingFirst = battingFirst;
        
        await match.save();
        io.to(data.matchId).emit('scoreUpdated', match);
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('deleteMatch', async (data) => {
    try {
      const match = await Match.findById(data.matchId);
      if (!match) return;

      const decoded = jwt.verify(data.token, JWT_SECRET);
      const matchCreator = match.createdBy ? match.createdBy.toString() : null;
      if (matchCreator && matchCreator !== decoded.userId) {
         return;
      }

      await Match.findByIdAndDelete(data.matchId);
      io.to(data.matchId).emit('matchDeleted');
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
