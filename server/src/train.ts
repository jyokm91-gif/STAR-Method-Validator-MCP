import * as fs from 'fs';
import * as path from 'path';
import * as mammoth from 'mammoth';
import { glob } from 'glob';

const DATA_DIR = "C:/Users/jyokm/OneDrive/Desktop/수리부엉이/STAR Method Validator MCP";
const OUTPUT_FILE = path.join(process.cwd(), 'src', 'knowledge_base.json');

// 기본 키워드 (학습 데이터가 부족할 경우를 대비한 시드 데이터)
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
  const metricPatterns: string[] = [];

  // 간단한 형태소 분석 흉내 (단어 뒤의 '하다', '했다' 등을 제거하고 어근 추출)
  // 실제로는 형태소 분석기가 필요하지만, 여기서는 Heuristic으로 처리
  const verbRegex = /([가-힣]{2,})(하다|했다|하여|하고|할|한)/g;
  
  texts.forEach(text => {
    // 1. Verb Extraction
    let match;
    while ((match = verbRegex.exec(text)) !== null) {
      const root = match[1];
      verbCounts[root] = (verbCounts[root] || 0) + 1;
    }

    // 2. Metric Pattern Discovery (단순 카운팅 대신 패턴 유무 확인)
    // 수치 주변의 단어들을 찾을 수도 있으나, 여기서는 기본 Metric 패턴이 얼마나 등장하는지 확인
  });

  // 빈도수 상위 동사 추출 (Top 50)
  const sortedVerbs = Object.entries(verbCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50)
    .map(([verb]) => verb);
  
  // 합치기 (시드 데이터 + 학습 데이터)
  const finalVerbs = Array.from(new Set([...SEED_VERBS, ...sortedVerbs]));

  return {
    verbs: finalVerbs,
    metrics: SEED_METRICS, // Metrics는 정규식 패턴이라 자동 추출이 어려워 시드 유지
    stats: {
      files_processed: texts.length,
      verbs_found: Object.keys(verbCounts).length
    }
  };
}

async function train() {
  console.log(`Scanning directory: ${DATA_DIR}`);
  // 서브디렉토리 포함 모든 docx 파일 찾기
  const files = await glob(`${DATA_DIR}/**/*.docx`);
  
  console.log(`Found ${files.length} docx files. Processing...`);

  const texts: string[] = [];
  for (const file of files) {
    const text = await extractTextFromDocx(file);
    if (text.length > 100) { // 너무 짧은 파일 제외
      texts.push(text);
    }
  }

  console.log(`Extracted text from ${texts.length} valid files. Analyzing...`);
  const knowledge = await analyzeTexts(texts);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(knowledge, null, 2), 'utf8');
  console.log(`Training complete. Knowledge base saved to ${OUTPUT_FILE}`);
  console.log(knowledge);
}

train().catch(console.error);
