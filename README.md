# SoundMark

Aplicação web para buscar artistas e faixas musicais (via Last.fm), avaliar músicas e gerenciar usuários — com backend em Node.js/Express, banco MySQL e frontend estático servido por Nginx, tudo orquestrado via Docker Compose.

## Arquitetura

```
Browser  ──▶  Nginx (porta 8080)  ──▶  App Node/Express (porta 3000)  ──▶  MySQL (porta 3306)
                  │                          │
            serve arquivos estáticos    proxy para API do Last.fm
            (frontend/) e faz proxy     (chave de API fica só no
            de /auth, /usuarios,         backend, via variável
            /avaliacoes, /lastfm         de ambiente)
```

A chave da API do Last.fm **nunca** fica exposta no frontend: todas as chamadas passam por um proxy no backend (`/lastfm/...`), que injeta a chave a partir de uma variável de ambiente.

## Estrutura do projeto

```
soundMark/
├── app/                        # Backend Node.js / Express
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── avaliacoesController.js
│   │   ├── lastfmController.js     # Proxy para a API do Last.fm
│   │   └── usuariosController.js
│   ├── middlewares/
│   │   └── auth.js                 # Middleware de autenticação (exigirLogin)
│   ├── routes/
│   │   ├── auth.js
│   │   ├── avaliacoes.js
│   │   ├── lastfm.js
│   │   └── usuarios.js
│   ├── services/
│   │   ├── avaliacoesService.js
│   │   └── usuariosService.js
│   ├── db.js                       # Conexão com o MySQL
│   ├── server.js                   # Bootstrap do Express
│   ├── package.json
│   └── Dockerfile
├── db/
│   └── init.sql                    # Script de criação/seed do banco
├── frontend/                       # HTML/CSS/JS estático (servido pelo Nginx)
│   ├── index.html / app.js
│   ├── home.html  / home.js
│   ├── user.html  / user.js
│   ├── lastfm.js                   # Funções de integração com /lastfm (proxy)
│   └── style.css
├── nginx/
│   └── default.conf                # Proxy reverso para /auth, /usuarios, /avaliacoes, /lastfm
├── docker-compose.yml
├── .env.example                    # Modelo de variáveis de ambiente
└── .gitignore
```

## Pré-requisitos

- [Docker](https://www.docker.com/) e Docker Compose instalados
- Uma chave de API do [Last.fm](https://www.last.fm/api/account/create) (gratuita)

## Configuração

### 1. Clonar o repositório

```bash
git clone <url-do-repositorio>
cd soundMark
```

> Se você recebeu o projeto como arquivo `.zip` em vez de repositório Git, apenas extraia o conteúdo e entre na pasta `soundMark` pelo terminal.

### 2. Obter a chave da API do Last.fm

1. Acesse [https://www.last.fm/api/account/create](https://www.last.fm/api/account/create) e crie uma conta de desenvolvedor (gratuita).
2. Preencha o formulário (nome da aplicação pode ser qualquer coisa, ex.: "SoundMark").
3. Após criar, copie o valor de **API key**.

### 3. Criar o arquivo `.env`

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Abra o `.env` em um editor de texto e cole sua chave, **sem aspas e sem espaços**:

```
LASTFM_API_KEY=f5a143c4b5fefd5d6776ce666e553c11
```

Checklist rápido:
- [ ] O arquivo se chama exatamente `.env` (não `.env.example`, `env`, ou `.env.txt`)
- [ ] Está na mesma pasta do `docker-compose.yml` (`soundMark/`)
- [ ] O valor da chave não tem aspas (`' '` ou `" "`)
- [ ] Não há espaços antes/depois do `=`

### 4. Verificar portas livres

Por padrão a aplicação usa as portas abaixo na sua máquina. Garanta que nenhuma esteja ocupada por outro serviço:

| Porta | Serviço |
|-------|---------|
| 8080  | Nginx (frontend) |
| 3000  | API Node.js |
| 3306  | MySQL |

Se alguma estiver em uso, edite o lado esquerdo do mapeamento em `docker-compose.yml`, por exemplo `"8081:80"`.

### 5. Subir os containers

```bash
docker compose up --build
```

Na primeira execução, o Docker vai:
- Baixar as imagens (`mysql:8.0`, `nginx:alpine`, `node:18`)
- Buildar a imagem do backend (`./app`)
- Criar o banco de dados e rodar `db/init.sql` automaticamente
- Subir os 3 containers (`mysql_lab`, `app_lab`, `nginx_lab`)

Aguarde até ver o container `app_lab` reportar que está ouvindo na porta 3000 — ele depende do MySQL estar "healthy" antes de iniciar (configurado via `healthcheck` no `docker-compose.yml`), então a primeira subida pode demorar uns 20-30 segundos.

### 6. Acessar a aplicação

Abra [http://localhost:8080](http://localhost:8080) no navegador.

### 7. Conferir se tudo está no ar

```bash
curl http://localhost:8080/health
```

Deve retornar uma resposta de sucesso da API. Se der erro, veja a seção [Solução de problemas](#solução-de-problemas) abaixo.

> ⚠️ O arquivo `.env` **não deve ser commitado** no Git — ele já está listado no `.gitignore`. Nunca suba sua chave de API real para um repositório público.

## Solução de problemas

**`app.js` (ou outro arquivo do frontend) retorna 404 no navegador**
Confira se os nomes dos arquivos dentro de `frontend/` estão exatamente como o projeto espera (`app.js`, `home.js`, `lastfm.js`, etc. — sem prefixos ou sufixos extras).

**Erro `Cannot find module './routes/lastfm'` ao subir o `app`**
O arquivo precisa se chamar `routes/lastfm.js`. Renomeie se necessário e rode `docker compose up --build` novamente.

**Site carrega muito rápido e nada funciona (botões não respondem)**
Abra o DevTools do navegador (F12 → Console) e procure erros de JavaScript. Um erro comum é carregar o mesmo arquivo `<script>` duas vezes na mesma página (gera `Identifier already declared` e trava todo o script).

**Erro 500 ou dados do Last.fm não aparecem**
Verifique se o `.env` está configurado corretamente e se o container foi reiniciado depois de criá-lo/editá-lo:

```bash
docker compose down
docker compose up --build
```

**Mudei o `.env` mas nada mudou**
Variáveis de ambiente só são lidas quando o container é (re)criado. Rode `docker compose down` seguido de `docker compose up --build` — apenas reiniciar (`restart`) não é suficiente.

**Quero resetar tudo do zero (banco incluso)**

```bash
docker compose down -v
docker compose up --build
```


## Serviços (docker-compose)

| Serviço  | Imagem/Build | Porta host | Descrição                          |
|----------|--------------|------------|-------------------------------------|
| `nginx`  | `nginx:alpine` | `8080`   | Serve o frontend e faz proxy reverso |
| `app`    | `./app`        | `3000`   | API Node/Express                     |
| `mysql`  | `mysql:8.0`    | `3306`   | Banco de dados                       |

## Endpoints da API

Todas as rotas abaixo passam pelo Nginx (`http://localhost:8080`) ou diretamente pela API (`http://localhost:3000`).

### Autenticação — `/auth`
| Método | Rota             | Descrição          |
|--------|------------------|---------------------|
| POST   | `/auth/cadastro` | Cria um novo usuário |
| POST   | `/auth/login`    | Autentica o usuário  |
| POST   | `/auth/logout`   | Encerra a sessão     |
| GET    | `/auth/me`       | Dados do usuário logado |

### Usuários — `/usuarios` (requer login)
| Método | Rota             | Descrição               |
|--------|------------------|--------------------------|
| GET    | `/usuarios`      | Lista usuários           |
| GET    | `/usuarios/:id`  | Busca usuário por ID     |
| PUT    | `/usuarios/:id`  | Atualiza usuário         |
| DELETE | `/usuarios/:id`  | Remove usuário           |

### Avaliações — `/avaliacoes` (requer login)
| Método | Rota                | Descrição                         |
|--------|---------------------|-------------------------------------|
| POST   | `/avaliacoes`       | Cria uma avaliação                  |
| GET    | `/avaliacoes`       | Lista as avaliações do usuário logado |
| DELETE | `/avaliacoes/:id`   | Remove uma avaliação                |

### Last.fm (proxy) — `/lastfm`
| Método | Rota                    | Parâmetros            | Descrição                              |
|--------|-------------------------|------------------------|------------------------------------------|
| GET    | `/lastfm/artist-info`   | `artista`              | Informações de um artista                |
| GET    | `/lastfm/top-tracks`    | `limite` (opcional)    | Faixas mais ouvidas no momento           |
| GET    | `/lastfm/track-search`  | `termo`, `limite`      | Busca faixas pelo nome                   |

### Saúde do servidor
| Método | Rota      | Descrição               |
|--------|-----------|--------------------------|
| GET    | `/health` | Verifica se a API está no ar |

## Banco de dados

O schema inicial e os dados de seed ficam em `db/init.sql`, executado automaticamente na primeira inicialização do container MySQL (via `docker-entrypoint-initdb.d`).

## Segurança

- A chave da API do Last.fm é lida via variável de ambiente (`LASTFM_API_KEY`) apenas no backend — nunca fica exposta no código do frontend nem no navegador.
- Rotas de usuários e avaliações exigem sessão autenticada (middleware `exigirLogin`).
- Senhas de usuário são armazenadas com hash (`bcryptjs`).

## Comandos úteis

```bash
# Subir os containers em background
docker compose up -d --build

# Ver logs do backend
docker compose logs -f app

# Parar e remover os containers
docker compose down

# Parar e remover containers + volumes (reseta o banco)
docker compose down -v
```