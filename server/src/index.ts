import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// --- Load Knowledge Base ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// dist/index.js 에서 실행되므로 ../src/knowledge_base.json 을 찾아야 함, 혹은 빌드 시 복사
// 개발 편의를 위해 소스 위치를 절대 경로로 참조하거나, try-catch로 로드
let KNOWLEDGE_BASE = {
  verbs: ["분석", "기획", "개발", "해결", "주도", "달성", "개선", "구축"],
  metrics: ["%", "원", "배", "시간", "단축", "증가", "감소"]
};

try {
  // Try loading from adjacent file (if copied) or source
  // Assuming strict structure, let's look at the generated file path
  // Current known path: C:\Users\jyokm\OneDrive\Desktop\수리부엉이\STAR Method Validator MCP\server\src\knowledge_base.json
  const kbPath = path.resolve(__dirname, '../../src/knowledge_base.json');
  if (fs.existsSync(kbPath)) {
      const raw = fs.readFileSync(kbPath, 'utf8');
      KNOWLEDGE_BASE = JSON.parse(raw);
      console.error(`Loaded knowledge base with ${KNOWLEDGE_BASE.verbs.length} verbs.`);
  } else {
      console.error("Knowledge base not found at " + kbPath + ", using defaults.");
  }
} catch (e) {
  console.error("Failed to load knowledge base:", e);
}

const HIGH_IMPACT_VERBS = KNOWLEDGE_BASE.verbs;
const METRIC_KEYWORDS = KNOWLEDGE_BASE.metrics;

const QUANTITATIVE_METRICS = [
  // Regex patterns combining numbers + keywords
  /[0-9]+(\.[0-9]+)?%/,        
  /[0-9]+(\.[0-9]+)?배/,       
  /[0-9]+(\.[0-9]+)?원/,       
  /[0-9]+(명|개|건|회|시간|일|개월|년)/, 
  new RegExp(METRIC_KEYWORDS.join("|"))
];

const WEAK_VERBS = [
  "참여했다", "배웠다", "생각한다", "느꼈다", "노력했다", "공부했다", "알게 되었다"
];

const server = new Server(
  {
    name: "star-validator",
    version: "2.0.0", // Major version up due to learning capability
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// --- Validation Logic ---

interface ValidationResult {
  score: number; 
  components: {
    S: boolean;
    T: boolean;
    A: boolean;
    R: boolean;
  };
  details: {
    missing: string[];
    weaknesses: string[];
    strengths: string[];
  };
  advice: string;
}

function validateStarMethod(text: string): ValidationResult {
  const missing: string[] = [];
  const weaknesses: string[] = [];
  const strengths: string[] = [];
  let score = 100;

  // 1. Structure Analysis 
  const hasSituation = /당시|배경|상황|시절|근무|프로젝트/.test(text);
  const hasTask = /목표|과제|역할|책임|문제|요구/.test(text);
  
  // Use learned verbs for Action detection
  const hasAction = HIGH_IMPACT_VERBS.some(v => text.includes(v));
  
  // Use learned metrics for Result detection
  const hasResult = QUANTITATIVE_METRICS.some(p => p.test(text));

  const components = { S: hasSituation, T: hasTask, A: hasAction, R: hasResult };

  if (!hasSituation) { missing.push("Situation (상황)"); score -= 10; }
  if (!hasTask) { missing.push("Task (과제/목표)"); score -= 10; }
  if (!hasAction) { missing.push("Action (구체적 행동)"); score -= 30; }
  if (!hasResult) { missing.push("Result (수치적 성과)"); score -= 30; }

  // 2. Action Quality Check
  const weakVerbCount = WEAK_VERBS.filter(v => text.includes(v)).length;
  if (weakVerbCount > 0) {
    weaknesses.push(`수동적이거나 추상적인 표현이 감지되었습니다 (${weakVerbCount}회): '참여했다', '배웠다' 대신 '주도했다', '분석하여 해결했다' 등으로 바꿔보세요.`);
    score -= (weakVerbCount * 5);
  }

  // 3. Result Quality Check
  if (hasResult) {
    strengths.push("성과가 수치나 명확한 지표로 표현되어 신뢰도를 높입니다.");
  } else {
    weaknesses.push("결과가 정성적(열심히 했다, 좋았다)으로만 기술되었습니다. 구체적인 숫자(%, 금액, 기간 등)를 포함시키세요.");
  }

  // 4. Length Check
  if (text.length < 100) score -= 20;
  if (score < 0) score = 0;

  // 5. Advice Generation
  let advice = "";
  if (score >= 90) advice = "훌륭합니다! 실제 합격 자소서들과 유사한 '핵심 동사'와 '성과 지표'가 잘 사용되었습니다.";
  else if (score >= 70) advice = "전반적으로 양호합니다. 학습된 합격 데이터 기반으로 보았을 때, 행동을 조금 더 주도적인 단어(" + HIGH_IMPACT_VERBS.slice(0,3).join(", ") + " 등)로 표현해보세요.";
  else advice = "구조적 보완이 필요합니다. 합격 자소서들은 보통 구체적인 숫자(" + METRIC_KEYWORDS.join(", ") + ")와 명확한 행동 동사를 사용합니다.";

  return {
    score,
    components,
    details: { missing, weaknesses, strengths },
    advice
  };
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "validate_star",
        description: "Validates a self-introduction text against the STAR method. USES REAL DATA LEARNED FROM 80+ SUCCESSFUL COVER LETTERS to evaluate action verbs and result metrics.",
        inputSchema: zodToJsonSchema(
          z.object({
            text: z.string().describe("The text to validate."),
          })
        ),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "validate_star") {
    const { text } = request.params.arguments as { text: string };
    const result = validateStarMethod(text);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
  throw new Error("Tool not found");
});

function zodToJsonSchema(schema: any) {
    return {
        type: "object",
        properties: {
            text: { type: "string", description: "The text to validate." }
        },
        required: ["text"]
    };
}

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("STAR Validator MCP server (Data-Driven) running on stdio");
}

run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
