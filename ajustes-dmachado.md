# Relatório de Revisão — Car Station Dashboard
**Analista responsável pela revisão:** Thales  
**Data:** 13/04/2026  
**Projeto:** Car Station Indicadores — Dashboard Comercial  
**Desenvolvedor:** Davi Machado  

---

## Visão Geral

A aplicação está bem estruturada para um projeto em desenvolvimento, com backend Node.js/Express conectado a PostgreSQL, camada de autenticação JWT e frontend responsivo. O problema central identificado foi um **conflito de duas arquiteturas rodando ao mesmo tempo**: o login já havia sido migrado para o backend real, mas o gerenciamento de usuários ainda operava com a lógica antiga baseada em `localStorage`. Além do problema principal, foram identificados e corrigidos pontos de segurança e inconsistências de configuração.

---

## Problemas Encontrados

### 1. Crítico — Cadastro de usuário não persistia entre máquinas/browsers
**Arquivo:** `Dash/dashboard.js`  
**Causa:** As funções `cadastrarUsuario()`, `listarUsuarios()` e `removerUsuario()` salvavam e liam dados diretamente do `localStorage` do browser, em vez de chamar a API backend. Cada máquina ou browser tinha sua própria lista de usuários isolada, que sumia ao limpar o cache.  
**Correção:** As três funções foram reescritas para consumir os endpoints da API com autenticação JWT:
- Cadastro → `POST /api/users`
- Listagem → `GET /api/users`
- Remoção → `DELETE /api/users/:id`

---

### 2. Crítico — Type mismatch: frontend enviava tipo inválido ao backend
**Arquivo:** `Dash/dashboard.html`  
**Causa:** O `<select>` de tipo de usuário tinha `value="user"` para a opção Gestor(a), mas o backend (`userController.js`) valida que o tipo deve ser `"gestor"` ou `"admin"`. Todo cadastro de gestor retornava erro 400 silenciosamente.  
**Correção:** Valor corrigido de `"user"` para `"gestor"`.

```html
<!-- Antes -->
<option value="user">📊 Gestor(a)</option>

<!-- Depois -->
<option value="gestor">📊 Gestor(a)</option>
```

---

### 3. Segurança — Logs expondo senha em texto puro no console do servidor
**Arquivo:** `backend/src/controllers/authController.js`  
**Causa:** Havia três `console.log` de debug que imprimiam o objeto completo do usuário (com hash), a senha digitada em texto puro e o hash do banco a cada login.  
**Correção:** Logs removidos. Apenas o log de login bem-sucedido foi mantido.

```js
// Removido:
console.log('Usuario do banco:', usuario);  // expunha hash
console.log('Senha digitada:', password);   // expunha senha em texto puro
console.log('Senha do banco:', usuario.password);
```

---

### 4. Segurança — Dashboard sem validação de sessão no backend
**Arquivo:** `Dash/dashboard.js`  
**Causa:** A proteção de acesso ao dashboard verificava apenas `localStorage.getItem('user')` — qualquer texto salvo nessa chave dava acesso. O token JWT era salvo mas nunca validado.  
**Correção:** Adicionada função `validarSessao()` que chama `GET /api/auth/validar` com o token JWT ao carregar o dashboard. Se o token for inválido ou expirado, o usuário é redirecionado para o login e o `localStorage` é limpo.

---

### 5. Rota de validação de token inativa
**Arquivo:** `backend/src/routes/auth.js`  
**Causa:** A rota `GET /api/auth/validar` estava comentada no código.  
**Correção:** Rota descomentada e ativada.

```js
// Antes:
//router.get('/validar', authMiddleware, authController.validarToken);

// Depois:
router.get('/validar', authMiddleware, authController.validarToken);
```

---

### 6. Código legado de localStorage no script.js
**Arquivo:** `script.js`  
**Causa:** Remanescentes da arquitetura anterior (antes do backend existir): funções `initializeDefaultUser()`, `encryptPassword()`, `decryptPassword()`, `getUsers()` e `saveUsers()`. A função `initializeDefaultUser()` ainda era chamada no `DOMContentLoaded` e criava um usuário `admin` fantasma no localStorage com senha em Base64 (não é criptografia real).  
**Correção:** Todas as funções e chamadas legadas foram removidas.

---

### 7. Caminho de redirecionamento pós-login com case errado
**Arquivo:** `script.js`  
**Causa:** Após login bem-sucedido, o redirect apontava para `dash/dashboard.html` (minúsculo), mas a pasta se chama `Dash/` (com D maiúsculo). Em sistemas de arquivos case-sensitive (Linux/servidor), isso causaria erro 404.  
**Correção:** Caminho corrigido para `Dash/dashboard.html`.

---

## Arquivos Modificados

| Arquivo | Tipo de alteração |
|---|---|
| `Dash/dashboard.js` | Refatoração da camada de gerenciamento de usuários |
| `Dash/dashboard.html` | Correção do value do select de tipo de usuário |
| `script.js` | Remoção de código legado; correção do caminho de redirect |
| `backend/src/controllers/authController.js` | Remoção de logs de segurança |
| `backend/src/routes/auth.js` | Ativação da rota de validação de token |

---

## Backup

Antes de qualquer alteração, foi criado o backup completo da pasta do projeto:

```
C:\Users\dmachado\Desktop\vscode2-backup\
```

---

## Recomendações Futuras

Estes itens não foram alterados agora por não serem o foco da revisão, mas vale planejar:

1. **JWT_SECRET no `.env`** — O valor atual é `qualquer_coisa_segura_aqui`. Trocar por uma string longa e aleatória antes de subir para produção.
2. **Senha do banco no `.env`** — `DB_PASSWORD=1234` deve ser trocada em ambiente de produção.
3. **Validação de senha forte** — Atualmente aceita senhas com 3 caracteres. Recomendado exigir mínimo de 8 caracteres com critérios de complexidade.
4. **Validação de e-mail** — O campo `email` no cadastro de usuário não valida o formato. Vale adicionar uma verificação básica.
5. **Rate limiting no login** — Sem limite de tentativas de login, o endpoint `/api/auth/login` está suscetível a ataques de força bruta. Biblioteca recomendada: `express-rate-limit`.
6. **Função "Editar usuário" removida** — A função de edição estava implementada apenas com `prompt()` do browser e operava sobre localStorage. Foi removida junto com o legado. Quando quiser reativar, ela precisará ser implementada chamando um endpoint `PUT /api/users/:id` no backend.

---

*Revisão realizada com foco em qualidade (QA) e arquitetura (Senior Dev). Qualquer dúvida, só chamar.*
