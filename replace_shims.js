const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'client', 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            results.push(file);
        }
    });
    return results;
}

const files = walk(srcDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

const replacements = [
    { from: /from ['"]\.\.?\/shims\/react-router-dom['"]/g, to: "from 'react-router-dom'" },
    { from: /from ['"]\.\.?\/shims\/axios['"]/g, to: "from 'axios'" },
    { from: /from ['"]\.\.?\/shims\/framer-motion['"]/g, to: "from 'framer-motion'" },
    { from: /from ['"]\.\.?\/shims\/lucide-react['"]/g, to: "from 'lucide-react'" },
    { from: /from ['"]\.\.?\/shims\/recharts['"]/g, to: "from 'recharts'" },
    { from: /from ['"]\.\.?\/shims\/react['"]/g, to: "from 'react'" },
    { from: /from ['"]\.\.?\/shims\/react-dom['"]/g, to: "from 'react-dom'" },
    // Also handle deep paths if any
    { from: /from ['"]\.\.\/shims\/react-router-dom['"]/g, to: "from 'react-router-dom'" },
    { from: /from ['"]\.\.\/shims\/axios['"]/g, to: "from 'axios'" },
    { from: /from ['"]\.\.\/\.\.\/shims\/react-router-dom['"]/g, to: "from 'react-router-dom'" }
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    replacements.forEach(rep => {
        if (rep.from.test(content)) {
            content = content.replace(rep.from, rep.to);
            changed = true;
        }
    });
    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Updated imports in: ${file}`);
    }
});
