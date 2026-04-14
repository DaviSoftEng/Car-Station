const { query } = require('../config/database');

const SECOES_VALIDAS = ['vendas', 'financeiro', 'estoque'];

// ==================== LISTAR TODOS OS DASHBOARDS ====================
async function listarDashboards(req, res) {
    try {
        const resultado = await query('SELECT * FROM dashboards ORDER BY secao');
        return res.status(200).json({
            sucesso: true,
            dashboards: resultado.rows,
        });
    } catch (error) {
        console.error('❌ Erro ao listar dashboards:', error);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar dashboards',
        });
    }
}

// ==================== ATUALIZAR URL DE UMA SEÇÃO (ADMIN) ====================
async function atualizarDashboard(req, res) {
    try {
        const { secao } = req.params;
        const { iframe_url } = req.body;

        if (!SECOES_VALIDAS.includes(secao)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Seção inválida. Use: vendas, financeiro ou estoque',
            });
        }

        if (iframe_url) {
            try {
                const url = new URL(iframe_url);
                if (url.protocol !== 'https:') {
                    return res.status(400).json({
                        sucesso: false,
                        mensagem: 'A URL deve usar HTTPS',
                    });
                }
            } catch {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'URL inválida',
                });
            }
        }

        await query(
            'UPDATE dashboards SET iframe_url = $1, atualizado_em = CURRENT_TIMESTAMP WHERE secao = $2',
            [iframe_url || null, secao]
        );

        console.log(`✅ Dashboard "${secao}" atualizado por ${req.usuario.username}`);
        return res.status(200).json({
            sucesso: true,
            mensagem: `Dashboard "${secao}" atualizado com sucesso`,
        });

    } catch (error) {
        console.error('❌ Erro ao atualizar dashboard:', error);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar dashboard',
        });
    }
}

module.exports = {
    listarDashboards,
    atualizarDashboard,
};
