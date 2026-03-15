/**
 * generate-images.js
 *
 * "클로드 코드 길들이기" 웹북용 일러스트 4장 생성 스크립트
 * Gemini Imagen 4.0 API를 사용하여 이미지를 생성합니다.
 *
 * 사용법: node js/generate-images.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ===== API 키 로딩 (.env 파일에서 읽기) =====
const envPath = 'C:/Users/yunas/Desktop/nomore-company/config/api_keys.env';
const envContent = fs.readFileSync(envPath, 'utf-8');
// GEMINI_API_KEY 값 추출 (첫 번째 매칭)
const apiKey = envContent.match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();

if (!apiKey) {
  console.error('[오류] GEMINI_API_KEY를 찾을 수 없습니다. api_keys.env 파일을 확인하세요.');
  process.exit(1);
}

// ===== 출력 디렉토리 설정 =====
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'images');

// 출력 디렉토리가 없으면 생성
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`[정보] 출력 디렉토리 생성: ${OUTPUT_DIR}`);
}

// ===== 생성할 이미지 목록 =====
const images = [
  {
    filename: 'cover-illustration.png',
    prompt: 'A friendly cartoon illustration of a person training a cute AI robot with a leash, warm pastel colors, minimal flat design, no text, educational book cover style',
    description: '표지 이미지 — AI 로봇을 길들이는 사람'
  },
  {
    filename: 'concept-memory.png',
    prompt: 'A cute illustration of colorful sticky notes and memo pads on a computer monitor, warm pastel colors, minimal flat design, no text, educational concept art',
    description: '메모리 개념 — 컴퓨터 모니터 위의 포스트잇'
  },
  {
    filename: 'concept-hook.png',
    prompt: 'A cute illustration of an automatic alarm bell system at a door, with notification icons, warm pastel colors, minimal flat design, no text, educational concept art',
    description: '훅 개념 — 자동 알림 시스템'
  },
  {
    filename: 'concept-skill.png',
    prompt: 'A cute illustration of a handbook or manual with upgrade arrows and level-up symbols, warm pastel colors, minimal flat design, no text, educational concept art',
    description: '스킬 2.0 개념 — 업그레이드/레벨업 매뉴얼'
  }
];

/**
 * Imagen 4.0 API를 호출하여 이미지를 생성하고 파일로 저장
 * @param {string} prompt - 이미지 생성 프롬프트 (영문)
 * @param {string} filename - 저장할 파일명
 * @param {string} description - 이미지 설명 (로그용)
 */
async function generateImage(prompt, filename, description) {
  console.log(`\n[생성 중] ${description}`);
  console.log(`  프롬프트: ${prompt}`);
  console.log(`  파일명: ${filename}`);

  // Imagen 4.0 API 요청 본문 구성
  const requestBody = JSON.stringify({
    instances: [
      { prompt: prompt }
    ],
    parameters: {
      sampleCount: 1
    }
  });

  // API URL: imagen-4.0-generate-001 모델의 predict 엔드포인트
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          // 에러 응답 처리
          if (response.error) {
            console.error(`  [오류] API 에러: ${response.error.message}`);
            reject(new Error(response.error.message));
            return;
          }

          // 응답에서 base64 이미지 데이터 추출
          const predictions = response.predictions;
          if (!predictions || predictions.length === 0) {
            console.error('  [오류] 이미지 생성 결과가 없습니다.');
            console.error('  응답:', JSON.stringify(response, null, 2).substring(0, 500));
            reject(new Error('이미지 생성 결과 없음'));
            return;
          }

          // base64 인코딩된 이미지 데이터 추출
          const imageData = predictions[0].bytesBase64Encoded;
          if (!imageData) {
            console.error('  [오류] base64 이미지 데이터를 찾을 수 없습니다.');
            console.error('  응답 키:', Object.keys(predictions[0]));
            reject(new Error('base64 데이터 없음'));
            return;
          }

          // base64 → Buffer → 파일 저장
          const imageBuffer = Buffer.from(imageData, 'base64');
          const outputPath = path.join(OUTPUT_DIR, filename);
          fs.writeFileSync(outputPath, imageBuffer);

          const fileSizeKB = (imageBuffer.length / 1024).toFixed(1);
          console.log(`  [완료] 저장됨: ${outputPath} (${fileSizeKB} KB)`);
          resolve(outputPath);

        } catch (parseError) {
          console.error(`  [오류] 응답 파싱 실패: ${parseError.message}`);
          console.error(`  원본 응답 (처음 500자): ${data.substring(0, 500)}`);
          reject(parseError);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`  [오류] 네트워크 에러: ${error.message}`);
      reject(error);
    });

    // 타임아웃 설정 (60초)
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('요청 타임아웃 (60초 초과)'));
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * 메인 실행 함수
 * 4장의 이미지를 순차적으로 생성
 */
async function main() {
  console.log('========================================');
  console.log('클로드 코드 길들이기 — 일러스트 생성 시작');
  console.log(`출력 디렉토리: ${OUTPUT_DIR}`);
  console.log(`총 ${images.length}장 생성 예정`);
  console.log('========================================');

  let successCount = 0;
  let failCount = 0;
  const results = [];

  // 순차 생성 (API rate limit 고려)
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    console.log(`\n--- [${i + 1}/${images.length}] ---`);

    try {
      const outputPath = await generateImage(img.prompt, img.filename, img.description);
      successCount++;
      results.push({ filename: img.filename, status: '성공', path: outputPath });
    } catch (error) {
      failCount++;
      results.push({ filename: img.filename, status: '실패', error: error.message });
      console.error(`  [실패] ${img.filename}: ${error.message}`);
    }

    // API 호출 간 2초 대기 (rate limit 방지)
    if (i < images.length - 1) {
      console.log('  (2초 대기 중...)');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // ===== 최종 결과 요약 =====
  console.log('\n========================================');
  console.log('생성 결과 요약');
  console.log('========================================');
  results.forEach(r => {
    if (r.status === '성공') {
      console.log(`  ✓ ${r.filename} — ${r.path}`);
    } else {
      console.log(`  ✗ ${r.filename} — 실패: ${r.error}`);
    }
  });
  console.log(`\n성공: ${successCount}장 / 실패: ${failCount}장`);
  console.log('========================================');

  // 실패가 있으면 exit code 1
  if (failCount > 0) {
    process.exit(1);
  }
}

// 실행
main().catch((error) => {
  console.error('[치명적 오류]', error);
  process.exit(1);
});
