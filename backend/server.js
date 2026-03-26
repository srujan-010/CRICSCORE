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

// ✅ Socket.IO setup
const io = new Server(server, {
  cors: { origin: '*' }
});

// ✅ Middlewares
app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json());

// ✅ ADD THIS (IMPORTANT FIX)
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// ✅ Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/match', require('./routes/match'));

// ✅ MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://srujanakulawar_db_user:qcQkiy18HsT4555l@scorecalculator.ecfzhg4.mongodb.net/?appName=scorecalculator';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ✅ Socket logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinMatch', (matchId) => {
    socket.join(matchId);
  });

  socket.on('updateScore', async (data) => {
    try {
      const match = await Match.findById(data.matchId);
      if (!match) return;

      const token = data.token;
      if (!token) return;

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const matchCreator = match.createdBy?.toString();
        if (matchCreator && matchCreator !== decoded.userId) return;
      } catch {
        return;
      }

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
        match.scoreHistory.push(JSON.parse(JSON.stringify(match.score)));
        if (match.scoreHistory.length > 20) match.scoreHistory.shift();

        if (data.update) match.score = data.update;

        await match.save();
        io.to(data.matchId).emit('scoreUpdated', match);
      }

    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ✅ Server start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});