function exigirLogin(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ erro: 'Acesso nao autorizado' });
  }

  return next();
}

module.exports = exigirLogin;