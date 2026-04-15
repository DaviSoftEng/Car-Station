# Relatório Técnico — Car Station Indicadores

| | |
|---|---|
| **Desenvolvedor** | Davi Ferreira |
| **Contato** | davimachado0610@hotmail.com |
| **Data** | Abril de 2026 |
| **Versão** | 1.0.0 |

---

> Documento explicativo do projeto para estudo e referência.

---

## 1. O que é o projeto?

O **Car Station Indicadores** é um sistema web interno desenvolvido para centralizar dashboards do Power BI em um único lugar com controle de acesso por login.

**Resumo do funcionamento:**
- Gestores fazem login e visualizam os dashboards das suas áreas
- O administrador configura quais links do Power BI aparecem em cada aba
- O administrador também gerencia os usuários do sistema (criar, editar, remover)

---

## 2. Tecnologias utilizadas

### Frontend (o que o usuário vê no navegador)
| Tecnologia | Para que serve |
|---|---|
| HTML | Estrutura das páginas |
| CSS | Estilo visual (cores, layout, animações) |
| JavaScript (Vanilla) | Lógica da interface, chamadas à API |

### Backend (servidor — o que roda nos bastidores)
| Tecnologia | Para que serve |
|---|---|
| Node.js | Ambiente para rodar JavaScript no servidor |
| Express.js | Framework para criar as rotas da API |
| PostgreSQL | Banco de dados relacional |
| JWT (JSON Web Token) | Autenticação segura por token |
| bcryptjs | Criptografia de senhas |
| dotenv | Gerenciar variáveis de ambiente (.env) |
| cors | Permitir que o frontend acesse o backend |

---

## 3. Estrutura de arquivos

```
Vscode2/
│
├── index.html          → Página de login
├── script.js           → Lógica do login
├── style.css           → Estilo da página de login
├── logo.png            → Logo da empresa
│
├── Dash/
│   ├── dashboard.html  → Página principal após o login
│   ├── dashboard.js    → Toda a lógica do dashboard
│   └── dashboard.css   → Estilo do dashboard
│
└── backend/
    ├── server.js       → Ponto de entrada do servidor
    ├── .env            → Variáveis sensíveis (senha do banco, etc.)
    ├── package.json    → Dependências do projeto
    └── src/
        ├── config/
        │   └── database.js       → Conexão e inicialização do banco
        ├── controllers/
        │   ├── authController.js      → Lógica de login e registro
        │   ├── userController.js      → Lógica de gestão de usuários
        │   └── dashboardController.js → Lógica dos dashboards Power BI
        ├── middleware/
        │   └── auth.js           → Verificação de token JWT
        └── routes/
            ├── auth.js           → Rotas de autenticação
            ├── users.js          → Rotas de usuários
            └── dashboards.js     → Rotas de dashboards
```

---

## 4. Como o sistema funciona — passo a passo

### 4.1 Fluxo de login

```
Usuário digita usuário e senha
        ↓
Frontend valida campos (mínimo 3 caracteres)
        ↓
POST /api/auth/login enviado ao backend
        ↓
Backend busca o usuário no banco pelo username
        ↓
bcrypt compara a senha digitada com o hash salvo
        ↓
Se correto → gera um JWT com 7 dias de validade
        ↓
Frontend salva token, username e tipo no localStorage
        ↓
Redireciona para Dash/dashboard.html
```

### 4.2 Proteção de rotas no frontend

Logo no início do `dashboard.js`, antes de qualquer coisa:

```js
const usuarioLogado = localStorage.getItem('user');
const token = localStorage.getItem('token');

if (!usuarioLogado || !token) {
  localStorage.clear();
  window.location.href = '../index.html'; // expulsa quem não tem token
}
```

Isso garante que ninguém acessa o dashboard sem estar logado.

### 4.3 Validação do token no servidor

Toda rota protegida passa pelo middleware `authMiddleware`:

```js
function authMiddleware(req, res, next) {
  const token = req.headers.authorization.split(' ')[1]; // pega o Bearer token
  const decoded = jwt.verify(token, process.env.JWT_SECRET); // verifica assinatura
  req.usuario = decoded; // injeta dados do usuário na requisição
  next(); // libera para o controller
}
```

Se o token for inválido ou expirado, retorna `401 Unauthorized` e o frontend redireciona para o login.

---

## 5. Banco de dados

### Tabela: `users`
Armazena todos os usuários do sistema.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | SERIAL (auto) | Identificador único |
| username | VARCHAR(255) | Nome de usuário (único) |
| password | VARCHAR(255) | Senha criptografada com bcrypt |
| tipo | VARCHAR(50) | `'admin'` ou `'gestor'` |
| email | VARCHAR(255) | Email (opcional) |
| criado_em | TIMESTAMP | Data de criação |
| atualizado_em | TIMESTAMP | Data da última atualização |

### Tabela: `dashboards`
Armazena os links do Power BI para cada seção.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | SERIAL (auto) | Identificador único |
| secao | VARCHAR(50) | `'vendas'`, `'financeiro'` ou `'estoque'` |
| iframe_url | TEXT | Link do embed do Power BI |
| atualizado_em | TIMESTAMP | Última vez que foi configurado |

> A tabela é criada automaticamente na inicialização do servidor. Um usuário `admin` com senha `admin` também é criado automaticamente se não existir.

---

## 6. API — Rotas disponíveis

### Autenticação (`/api/auth`)
| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| POST | `/login` | Pública | Faz o login e retorna o JWT |
| POST | `/register` | Pública | Registra um novo usuário |
| GET | `/validar` | Token | Valida se o token ainda é válido |

### Usuários (`/api/users`)
| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/` | Token | Lista todos os usuários |
| POST | `/` | Admin | Cria um novo usuário |
| PUT | `/:id` | Admin | Edita senha e/ou tipo de um usuário |
| DELETE | `/:id` | Admin | Remove um usuário |

### Dashboards (`/api/dashboards`)
| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/` | Token | Lista as configs de todas as seções |
| PUT | `/:secao` | Admin | Salva o link do Power BI para uma seção |

---

## 7. Sistema de permissões

Existem dois tipos de usuário:

### Admin
- Acessa todas as abas (Vendas, Financeiro, Estoque, Configurações)
- Cria, edita e remove usuários
- Configura os links do Power BI por seção
- Não pode remover a própria conta
- Não pode rebaixar o próprio tipo de acesso

### Gestor
- Acessa as abas de dados (Vendas, Financeiro, Estoque)
- Visualiza e interage com os dashboards do Power BI
- Não vê o menu de Configurações

A verificação de permissão acontece em **dois lugares**:
1. **Frontend** — esconde botões e menus para quem não tem permissão (experiência do usuário)
2. **Backend** — bloqueia as rotas via `adminMiddleware` mesmo que alguém tente acessar diretamente (segurança real)

---

## 8. Funcionalidades implementadas

### Página de Login
- Labels flutuantes nos campos de input
- Mostrar/ocultar senha
- Validação de campos no frontend antes de chamar a API
- Botão com loading spinner durante a requisição
- Mensagem de erro com animação de shake
- Enter no campo de usuário vai para o campo de senha
- Enter no campo de senha dispara o login

### Dashboard
- Sidebar com navegação entre seções
- Header com nome e badge do usuário logado
- Menu responsivo (hambúrguer no mobile)
- Animação de fadeIn ao trocar de seção
- Notificações toast (verde = sucesso, vermelho = erro, azul = info)
- Modal de confirmação para ações destrutivas
- Logout com confirmação

### Configurações de Dashboard (Admin)
- Accordion para selecionar qual seção configurar
- Aceita tanto a URL pura quanto o código `<iframe>` completo gerado pelo Power BI
- Badge de status por seção (Configurado / Não configurado)
- Botão Remover para limpar o link de uma seção
- Fecha automaticamente após salvar

### Visualização do Power BI
- Quando configurado: exibe o iframe em tela cheia na aba
- Quando não configurado: exibe placeholder "Aguardando dados"
- O título da seção some quando o iframe está ativo (mais espaço para o dashboard)

### Gestão de Usuários (Admin)
- Lista todos os usuários com nome e tipo
- Cadastro de novo usuário (usuário, senha, tipo)
- Edição de usuário existente (senha e/ou tipo)
  - Senha em branco = mantém a senha atual
  - Admin não pode alterar o próprio tipo
- Remoção com confirmação
- Não é possível remover a própria conta

---

## 9. Segurança

| Ponto | Como está protegido |
|---|---|
| Senhas | Nunca salvas em texto puro — criptografadas com `bcrypt` (custo 10) |
| Autenticação | JWT com expiração de 7 dias assinado com chave secreta |
| Rotas sensíveis | Protegidas por `authMiddleware` e `adminMiddleware` no servidor |
| SQL Injection | Todas as queries usam parâmetros (`$1, $2...`), nunca concatenação de strings |
| URLs de iframe | Validadas no backend para garantir protocolo HTTPS |
| Auto-proteção | Admin não pode se remover nem rebaixar o próprio tipo |

---

## 10. Como rodar o projeto

### Pré-requisitos
- Node.js instalado
- PostgreSQL instalado e rodando
- Banco de dados criado

### Variáveis de ambiente (`backend/.env`)
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=nome_do_banco
JWT_SECRET=uma_chave_secreta_qualquer
PORT=3001
```

### Iniciar o backend
```bash
cd backend
npm install
node server.js
```

O servidor sobe em `http://localhost:3001`.
As tabelas são criadas automaticamente.
O usuário `admin` com senha `admin` é criado automaticamente.

### Abrir o frontend
Abrir o arquivo `index.html` diretamente no navegador ou via Live Server no VS Code.

---

## 11. Conceitos importantes para estudo

### O que é JWT?
JWT (JSON Web Token) é uma forma de autenticação sem guardar sessão no servidor. Quando o usuário faz login, o servidor gera um "bilhete assinado" com os dados do usuário. Nas próximas requisições, o frontend envia esse bilhete no header. O servidor só precisa verificar a assinatura para saber quem é o usuário — sem consultar o banco a cada requisição.

### O que é bcrypt?
bcrypt é um algoritmo de hash para senhas. Diferente de MD5 ou SHA, ele é lento de propósito — isso dificulta ataques de força bruta. O "custo 10" significa que o hash passa por 2^10 = 1024 iterações.

### O que é uma API REST?
É uma forma padronizada de comunicação entre frontend e backend via HTTP. Cada rota tem um método (GET, POST, PUT, DELETE) e um caminho (`/api/users`). O frontend faz requisições e o backend responde com JSON.

### O que é middleware?
É uma função que fica no meio do caminho entre a requisição e o controller. O `authMiddleware` é um exemplo: ele intercepta a requisição, verifica o token, e só deixa passar se estiver válido.

### O que é o localStorage?
É um armazenamento no próprio navegador do usuário. O sistema usa para guardar o token JWT, o nome do usuário e o tipo. Persiste mesmo após fechar o navegador (diferente do sessionStorage).

---

---

**Desenvolvido por Davi Ferreira**
davimachado0610@hotmail.com — Abril de 2026

*Sistema interno Car Station Indicadores — todos os direitos reservados.*
