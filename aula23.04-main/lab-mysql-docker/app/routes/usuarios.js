const express = require('express');
const controller = require('../controllers/usuariosController');
const exigirLogin = require('../middlewares/auth');

const router = express.Router();

router.get('/', exigirLogin, controller.listar);
router.get('/:id', exigirLogin, controller.buscarPorId);
router.put('/:id', exigirLogin, controller.atualizar);
router.delete('/:id', exigirLogin, controller.remover);

module.exports = router;
