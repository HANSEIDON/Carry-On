# 안내방송 음성 클립 만들기

앱의 안내방송은 미리 만든 음성 클립을 이어 붙여 재생해요. 대본(`src/domain/announcements.ts`)의 모든 방송은 쉼표나 마침표에서 끊기는 **구절**로 나뉘고, 구절 하나가 클립 하나예요. 도시·항공사·편명·시간처럼 바뀌는 부분은 항상 구절 통째로 들어가서, 단어 중간에서 잘리는 클립은 없어요.

| 화자 | 목소리 | 엔진 | 구절 수 | 분량 (대략) |
|---|---|---|---|---|
| 기장 | `cb-default` (Chatterbox 기본 음색, 차분하게) | Chatterbox | 432 | 25분 |
| 기장 | `cb-george` (George 음색 + Chatterbox, 차분하게) | Chatterbox | 432 | 25분 |
| 승무원 | `alice-112` (Kokoro Alice, 1.12배속) | Kokoro | 1,781 | 60분 |

- 기장은 비행마다 편명으로 둘 중 한 명이 정해져요 (`voiceFor()`, 같은 편명이면 늘 같은 기장)
- 결과: `public/audio/voice/<목소리>/<구절 키>.mp3` (모노 24kHz, 약 25kbps, 앞뒤 무음 제거, 음량 통일) + `clips.json` (있는 클립 목록). 전부 합쳐 약 20MB
- 클립이 하나라도 없는 방송은 앱이 기기 음성(Web Speech)으로 대신 읽어요. 그래서 일부만 만들어도 앱은 동작해요
- 이어서 만들기 가능: 이미 있는 클립은 건너뛰어요. 중간에 꺼도 다시 실행하면 이어서 해요

## 구절 목록

`scripts/tts/parts.json`이 만들 구절 전체 목록이에요 (git에 포함). 대본·도시·항공사를 바꿨다면 다시 만들어요:

```
node scripts/tts/list_parts.mjs
```

## 데스크톱(NVIDIA GPU)에서 만들기

Chatterbox는 이 노트북 CPU에서 실시간의 약 0.1배라 기장 두 명 분량에 12시간 넘게 걸려요(짧은 구절 하나에 50초쯤). GPU가 있는 데스크톱이면 훨씬 빨라요. Kokoro(승무원)는 CPU로도 2시간쯤이에요.

1. 저장소 받기 (최신 커밋이 푸시돼 있어야 해요)
   ```
   git clone https://github.com/HANSEIDON/Carry-On.git
   cd Carry-On
   ```
2. Python 3.12 설치 후 가상환경 두 개
   ```
   py -3.12 -m venv scripts/tts/.venv
   scripts/tts/.venv/Scripts/python -m pip install kokoro-onnx soundfile

   py -3.12 -m venv scripts/tts/.venv-chatterbox
   scripts/tts/.venv-chatterbox/Scripts/python -m pip install torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124
   scripts/tts/.venv-chatterbox/Scripts/python -m pip install chatterbox-tts soundfile "setuptools<81"
   ```
   (`setuptools<81`: Chatterbox의 워터마크 모듈이 `pkg_resources`를 써요)
3. 모델 파일 (git 제외, 약 3.4GB)
   - `scripts/tts/models/kokoro-v1.0.onnx`, `voices-v1.0.bin`: https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
   - `scripts/tts/models/chatterbox/` 에 `ve.safetensors`, `t3_cfg.safetensors`, `s3gen.safetensors`, `tokenizer.json`, `conds.pt`: https://huggingface.co/ResembleAI/chatterbox
     ```
     curl -4 -L -o scripts/tts/models/chatterbox/t3_cfg.safetensors https://huggingface.co/ResembleAI/chatterbox/resolve/main/t3_cfg.safetensors
     ```
     (다섯 파일 모두 같은 방식. `-4`는 이 노트북 네트워크에서 IPv6가 멈춰서 붙인 것, 데스크톱에선 없어도 돼요)
4. 생성 (두 창에서 동시에 돌려도 돼요)
   ```
   scripts/tts/.venv-chatterbox/Scripts/python -I scripts/tts/generate_clips.py
   scripts/tts/.venv/Scripts/python -I scripts/tts/generate_clips.py
   ```
   시작할 때 `chatterbox on cuda`가 나오면 GPU로 돌고 있는 거예요. 진행률과 남은 시간이 25개마다 찍혀요.
5. 끝나면 `public/audio/voice/` 를 커밋하고 푸시 → 노트북에서 풀

옵션: `--voice cb-george` (한 목소리만), `--match "Tokyo"` (특정 구절만), `--limit 50` (개수 제한), `--device cpu`

## 듣고 확인하기

개발 서버에서 사운드 랩(`/voice-samples/index.html`)의 **완성 방송 미리듣기**: 앱과 똑같이 클립을 이어 붙여 기내 PA 필터로 재생해요. 기장을 골라 들을 수 있고, 클립이 없는 방송은 표시돼요.
