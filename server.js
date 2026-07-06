require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');

const { MongoStore } = require('connect-mongo');
const webhookRoutes = require('./routes/webhook');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const { startExportJob } = require('./jobs/exportJson');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static assets
app.use('/public', express.static(path.join(__dirname, 'public')));

// Body parsing — raw buffer for webhook signature validation, JSON for everything else
app.use('/webhook', express.raw({ type: 'application/json' }));
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

app.get('/', (req, res) => res.redirect('/admin'));

// Connect to MongoDB then start server
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    startExportJob();
    app.listen(PORT, () => console.log(`nsc-middleware listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
