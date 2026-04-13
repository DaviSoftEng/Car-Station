require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { initDatabase } = require('./src/config/database');

// 🔥 NOVAS ROTAS
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');

const { authMiddleware } = require('./src/middleware/auth');

const app = express();

// ==================== MIDDLEWARES ====================
app.use(cors());
app.use(express.json());

// ==================== ROTA TESTE ====================
app.get('/', (req, res) => {
    res.send('API rodando 🚀');
});

// ==================== ROTAS PRINCIPAIS ====================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// ==================== ROTA PROTEGIDA 🔐 ====================
app.get('/api/dashboard', authMiddleware, (req, res) => {
    res.json({
        sucesso: true,
        mensagem: 'Acesso autorizado 🔐',
        usuario: req.usuario
    });
});

// ==================== SUBIR SERVIDOR ====================
const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    await initDatabase();
});