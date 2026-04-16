const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function gerarToken(usuario) {
    return jwt.sign(
        {
            id: usuario.id,
            username: usuario.username,
            tipo: usuario.tipo,
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

async function login(req, res) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Usuário e senha são obrigatórios',
            });
        }

        const resultado = await query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Usuário ou senha inválidos',
            });
        }

        const usuario = resultado.rows[0];

        if (!usuario.password) {
            throw new Error('Senha do usuário está vazia no banco');
        }

        const senhaValida = await bcrypt.compare(password, usuario.password);

        if (!senhaValida) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Usuário ou senha inválidos',
            });
        }

        const token = gerarToken(usuario);

        await query('UPDATE users SET ultimo_login = NOW() WHERE id = $1', [usuario.id]);

        console.log(`✅ Login bem-sucedido: ${username}`);
        return res.status(200).json({
            sucesso: true,
            mensagem: 'Login realizado com sucesso',
            token,
            usuario: {
                id: usuario.id,
                username: usuario.username,
                tipo: usuario.tipo,
                email: usuario.email,
            },
        });

    }

    catch (error) {
        console.error('❌ ERRO NO LOGIN:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor',
        });
    }
}

async function registrar(req, res) {
    try {
        const { username, password, email, tipo } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Usuário e senha são obrigatórios',
            });
        }

        if (username.length < 3) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Usuário deve ter no mínimo 3 caracteres',
            });
        }

        const usuarioExiste = await query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (usuarioExiste.rows.length > 0) {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Usuário já existe',
            });
        }

        const senhaHasheada = await bcrypt.hash(password, 10);

        const resultado = await query(
            'INSERT INTO users (username, password, email, tipo) VALUES ($1, $2, $3, $4) RETURNING *',
            [username, senhaHasheada, email || null, 'gestor']
        );

        const novoUsuario = resultado.rows[0];
        const token = gerarToken(novoUsuario);

        console.log(`✅ Usuário registrado: ${username}`);
        return res.status(201).json({
            sucesso: true,
            mensagem: 'Usuário registrado com sucesso',
            token,
            usuario: {
                id: novoUsuario.id,
                username: novoUsuario.username,
                tipo: novoUsuario.tipo,
                email: novoUsuario.email,
            },
        });

    } catch (error) {
        console.error('❌ Erro no registro:', error);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor',
        });
    }
}

async function validarToken(req, res) {
    try {
        return res.status(200).json({
            sucesso: true,
            mensagem: 'Token válido',
            usuario: req.usuario,
        });
    } catch (error) {
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao validar token',
        });
    }
}

module.exports = {
    login,
    registrar,
    validarToken,
};