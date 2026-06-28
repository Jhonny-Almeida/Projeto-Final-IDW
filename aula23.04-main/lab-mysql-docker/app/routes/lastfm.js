const express = require('express');
const controller = require('../controllers/lastfmController');

const router = express.Router();

router.get('/artist-info', controller.artistInfo);
router.get('/top-tracks', controller.topTracks);
router.get('/track-search', controller.trackSearch);

module.exports = router;
