const cadastrarBtnInput = document.getElementById('cadastrarBtn');
const loginBtnInput = document.getElementById('loginBtn');
const cadastrarModal = document.getElementById('cadastroDialog');
const loginModal = document.getElementById('loginDialog');
const carrosseis = document.querySelectorAll('.carrossel');

const cadastroForm = document.getElementById('cadastroForm');
const loginForm = document.getElementById('loginForm');
const cadastroErro = document.getElementById('cadastroErro');
const loginErro = document.getElementById('loginErro');
const botoesVisitante = document.getElementById('botoesVisitante');
const areaLogado = document.getElementById('areaLogado');
const nomeUsuarioLogado = document.getElementById('nomeUsuarioLogado');
const logoutBtn = document.getElementById('logoutBtn');

// --- Configuração da API do Last.fm ---
const LASTFM_API_KEY = 'f5a143c4b5fefd5d6776ce666e553c11';
const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

cadastrarBtnInput.onclick = () => {
  cadastroErro.textContent = '';
  cadastrarModal.showModal();
}

loginBtnInput.onclick = () => {
  loginErro.textContent = '';
  loginModal.showModal();
}

document.querySelectorAll('.fechar-modal').forEach((botao) => {
  botao.addEventListener('click', () => {
    document.getElementById(botao.dataset.modal).close();
  });
});

//verificar se o usuário prefere reduzir animações
const reduzirAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function addAnimation(carrossel) {
  carrossel.setAttribute('data-animate', 'true');

  const grupoAlbuns = carrossel.querySelector('.grupo-albuns');
  const albuns = Array.from(grupoAlbuns.children);
  const larguraOriginal = grupoAlbuns.scrollWidth;
  const estiloGrupo = window.getComputedStyle(grupoAlbuns);
  const gap = parseFloat(estiloGrupo.columnGap || estiloGrupo.gap || '0');

  albuns.forEach((item) => {
    const itemDuplicado = item.cloneNode(true);
    itemDuplicado.setAttribute('aria-hidden', 'true');
    grupoAlbuns.appendChild(itemDuplicado);
  });
  carrossel.style.setProperty('--carrossel-distance', `${larguraOriginal + gap}px`);
  carrossel.style.setProperty('--carrossel-duration', '60s');
}

// --- Top de músicas mais tocadas (Last.fm - chart.getTopTracks + capa via álbum da faixa) ---

const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';
const CAPA_PLACEHOLDER = 'https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png';
const LASTFM_LIMITE_FAIXAS = 15;

async function carregarTopMusicas() {
  const carrossel = document.getElementById('carrossel-topmusicas');
  const grupo = document.getElementById('grupo-topmusicas');

  if (!grupo || !carrossel) {
    return;
  }

  const url = `${LASTFM_BASE_URL}?method=chart.gettoptracks&api_key=${LASTFM_API_KEY}&format=json&limit=${LASTFM_LIMITE_FAIXAS}`;

  try {
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

    grupo.innerHTML = '';

    faixas.forEach((faixa, indice) => {
      grupo.appendChild(criarCardMusica(faixa, indice + 1));
    });

    // a animação usa a largura calculada das cards já inseridas, então pode iniciar
    // mesmo antes das capas (buscadas em paralelo) terminarem de carregar
    if (!reduzirAnimacao) {
      addAnimation(carrossel);
    }

    buscarCapasFaltantes(faixas, grupo);
  } catch (error) {
    console.error('Falha ao carregar top músicas do Last.fm:', error);
    grupo.innerHTML = '<div class="album album-erro">Não foi possível carregar o top de músicas do Last.fm.</div>';
  }
}

function criarCardMusica(faixa, posicao) {
  const card = document.createElement('div');
  card.classList.add('musica-card');
  card.dataset.id = String(posicao);

  const nomeMusica = faixa.name || 'Faixa desconhecida';
  const nomeArtista = faixa.artist?.name || 'Artista desconhecido';
  const linkLastfm = faixa.url || 'https://www.last.fm';
  const playcount = faixa.playcount ? Number(faixa.playcount).toLocaleString('pt-BR') : null;

  const capa = obterMelhorCapa(faixa.image) || CAPA_PLACEHOLDER;

  card.innerHTML = `
    <a href="${linkLastfm}" target="_blank" rel="noopener noreferrer" class="capa-wrapper">
      <span class="posicao">#${posicao}</span>
      <img src="${capa}" alt="Foto de ${nomeArtista}" loading="lazy" />
      <div class="musica-info">
        <p class="musica-nome">${nomeMusica}</p>
        <p class="musica-artista">${nomeArtista}</p>
        ${playcount ? `<p class="musica-plays">${playcount} execuções</p>` : ''}
      </div>
    </a>
  `;

  return card;
}

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

// estratégia de imagem: foto do artista.
// 1ª tentativa: artist.getinfo do Last.fm (pode vir vazio, a Last.fm removeu boa parte dessas imagens).
// 2ª tentativa: iTunes Search API, buscando pelo nome do artista.
function buscarCapasFaltantes(faixas, grupo) {
  faixas.forEach((faixa, indice) => {
    const temCapaValida = !!obterMelhorCapa(faixa.image);

    if (temCapaValida) {
      return;
    }

    const posicao = indice + 1;
    const nomeArtista = faixa.artist?.name || '';

    buscarFotoArtistaLastfm(nomeArtista)
      .then((urlCapa) => urlCapa || buscarFotoArtistaNaItunes(nomeArtista))
      .then((urlCapaFinal) => {
        if (!urlCapaFinal) {
          console.warn(`Sem foto disponível para o artista "${nomeArtista}"`);
          return;
        }

        // atualiza tanto o card original quanto a cópia clonada pela animação do carrossel
        const cards = grupo.querySelectorAll(`.musica-card[data-id="${posicao}"] img`);

        if (cards.length === 0) {
          console.warn(`Nenhum card encontrado para data-id="${posicao}"`);
        }

        cards.forEach((img) => {
          img.src = urlCapaFinal;
        });
      });
  });
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

carregarTopMusicas();

// --- Autenticação (cadastro, login, logout, sessão) ---

cadastroForm.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  cadastroErro.textContent = '';

  const usuario = document.getElementById('cadastro-usuario').value.trim();
  const senha = document.getElementById('cadastro-senha').value;
  const confirmarSenha = document.getElementById('cadastro-confirmar-senha').value;

  if (senha !== confirmarSenha) {
    cadastroErro.textContent = 'As senhas não coincidem';
    return;
  }

  try {
    const resposta = await fetch('/auth/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ nome: usuario, senha, confirmarSenha })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      cadastroErro.textContent = dados.erro || 'Não foi possível concluir o cadastro';
      return;
    }

    cadastroForm.reset();
    cadastrarModal.close();
    aplicarSessaoLogada(dados.usuario);
  } catch (error) {
    console.error('Erro ao cadastrar:', error);
    cadastroErro.textContent = 'Erro de conexão com o servidor';
  }
});

loginForm.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  loginErro.textContent = '';

  const usuario = document.getElementById('login-usuario').value.trim();
  const senha = document.getElementById('login-senha').value;

  try {
    const resposta = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ nome: usuario, senha })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      loginErro.textContent = dados.erro || 'Não foi possível fazer login';
      return;
    }

    loginForm.reset();
    loginModal.close();
    aplicarSessaoLogada(dados.usuario);
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    loginErro.textContent = 'Erro de conexão com o servidor';
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
  } finally {
    aplicarSessaoDeslogada();
  }
});

function aplicarSessaoLogada(usuario) {
  nomeUsuarioLogado.textContent = `Olá, ${usuario.nome}`;
  botoesVisitante.hidden = true;
  areaLogado.hidden = false;
}

function aplicarSessaoDeslogada() {
  botoesVisitante.hidden = false;
  areaLogado.hidden = true;
}

// ao carregar a página, verifica se já existe uma sessão ativa no backend
async function verificarSessaoAtual() {
  try {
    const resposta = await fetch('/auth/me', { credentials: 'include' });

    if (!resposta.ok) {
      aplicarSessaoDeslogada();
      return;
    }

    const dados = await resposta.json();
    aplicarSessaoLogada(dados.usuario);
  } catch (error) {
    console.warn('Não foi possível verificar a sessão atual', error);
    aplicarSessaoDeslogada();
  }
}

verificarSessaoAtual();