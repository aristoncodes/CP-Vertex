import fs from 'fs';
import path from 'path';

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.resolve(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const apiDir = path.resolve(__dirname, '../src/app/api');
const files = walk(apiDir);

let count = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('import { auth } from "@/auth"')) {
    // Basic detection
    const hasGet = content.includes('export async function GET(');
    const hasPost = content.includes('export async function POST(');
    const hasPut = content.includes('export async function PUT(');
    const hasDelete = content.includes('export async function DELETE(');
    const hasPatch = content.includes('export async function PATCH(');

    if (hasGet || hasPost || hasPut || hasDelete || hasPatch) {
      console.log(`Need to refactor ${file}`);
      // Skip automatic replacement since regex for all edge cases is too complex to get right in a simple script.
      // I will do it manually or via a smarter AST approach.
    }
  }
}
