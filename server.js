require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');

const { MongoStore } = require('connect-mongo');
const webhookRoutes = require('./routes/webhook');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const cronRoutes = require('./routes/cron');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static assets
app.use('/public', express.static(path.join(__dirname, 'public')));

// CORS — webhook routes accept submissions from any origin (all go to pending queue)
app.use('/webhook', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session (admin only)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  },
}));

// Routes
app.use('/webhook', webhookRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/cron', cronRoutes);

app.get('/', (req, res) => res.redirect('/admin'));

// Connect to MongoDB then start server
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`nsc-middleware listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
