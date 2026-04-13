// ==================== IMPORTAÇÕES ====================
const { Pool } = require('pg');
require('dotenv').config();

// ==================== CRIAR POOL DE CONEXÃO ====================
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// ==================== TESTAR CONEXÃO ====================
pool.on('connect', () => {
    console.log('✅ Conectado ao PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Erro na conexão com PostgreSQL:', err);
});

// ==================== EXECUTAR QUERY ====================
async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('✅ Query executada:', { text, duration, rows: result.rowCount });
        return result;
    } catch (error) {
        console.error('❌ Erro na query:', error);
        throw error;
    }
}

// ==================== CRIAR TABELAS ====================
async function initDatabase() {
    try {
        console.log('🔄 Iniciando banco de dados...');

        await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) DEFAULT 'user',
        email VARCHAR(255),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ Tabela "users" pronta');

        const userExists = await query(
            'SELECT * FROM users WHERE username = $1',
            ['admin']
        );

        if (userExists.rows.length === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin', 10);

            await query(
                'INSERT INTO users (username, password, tipo, email) VALUES ($1, $2, $3, $4)',
                ['admin', hashedPassword, 'admin', 'admin@carstation.com']
            );
            console.log('✅ Usuário admin criado com sucesso');
        }

    } catch (error) {
        console.error('❌ Erro ao inicializar banco:', error);
        process.exit(1);
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    query,
    pool,
    initDatabase,
};