const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

// ==================== LISTAR TODOS OS USUÁRIOS ====================
async function listarUsuarios(req, res) {
    try {
        const resultado = await query(
            'SELECT id, username, tipo, email, criado_em FROM users ORDER BY criado_em DESC'
        );

        return res.status(200).json({
            sucesso: true,
            usuarios: resultado.rows,
            total: resultado.rows.length,
        });
    } catch (error) {
        console.error('❌ Erro ao listar usuários:', error);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar usuários',
        });
    }
}

// ==================== CRIAR NOVO USUÁRIO ====================
async function criarUsuario(req, res) {
    try {
        const { username, password, tipo, email } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Usuário e senha são obrigatórios',
            });
        }

        // 🔥 CORREÇÃO AQUI
        if (!['gestor', 'admin'].includes(tipo)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Tipo deve ser "gestor" ou "admin"',
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
            'INSERT INTO users (username, password, tipo, email) VALUES ($1, $2, $3, $4) RETURNING id, username, tipo, email, criado_em',
            [username, senhaHasheada, tipo, email || null]
        );

        const novoUsuario = resultado.rows[0];

        console.log(`✅ Usuário criado: ${username}`);
        return res.status(201).json({
            sucesso: true,
            mensagem: 'Usuário criado com sucesso',
            usuario: novoUsuario,
        });

    } catch (error) {
        console.error('❌ Erro ao criar usuário:', error);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao criar usuário',
        });
    }
}

// ==================== DELETAR USUÁRIO ====================
async function deletarUsuario(req, res) {
    try {
        const { id } = req.params;

        if (req.usuario.id === parseInt(id)) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Você não pode deletar sua própria conta',
            });
        }

        const usuarioExiste = await query(
            'SELECT username FROM users WHERE id = $1',
            [id]
        );

        if (usuarioExiste.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado',
            });
        }

        await query('DELETE FROM users WHERE id = $1', [id]);

        console.log(`✅ Usuário deletado: ${usuarioExiste.rows[0].username}`);
        return res.status(200).json({
            sucesso: true,
            mensagem: 'Usuário deletado com sucesso',
        });

    } catch (error) {
        console.error('❌ Erro ao deletar usuário:', error);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao deletar usuário',
        });
    }
}

// ==================== EDITAR USUÁRIO ====================
async function editarUsuario(req, res) {
    try {
        const { id } = req.params;
        const { password, tipo } = req.body;

        const usuarioExiste = await query(
            'SELECT id, username, tipo FROM users WHERE id = $1',
            [id]
        );

        if (usuarioExiste.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado',
            });
        }

        if (tipo && !['gestor', 'admin'].includes(tipo)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Tipo inválido',
            });
        }

        // Admin não pode rebaixar a própria conta
        if (req.usuario.id === parseInt(id) && tipo && tipo !== req.usuario.tipo) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Você não pode alterar seu próprio tipo',
            });
        }

        const campos = [];
        const valores = [];
        let i = 1;

        if (password) {
            if (password.length < 3) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Senha deve ter no mínimo 3 caracteres',
                });
            }
            const senhaHasheada = await bcrypt.hash(password, 10);
            campos.push(`password = $${i++}`);
            valores.push(senhaHasheada);
        }

        if (tipo) {
            campos.push(`tipo = $${i++}`);
            valores.push(tipo);
        }

        if (campos.length === 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Nenhum campo para atualizar',
            });
        }

        campos.push(`atualizado_em = CURRENT_TIMESTAMP`);
        valores.push(id);

        await query(
            `UPDATE users SET ${campos.join(', ')} WHERE id = $${i}`,
            valores
        );

        console.log(`✅ Usuário editado: ${usuarioExiste.rows[0].username}`);
        return res.status(200).json({
            sucesso: true,
            mensagem: 'Usuário atualizado com sucesso',
        });

    } catch (error) {
        console.error('❌ Erro ao editar usuário:', error);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao editar usuário',
        });
    }
}

module.exports = {
    listarUsuarios,
    criarUsuario,
    editarUsuario,
    deletarUsuario,
};