export const LGPD_NOTICE = {
  projectContext:
    "Ferramenta demonstrativa e independente. Este projeto não representa uma política oficial da Coopersystem.",
  processingMode: "local-browser-only",
  dataCategories: [
    "nome do usuário",
    "IDs de tarefas/cartões",
    "títulos de atividades",
    "datas",
    "horas",
    "etiquetas",
    "respostas coladas da Cecis",
  ],
  purposes: [
    "validar lançamentos de horas",
    "gerar JSONs para uso manual em sistemas internos",
    "permitir conferência pelo próprio usuário",
  ],
  userResponsibility:
    "Use somente arquivos que você esteja autorizado a consultar e compartilhe relatórios ou JSONs apenas com destinos permitidos.",
};

export function sanitizeProcessingError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Não foi possível processar o arquivo sem expor o conteúdo importado.";
}
