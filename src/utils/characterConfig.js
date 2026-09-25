// Config do personagem para as telas em React (sprite animado, lista de
// golpes), baixado uma vez por personagem.
const configCache = new Map();

export function loadConfig(entry) {
  const url = `${entry.dir}/${entry.config}`;
  if (!configCache.has(url)) {
    configCache.set(url, fetch(url).then((response) => response.json()));
  }
  return configCache.get(url);
}

// URL de uma pagina do atlas com a versao gravada pelo importador: depois de
// reimportar um personagem, a imagem nova nao vem do cache do navegador.
export function sheetUrl(entry, config, file) {
  const url = `${entry.dir}/${file}`;
  return config.assetVersion ? `${url}?v=${config.assetVersion}` : url;
}
