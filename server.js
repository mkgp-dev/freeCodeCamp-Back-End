// .env
require('dotenv').config();

// Library
const express = require('express');
const cors = require('cors');
const { trim_all } = require('request_trimmer');
const requestIp = require('request-ip');
const multer = require('multer')

// Personal
const { init } = require('./lib/database');
const App = require('./lib/function');

// Express
const app = express();

// Reduce anonimity
app.set('trust proxy', true);

// Request
app.use(cors());
app.use(express.static('static'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(trim_all);
app.use(requestIp.mw());

// Front
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/templates/index.html');
});

// Global
const errorMSG = (m) => ({ error: m });
const MAX_BYTES = 10 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { MAX_BYTES }
});

// Timestamp Microservice
app.get(/^\/api\/([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{10}|[0-9]{13}|[0-9]+)$/, (req, res) => {
  const date = req.params[0];
  const response = App.timestamp(date);
  if (response.error) {
    return res.status(400).json(errorMSG('Invalid Date'));
  }

  res.status(200).json({
    unix: response.unix,
    utc: response.utc
  });
});

// Request Header Parser Microservice
app.get('/api/whoami', (req, res) => {
  const response = App.headerParser(req);

  res.status(200).json({
    ipaddress: response.ip,
    language: response.lang,
    software: response.ua
  });
});

// URL Shortener Microservice
/* app.get('/url-shortener', (req, res) => {
  res.sendFile(process.cwd() + '/templates/url-shortener.html');
}); */

app.post('/api/shorturl', async(req, res, next) => {
  const url = req.body.url;
  if (!url) {
    return res.status(400).json(errorMSG('URL is required.'))
  }

  try {
    const response = await App.insertURL(url);
    if (response.code == 0) {
      return res.status(400).json(errorMSG('invalid url'));
    }

    res.status(200).json({
      original_url: url,
      short_url: response.code
    });
  } catch(err) {
    console.error(err.message);
    next(err);
  }
});

app.get('/api/shorturl/:code', async(req, res) => {
  const code = parseInt(req.params.code);

  try {
    const response = await App.findURL(code);
    if (response.domain == null) {
      return res.status(400).json(errorMSG('No short URL found for the given input.'))
    }

    res.redirect(response.domain);
  } catch(err) {
    console.error(err.message);
    next(err);
  }
});

// Exercise Tracker
/* app.get('/exercise-tracker', (req, res) => {
  res.sendFile(process.cwd() + '/templates/exercise-tracker.html');
}); */

app.post('/api/users', async(req, res, next) => {
  const username = req.body.username;

  try {
    const response = await App.createUser(username);
    if (response.error) {
      return res.status(400).json(errorMSG(response.error || 'Unknown issue.'));
    }

    res.status(200).json({
      username: username,
      _id: response.id
    });
  } catch(err) {
    console.error(err.message);
    next(err);
  }
});

app.get('/api/users', async(req, res, next) => {
  try {
    const response = await App.retrieveUsers();
    if (response.error) {
      return res.status(400).json(errorMSG(response.error || 'Unknown issue.'))
    }

    res.status(200).json(response);
  } catch(err) {
    console.error(err.message);
    next(err);
  }
});

app.post('/api/users/:id/exercises', async(req, res, next) => {
  const id = req.params.id;
  const body = req.body;

  try {
    const response = await App.addExercise(id, body);
    if (response.error) {
      return res.status(400).json(errorMSG(response.error));
    }

    res.json({
      username: response.username,
      description: response.description,
      duration: response.duration,
      date: new Date(response.date).toDateString(),
      _id: id
    })
  } catch(err) {
    console.error(err.message);
    next(err);
  }
});

app.get('/api/users/:id/logs', async(req, res, next) => {
  const id = req.params.id;
  const query = req.query;

  try {
    const response = await App.retrieveLogs(id, query);

    if (response.error) {
      return res.status(400).json(errorMSG(response.error));
    }

    res.json({
      username: response.username,
      count: response.count,
      _id: response.id,
      log: response.log
    });
  } catch(err) {
    console.error(err.message);
    next(err);
  }
});

// File Metadata Microservice
/* app.get('/file-metadata', (req, res) => {
  res.sendFile(process.cwd() + '/templates/file-metadata.html');
}); */

app.post('/api/fileanalyse', upload.single('upfile'), (req, res, next) => {
  try {
    const response = App.fileAnalyze(req);
    if (response.error) {
      return res.status(400).json(errorMSG(response.error));
    }

    res.json({
      name: response.name,
      type: response.type,
      size: response.size
    });
  } catch(err) {
    console.error(err.message);
    next(err);
  }
});

// Fallback error
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json(errorMSG(err.message));
});

// Initialize Mongodb
init()
  .then(() => app.listen(process.env.PORT || 3000, () => console.log('Server is running.')))
  .catch((err) => {
    console.error('Error:', err.message);
  });