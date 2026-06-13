CREATE TABLE IF NOT EXISTS usuarios (
    nome VARCHAR(100) NOT NULL,
    senha VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO usuarios (nome, senha)
VALUES
    ('Ana Silva', 'ana123'),
    ('Carlos Souza', 'carlos123')
ON DUPLICATE KEY UPDATE
    nome = VALUES(nome),
    senha = VALUES(senha);