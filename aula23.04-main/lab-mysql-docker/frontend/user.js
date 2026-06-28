const nomeUsuarioLogado = document.getElementById('nomeUsuarioLogado');
const logoutBtn         = document.getElementById('logoutBtn');
const grid              = document.getElementById('avaliacoes-grid');
const modalVer          = document.getElementById('modalVer');
const modalConfirm      = document.getElementById('modalConfirm');

const PLACEHOLDER_IMG = 'https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png';

// ── Auth ──────────────────────────────────────────────────────────────────────

async function protegerPagina() {
  try {
    const resp = await fetch('/auth/me', { credentials: 'include' });
    if (!resp.ok) { window.location.replace('index.html'); return; }
    const dados = await resp.json();
    nomeUsuarioLogado.textContent = dados.usuario.nome;
    carregarAvaliacoes();
  } catch {
    window.location.replace('index.html');
  }
}

logoutBtn.addEventListener('click', async () => {
  try { await fetch('/auth/logout', { method: 'POST', credentials: 'include' }); }
  catch (e) { console.error(e); }
  finally { window.location.replace('index.html'); }
});

// ── Carregar avaliações ───────────────────────────────────────────────────────

async function carregarAvaliacoes() {
  grid.innerHTML = '<div class="grid-loading">Carregando...</div>';

  try {
    const resp = await fetch('/avaliacoes', { credentials: 'include' });
    if (!resp.ok) throw new Error();
    const avaliacoes = await resp.json();

    if (!avaliacoes.length) {
      grid.innerHTML = '<div class="grid-erro">Você ainda não fez nenhuma avaliação.</div>';
      return;
    }

    grid.innerHTML = '';
    avaliacoes.forEach(av => grid.appendChild(criarCard(av)));

  } catch {
    grid.innerHTML = '<div class="grid-erro">Erro ao carregar avaliações.</div>';
  }
}

// ── Card (mesmo visual da home) ───────────────────────────────────────────────

function criarCard(av) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = av.id;
  card.style.backgroundImage = `url('${av.capa_url || PLACEHOLDER_IMG}')`;

  const estrelasFill = '★'.repeat(av.nota) + '☆'.repeat(5 - av.nota);

  card.innerHTML = `
    <span class="card-badge">${estrelasFill}</span>
    <div class="card-info">
      <div class="card-nome">${av.musica}</div>
      <div class="card-artista">${av.artista}</div>
      <div class="card-plays">${new Date(av.created_at).toLocaleDateString('pt-BR')}</div>
    </div>
  `;

  card.addEventListener('click', () => abrirModalVer(av));
  return card;
}

// ── Modal de visualização ─────────────────────────────────────────────────────

let avaliacaoAtual = null;

function abrirModalVer(av) {
  avaliacaoAtual = av;

  document.getElementById('verCapa').src        = av.capa_url || PLACEHOLDER_IMG;
  document.getElementById('verNome').textContent    = av.musica;
  document.getElementById('verArtista').textContent = av.artista;
  document.getElementById('verPlays').textContent   =
    'Avaliado em ' + new Date(av.created_at).toLocaleDateString('pt-BR');

  // estrelas — somente leitura
  document.querySelectorAll('#verEstrelas .estrela').forEach(e => {
    e.classList.toggle('ativa', Number(e.dataset.valor) <= av.nota);
  });

  // comentário
  const verComentario = document.getElementById('verComentario');
  verComentario.textContent = av.comentario || 'Sem comentário.';

  // limpa feedback anterior
  const fb = document.getElementById('verFeedback');
  if (fb) fb.remove();

  modalVer.showModal();
}

document.getElementById('btnFecharVer').addEventListener('click', () => modalVer.close());
modalVer.addEventListener('click', e => { if (e.target === modalVer) modalVer.close(); });

// ── Exclusão ──────────────────────────────────────────────────────────────────

document.getElementById('btnExcluir').addEventListener('click', () => {
  modalConfirm.showModal();
});

document.getElementById('btnCancelarExclusao').addEventListener('click', () => {
  modalConfirm.close();
});

modalConfirm.addEventListener('click', e => { if (e.target === modalConfirm) modalConfirm.close(); });

document.getElementById('btnConfirmarExclusao').addEventListener('click', async () => {
  if (!avaliacaoAtual) return;

  const btnConfirmar = document.getElementById('btnConfirmarExclusao');
  btnConfirmar.disabled = true;
  btnConfirmar.textContent = 'Excluindo...';

  try {
    const resp = await fetch(`/avaliacoes/${avaliacaoAtual.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!resp.ok) throw new Error();

    modalConfirm.close();
    modalVer.close();

    // remove o card do grid sem recarregar tudo
    const cardEl = grid.querySelector(`.card[data-id="${avaliacaoAtual.id}"]`);
    if (cardEl) cardEl.remove();

    // se ficou vazio
    if (!grid.querySelector('.card')) {
      grid.innerHTML = '<div class="grid-erro">Você ainda não fez nenhuma avaliação.</div>';
    }

    avaliacaoAtual = null;

  } catch {
    modalConfirm.close();
    // mostra feedback de erro no modal de visualização
    let fb = document.getElementById('verFeedback');
    if (!fb) {
      fb = document.createElement('p');
      fb.id = 'verFeedback';
      fb.className = 'modal-feedback modal-feedback--erro';
      document.querySelector('#modalVer .modal-acoes').before(fb);
    }
    fb.textContent = 'Erro ao excluir. Tente novamente.';
  } finally {
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = 'Excluir';
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────

protegerPagina();