import fs from 'node:fs';
import validator from 'gltf-validator';
const file=process.argv[2]||'public/confirmed/model.glb';
const result=await validator.validateBytes(new Uint8Array(fs.readFileSync(file)),{uri:'model.glb',maxIssues:100});
console.log(JSON.stringify(result.issues,null,2));
if(result.issues.numErrors||result.issues.numWarnings)process.exitCode=1;
