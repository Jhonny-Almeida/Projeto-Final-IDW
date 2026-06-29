# 🎵 SoundMark

> Aplicação web para avaliar músicas e artistas, com autenticação de usuários, persistência em MySQL e integração com a API do **Last.fm**. Todo o ambiente é orquestrado via **Docker Compose** (Nginx + Node.js/Express + MySQL).

---

## 📌 Visão Geral

O SoundMark permite que um usuário:

* Crie uma conta e faça login (sessão autenticada)
* Busque artistas e músicas usando a API do Last.fm
* Registre avaliações (nota de 1 a 5, comentário e capa do álbum) das músicas que ouviu
* Liste, edite seus dados e exclua suas próprias avaliações

---

## 🏗️ Arquitetura

```mermaid
flowchart LR
    User[Usuário / Browser]
    Nginx[Nginx :8080]
    API[API Node.js/Express :3000]
    MySQL[(MySQL :3306)]
    LastFM[(Last.fm API)]

    User -->|HTTP| Nginx
    Nginx -->|/usuarios, /auth, /avaliacoes, /lastfm| API
    Nginx -->|arquivos estáticos| User
    API -->|SQL| MySQL
    API -->|proxy de requisições| LastFM
```

A aplicação roda em três containers:

| Container | Papel |
| --- | --- |
| `nginx_lab` | Serve o frontend estático e faz proxy reverso das rotas da API |
| `app_lab` | API Node.js/Express (autenticação, usuários, avaliações, proxy Last.fm) |
| `mysql_lab` | Banco de dados MySQL 8, com volume persistente |

---

## 📦 Estrutura do Projeto

```text
soundMark/
├── docker-compose.yml
├── .env                       # LASTFM_API_KEY
├── db/
│   └── init.sql               # criação das tabelas usuarios e avaliacoes
├── nginx/
│   └── default.conf           # proxy reverso para a API
├── app/                       # API Node.js
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js              # bootstrap do Express
│   ├── db.js                  # pool MySQL + migrations automáticas
│   ├── middlewares/
│   │   └── auth.js            # exige sessão autenticada
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── usuariosController.js
│   │   ├── avaliacoesController.js
│   │   └── lastfmController.js
│   ├── services/
│   │   ├── usuariosService.js
│   │   └── avaliacoesService.js
│   └── routes/
│       ├── auth.js
│       ├── usuarios.js
│       └── lastfm.js
└── frontend/                  # HTML/CSS/JS puro
    ├── index.html / app.js    # cadastro/login
    ├── home.html / home.js    # busca e avaliação de músicas
    ├── user.html / user.js    # perfil e avaliações do usuário
    ├── frontend.lastfm.js     # chamadas à API do Last.fm via proxy
    └── style.css
```

---

## ⚙️ Stack Tecnológica

| Camada | Tecnologia |
| --- | --- |
| Frontend | HTML, CSS e JavaScript puro |
| Proxy / Servidor estático | Nginx |
| Backend | Node.js + Express |
| Sessão | express-session |
| Hash de senha | bcryptjs |
| Banco de Dados | MySQL 8 (driver `mysql2`) |
| API externa | Last.fm |
| Containers | Docker + Docker Compose |

---

## 🚀 Como executar

### 1. Pré-requisitos

* [Git](https://git-scm.com/downloads) instalado
* [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/install/) instalados
  * Verifique com: `docker --version` e `docker compose version`
* Uma chave de API do Last.fm ([obter aqui](https://www.last.fm/api/account/create))
* Portas `8080` (frontend) e `3306` (MySQL) livres na sua máquina

### 2. Clonar o repositório

```bash
git clone https://github.com/<seu-usuario>/aula23.04.git
cd aula23.04
```

> Troque a URL acima pela URL real do repositório (HTTPS ou SSH). Se você baixou o projeto como `.zip`, basta extrair o arquivo e entrar na pasta extraída.

### 3. Configurar variáveis de ambiente

Entre na pasta do projeto e crie/edite o arquivo `.env`:

```bash
cd soundMark
```

```env
# soundMark/.env
LASTFM_API_KEY=sua_chave_aqui
```

> Se o repositório tiver um `.env.example`, copie-o com `cp .env.example .env` e depois edite com sua chave.

### 4. Subir o ambiente com Docker

```bash
docker compose up -d --build
```

> Use `docker-compose` (com hífen) caso esteja usando uma versão mais antiga do Docker.

Esse comando vai:
1. Construir a imagem da API Node.js (`app/Dockerfile`);
2. Baixar e iniciar o container do MySQL, executando `db/init.sql` na primeira inicialização;
3. Iniciar o Nginx, servindo o frontend e fazendo proxy para a API.

### 5. Verificar se tudo subiu corretamente

```bash
docker compose ps
```

Você deve ver três containers com status `Up`: `nginx_lab`, `app_lab` e `mysql_lab`.

Para checar se a API está respondendo:

```bash
curl http://localhost:3000/health
```

Para acompanhar os logs em tempo real (útil para depurar problemas):

```bash
docker compose logs -f app
```

### 6. Acessar a aplicação

* Frontend: http://localhost:8080
* API (sem passar pelo Nginx): http://localhost:3000

### 7. Parar o ambiente

```bash
docker compose down
```

Para parar **e** remover também os dados do banco (reinício "limpo"):

```bash
docker compose down -v
```

### 8. Reiniciar após alterações no código

Se você alterar arquivos da API (`app/`), é necessário reconstruir a imagem:

```bash
docker compose up -d --build app
```

Alterações no `frontend/` não exigem rebuild — basta atualizar a página no navegador.

---

## 🧠 Banco de Dados

O script `db/init.sql` é executado automaticamente na primeira inicialização do container MySQL e cria as tabelas:

* **usuarios** — `id`, `nome` (único), `senha_hash`, `created_at`
* **avaliacoes** — `id`, `usuario_id` (FK), `musica`, `artista`, `nota` (1–5), `comentario`, `capa_url`, `created_at`

Além disso, o arquivo `app/db.js` executa migrations idempotentes a cada inicialização da API, garantindo que a tabela `avaliacoes` exista com todas as colunas mesmo em volumes antigos.

| Parâmetro | Valor |
| --- | --- |
| Host | mysql |
| Porta | 3306 |
| Database | lab_db |
| Usuário | user |
| Senha | user123 |

---

## 🌐 Endpoints da API

### Autenticação (`/auth`)

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/auth/cadastro` | Cria um novo usuário (nome, senha, confirmarSenha) |
| POST | `/auth/login` | Autentica o usuário e abre sessão |
| POST | `/auth/logout` | Encerra a sessão |
| GET | `/auth/me` | Retorna o usuário autenticado na sessão |

### Usuários (`/usuarios`) — requer login

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/usuarios` | Lista todos os usuários |
| GET | `/usuarios/:id` | Busca um usuário por ID |
| PUT | `/usuarios/:id` | Atualiza o nome de um usuário |
| DELETE | `/usuarios/:id` | Remove um usuário |

### Avaliações (`/avaliacoes`) — requer login

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/avaliacoes` | Cria uma avaliação (música, artista, nota, comentário, capa_url) |
| GET | `/avaliacoes` | Lista as avaliações do usuário logado |
| DELETE | `/avaliacoes/:id` | Remove uma avaliação do usuário logado |

### Last.fm (`/lastfm`) — proxy para a API externa

| Método | Rota | Parâmetros | Descrição |
| --- | --- | --- | --- |
| GET | `/lastfm/artist-info` | `artista` | Informações sobre um artista |
| GET | `/lastfm/top-tracks` | `limite` (opcional) | Ranking de músicas mais populares |
| GET | `/lastfm/track-search` | `termo`, `limite` (opcional, padrão 18) | Busca músicas por termo |

### Health check

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/health` | Verifica se a API está no ar |

---

## 🔐 Autenticação

A autenticação é feita via **sessão** (`express-session`), armazenada em memória no servidor. Após login ou cadastro, o servidor guarda `{ id, nome }` na sessão e o middleware `exigirLogin` bloqueia rotas protegidas (usuários, avaliações) para quem não estiver autenticado, retornando `401`.

---

## 🛠️ Troubleshooting (problemas comuns)

| Problema | Possível causa / solução |
| --- | --- |
| `port is already allocated` | Outra aplicação já está usando a porta 8080 ou 3306. Pare o serviço conflitante ou altere a porta mapeada no `docker-compose.yml` |
| API retorna erro de conexão com o banco | O MySQL pode ainda estar inicializando. Aguarde alguns segundos e veja os logs: `docker compose logs -f mysql` |
| Busca de música não retorna resultados | Verifique se `LASTFM_API_KEY` está definida corretamente no `.env` e se o container `app` foi reconstruído após a alteração |
| Alterações no código não aparecem | Rode `docker compose up -d --build app` para reconstruir a imagem da API |
| Quero recomeçar do zero | `docker compose down -v` remove containers e o volume do banco; depois suba novamente com `docker compose up -d --build` |
