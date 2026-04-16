require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { initDatabase } = require('./src/config/database');
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const dashboardRoutes = require('./src/routes/dashboards');
const { authMiddleware } = require('./src/middleware/auth');

const app = express();

// ==================== SEGURANÇA ====================
app.use(helmet());

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Rate limit no login (5 tentativas por 15 min)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { sucesso: false, mensagem: 'Muitas tentativas. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/auth/login', loginLimiter);

// ==================== ROTAS ====================
app.get('/', (req, res) => res.send('API rodando 🚀'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboards', dashboardRoutes);

app.get('/api/dashboard', authMiddleware, (req, res) => {
    res.json({ sucesso: true, mensagem: 'Acesso autorizado', usuario: req.usuario });
});

// ==================== ERRO GLOBAL ====================
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        sucesso: false,
        mensagem: 'Erro interno do servidor',
    });
});

// ==================== INICIAR ====================
const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    await initDatabase();
});
