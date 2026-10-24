import { cpSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../dist/', import.meta.url));
const destination = fileURLToPath(new URL('../../backend/src/main/resources/static/', import.meta.url));
if (!existsSync(new URL('../dist/index.html', import.meta.url))) {
  throw new Error('React build is missing. Run npm run build:backend.');
}
rmSync(destination, { recursive: true, force: true });
cpSync(source, destination, { recursive: true });
console.log('React runtime bundle updated in backend/src/main/resources/static.');
