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
