import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import { ArrowLeft, Shield, Check, X } from 'lucide-react';

const roles = [
  { key: 'admin', label: 'Admin', color: 'bg-red-500/15 text-red-500 border-red-500/20' },
  { key: 'moderator', label: 'Gestor', color: 'bg-amber-500/15 text-amber-600 border-amber-500/20' },
  { key: 'social_media', label: 'Social Media', color: 'bg-blue-500/15 text-blue-500 border-blue-500/20' },
  { key: 'client', label: 'Cliente', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' },
];

interface Permission {
  label: string;
  description: string;
  admin: boolean;
  moderator: boolean;
  social_media: boolean;
  client: boolean;
}

const permissions: { category: string; items: Permission[] }[] = [
  {
    category: 'Conteúdo',
    items: [
      { label: 'Criar conteúdo', description: 'Criar novos posts e conteúdos', admin: true, moderator: true, social_media: true, client: false },
      { label: 'Editar conteúdo', description: 'Modificar conteúdos existentes', admin: true, moderator: true, social_media: true, client: false },
      { label: 'Excluir conteúdo', description: 'Remover conteúdos permanentemente', admin: true, moderator: true, social_media: false, client: false },
      { label: 'Aprovar conteúdo', description: 'Aprovar ou reprovar conteúdos para publicação', admin: true, moderator: true, social_media: false, client: true },
      { label: 'Ver conteúdo', description: 'Visualizar conteúdos dos clientes', admin: true, moderator: true, social_media: true, client: true },
    ],
  },
  {
    category: 'Clientes',
    items: [
      { label: 'Criar clientes', description: 'Adicionar novos clientes à plataforma', admin: true, moderator: false, social_media: false, client: false },
      { label: 'Editar clientes', description: 'Modificar informações de clientes', admin: true, moderator: true, social_media: false, client: false },
      { label: 'Excluir clientes', description: 'Remover clientes e todos os seus dados', admin: true, moderator: false, social_media: false, client: false },
      { label: 'Gerenciar membros', description: 'Adicionar ou remover usuários de um cliente', admin: true, moderator: true, social_media: false, client: false },
    ],
  },
  {
    category: 'Plataforma',
    items: [
      { label: 'Gerenciar usuários', description: 'Criar, editar e remover usuários do sistema', admin: true, moderator: false, social_media: false, client: false },
      { label: 'Aprovar cadastros', description: 'Aprovar novos usuários que se registraram', admin: true, moderator: true, social_media: false, client: false },
      { label: 'Configurações gerais', description: 'Acessar e editar configurações da plataforma', admin: true, moderator: false, social_media: false, client: false },
      { label: 'Ver relatórios', description: 'Acessar relatórios de desempenho', admin: true, moderator: true, social_media: true, client: true },
    ],
  },
  {
    category: 'Tarefas & Projetos',
    items: [
      { label: 'Criar tarefas', description: 'Criar e atribuir novas tarefas', admin: true, moderator: true, social_media: true, client: false },
      { label: 'Ver tarefas', description: 'Visualizar tarefas dos projetos', admin: true, moderator: true, social_media: true, client: false },
      { label: 'Gerenciar calendário', description: 'Criar e editar eventos no calendário', admin: true, moderator: true, social_media: true, client: false },
    ],
  },
];

const SettingsPermissionsPage = () => {
  const navigate = useNavigate();

  const Cell = ({ allowed }: { allowed: boolean }) => (
    <div className="flex justify-center">
      {allowed ? (
        <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <Check size={11} className="text-emerald-600" />
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
          <X size={11} className="text-muted-foreground/50" />
        </div>
      )}
    </div>
  );

  return (
    <>
      <TopBar
        title="Permissões"
        subtitle="Visão geral de roles e acessos da plataforma"
        actions={<></>}
      />
      <div className="p-6 max-w-4xl space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar para configurações
        </button>

        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
          <Shield size={18} className="text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Permissões por cargo</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              As permissões abaixo são fixas e definidas pelo sistema. Para alterar o cargo de um usuário, acesse a seção <strong>Equipe</strong>.
            </p>
          </div>
        </div>

        {/* Role legend */}
        <div className="flex items-center gap-2 flex-wrap">
          {roles.map(r => (
            <span key={r.key} className={`text-xs font-semibold px-3 py-1 rounded-full border ${r.color}`}>
              {r.label}
            </span>
          ))}
        </div>

        {/* Permission tables */}
        <div className="space-y-5">
          {permissions.map(group => (
            <div key={group.category} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Header */}
              <div className="px-4 py-2.5 bg-secondary/40 border-b border-border">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">{group.category}</p>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[1fr_repeat(4,_minmax(72px,_72px))] px-4 py-2 border-b border-border bg-muted/20">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Permissão</p>
                {roles.map(r => (
                  <p key={r.key} className="text-[11px] font-medium text-muted-foreground text-center">{r.label}</p>
                ))}
              </div>

              {/* Rows */}
              {group.items.map((perm, i) => (
                <div
                  key={perm.label}
                  className={`grid grid-cols-[1fr_repeat(4,_minmax(72px,_72px))] px-4 py-3 items-center ${i < group.items.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{perm.label}</p>
                    <p className="text-xs text-muted-foreground">{perm.description}</p>
                  </div>
                  <Cell allowed={perm.admin} />
                  <Cell allowed={perm.moderator} />
                  <Cell allowed={perm.social_media} />
                  <Cell allowed={perm.client} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default SettingsPermissionsPage;
