const { query } = require('../config/database');

// ==================== LISTAR TODOS ====================
async function listarDashboards(req, res) {
    try {
        let resultado;

        if (req.usuario.tipo === 'admin') {
            resultado = await query('SELECT * FROM dashboards ORDER BY secao, ordem, id');
        } else {
            resultado = await query(`
                SELECT d.* FROM dashboards d
                INNER JOIN user_dashboard_permissions udp ON d.id = udp.dashboard_id
                WHERE udp.user_id = $1
                ORDER BY d.secao, d.ordem, d.id
            `, [req.usuario.id]);
        }

        return res.status(200).json({ sucesso: true, dashboards: resultado.rows });
    } catch (error) {
        console.error('❌ Erro ao listar dashboards:', error);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar dashboards' });
    }
}

// ==================== CRIAR DASHBOARD ====================
async function criarDashboard(req, res) {
    try {
        const { secao } = req.params;
        const { nome, iframe_url } = req.body;

        if (!secao || !secao.trim()) {
            return res.status(400).json({ sucesso: false, mensagem: 'Seção inválida' });
        }

        if (!nome || !nome.trim()) {
            return res.status(400).json({ sucesso: false, mensagem: 'Nome do dashboard é obrigatório' });
        }

        let urlFinal = null;
        if (iframe_url && iframe_url.trim()) {
            try {
                const url = new URL(iframe_url.trim());
                if (url.protocol !== 'https:') {
                    return res.status(400).json({ sucesso: false, mensagem: 'A URL deve usar HTTPS' });
                }
                urlFinal = iframe_url.trim();
            } catch {
                return res.status(400).json({ sucesso: false, mensagem: 'URL inválida' });
            }
        }

        const resultado = await query(
            'INSERT INTO dashboards (secao, nome, iframe_url) VALUES ($1, $2, $3) RETURNING *',
            [secao, nome.trim(), urlFinal]
        );

        console.log(`✅ Dashboard criado: "${nome}" em ${secao} por ${req.usuario.username}`);
        return res.status(201).json({ sucesso: true, mensagem: 'Dashboard criado', dashboard: resultado.rows[0] });

    } catch (error) {
        console.error('❌ Erro ao criar dashboard:', error);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar dashboard' });
    }
}

// ==================== ATUALIZAR DASHBOARD (por ID) ====================
async function atualizarDashboard(req, res) {
    try {
        const { id } = req.params;
        const { nome, iframe_url } = req.body;

        const existe = await query('SELECT id FROM dashboards WHERE id = $1', [id]);
        if (existe.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Dashboard não encontrado' });
        }

        let urlFinal = iframe_url || null;
        if (iframe_url && iframe_url.trim()) {
            try {
                const url = new URL(iframe_url.trim());
                if (url.protocol !== 'https:') {
                    return res.status(400).json({ sucesso: false, mensagem: 'A URL deve usar HTTPS' });
                }
                urlFinal = iframe_url.trim();
            } catch {
                return res.status(400).json({ sucesso: false, mensagem: 'URL inválida' });
            }
        }

        await query(
            'UPDATE dashboards SET nome = COALESCE($1, nome), iframe_url = $2, atualizado_em = CURRENT_TIMESTAMP WHERE id = $3',
            [nome?.trim() || null, urlFinal, id]
        );

        console.log(`✅ Dashboard ${id} atualizado por ${req.usuario.username}`);
        return res.status(200).json({ sucesso: true, mensagem: 'Dashboard atualizado' });

    } catch (error) {
        console.error('❌ Erro ao atualizar dashboard:', error);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar dashboard' });
    }
}

// ==================== DELETAR DASHBOARD (por ID) ====================
async function deletarDashboard(req, res) {
    try {
        const { id } = req.params;

        const existe = await query('SELECT id, nome FROM dashboards WHERE id = $1', [id]);
        if (existe.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Dashboard não encontrado' });
        }

        await query('DELETE FROM dashboards WHERE id = $1', [id]);

        console.log(`✅ Dashboard "${existe.rows[0].nome}" removido por ${req.usuario.username}`);
        return res.status(200).json({ sucesso: true, mensagem: 'Dashboard removido' });

    } catch (error) {
        console.error('❌ Erro ao deletar dashboard:', error);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro ao deletar dashboard' });
    }
}

module.exports = { listarDashboards, criarDashboard, atualizarDashboard, deletarDashboard };
