export const LGPD_NOTICE = {
  controllerName: "[PLACEHOLDER_NOME_EMPRESA]",
  contactChannel: "[PLACEHOLDER_CANAIS_CONTATO]",
  dpoContact: "[PLACEHOLDER_CONTATO_DPO]",
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
  legalBasisSuggestion:
    "definir conforme o contexto: execução de contrato, legítimo interesse, cumprimento de obrigação legal/regulatória ou consentimento quando aplicável",
};

export function sanitizeProcessingError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Não foi possível processar o arquivo sem expor o conteúdo importado.";
}
