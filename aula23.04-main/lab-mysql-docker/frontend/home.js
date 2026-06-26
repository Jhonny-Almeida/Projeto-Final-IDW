const nomeUsuarioLogado = document.getElementById('nomeUsuarioLogado');
const logoutBtn = document.getElementById('logoutBtn');

async function protegerPagina() {
  try {
    const resposta = await fetch('/auth/me', { credentials: 'include' });
    if (!resposta.ok) { window.location.href = 'index.html'; return; }
    const dados = await resposta.json();
    nomeUsuarioLogado.textContent = `Olá, ${dados.usuario.nome}`;
  } catch (e) {
    window.location.href = 'index.html';
  }
}

logoutBtn.addEventListener('click', async () => {
  try { await fetch('/auth/logout', { method: 'POST', credentials: 'include' }); }
  catch (e) { console.error(e); }
  finally { window.location.href = 'index.html'; }
});

protegerPagina();

const LASTFM_API_KEY    = 'f5a143c4b5fefd5d6776ce666e553c11';
const LASTFM_BASE_URL   = 'https://ws.audioscrobbler.com/2.0/';
const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';
const PLACEHOLDER_HASH  = '2a96cbd8b46e442fc41c2b86b821562f';
const PLACEHOLDER_IMG   = `https://lastfm.freetls.fastly.net/i/u/300x300/${PLACEHOLDER_HASH}.png`;
const TOTAL_CARDS       = 18;

async function carregarMusicasMaisTocadas() {
  const grid = document.getElementById('musicas-grid');
  if (!grid) return;

  try {
    const resp  = await fetch(`${LASTFM_BASE_URL}?method=chart.gettoptracks&api_key=${LASTFM_API_KEY}&format=json&limit=${TOTAL_CARDS}`);
    if (!resp.ok) throw new Error();
    const dados = await resp.json();
    if (dados.error) throw new Error();
    const faixas = dados?.tracks?.track || [];
    if (!faixas.length) throw new Error();

    grid.innerHTML = '';
    faixas.forEach((faixa, i) => grid.appendChild(criarCard(faixa, i + 1)));
    buscarCapasFaltantes(faixas, grid);
  } catch (err) {
    grid.innerHTML = '<div class="grid-erro">Não foi possível carregar as músicas.</div>';
  }
}

function criarCard(faixa, pos) {
  const nome    = faixa.name         || 'Faixa desconhecida';
  const artista = faixa.artist?.name || 'Artista desconhecido';
  const plays   = faixa.playcount ? Number(faixa.playcount).toLocaleString('pt-BR') + ' execuções' : '';
  const imgSrc  = melhorCapa(faixa.image) || PLACEHOLDER_IMG;

  // Card usa background-image — sem filhos com height:100%, sem aspect-ratio, sem padding-top hack.
  // A proporção quadrada é garantida pelo padding-bottom:100% no próprio .card.
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.pos = pos;
  card.style.backgroundImage = `url('${imgSrc}')`;

  card.innerHTML = `
    <span class="card-badge">#${pos}</span>
    <div class="card-info">
      <div class="card-nome">${nome}</div>
      <div class="card-artista">${artista}</div>
      ${plays ? `<div class="card-plays">${plays}</div>` : ''}
    </div>
  `;

  return card;
}

function melhorCapa(imgs) {
  if (!Array.isArray(imgs) || !imgs.length) return null;
  for (const tam of ['extralarge', 'large', 'medium', 'small']) {
    const f = imgs.find(i => i.size === tam && i['#text'] && !i['#text'].includes(PLACEHOLDER_HASH));
    if (f) return f['#text'];
  }
  return null;
}

function buscarCapasFaltantes(faixas, grid) {
  faixas.forEach((faixa, i) => {
    if (melhorCapa(faixa.image)) return;
    const pos = i + 1;
    const artista = faixa.artist?.name || '';
    buscarLastfm(artista)
      .then(u => u || buscarItunes(artista))
      .then(u => {
        if (!u) return;
        const card = grid.querySelector(`.card[data-pos="${pos}"]`);
        if (card) card.style.backgroundImage = `url('${u}')`;
      });
  });
}

async function buscarLastfm(artista) {
  if (!artista) return null;
  try {
    const r = await fetch(`${LASTFM_BASE_URL}?method=artist.getinfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(artista)}&format=json`);
    if (!r.ok) return null;
    return melhorCapa((await r.json())?.artist?.image);
  } catch { return null; }
}

async function buscarItunes(artista) {
  if (!artista) return null;
  try {
    const r = await fetch(`${ITUNES_SEARCH_URL}?term=${encodeURIComponent(artista)}&media=music&entity=song&attribute=artistTerm&limit=1`);
    if (!r.ok) return null;
    const url = (await r.json())?.results?.[0]?.artworkUrl100;
    return url ? url.replace('100x100bb', '600x600bb') : null;
  } catch { return null; }
}

carregarMusicasMaisTocadas();