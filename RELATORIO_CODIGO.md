# Relatório de Código — Car Station Indicadores

| | |
|---|---|
| **Desenvolvedor** | Davi Ferreira |
| **Contato** | davimachado0610@hotmail.com |
| **Data** | Abril de 2026 |

> Explicação técnica dos trechos de código mais importantes do projeto.

---

## 1. Autenticação — Como o login funciona de verdade

### 1.1 Frontend envia as credenciais

Quando o usuário clica em "Entrar", o frontend faz uma requisição HTTP para o backend:

```js
// script.js
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: user, password: pass })
});

const data = await response.json();

if (data.sucesso) {
  localStorage.setItem('token', data.token);       // salva o token
  localStorage.setItem('user', data.usuario.username);
  localStorage.setItem('userType', data.usuario.tipo);
  window.location.href = 'Dash/dashboard.html';    // redireciona
}
```

**O que acontece aqui:**
- `fetch` faz uma chamada HTTP POST para o backend
- As credenciais vão no `body` em formato JSON
- Se o login for bem sucedido, o token JWT fica salvo no `localStorage` do navegador
- O usuário é redirecionado para o dashboard

---

### 1.2 Backend verifica e responde

```js
// authController.js
async function login(req, res) {
  const { username, password } = req.body;

  // 1. Busca o usuário no banco pelo username
  const resultado = await query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );

  if (resultado.rows.length === 0) {
    return res.status(401).json({ sucesso: false, mensagem: 'Usuário ou senha inválidos' });
  }

  const usuario = resultado.rows[0];

  // 2. Compara a senha digitada com o hash salvo no banco
  const senhaValida = await bcrypt.compare(password, usuario.password);

  if (!senhaValida) {
    return res.status(401).json({ sucesso: false, mensagem: 'Usuário ou senha inválidos' });
  }

  // 3. Gera o token JWT e retorna pro frontend
  const token = gerarToken(usuario);
  return res.status(200).json({ sucesso: true, token, usuario });
}
```

**Ponto importante:** note que tanto usuário não encontrado quanto senha errada retornam a mesma mensagem `"Usuário ou senha inválidos"`. Isso é proposital — não deixa o atacante descobrir se o usuário existe ou não.

---

### 1.3 Geração do token JWT

```js
// authController.js
function gerarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      username: usuario.username,
      tipo: usuario.tipo,        // 'admin' ou 'gestor'
    },
    process.env.JWT_SECRET,      // chave secreta do .env
    { expiresIn: '7d' }          // expira em 7 dias
  );
}
```

**O que é o JWT:**  
Um JWT é um texto codificado dividido em 3 partes separadas por ponto: `header.payload.signature`

- **header** — tipo do token e algoritmo usado
- **payload** — os dados (id, username, tipo) — qualquer um pode ler, não é criptografado
- **signature** — assinatura gerada com a `JWT_SECRET` — só o servidor consegue criar e verificar

Isso garante que o token não foi adulterado.

---

## 2. Proteção de rotas — Middleware

O middleware é uma função que fica entre a requisição e o controller. Toda rota protegida passa por ele antes de chegar na lógica de negócio.

```js
// middleware/auth.js
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  // O header chega assim: "Bearer eyJhbGci..."

  if (!authHeader) {
    return res.status(401).json({ sucesso: false, mensagem: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1]; // pega só o token, sem o "Bearer"

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // verifica assinatura
    req.usuario = decoded; // injeta os dados do usuário na requisição
    next();                // libera para o controller
  } catch (error) {
    return res.status(401).json({ sucesso: false, mensagem: 'Token inválido' });
  }
}
```

**Como é usado nas rotas:**

```js
// routes/users.js
router.get('/',         authMiddleware,                userController.listarUsuarios);
router.post('/',        authMiddleware, adminMiddleware, userController.criarUsuario);
router.put('/:id',      authMiddleware, adminMiddleware, userController.editarUsuario);
router.delete('/:id',   authMiddleware, adminMiddleware, userController.deletarUsuario);
```

- Rotas com só `authMiddleware` → qualquer usuário logado acessa
- Rotas com `authMiddleware + adminMiddleware` → só admins acessam

O `adminMiddleware` é simples:

```js
function adminMiddleware(req, res, next) {
  if (req.usuario.tipo !== 'admin') {
    return res.status(403).json({ sucesso: false, mensagem: 'Apenas administradores' });
  }
  next();
}
```

---

## 3. Banco de dados — Queries parametrizadas

```js
// config/database.js
async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}
```

**Uso correto (seguro contra SQL Injection):**
```js
// Os valores vão como parâmetros separados ($1, $2...)
await query(
  'SELECT * FROM users WHERE username = $1',
  ['admin']
);
```

**Por que isso importa — exemplo de SQL Injection:**
```sql
-- Se concatenasse direto a string, um usuário malicioso poderia digitar:
-- username = "' OR '1'='1"
-- e a query viraria:
SELECT * FROM users WHERE username = '' OR '1'='1'
-- que retorna TODOS os usuários do banco
```

Com parâmetros `$1`, o banco trata o valor como dado puro, nunca como código SQL.

---

## 4. Senha criptografada com bcrypt

```js
// Ao criar usuário — gera o hash
const senhaHasheada = await bcrypt.hash(password, 10);
// O "10" é o custo — quantas rodadas de processamento
// Resultado: "$2a$10$xK9mP3..." (nunca é igual mesmo para a mesma senha)

// Ao fazer login — compara sem precisar descriptografar
const senhaValida = await bcrypt.compare(passwordDigitado, hashDoBanco);
// Retorna true ou false
```

**Por que bcrypt é seguro:**  
bcrypt é um hash de mão única — não tem como voltar atrás. Se o banco vazar, as senhas continuam protegidas porque o atacante precisaria testar cada combinação possível uma por uma (e o custo 10 torna isso lento de propósito).

---

## 5. Proteção no frontend

### 5.1 Verificação síncrona ao abrir o dashboard

```js
// dashboard.js — roda ANTES de qualquer coisa
const usuarioLogado = localStorage.getItem('user');
const token = localStorage.getItem('token');

if (!usuarioLogado || !token) {
  localStorage.clear();
  window.location.href = '../index.html'; // expulsa imediatamente
}
```

Isso roda antes mesmo do DOM carregar. Se não tiver token, redireciona na hora — o usuário nem vê o dashboard.

### 5.2 Validação do token no servidor ao carregar

```js
// dashboard.js
async function validarSessao() {
  try {
    const response = await fetch(`${API_BASE}/auth/validar`, {
      headers: getAuthHeaders() // envia o token no header
    });
    if (!response.ok) {
      localStorage.clear();
      window.location.href = '../index.html'; // token expirado ou inválido
    }
  } catch {
    // Se o servidor estiver offline, mantém a sessão local
  }
}
```

**Dupla verificação:**
1. Verificação local (rápida) — checa se o token existe no localStorage
2. Verificação no servidor (segura) — confirma que o token ainda é válido

---

## 6. Envio do token em todas as requisições

```js
// dashboard.js
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` // padrão Bearer Token
  };
}

// Exemplo de uso
const response = await fetch(`${API_BASE}/users`, {
  headers: getAuthHeaders()
});
```

O padrão `Bearer` é uma convenção do mercado para envio de JWT no header HTTP.

---

## 7. Sistema de permissões no frontend

```js
// dashboard.js
function aplicarPermissoes() {
  const configBtn = document.querySelector('.bottom-menu a.config');
  const dashboardConfigBox = document.getElementById('dashboardConfigBox');

  if (tipoUsuario !== 'admin') {
    if (configBtn) configBtn.style.display = 'none';       // esconde o menu
    if (dashboardConfigBox) dashboardConfigBox.style.display = 'none'; // esconde o painel
  }
}
```

**Importante:** esconder elementos no frontend é só para a experiência do usuário. A proteção real está no backend com o `adminMiddleware`. Se alguém tentar chamar a rota diretamente (via Postman, por exemplo), o servidor bloqueia mesmo assim.

---

## 8. Dashboards Power BI — Lógica de exibição

### 8.1 Carregamento inicial

```js
// dashboard.js
async function carregarDashboards() {
  const response = await fetch(`${API_BASE}/dashboards`, {
    headers: getAuthHeaders()
  });
  const data = await response.json();

  data.dashboards.forEach(d => {
    dashboardConfigs[d.secao] = d.iframe_url; // armazena localmente
    aplicarIframe(d.secao, d.iframe_url);      // aplica na tela
    atualizarStatusConfig(d.secao, d.iframe_url);
  });
}
```

### 8.2 Aplicar ou remover o iframe

```js
// dashboard.js
function aplicarIframe(secao, url) {
  const container = document.getElementById(`iframe-${secao}`);
  const placeholder = document.getElementById(`placeholder-${secao}`);
  const sectionHeader = document.getElementById(`section-header-${secao}`);

  if (url) {
    // Cria o iframe dinamicamente (mais seguro que innerHTML)
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.allowFullscreen = true;
    iframe.setAttribute('allow', 'fullscreen');
    container.appendChild(iframe);

    container.classList.remove('hidden');  // mostra o iframe
    placeholder.classList.add('hidden');   // esconde o placeholder
    sectionHeader.classList.add('hidden'); // esconde o título (mais espaço)
  } else {
    container.innerHTML = '';
    container.classList.add('hidden');
    placeholder.classList.remove('hidden');
    sectionHeader.classList.remove('hidden');
  }
}
```

### 8.3 Layout da seção — aplicado só quando visível

```js
// dashboard.js
function mostrarSecao(secaoId) {
  // Esconde todas e limpa o layout de iframe
  document.querySelectorAll('.conteudo').forEach(secao => {
    secao.classList.add('hidden');
    secao.classList.remove('showing-iframe'); // remove o flex layout
  });

  const secao = document.getElementById(secaoId);
  secao.classList.remove('hidden');

  // Aplica o layout de iframe APENAS na seção visível
  if (dashboardConfigs[secaoId]) {
    secao.classList.add('showing-iframe');
  }
}
```

**Por que isso importa:**  
A classe `showing-iframe` define `display: flex` para que o iframe preencha a tela. Se fosse aplicada em seções escondidas, o `display: flex` sobrescreveria o `display: none` e todas as seções apareceriam ao mesmo tempo — bug que foi corrigido exatamente por essa lógica.

---

## 9. Extração de URL do código iframe

O Power BI gera um código completo assim:
```html
<iframe width="600" height="373" src="https://app.powerbi.com/view?r=eyJ..." allowFullScreen="true"></iframe>
```

O sistema aceita tanto esse código inteiro quanto só a URL:

```js
// dashboard.js
function extrairUrl(input) {
  const trimmed = input.trim();

  // Se parecer um iframe HTML, extrai só o src
  if (trimmed.toLowerCase().startsWith('<iframe')) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    return match ? match[1] : '';
  }

  // Senão, assume que já é a URL
  return trimmed;
}
```

A regex `/src=["']([^"']+)["']/i` procura o atributo `src` dentro do HTML e captura o valor entre aspas.

---

## 10. Edição de usuário — Query dinâmica

```js
// userController.js
async function editarUsuario(req, res) {
  const { password, tipo } = req.body;

  const campos = [];
  const valores = [];
  let i = 1;

  // Monta a query só com os campos que vieram no body
  if (password) {
    const senhaHasheada = await bcrypt.hash(password, 10);
    campos.push(`password = $${i++}`);
    valores.push(senhaHasheada);
  }

  if (tipo) {
    campos.push(`tipo = $${i++}`);
    valores.push(tipo);
  }

  campos.push(`atualizado_em = CURRENT_TIMESTAMP`);
  valores.push(id);

  await query(
    `UPDATE users SET ${campos.join(', ')} WHERE id = $${i}`,
    valores
  );
}
```

**Por que é assim:**  
Se a senha vier vazia (usuário só quer mudar o tipo), a query não inclui o campo `password`. Isso evita sobrescrever a senha com um valor vazio acidentalmente.

---

## Resumo dos conceitos aplicados

| Conceito | Onde foi usado |
|---|---|
| **JWT** | Autenticação stateless entre frontend e backend |
| **bcrypt** | Hash de senhas com custo configurável |
| **Middleware** | Verificação de token e permissão de admin nas rotas |
| **Queries parametrizadas** | Proteção contra SQL Injection em todas as queries |
| **localStorage** | Persistência de sessão no navegador |
| **Fetch API** | Comunicação assíncrona com o backend |
| **DOM manipulation** | Mostrar/esconder elementos dinamicamente sem frameworks |
| **Regex** | Extração de URL do código iframe do Power BI |
| **Query dinâmica** | Atualização parcial de campos no banco |

---

**Desenvolvido por Davi Ferreira**  
davimachado0610@hotmail.com — Abril de 2026
