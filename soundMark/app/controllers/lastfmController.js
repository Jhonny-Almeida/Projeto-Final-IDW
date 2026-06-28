const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';
const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

async function proxy(method, extraParams, res) {
  if (!LASTFM_API_KEY) {
    return res.status(500).json({ erro: 'LASTFM_API_KEY não configurada no servidor' });
  }

  const params = new URLSearchParams({
    method,
    api_key: LASTFM_API_KEY,
    format: 'json',
    ...extraParams
  });

  try {
    const resposta = await fetch(`${LASTFM_BASE_URL}?${params.toString()}`);
    const dados = await resposta.json();
    res.status(resposta.status).json(dados);
  } catch (err) {
    res.status(502).json({ erro: 'Falha ao consultar a API do Last.fm', detalhes: err.message });
  }
}

exports.artistInfo = (req, res) => {
  const { artista } = req.query;
  if (!artista) return res.status(400).json({ erro: 'Parâmetro "artista" é obrigatório' });
  return proxy('artist.getinfo', { artist: artista }, res);
};

exports.topTracks = (req, res) => {
  const { limite } = req.query;
  return proxy('chart.gettoptracks', limite ? { limit: limite } : {}, res);
};

exports.trackSearch = (req, res) => {
  const { termo, limite } = req.query;
  if (!termo) return res.status(400).json({ erro: 'Parâmetro "termo" é obrigatório' });
  return proxy('track.search', { track: termo, limit: limite || 18 }, res);
};
