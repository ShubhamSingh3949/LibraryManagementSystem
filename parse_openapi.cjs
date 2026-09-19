const fs = require('fs');

const data = JSON.parse(fs.readFileSync('openapi.json', 'utf8'));
const spaces = data.definitions.spaces;
console.log("Spaces definition:");
console.dir(spaces, { depth: null });
