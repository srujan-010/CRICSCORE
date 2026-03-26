const mongoose = require('mongoose');

const playerStatsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  isOut: { type: Boolean, default: false },
  dismissedBy: { type: String, default: '' },
  overs: { type: Number, default: 0 },
  bowlingRuns: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  maidens: { type: Number, default: 0 }
}, { _id: false });

const scoreSchema = new mongoose.Schema({
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  overs: { type: Number, default: 0 }, 
  balls: { type: Number, default: 0 },
  thisOver: { type: [String], default: [] },
  oversHistory: { type: [[String]], default: [] },
  players: { type: [playerStatsSchema], default: [] },
  striker: { type: String, default: '' },
  nonStriker: { type: String, default: '' },
  bowler: { type: String, default: '' }
}, { _id: false });

const matchSchema = new mongoose.Schema({
  teamA: { type: String, required: true },
  teamB: { type: String, required: true },
  totalOvers: { type: Number, required: true },
  totalWickets: { type: Number, default: 10 },
  wideRuns: { type: Number, default: 1 },
  noBallRuns: { type: Number, default: 1 },
  battingFirst: { type: String, required: false },
  currentInnings: { type: Number, default: 1 },
  teamAPlayers: { type: [String], default: [] },
  teamBPlayers: { type: [String], default: [] },
  score: { type: scoreSchema, default: () => ({}) },
  firstInnings: { type: scoreSchema, default: null },
  scoreHistory: { type: [scoreSchema], default: [] },
  status: { type: String, enum: ['Live', 'Completed'], default: 'Live' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
