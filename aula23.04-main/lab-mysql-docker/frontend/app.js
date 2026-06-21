const form = document.getElementById('usuario-form');
const nomeInput = document.getElementById('nome');
const SenhaInput = document.getElementById('senha');
const cadastrarBtnInput = document.getElementById('cadastrarBtn');
const loginBtnInput = document.getElementById('loginBtn');
const cadastrarModal = document.getElementById('cadastroDialog');
const loginModal = document.getElementById('loginDialog');
const carrosseis = document.querySelectorAll('.carrossel');

cadastrarBtnInput.onclick = () => {
  cadastrarModal.showModal();
}

loginBtnInput.onclick = () => {
  loginModal.showModal();
}

//verificar se o usuário prefere reduzir animações e, se não, adicionar a classe de animação
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  addAnimation();
}

function addAnimation() {

  carrosseis.forEach(carrossel => {
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
  });

}


function carregarDadosSalvos() {
  const dados = localStorage.getItem(STORAGE_KEY);

  if (!dados) {
    return;
  }

  try {
    const usuario = JSON.parse(dados);

    nomeInput.value = usuario.nome || '';

    

    mostrarMensagem('Dados carregados do navegador. Clique em Salvar para persistir.');
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function limparDadosLocais() {
  localStorage.removeItem(STORAGE_KEY);
}


async function carregarUsuarios() {
  try {
    const resposta = await fetch(API_URL);
    const usuarios = await resposta.json();

    tabela.innerHTML = '';

    usuarios.forEach((usuario) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${usuario.nome}</td>
        <td>${usuario.senha}</td>
        <td>
          <button class="acao" data-editar="${usuario.id}">Editar</button>
          <button class="acao btn-excluir" data-excluir="${usuario.id}">Excluir</button>
        </td>
      `;

      tabela.appendChild(tr);
    });
  } catch (error) {
    mostrarMensagem('Não foi possível carregar os usuários do servidor.', true);
  }
}

async function salvarUsuario(event) {
  event.preventDefault();

  const id = idInput.value;
  const payload = {
    id,
    nome: nomeInput.value.trim(),
    senha: SenhaInput.value.trim()
  };

  if (!payload.nome || !payload.senha) {
    mostrarMensagem('Nome e senha são obrigatórios.', true);
    return;
  }

  salvarDadosLocalmente(payload);

  try {
    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/${id}` : API_URL;

    const resposta = await fetch(url, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nome: payload.nome, email: payload.email })
    });

    if (!resposta.ok) {
      const erro = await resposta.json();
      mostrarMensagem(erro.erro || 'Falha ao salvar usuário.', true);
      return;
    }

    mostrarMensagem(id ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.');
    limparFormulario();
    carregarUsuarios();
  } catch (error) {
    mostrarMensagem('Dados salvos localmente, mas não foi possível conectar ao servidor.', true);
  }
}

async function excluirUsuario(id) {
  const confirmar = window.confirm('Deseja excluir este usuario?');

  if (!confirmar) {
    return;
  }

  const resposta = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE'
  });

  if (!resposta.ok) {
    mostrarMensagem('Falha ao excluir usuario', true);
    return;
  }

  mostrarMensagem('Usuario excluido com sucesso');
  carregarUsuarios();
}

async function editarUsuario(id) {
  const resposta = await fetch(`${API_URL}/${id}`);
  const usuario = await resposta.json();

  idInput.value = usuario.id;
  nomeInput.value = usuario.nome;
  emailInput.value = usuario.email;
}

form.addEventListener('submit', salvarUsuario);

cancelarEdicaoBtn.addEventListener('click', () => {
  limparFormulario();
  mostrarMensagem('Edicao cancelada');
});

tabela.addEventListener('click', (event) => {
  const editarId = event.target.getAttribute('data-editar');
  const excluirId = event.target.getAttribute('data-excluir');

  if (editarId) {
    editarUsuario(editarId);
  }

  if (excluirId) {
    excluirUsuario(excluirId);
  }
});

carregarDadosSalvos();
carregarUsuarios();