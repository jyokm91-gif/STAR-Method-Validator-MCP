import * as fs from 'fs';
import * as path from 'path';
import * as mammoth from 'mammoth';
import { glob } from 'glob';

// [수정됨] 절대 경로 대신 상대 경로 사용
// 이 스크립트는 server 폴더 내에서 실행되므로, 상위 폴더의 문서들을 찾도록 설정
const DATA_DIR = path.resolve(__dirname, '../../'); 
const OUTPUT_FILE = path.join(__dirname, 'knowledge_base.json');

// 기본 키워드
const SEED_VERBS = ["분석", "기획", "개발", "해결", "주도", "달성", "개선", "구축"];
const SEED_METRICS = ["%", "원", "배", "시간", "단축", "증가", "감소"];

async function extractTextFromDocx(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.warn(`Skipping file ${filePath}:`, error);
    return "";
  }
}

async function analyzeTexts(texts: string[]) {
  const verbCounts: Record<string, number> = {};
  const verbRegex = /([가-힣]{2,})(하다|했다|하여|하고|할|한)/g;
  
  texts.forEach(text => {
    let match;
    while ((match = verbRegex.exec(text)) !== null) {
      const root = match[1];
      verbCounts[root] = (verbCounts[root] || 0) + 1;
    }
  });

  const sortedVerbs = Object.entries(verbCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50)
    .map(([verb]) => verb);
  
  const finalVerbs = Array.from(new Set([...SEED_VERBS, ...sortedVerbs]));

  return {
    verbs: finalVerbs,
    metrics: SEED_METRICS,
    stats: {
      files_processed: texts.length,
      verbs_found: Object.keys(verbCounts).length
    }
  };
}

async function train() {
  console.log(`Scanning directory for training data: ${DATA_DIR}`);
  const files = await glob(`${DATA_DIR}/**/*.docx`);
  
  console.log(`Found ${files.length} docx files. Processing...`);

  const texts: string[] = [];
  for (const file of files) {
    const text = await extractTextFromDocx(file);
    if (text.length > 100) {
      texts.push(text);
    }
  }

  console.log(`Extracted text from ${texts.length} valid files. Analyzing...`);
  const knowledge = await analyzeTexts(texts);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(knowledge, null, 2), 'utf8');
  console.log(`Training complete. Knowledge base saved to ${OUTPUT_FILE}`);
}

train().catch(console.error);
