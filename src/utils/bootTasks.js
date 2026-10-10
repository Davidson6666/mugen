// Carregamento de abertura: roda as tarefas (fontes, retratos...) em paralelo e
// conta o progresso em "unidades" reais, para a barra andar de verdade em vez de
// fingir. Tarefa que falha ou demora demais nao trava o jogo: ela e dada como
// terminada e aparece na lista de "falhou" (o jogo funciona sem ela, so pode
// aparecer um pouco menos polido).
//
// task = { label, units = 1, run(tick) }; "tick()" soma uma unidade (uma imagem
// carregada, por exemplo). O que sobrar das unidades entra quando a tarefa acaba.
export async function runBoot(tasks, { onProgress = () => {}, taskTimeoutMs = 8000 } = {}) {
  const unitsOf = (task) => task.units ?? 1;
  const total = tasks.reduce((sum, task) => sum + unitsOf(task), 0);
  const finished = new Set();
  const failed = [];
  let done = 0;

  const report = () => onProgress({
    fraction: total === 0 ? 1 : Math.min(1, done / total),
    pending: tasks.filter((task) => !finished.has(task)).map((task) => task.label),
  });
  report();

  await Promise.all(tasks.map(async (task) => {
    let ticked = 0;
    const tick = () => {
      if (ticked >= unitsOf(task)) return;
      ticked += 1;
      done += 1;
      report();
    };
    let timer;
    try {
      await Promise.race([
        Promise.resolve().then(() => task.run(tick)),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('tempo esgotado')), taskTimeoutMs); }),
      ]);
    } catch {
      failed.push(task.label);
    } finally {
      clearTimeout(timer);
      done += unitsOf(task) - ticked;
      finished.add(task);
      report();
    }
  }));

  return { failed };
}

// Imagem baixada ate o fim (ou com erro: o retrato que falta nao pode travar a
// abertura).
export function preloadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
  });
}
