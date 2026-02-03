# STAR Method Validator MCP 🦉

S.T.A.R 기법(Situation, Task, Action, Result)을 기반으로 자기소개서나 면접 답변의 논리적 구조를 분석하고 검증해주는 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) 서버입니다.

단순한 텍스트 분석을 넘어, 실제 합격 자소서 데이터에서 추출한 핵심 동사(Action Verbs)와 성과 지표(Metrics)를 기반으로 점수를 매기고 구체적인 피드백을 제공합니다.

## ✨ 주요 기능

*   STAR 구조 자동 감지: 상황, 과제, 행동, 결과 4단계 구조가 잘 갖춰졌는지 분석합니다.
*   데이터 기반 검증: 80여 건의 실제 합격 자소서에서 학습된 고성능 키워드(High Impact Verbs) 사용 여부를 체크합니다.
    *   예: '참여했다' (X) -> '주도했다', '최적화했다' (O)
*   수치적 성과(Result) 확인: 구체적인 숫자(%, 금액, 시간 단축 등)가 포함되었는지 정규표현식으로 정밀하게 검사합니다.
*   점수 및 피드백: 0~100점 스코어링 시스템과 개선을 위한 구체적인 조언(Advice)을 JSON 형태로 반환합니다.

## 🚀 설치 및 실행

### 1. 프로젝트 클론 및 설치
```bash
git clone https://github.com/jyokm91-gif/STAR-Method-Validator-MCP.git
cd STAR-Method-Validator-MCP/server
npm install
```

### 2. 빌드
TypeScript 코드를 컴파일합니다.
```bash
npm run build
```

### 3. Claude Desktop 연동
claude_desktop_config.json 파일을 열고 아래 내용을 추가하세요.
(Windows: %APPDATA%\Claude\claude_desktop_config.json)

```json
{
  "mcpServers": {
    "star-validator": {
      "command": "node",
      "args": [
        "C:\\path\\to\\STAR-Method-Validator-MCP\\server\\dist\\index.js"
      ]
    }
  }
}
```
*경로는 실제 프로젝트가 위치한 절대 경로로 수정해주세요.*

## 🛠️ 사용 방법

Claude나 MCP 클라이언트에게 다음과 같이 요청하세요:

> "이 자소서 내용을 STAR 기법으로 검증해줘: [자소서 내용]"

또는 직접적인 툴 호출을 테스트할 수 있습니다:
```javascript
// validate_star 툴 호출 예시
{
  "name": "validate_star",
  "arguments": {
    "text": "팀장으로서 프로젝트를 기획하고 주도했습니다. 결과적으로 매출이 20% 증가했습니다."
  }
}
```

## 🧠 작동 원리 및 학습 데이터

이 MCP는 사전 학습된 지식(Pre-trained Knowledge)을 내장하고 있습니다.

*   src/knowledge_base.json: 합격 자소서 분석을 통해 추출된 핵심 동사 리스트와 성과 지표 패턴이 저장되어 있습니다.
*   참고: 저작권 및 개인정보 보호를 위해 학습에 사용된 원본 자소서 파일(.docx)은 리포지토리에 포함되지 않습니다. 하지만 서버는 내장된 knowledge_base.json을 통해 문제없이 완벽하게 작동합니다.

### 커스텀 학습 (Optional)
만약 본인이 소유한 자소서 데이터로 모델을 재학습시키고 싶다면:
1. .docx 파일들을 특정 폴더에 모아둡니다.
2. src/train.ts 파일의 DATA_DIR 경로를 수정합니다.
3. npx tsx src/train.ts를 실행하여 knowledge_base.json을 업데이트합니다.

## 📝 License

This project is licensed under the MIT License.
