const db = require('../db');

async function criar({ usuarioId, musica, artista, nota, comentario, capaUrl }) {
  const [result] = await db.query(
    'INSERT INTO avaliacoes (usuario_id, musica, artista, nota, comentario, capa_url) VALUES (?, ?, ?, ?, ?, ?)',
    [usuarioId, musica, artista, nota, comentario || null, capaUrl || null]
  );
  return buscarPorId(result.insertId);
}

async function buscarPorId(id) {
  const [rows] = await db.query(
    'SELECT id, usuario_id, musica, artista, nota, comentario, capa_url, created_at FROM avaliacoes WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function listarPorUsuario(usuarioId) {
  const [rows] = await db.query(
    'SELECT id, usuario_id, musica, artista, nota, comentario, capa_url, created_at FROM avaliacoes WHERE usuario_id = ? ORDER BY created_at DESC',
    [usuarioId]
  );
  return rows;
}

module.exports = { criar, buscarPorId, listarPorUsuario };