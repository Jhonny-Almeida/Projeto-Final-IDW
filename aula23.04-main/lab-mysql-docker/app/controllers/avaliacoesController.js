const service = require('../services/avaliacoesService');

const COMENTARIO_MAX = 1000;

function validar({ musica, artista, nota, comentario }) {
  if (!musica || !artista) return 'Música e artista são obrigatórios';
  const n = Number(nota);
  if (!Number.isInteger(n) || n < 1 || n > 5) return 'Nota deve ser um inteiro entre 1 e 5';
  if (comentario && comentario.length > COMENTARIO_MAX)
    return `Comentário deve ter no máximo ${COMENTARIO_MAX} caracteres`;
  return null;
}

async function criar(req, res) {
  const { musica, artista, nota, comentario, capa_url } = req.body;
  const erro = validar({ musica, artista, nota, comentario });
  if (erro) return res.status(400).json({ erro });

  try {
    const avaliacao = await service.criar({
      usuarioId:  req.session.usuario.id,
      musica:     musica.trim(),
      artista:    artista.trim(),
      nota:       Number(nota),
      comentario: comentario ? comentario.trim() : null,
      capaUrl:    capa_url   ? capa_url.trim()   : null,
    });
    return res.status(201).json({ mensagem: 'Avaliação salva com sucesso', avaliacao });
  } catch (error) {
    console.error('Erro ao salvar avaliação:', error);
    return res.status(500).json({ erro: 'Erro interno ao salvar avaliação' });
  }
}

async function listarMinhas(req, res) {
  try {
    const avaliacoes = await service.listarPorUsuario(req.session.usuario.id);
    return res.json(avaliacoes);
  } catch (error) {
    console.error('Erro ao listar avaliações:', error);
    return res.status(500).json({ erro: 'Erro interno ao listar avaliações' });
  }
}

module.exports = { criar, listarMinhas };