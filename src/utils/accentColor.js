// Cor de destaque de cada personagem, tirada do proprio retrato: a media dos
// pixels, com peso nos mais saturados, para o holofote da selecao ficar na cor
// dele sem ninguem escolher uma por uma. Devolve null se a imagem nao carregar.
const cache = new Map();
const SIZE = 24;

export function loadAccent(url, rect) {
  const key = `${url}|${rect?.join(',') ?? ''}`;
  if (!cache.has(key)) {
    cache.set(key, new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = SIZE;
          canvas.height = SIZE;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (rect) context.drawImage(image, rect[0], rect[1], rect[2], rect[3], 0, 0, SIZE, SIZE);
          else context.drawImage(image, 0, 0, SIZE, SIZE);
          const { data } = context.getImageData(0, 0, SIZE, SIZE);
          let red = 0, green = 0, blue = 0, total = 0;
          for (let at = 0; at < data.length; at += 4) {
            if (data[at + 3] < 200) continue;
            const high = Math.max(data[at], data[at + 1], data[at + 2]);
            const low = Math.min(data[at], data[at + 1], data[at + 2]);
            const saturation = high ? (high - low) / high : 0;
            const weight = saturation * saturation * (high / 255) + 0.002;
            red += data[at] * weight;
            green += data[at + 1] * weight;
            blue += data[at + 2] * weight;
            total += weight;
          }
          if (!total) return resolve(null);
          const peak = Math.max(red, green, blue) / total;
          const lift = peak > 0 ? 235 / peak : 1;
          const channel = (value) => Math.min(255, Math.round((value / total) * lift));
          return resolve(`rgb(${channel(red)}, ${channel(green)}, ${channel(blue)})`);
        } catch {
          return resolve(null);
        }
      };
      image.onerror = () => resolve(null);
      image.src = url;
    }));
  }
  return cache.get(key);
}
