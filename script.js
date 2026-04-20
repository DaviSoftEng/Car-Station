// ==================== UI - MENSAGENS ====================
function showError(message) {
  const container = document.getElementById('error-container');
  container.innerHTML = `
    <div class="error-message">
      ${message}
    </div>
  `;

  // Auto remover erro após 5 segundos
  setTimeout(() => {
    container.innerHTML = '';
  }, 5000);
}

function clearError() {
  document.getElementById('error-container').innerHTML = '';
}

// ==================== UI - VALIDAÇÃO ====================
function validateLogin(user, pass) {
  // Validar campos vazios
  if (!user.trim()) {
    showError('Digite seu usuário');
    return false;
  }

  if (!pass.trim()) {
    showError('Digite sua senha');
    return false;
  }

  // Validar comprimento mínimo
  if (user.trim().length < 3) {
    showError('Usuário deve ter no mínimo 3 caracteres');
    return false;
  }

  if (pass.length < 3) {
    showError('Senha deve ter no mínimo 3 caracteres');
    return false;
  }

  return true;
}

// ==================== TOGGLE DE SENHA ====================
function togglePassword() {
  const passInput = document.getElementById('pass');
  const eyeIcon = document.getElementById('eyeIcon');

  if (passInput.type === 'password') {
    passInput.type = 'text';
    eyeIcon.style.opacity = '1';
  } else {
    passInput.type = 'password';
    eyeIcon.style.opacity = '0.6';
  }
}

// ==================== LOGIN ====================
async function login() {
  const userInput = document.getElementById('user');
  const passInput = document.getElementById('pass');
  const loginBtn = document.getElementById('login-btn');
  const btnText = document.getElementById('btn-text');
  const btnLoader = document.getElementById('btn-loader');

  const user = userInput.value.trim();
  const pass = passInput.value;

  // Limpar erro anterior
  clearError();

  // Validar
  if (!validateLogin(user, pass)) {
    return;
  }

  // Desabilitar botão e mostrar loader
  loginBtn.disabled = true;
  btnText.style.opacity = '0';
  btnLoader.style.display = 'block';

  // Simular delay de rede (remover quando integrar com backend)
  try {
    const response = await fetch('https://car-station.onrender.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: user,
        password: pass
      })
    });

    const data = await response.json();

    console.log('Resposta do backend:', data);

    if (data.sucesso) {
      // 🔥 LOGIN REAL
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', data.usuario.username);
      localStorage.setItem('userType', data.usuario.tipo);

      window.location.href = 'Dash/dashboard.html';
    } else {
      throw new Error(data.mensagem);
    }

  } catch (error) {
    loginBtn.disabled = false;
    btnText.style.opacity = '1';
    btnLoader.style.display = 'none';

    showError(error.message || 'Erro ao fazer login');

    passInput.value = '';
    passInput.focus();
  }
}

// ==================== ENTER PARA LOGIN ====================
document.addEventListener('DOMContentLoaded', function () {
  // Enter no campo de senha = login
  const passInput = document.getElementById('pass');
  passInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      login();
    }
  });

  // Enter no campo de usuário = vai para senha
  const userInput = document.getElementById('user');
  userInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      passInput.focus();
    }
  });

  // Limpar erro quando começar a digitar
  userInput.addEventListener('input', clearError);
  passInput.addEventListener('input', clearError);
});
