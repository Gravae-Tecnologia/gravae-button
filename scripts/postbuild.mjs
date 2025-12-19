import fs from 'fs/promises';
import path from 'path';

async function main() {
  const dist = path.resolve('./dist');
  // renomeia config.js import path fixes: ensure config.ts compiled to config.js exists
  try {
    await fs.access(path.join(dist, 'config.js'));
    console.log('postbuild: config.js presente');
  } catch (e) {
    console.log('postbuild: config.js ausente, tentando gerar a partir de src/config.ts...');
    const src = path.resolve('./src/config.ts');
    const dest = path.join(dist, 'config.js');
    try {
      const content = await fs.readFile(src, 'utf8');
      // Simples transpile: export as-is (TypeScript types removed by tsc normally). Aqui apenas escreve o conteúdo para dist/config.js
      // Isso é apenas fallback; ideal é rodar tsc primeiro.
      await fs.writeFile(dest, content.replace(/export type [^;]+;\n?/g, ''), 'utf8');
      console.log('postbuild: escreveu dist/config.js a partir de src/config.ts (fallback)');
    } catch (err) {
      console.error('postbuild: falha ao gerar dist/config.js', err);
      process.exit(1);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
