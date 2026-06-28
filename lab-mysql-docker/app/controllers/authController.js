const service = require('../services/usuariosService');

const NOME_MIN = 3;
const SENHA_MIN = 6;

function validarCadastro({ nome, senha, confirmarSenha }) {
  if (!nome || !senha || !confirmarSenha) {
    return 'Nome, senha e confirmação de senha são obrigatórios';
  }

  if (nome.trim().length < NOME_MIN) {
    return `Nome deve ter pelo menos ${NOME_MIN} caracteres`;
  }

  if (senha.length < SENHA_MIN) {
    return `Senha deve ter pelo menos ${SENHA_MIN} caracteres`;
  }

  if (senha !== confirmarSenha) {
    return 'As senhas não coincidem';
  }

  return null;
}

async function cadastrar(req, res) {
  const { nome, senha, confirmarSenha } = req.body;

  const erro = validarCadastro({ nome, senha, confirmarSenha });

  if (erro) {
    return res.status(400).json({ erro });
  }

  const nomeNormalizado = nome.trim();

  try {
    const existente = await service.buscarPorNome(nomeNormalizado);

    if (existente) {
      return res.status(409).json({ erro: 'Esse nome de usuário já está em uso' });
    }

    const usuario = await service.criar({ nome: nomeNormalizado, senha });

    req.session.usuario = { id: usuario.id, nome: usuario.nome };

    return res.status(201).json({
      mensagem: 'Cadastro realizado com sucesso',
      usuario: { id: usuario.id, nome: usuario.nome }
    });
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    return res.status(500).json({ erro: 'Erro interno ao cadastrar usuário' });
  }
}

async function login(req, res) {
  const { nome, senha } = req.body;

  if (!nome || !senha) {
    return res.status(400).json({ erro: 'Nome e senha são obrigatórios' });
  }

  try {
    const usuario = await service.buscarPorNome(nome.trim());
    const senhaValida = await service.validarSenha(usuario, senha);

    if (!usuario || !senhaValida) {
      return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
    }

    req.session.usuario = { id: usuario.id, nome: usuario.nome };

    return res.json({
      mensagem: 'Login realizado com sucesso',
      usuario: { id: usuario.id, nome: usuario.nome }
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return res.status(500).json({ erro: 'Erro interno ao fazer login' });
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.json({ mensagem: 'Logout realizado com sucesso' });
  });
}

function me(req, res) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ erro: 'Não autenticado' });
  }

  return res.json({ usuario: req.session.usuario });
}

module.exports = {
  cadastrar,
  login,
  logout,
  me
};
