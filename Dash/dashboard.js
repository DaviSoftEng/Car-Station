// PROTEÇÃO DE LOGIN

const usuarioLogado = localStorage.getItem('user');
const tipoUsuario = localStorage.getItem('userType') || 'gestor';
const token = localStorage.getItem('token');

if (!usuarioLogado || !token) {
  localStorage.clear();
  window.location.href = '../index.html';
}

// ==================== VALIDAR TOKEN NA INICIALIZAÇÃO ====================
async function validarSessao() {
  try {
    const response = await fetch(`${API_BASE}/auth/validar`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      localStorage.clear();
      window.location.href = '../index.html';
    }
  } catch {
    // Servidor offline: mantém sessão local, não expulsa o usuário
  }
}

// ==================== API ====================
const API_BASE = 'http://localhost:3001/api';

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// ==================== VARIÁVEIS GLOBAIS ====================
let confirmacaoPendente = null;
let users = [];

// ==================== NOTIFICAÇÕES (TOAST) ====================
function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type}`;

  setTimeout(() => {
    notification.classList.add('hidden');
  }, 3500);
}

// ==================== MODAL DE CONFIRMAÇÃO ====================
function abrirConfirmacao(titulo, mensagem, callback) {
  const modal = document.getElementById('confirmModal');
  document.getElementById('confirmTitle').textContent = titulo;
  document.getElementById('confirmMessage').textContent = mensagem;

  confirmacaoPendente = callback;
  modal.classList.remove('hidden');
}

function cancelarConfirmacao() {
  const modal = document.getElementById('confirmModal');
  modal.classList.add('hidden');
  confirmacaoPendente = null;
}

function executarConfirmacao() {
  if (confirmacaoPendente) {
    confirmacaoPendente();
  }
  cancelarConfirmacao();
}

// Fechar modal ao clicar fora
document.addEventListener('click', function (event) {
  const modal = document.getElementById('confirmModal');
  if (event.target === modal) {
    cancelarConfirmacao();
  }
});

// ==================== PERMISSÕES ====================
function aplicarPermissoes() {
  const configBtn = document.querySelector('.bottom-menu a.config');

  if (tipoUsuario !== 'admin') {
    if (configBtn) {
      configBtn.style.display = 'none';
    }
  }

  // Atualizar badge do usuário
  const userBadge = document.getElementById('userBadge');
  if (tipoUsuario === 'admin') {
    userBadge.textContent = 'Admin';
    userBadge.classList.add('admin');
  } else {
    userBadge.textContent = 'Gestor';
  }
}

// ==================== NAVEGAÇÃO ====================
function mostrarSecao(secaoId) {
  // Fechar menu mobile
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.remove('mobile-open');
  sidebar.classList.add('mobile-closed');

  // Esconder todas as seções
  document.querySelectorAll('.conteudo').forEach(secao => {
    secao.classList.add('hidden');
  });

  // Mostrar seção selecionada
  const secao = document.getElementById(secaoId);
  if (secao) {
    secao.classList.remove('hidden');
  }

  // Atualizar menu ativo
  document.querySelectorAll('.menu a, .bottom-menu a').forEach(link => {
    link.classList.remove('active');
  });

  const linkAtivo = document.querySelector(`[onclick="mostrarSecao('${secaoId}')"]`);
  if (linkAtivo) {
    linkAtivo.classList.add('active');
  }
}

function abrirDashboard(nome) {
  mostrarSecao(nome);
}

// ==================== MENU MOBILE ====================
function toggleMobileMenu() {
  const sidebar = document.querySelector('.sidebar');

  if (sidebar.classList.contains('mobile-closed')) {
    sidebar.classList.remove('mobile-closed');
    sidebar.classList.add('mobile-open');
  } else {
    sidebar.classList.remove('mobile-open');
    sidebar.classList.add('mobile-closed');
  }
}

// ==================== CADASTRO DE USUÁRIO ====================
function validarNovoUsuario(usuario, senha, tipo) {
  if (!usuario.trim() || !senha.trim()) {
    showNotification('Preencha todos os campos', 'error');
    return false;
  }

  if (usuario.trim().length < 3) {
    showNotification('Usuário deve ter no mínimo 3 caracteres', 'error');
    return false;
  }

  if (senha.length < 3) {
    showNotification('Senha deve ter no mínimo 3 caracteres', 'error');
    return false;
  }

  if (!['gestor', 'admin'].includes(tipo)) {
    showNotification('Tipo de usuário inválido', 'error');
    return false;
  }

  return true;
}

async function cadastrarUsuario() {
  const usuario = document.getElementById('novoUsuario').value.trim();
  const senha = document.getElementById('novaSenha').value;
  const tipo = document.getElementById('tipoUsuario').value;

  if (!validarNovoUsuario(usuario, senha, tipo)) {
    return;
  }

  const btn = document.querySelector('.config-box .btn-primary');
  btn.disabled = true;
  btn.textContent = 'Cadastrando...';

  try {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ username: usuario, password: senha, tipo })
    });

    const data = await response.json();

    if (data.sucesso) {
      document.getElementById('novoUsuario').value = '';
      document.getElementById('novaSenha').value = '';
      document.getElementById('tipoUsuario').value = 'gestor';

      showNotification(`Usuário "${usuario}" cadastrado com sucesso!`, 'success');
      await listarUsuarios();
    } else {
      showNotification(data.mensagem || 'Erro ao cadastrar usuário', 'error');
    }
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    showNotification('Erro de conexão com o servidor', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Cadastrar Usuário';
  }
}

// ==================== LISTAR USUÁRIOS ====================
async function listarUsuarios() {
  const container = document.getElementById('usersList');
  if (!container) return;

  container.innerHTML = '<p style="color:#999; text-align:center;">Carregando...</p>';

  try {
    const response = await fetch(`${API_BASE}/users`, {
      headers: getAuthHeaders()
    });

    if (response.status === 401) {
      localStorage.clear();
      window.location.href = '../index.html';
      return;
    }

    const data = await response.json();

    if (!data.sucesso) {
      container.innerHTML = '<p style="color:#e74c3c; text-align:center;">Erro ao carregar usuários</p>';
      return;
    }

    users = data.usuarios;

    if (users.length === 0) {
      container.innerHTML = `
        <div class="empty-list">
          <div class="empty-list-icon">👥</div>
          <p>Nenhum usuário cadastrado</p>
        </div>
      `;
      return;
    }

    container.innerHTML = users.map(u => {
      const podeRemover = u.username !== usuarioLogado;
      return `
        <div class="user-item">
          <div class="user-item-info">
            <span class="user-item-name">👤 ${u.username}</span>
            <span class="user-item-type ${u.tipo === 'admin' ? 'admin' : 'user'}">
              ${u.tipo === 'admin' ? '👨‍💼 Admin' : '📊 Gestor(a)'}
            </span>
          </div>
          <div class="user-item-actions">
            ${podeRemover ? `
              <button class="btn-delete" onclick="confirmarRemoverUsuario(${u.id}, '${u.username}')">
                🗑️ Remover
              </button>
            ` : `
              <span style="color: #999; font-size: 12px;">Seu usuário</span>
            `}
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    container.innerHTML = '<p style="color:#e74c3c; text-align:center;">Erro de conexão com o servidor</p>';
  }
}

// ==================== REMOVER USUÁRIO ====================
function confirmarRemoverUsuario(id, username) {
  abrirConfirmacao(
    'Remover usuário',
    `Tem certeza que deseja remover "${username}"? Esta ação não pode ser desfeita.`,
    () => removerUsuario(id, username)
  );
}

async function removerUsuario(id, username) {
  try {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (data.sucesso) {
      showNotification(`Usuário "${username}" removido com sucesso`, 'success');
      await listarUsuarios();
    } else {
      showNotification(data.mensagem || 'Erro ao remover usuário', 'error');
    }
  } catch (error) {
    console.error('Erro ao remover usuário:', error);
    showNotification('Erro de conexão com o servidor', 'error');
  }
}

// ==================== LOGOUT ====================
function confirmarSair() {
  abrirConfirmacao(
    'Fazer logout',
    'Deseja realmente sair da sua conta?',
    sair
  );
}

function sair() {
  localStorage.clear();
  window.location.href = '../index.html';
}

// ==================== INICIALIZAÇÃO ====================
window.addEventListener('DOMContentLoaded', async function () {
  await validarSessao();

  // Atualizar UI
  document.getElementById('username').textContent = usuarioLogado;

  // Aplicar permissões
  aplicarPermissoes();

  // Carregar lista de usuários (se for admin)
  if (tipoUsuario === 'admin') {
    listarUsuarios();
  }

  // Mostrar seção inicial
  mostrarSecao('inicio');

  // Responsividade mobile
  const sidebar = document.querySelector('.sidebar');
  if (window.innerWidth <= 768) {
    sidebar.classList.add('mobile-closed');
  }
});

// Atualizar responsividade ao redimensionar
window.addEventListener('resize', function () {
  const sidebar = document.querySelector('.sidebar');
  if (window.innerWidth <= 768) {
    if (!sidebar.classList.contains('mobile-closed') && !sidebar.classList.contains('mobile-open')) {
      sidebar.classList.add('mobile-closed');
    }
  } else {
    sidebar.classList.remove('mobile-closed', 'mobile-open');
  }
});

// Fechar menu mobile ao clicar fora
document.addEventListener('click', function (event) {
  const sidebar = document.querySelector('.sidebar');
  const menuToggle = document.querySelector('.menu-toggle');

  if (window.innerWidth <= 768) {
    if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
      sidebar.classList.remove('mobile-open');
      sidebar.classList.add('mobile-closed');
    }
  }
});

// Prevenir logout acidental - avisar se tentar fechar a aba
window.addEventListener('beforeunload', function (e) {
  // Descomente para avisar ao sair
  // e.preventDefault();
  // e.returnValue = '';
});

