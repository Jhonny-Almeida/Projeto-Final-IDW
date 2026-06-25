const express = require('express');
const controller = require('../controllers/authController');

const router = express.Router();

router.post('/cadastro', controller.cadastrar);
router.post('/login', controller.login);
router.post('/logout', controller.logout);
router.get('/me', controller.me);

module.exports = router;
