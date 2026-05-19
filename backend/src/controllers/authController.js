const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function gerarToken(usuario) {
    return jwt.sign(
        { id: usuario.id, username: usuario.username, tipo: usuario.tipo },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ sucesso: false, mensagem: 'Email e senha são obrigatórios' });
        }

        const resultado = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);

        if (resultado.rows.length === 0) {
            return res.status(401).json({ sucesso: false, mensagem: 'Email ou senha inválidos' });
        }

        const usuario = resultado.rows[0];
        const senhaValida = await bcrypt.compare(password, usuario.password);

        if (!senhaValida) {
            return res.status(401).json({ sucesso: false, mensagem: 'Email ou senha inválidos' });
        }

        const token = gerarToken(usuario);
        await query('UPDATE users SET ultimo_login = NOW() WHERE id = $1', [usuario.id]);

        console.log(`✅ Login: ${usuario.username} (${email})`);
        return res.status(200).json({
            sucesso: true,
            token,
            primeiro_acesso: usuario.primeiro_acesso,
            usuario: { id: usuario.id, username: usuario.username, tipo: usuario.tipo, email: usuario.email },
        });

    } catch (error) {
        console.error('❌ ERRO NO LOGIN:', error);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor' });
    }
}

async function definirSenha(req, res) {
    try {
        const { novaSenha } = req.body;

        if (!novaSenha || novaSenha.length < 6) {
            return res.status(400).json({ sucesso: false, mensagem: 'A senha deve ter no mínimo 6 caracteres' });
        }

        const senhaHasheada = await bcrypt.hash(novaSenha, 10);
        await query(
            'UPDATE users SET password = $1, primeiro_acesso = FALSE, atualizado_em = NOW() WHERE id = $2',
            [senhaHasheada, req.usuario.id]
        );

        console.log(`✅ Senha definida: ${req.usuario.username}`);
        return res.status(200).json({ sucesso: true, mensagem: 'Senha definida com sucesso' });

    } catch (error) {
        console.error('❌ Erro ao definir senha:', error);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor' });
    }
}

async function validarToken(req, res) {
    try {
        return res.status(200).json({ sucesso: true, usuario: req.usuario });
    } catch (error) {
        return res.status(500).json({ sucesso: false, mensagem: 'Erro ao validar token' });
    }
}

module.exports = { login, definirSenha, validarToken };
