const bcrypt = require('bcryptjs');
const db = require('../db');

const SALT_ROUNDS = 10;

async function listar() {
  const [rows] = await db.query('SELECT id, nome, created_at FROM usuarios ORDER BY id DESC');
  return rows;
}

async function buscarPorId(id) {
  const [rows] = await db.query(
    'SELECT id, nome, created_at FROM usuarios WHERE id = ?',
    [id]
  );

  return rows[0] || null;
}

async function buscarPorNome(nome) {
  const [rows] = await db.query(
    'SELECT id, nome, senha_hash, created_at FROM usuarios WHERE nome = ?',
    [nome]
  );

  return rows[0] || null;
}

async function criar({ nome, senha }) {
  const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

  const [result] = await db.query(
    'INSERT INTO usuarios (nome, senha_hash) VALUES (?, ?)',
    [nome, senhaHash]
  );

  return buscarPorId(result.insertId);
}

async function validarSenha(usuario, senha) {
  if (!usuario || !usuario.senha_hash) {
    return false;
  }

  return bcrypt.compare(senha, usuario.senha_hash);
}

async function atualizar(id, { nome }) {
  const [result] = await db.query(
    'UPDATE usuarios SET nome = ? WHERE id = ?',
    [nome, id]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return buscarPorId(id);
}

async function remover(id) {
  const [result] = await db.query('DELETE FROM usuarios WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  listar,
  buscarPorId,
  buscarPorNome,
  criar,
  validarSenha,
  atualizar,
  remover
};
