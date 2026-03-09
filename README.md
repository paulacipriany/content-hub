# SocialFlow - Plataforma de Gerenciamento de Redes Sociais

SocialFlow é uma plataforma robusta para gestão de presença digital, permitindo o controle de conteúdos, aprovações, calendários editoriais e relatórios de desempenho para múltiplos clientes.

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 18** com **TypeScript**: Base para uma interface reativa e tipagem forte.
- **Vite**: Build tool extremamente rápida para desenvolvimento moderno.
- **Tailwind CSS**: Estilização baseada em utilitários para design responsivo e customizável.
- **shadcn/ui**: Componentes de UI de alta qualidade e acessíveis.
- **Lucide React**: Biblioteca de ícones moderna.
- **TanStack Query (React Query)**: Gerenciamento de estado assíncrono e cache de dados.
- **React Router DOM**: Navegação e roteamento dinâmico.
- **React Hook Form & Zod**: Validação de formulários e esquemas de dados.
- **Embla Carousel**: Carrosséis fluidos para exibição de mídia.
- **Recharts**: Visualização de dados e métricas em gráficos.
- **Tiptap**: Editor de texto rico para criação de legendas e briefings.
- **@dnd-kit**: Funcionalidades de arrastar e soltar (Drag and Drop) para fluxos de trabalho.
- **Sonner**: Sistema de notificações (toasts).

### Backend & Infraestrutura
- **Supabase**: Backend-as-a-Service (BaaS) provendo:
  - **PostgreSQL**: Banco de dados relacional.
  - **Auth**: Autenticação de usuários com controle de permissões (RBAC).
  - **Storage**: Armazenamento de arquivos de mídia e logotipos.
  - **Edge Functions**: Funções serverless para lógica de backend personalizada.
  - **Realtime**: Atualizações em tempo real para colaboração.

### Ferramentas de Desenvolvimento
- **Vitest**: Framework de testes unitários e de integração.
- **ESLint**: Linter para garantir a qualidade e consistência do código.

---

## 📂 Estrutura do Projeto

```text
├── public/              # Arquivos estáticos
├── src/
│   ├── components/      # Componentes de UI (shadcn e customizados)
│   ├── contexts/        # Provedores de estado global (Auth, App)
│   ├── data/            # Definições de tipos e constantes
│   ├── hooks/           # Hooks React personalizados
│   ├── integrations/    # Configurações de serviços externos (Supabase)
│   ├── lib/             # Funções utilitárias e helpers
│   ├── pages/           # Páginas principais da aplicação
│   ├── App.tsx          # Componente raiz e definição de rotas
│   └── main.tsx         # Ponto de entrada do React
├── supabase/
│   ├── functions/       # Supabase Edge Functions
│   └── migrations/      # Scripts de migração do banco de dados
├── package.json         # Dependências e scripts
└── tailwind.config.ts   # Configuração do Tailwind CSS
```

---

## 🛠️ Passo a Passo para Instalação

### Pré-requisitos
- Node.js (v18+)
- npm ou bun
- Conta no [Supabase](https://supabase.com/)

### 1. Configuração Local
1. Clone o repositório:
   ```bash
   git clone <url-do-repositorio>
   cd <nome-do-diretorio>
   ```
2. Instale as dependências:
   ```bash
   npm install
   # ou
   bun install
   ```
3. Configure as variáveis de ambiente:
   Crie um arquivo `.env` na raiz do projeto com as seguintes chaves (obtidas no painel do Supabase):
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_anonima
   ```

### 2. Configuração do Supabase
1. No painel do Supabase, crie um novo projeto.
2. Aplique as migrações localizadas em `supabase/migrations` via SQL Editor ou usando a [Supabase CLI](https://supabase.com/docs/guides/cli):
   ```bash
   supabase db push
   ```
3. Configure as políticas de segurança (RLS) conforme necessário (as migrações já devem incluir as definições básicas).
4. Crie os buckets de storage necessários (ex: `media`, `logos`) se não forem criados via migração.

---

## 🌐 Passo a Passo para Hospedagem

### Frontend (Vercel ou Netlify)
Recomendamos a **Vercel** por sua integração nativa com Vite.

1. Conecte seu repositório GitHub à Vercel.
2. Nas configurações de Build:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Adicione as **Environment Variables** configuradas no seu `.env`.
4. Clique em **Deploy**.

### Backend (Supabase)
O backend já está "hospedado" no ecossistema Supabase.
1. Certifique-se de que as migrações foram aplicadas ao banco de produção.
2. Deploy das Edge Functions:
   ```bash
   supabase functions deploy admin-update-user --project-ref seu-project-id
   ```

---

## 🔍 Revisão de Código
O projeto segue as melhores práticas de desenvolvimento com React:
- **Componentização**: Interface dividida em componentes pequenos e reutilizáveis.
- **Context API**: Utilizada para gerenciamento de autenticação e estado global da aplicação, evitando o "prop drilling".
- **Clean Code**: Código bem organizado, com separação clara de responsabilidades entre lógica (hooks), UI (componentes) e dados.
- **Tipagem**: Uso extensivo de TypeScript para prevenir erros em tempo de execução.
- **UX/UI**: Uso de feedback visual (toasts), loaders e design consistente através do Tailwind e shadcn/ui.
