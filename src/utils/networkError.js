// Erro de rede (servidor fora do ar, sem internet, projeto pausado): o navegador
// diz so "Failed to fetch" ou "NetworkError", sem dizer o que fazer.
export const NETWORK_MESSAGE = 'Sem conexao com o servidor. Confira a internet e tente de novo.';

export function isNetworkError(error) {
  const text = `${error?.name ?? ''} ${error?.message ?? ''}`;
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|retryablefetch/i.test(text);
}
