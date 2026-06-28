const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'mysql',
  user: 'user',
  password: 'user123',
  database: 'lab_db',
  waitForConnections: true,
  connectionLimit: 10
});

// Migrations executadas toda vez que a app sobe.
// Usamos IF NOT EXISTS / ADD COLUMN IF NOT EXISTS para ser idempotente.
async function runMigrations() {
  const conn = await pool.getConnection();
  try {
    // Garante que a tabela avaliacoes existe com todos os campos
    await conn.query(`
      CREATE TABLE IF NOT EXISTS avaliacoes (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id  INT NOT NULL,
        musica      VARCHAR(255) NOT NULL,
        artista     VARCHAR(255) NOT NULL,
        nota        TINYINT UNSIGNED NOT NULL,
        comentario  TEXT,
        capa_url    VARCHAR(500),
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    // Adiciona capa_url caso a tabela já existisse sem ela (volume antigo)
    await conn.query(`
      ALTER TABLE avaliacoes
        ADD COLUMN IF NOT EXISTS capa_url VARCHAR(500)
    `);

    console.log('Migrations OK');
  } catch (err) {
    console.error('Erro nas migrations:', err);
  } finally {
    conn.release();
  }
}

runMigrations();

module.exports = pool;