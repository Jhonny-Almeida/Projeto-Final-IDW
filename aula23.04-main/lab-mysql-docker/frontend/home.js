const nomeUsuarioLogado = document.getElementById('nomeUsuarioLogado');
const logoutBtn         = document.getElementById('logoutBtn');
const searchForm        = document.getElementById('searchForm');
const searchInput       = document.getElementById('searchInput');
const gridTitulo        = document.getElementById('gridTitulo');
const btnVoltar         = document.getElementById('btnVoltar');

// ── Autenticação ──────────────────────────────────────────────────────────────

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

// ── Constantes Last.fm ────────────────────────────────────────────────────────

const LASTFM_API_KEY    = 'f5a143c4b5fefd5d6776ce666e553c11';
const LASTFM_BASE_URL   = 'https://ws.audioscrobbler.com/2.0/';
const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';
const PLACEHOLDER_HASH  = '2a96cbd8b46e442fc41c2b86b821562f';
const PLACEHOLDER_IMG   = `https://lastfm.freetls.fastly.net/i/u/300x300/${PLACEHOLDER_HASH}.png`;
const TOTAL_CARDS       = 18;

// ── Helpers de imagem ─────────────────────────────────────────────────────────

function melhorCapa(imgs) {
  if (!Array.isArray(imgs) || !imgs.length) return null;
  for (const tam of ['extralarge', 'large', 'medium', 'small']) {
    const f = imgs.find(i => i.size === tam && i['#text'] && !i['#text'].includes(PLACEHOLDER_HASH));
    if (f) return f['#text'];
  }
  return null;
}

async function buscarLastfm(artista) {
  if (!artista) return null;
  try {
    const r = await fetch(`${LASTFM_BASE_URL}?method=artist.getinfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(artista)}&format=json`);
    if (!r.ok) return null;
    return melhorCapa((await r.json())?.artist?.image);
  } catch { return null; }
}

async function buscarItunes(termo) {
  if (!termo) return null;
  try {
    const r = await fetch(`${ITUNES_SEARCH_URL}?term=${encodeURIComponent(termo)}&media=music&entity=song&attribute=artistTerm&limit=1`);
    if (!r.ok) return null;
    const url = (await r.json())?.results?.[0]?.artworkUrl100;
    return url ? url.replace('100x100bb', '600x600bb') : null;
  } catch { return null; }
}

// ── Criação de card ───────────────────────────────────────────────────────────

function criarCard(dados) {
  // dados: { nome, artista, plays, imgSrc, badge }
  const card = document.createElement('div');
  card.className = 'card';
  if (dados.badge) card.dataset.pos = dados.badge;
  card.style.backgroundImage = `url('${dados.imgSrc || PLACEHOLDER_IMG}')`;

  card.innerHTML = `
    ${dados.badge ? `<span class="card-badge">#${dados.badge}</span>` : ''}
    <div class="card-info">
      <div class="card-nome">${dados.nome}</div>
      <div class="card-artista">${dados.artista}</div>
      ${dados.plays ? `<div class="card-plays">${dados.plays}</div>` : ''}
    </div>
  `;
  return card;
}

function setGridLoading(msg = 'Carregando...') {
  document.getElementById('musicas-grid').innerHTML =
    `<div class="grid-loading">${msg}</div>`;
}

function setGridErro(msg = 'Não foi possível carregar as músicas.') {
  document.getElementById('musicas-grid').innerHTML =
    `<div class="grid-erro">${msg}</div>`;
}

// ── Top músicas (estado inicial) ──────────────────────────────────────────────

async function carregarMusicasMaisTocadas() {
  const grid = document.getElementById('musicas-grid');
  setGridLoading();

  try {
    const resp  = await fetch(`${LASTFM_BASE_URL}?method=chart.gettoptracks&api_key=${LASTFM_API_KEY}&format=json&limit=${TOTAL_CARDS}`);
    if (!resp.ok) throw new Error();
    const dados = await resp.json();
    if (dados.error) throw new Error();
    const faixas = dados?.tracks?.track || [];
    if (!faixas.length) throw new Error();

    grid.innerHTML = '';
    faixas.forEach((faixa, i) => {
      const card = criarCard({
        badge:   i + 1,
        nome:    faixa.name              || 'Faixa desconhecida',
        artista: faixa.artist?.name      || 'Artista desconhecido',
        plays:   faixa.playcount ? Number(faixa.playcount).toLocaleString('pt-BR') + ' execuções' : '',
        imgSrc:  melhorCapa(faixa.image) || PLACEHOLDER_IMG,
      });
      grid.appendChild(card);
    });

    // busca capas em paralelo para cards sem imagem
    faixas.forEach((faixa, i) => {
      if (melhorCapa(faixa.image)) return;
      const pos     = i + 1;
      const artista = faixa.artist?.name || '';
      buscarLastfm(artista)
        .then(u => u || buscarItunes(artista))
        .then(u => {
          if (!u) return;
          const c = grid.querySelector(`.card[data-pos="${pos}"]`);
          if (c) c.style.backgroundImage = `url('${u}')`;
        });
    });

  } catch {
    setGridErro();
  }
}

// ── Pesquisa (track.search) ───────────────────────────────────────────────────

async function pesquisarMusicas(termo) {
  const grid = document.getElementById('musicas-grid');
  setGridLoading(`Buscando "${termo}"...`);

  gridTitulo.textContent = `Resultados para "${termo}"`;
  btnVoltar.hidden = false;

  try {
    const url = `${LASTFM_BASE_URL}?method=track.search&track=${encodeURIComponent(termo)}&api_key=${LASTFM_API_KEY}&format=json&limit=18`;
    const resp  = await fetch(url);
    if (!resp.ok) throw new Error();
    const dados = await resp.json();

    const faixas = dados?.results?.trackmatches?.track || [];

    if (!faixas.length) {
      setGridErro(`Nenhum resultado encontrado para "${termo}".`);
      return;
    }

    grid.innerHTML = '';

    // cria os cards e já dispara busca de capa para cada um em paralelo
    faixas.forEach((faixa, i) => {
      const nome    = faixa.name        || 'Faixa desconhecida';
      const artista = faixa.artist      || 'Artista desconhecido';
      const imgSrc  = melhorCapa(faixa.image) || PLACEHOLDER_IMG;

      const card = criarCard({ nome, artista, imgSrc });
      card.dataset.search = i; // índice para atualizar capa depois
      grid.appendChild(card);

      // busca capa se for placeholder
      const ehPlaceholder = !melhorCapa(faixa.image);
      if (ehPlaceholder) {
        buscarLastfm(artista)
          .then(u => u || buscarItunes(artista))
          .then(u => {
            if (!u) return;
            const c = grid.querySelector(`.card[data-search="${i}"]`);
            if (c) c.style.backgroundImage = `url('${u}')`;
          });
      }
    });

  } catch {
    setGridErro('Erro ao buscar músicas. Tente novamente.');
  }
}

// ── Eventos ───────────────────────────────────────────────────────────────────

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const termo = searchInput.value.trim();
  if (!termo) return;
  pesquisarMusicas(termo);
});

// pesquisa ao vivo com debounce de 500ms
let debounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const termo = searchInput.value.trim();

  if (!termo) {
    // campo limpo → volta ao top
    voltarAoTop();
    return;
  }

  debounceTimer = setTimeout(() => pesquisarMusicas(termo), 500);
});

function voltarAoTop() {
  gridTitulo.textContent = 'Músicas mais tocadas do momento';
  btnVoltar.hidden = true;
  searchInput.value = '';
  carregarMusicasMaisTocadas();
}

btnVoltar.addEventListener('click', voltarAoTop);

// ── Init ──────────────────────────────────────────────────────────────────────

carregarMusicasMaisTocadas();