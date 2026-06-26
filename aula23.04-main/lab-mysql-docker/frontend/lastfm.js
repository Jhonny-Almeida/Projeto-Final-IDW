// --- Utilitários compartilhados da API do Last.fm (usados em index.html e home.html) ---

const LASTFM_API_KEY = 'f5a143c4b5fefd5d6776ce666e553c11';
const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';
const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';
const CAPA_PLACEHOLDER = 'https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png';

// hash de arquivo do placeholder genérico ("estrelinha") que o Last.fm devolve
// quando não tem uma imagem real - precisa ser ignorado, senão é tratado como capa válida
const LASTFM_PLACEHOLDER_HASH = '2a96cbd8b46e442fc41c2b86b821562f';

function obterMelhorCapa(imagens) {
  if (!Array.isArray(imagens) || imagens.length === 0) {
    return null;
  }

  // a API retorna tamanhos: small, medium, large, extralarge (do menor pro maior)
  const ordemPreferida = ['extralarge', 'large', 'medium', 'small'];

  for (const tamanho of ordemPreferida) {
    const encontrada = imagens.find(
      (img) => img.size === tamanho && img['#text'] && !img['#text'].includes(LASTFM_PLACEHOLDER_HASH)
    );
    if (encontrada) {
      return encontrada['#text'];
    }
  }

  return null;
}

// busca a foto do artista direto no Last.fm
async function buscarFotoArtistaLastfm(nomeArtista) {
  if (!nomeArtista) {
    return null;
  }

  const url = `${LASTFM_BASE_URL}?method=artist.getinfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(nomeArtista)}&format=json`;

  try {
    const resposta = await fetch(url);

    if (!resposta.ok) {
      return null;
    }

    const dados = await resposta.json();
    const imagens = dados?.artist?.image;

    return obterMelhorCapa(imagens);
  } catch (error) {
    console.warn(`Não foi possível buscar artist.getinfo para "${nomeArtista}"`, error);
    return null;
  }
}

// fallback: busca uma foto representativa do artista na iTunes Search API
// (sem precisar de chave, com CORS liberado). A Search API não tem endpoint de
// "foto de artista" direta, então usamos a arte da faixa mais associada ao nome dele.
async function buscarFotoArtistaNaItunes(nomeArtista) {
  if (!nomeArtista) {
    return null;
  }

  const termo = encodeURIComponent(nomeArtista);
  const url = `${ITUNES_SEARCH_URL}?term=${termo}&media=music&entity=song&attribute=artistTerm&limit=1`;

  try {
    const resposta = await fetch(url);

    if (!resposta.ok) {
      return null;
    }

    const dados = await resposta.json();
    const resultado = dados?.results?.[0];

    if (!resultado?.artworkUrl100) {
      return null;
    }

    // a iTunes entrega 100x100 por padrão; trocamos pra uma resolução maior
    return resultado.artworkUrl100.replace('100x100bb', '600x600bb');
  } catch (error) {
    console.warn(`Não foi possível buscar foto na iTunes para o artista "${nomeArtista}"`, error);
    return null;
  }
}

// resolve a imagem de uma faixa: 1ª tentativa Last.fm, 2ª tentativa iTunes
async function resolverFotoArtista(faixa) {
  const temCapaValida = !!obterMelhorCapa(faixa.image);

  if (temCapaValida) {
    return obterMelhorCapa(faixa.image);
  }

  const nomeArtista = faixa.artist?.name || '';
  const urlLastfm = await buscarFotoArtistaLastfm(nomeArtista);

  if (urlLastfm) {
    return urlLastfm;
  }

  return buscarFotoArtistaNaItunes(nomeArtista);
}

// busca o top de faixas mais tocadas no momento (chart.gettoptracks)
async function buscarTopMusicas(limite) {
  const url = `${LASTFM_BASE_URL}?method=chart.gettoptracks&api_key=${LASTFM_API_KEY}&format=json&limit=${limite}`;

  const resposta = await fetch(url);

  if (!resposta.ok) {
    throw new Error(`Erro HTTP ${resposta.status}`);
  }

  const dados = await resposta.json();

  if (dados.error) {
    throw new Error(dados.message || 'Erro retornado pela API do Last.fm');
  }

  const faixas = dados?.tracks?.track || [];

  if (faixas.length === 0) {
    throw new Error('Nenhuma faixa retornada pela API.');
  }

  return faixas;
}
