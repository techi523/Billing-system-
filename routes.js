const fs = require('fs');
const path = require('path');
const dir = 'src/routes';
let result = [];
fs.readdirSync(dir).forEach(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const matches = content.match(/router\.(get|post|put|delete|patch)\((['"`])(.*?)(\2)/g);
  if (matches) {
    result.push(`\n--- ${file} ---`);
    matches.forEach(m => result.push(m.replace('router.', '')));
  }
});
fs.writeFileSync('routes_output.txt', result.join('\n'));
