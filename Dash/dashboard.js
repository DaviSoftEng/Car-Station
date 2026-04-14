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

// Fechar modais ao clicar fora
document.addEventListener('click', function (event) {
  const confirmModal = document.getElementById('confirmModal');
  if (event.target === confirmModal) cancelarConfirmacao();

  const editModal = document.getElementById('editUserModal');
  if (event.target === editModal) fecharEditarUsuario();
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
            <button class="btn-edit" onclick="abrirEditarUsuario(${u.id}, '${u.username}', '${u.tipo}')">
              ✏️ Editar
            </button>
            ${podeRemover ? `
              <button class="btn-delete" onclick="confirmarRemoverUsuario(${u.id}, '${u.username}')">
                🗑️ Remover
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    container.innerHTML = '<p style="color:#e74c3c; text-align:center;">Erro de conexão com o servidor</p>';
  }
}

// ==================== EDITAR USUÁRIO ====================
let editandoUsuarioId = null;

function abrirEditarUsuario(id, username, tipo) {
  editandoUsuarioId = id;
  document.getElementById('editUserName').textContent = `👤 ${username}`;
  document.getElementById('editUserPassword').value = '';
  document.getElementById('editUserTipo').value = tipo;

  // Não deixa o admin mudar o próprio tipo
  document.getElementById('editUserTipo').disabled = (username === usuarioLogado);

  document.getElementById('editUserModal').classList.remove('hidden');
  document.getElementById('editUserPassword').focus();
}

function fecharEditarUsuario() {
  editandoUsuarioId = null;
  document.getElementById('editUserModal').classList.add('hidden');
}

async function salvarEdicaoUsuario() {
  if (!editandoUsuarioId) return;

  const password = document.getElementById('editUserPassword').value;
  const tipo = document.getElementById('editUserTipo').value;

  if (!password && !tipo) {
    showNotification('Nenhum campo preenchido', 'error');
    return;
  }

  const btn = document.getElementById('editUserBtn');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    const body = { tipo };
    if (password) body.password = password;

    const response = await fetch(`${API_BASE}/users/${editandoUsuarioId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (data.sucesso) {
      fecharEditarUsuario();
      showNotification('Usuário atualizado com sucesso!', 'success');
      await listarUsuarios();
    } else {
      showNotification(data.mensagem || 'Erro ao salvar', 'error');
    }
  } catch (error) {
    console.error('Erro ao editar usuário:', error);
    showNotification('Erro de conexão com o servidor', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar';
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

// ==================== DASHBOARDS POWER BI ====================
let dashboardConfigs = {};

// Extrai só a URL caso o usuário cole o código iframe completo
function extrairUrl(input) {
  const trimmed = input.trim();
  if (trimmed.toLowerCase().startsWith('<iframe')) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    return match ? match[1] : '';
  }
  return trimmed;
}

function aplicarIframe(secao, url) {
  const section = document.getElementById(secao);
  const container = document.getElementById(`iframe-${secao}`);
  const placeholder = document.getElementById(`placeholder-${secao}`);
  const sectionHeader = document.getElementById(`section-header-${secao}`);

  if (!container) return;

  if (url) {
    container.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.frameBorder = '0';
    iframe.allowFullscreen = true;
    iframe.setAttribute('allow', 'fullscreen');
    container.appendChild(iframe);
    container.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');
    if (sectionHeader) sectionHeader.classList.add('hidden');
    if (section) section.classList.add('showing-iframe');
  } else {
    container.innerHTML = '';
    container.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
    if (sectionHeader) sectionHeader.classList.remove('hidden');
    if (section) section.classList.remove('showing-iframe');
  }
}

function atualizarStatusConfig(secao, url) {
  const status = document.getElementById(`dash-status-${secao}`);
  if (!status) return;

  if (url) {
    status.textContent = 'Configurado';
    status.className = 'dash-status configured';
  } else {
    status.textContent = 'Não configurado';
    status.className = 'dash-status not-configured';
  }
}

async function carregarDashboards() {
  try {
    const response = await fetch(`${API_BASE}/dashboards`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) return;

    const data = await response.json();
    if (!data.sucesso) return;

    data.dashboards.forEach(d => {
      dashboardConfigs[d.secao] = d.iframe_url;
      aplicarIframe(d.secao, d.iframe_url);

      const input = document.getElementById(`dash-url-${d.secao}`);
      if (input) input.value = d.iframe_url || '';

      atualizarStatusConfig(d.secao, d.iframe_url);
    });

  } catch (error) {
    console.error('Erro ao carregar dashboards:', error);
  }
}

// ==================== ACCORDION ====================
const SECOES_DASH = ['vendas', 'financeiro', 'estoque'];

function closeDashConfig(secao) {
  document.getElementById(`acc-body-${secao}`)?.classList.remove('open');
  document.getElementById(`arrow-${secao}`)?.classList.remove('open');
  document.getElementById(`acc-${secao}`)?.classList.remove('open');
}

function toggleDashConfig(secao) {
  const isOpen = document.getElementById(`acc-body-${secao}`).classList.contains('open');
  SECOES_DASH.forEach(s => closeDashConfig(s));
  if (!isOpen) {
    document.getElementById(`acc-body-${secao}`).classList.add('open');
    document.getElementById(`arrow-${secao}`).classList.add('open');
    document.getElementById(`acc-${secao}`).classList.add('open');
  }
}

async function removerDashboard(secao) {
  const input = document.getElementById(`dash-url-${secao}`);
  if (input) input.value = '';
  await salvarDashboard(secao);
}

async function salvarDashboard(secao) {
  const input = document.getElementById(`dash-url-${secao}`);
  if (!input) return;

  const url = extrairUrl(input.value);

  const btn = input.closest('.dash-accordion-body-inner').querySelector('.btn-save-dash');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    const response = await fetch(`${API_BASE}/dashboards/${secao}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ iframe_url: url })
    });

    const data = await response.json();

    if (data.sucesso) {
      input.value = url;
      dashboardConfigs[secao] = url;
      aplicarIframe(secao, url);
      atualizarStatusConfig(secao, url);

      closeDashConfig(secao);
      showNotification(
        url ? `Dashboard "${secao}" configurado com sucesso!` : `Dashboard "${secao}" removido`,
        url ? 'success' : 'info'
      );
    } else {
      showNotification(data.mensagem || 'Erro ao salvar', 'error');
    }

  } catch (error) {
    console.error('Erro ao salvar dashboard:', error);
    showNotification('Erro de conexão com o servidor', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar';
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

  // Carregar configs dos dashboards (todos os usuários)
  await carregarDashboards();

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

