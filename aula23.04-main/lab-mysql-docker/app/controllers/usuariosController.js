const service = require('../services/usuariosService');

async function listar(req, res) {
  const usuarios = await service.listar();
  res.json(usuarios);
}

async function buscarPorId(req, res) {
  const usuario = await service.buscarPorId(req.params.id);

  if (!usuario) {
    return res.status(404).json({ erro: 'Usuario nao encontrado' });
  }

  return res.json(usuario);
}

async function atualizar(req, res) {
  const { nome } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: 'Nome e obrigatorio' });
  }

  const usuario = await service.atualizar(req.params.id, { nome });

  if (!usuario) {
    return res.status(404).json({ erro: 'Usuario nao encontrado' });
  }

  return res.json(usuario);
}

async function remover(req, res) {
  const removido = await service.remover(req.params.id);

  if (!removido) {
    return res.status(404).json({ erro: 'Usuario nao encontrado' });
  }

  return res.status(204).send();
}

module.exports = {
  listar,
  buscarPorId,
  atualizar,
  remover
};
