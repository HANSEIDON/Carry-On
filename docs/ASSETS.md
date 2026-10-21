# 외부 에셋 & 라이선스 기록

새 에셋을 추가할 때마다 여기에 한 줄 추가. (설계서 §11 참고)

| 에셋 | 용도 | 출처 | 라이선스 | 출처 표기 필요 |
|---|---|---|---|---|
| Inter | UI 폰트 | @fontsource-variable/inter | SIL OFL 1.1 | 아니오 |
| Barlow Condensed | 공항 코드/태그 폰트 | @fontsource/barlow-condensed | SIL OFL 1.1 | 아니오 |
| Roboto Mono | 편명/태그번호 폰트 | @fontsource/roboto-mono | Apache 2.0 | 아니오 |
| world-atlas | 지도 국경 데이터 | npm world-atlas (Natural Earth 기반) | ISC / Public domain | 아니오 |
| 공항 좌표·코드 | 도시 DB | OurAirports | Public domain | 아니오 |

| Chatterbox (Resemble AI, 모델) | 기장 목소리 클립 생성 (PC/데스크톱에서 오프라인, 앱엔 결과 오디오만) | [ResembleAI/chatterbox](https://huggingface.co/ResembleAI/chatterbox) | MIT | 아니오 (출력물에 Perth 워터마크가 들어감) |
| `scripts/tts/refs/ref-george.wav` | `cb-george` 기장의 음색 참조. Kokoro `bm_george` 낭독(실제 사람 목소리 아님) | 이 저장소에서 생성 | Apache 2.0 파생 | 아니오 |
| Cinzel (글꼴) | 여권 표지 "PASSPORT"·나라 이름 (새긴 로마 대문자) | [@fontsource/cinzel](https://fontsource.org/fonts/cinzel) | OFL 1.1 | 아니오 |
| Noto Serif KR · Noto Serif JP (글꼴) | 여권 표지의 자국어 국가명 (한글·한자·키릴 명조) | [@fontsource/noto-serif-kr](https://fontsource.org/fonts/noto-serif-kr), [@fontsource/noto-serif-jp](https://fontsource.org/fonts/noto-serif-jp) | OFL 1.1 | 아니오 |
| Kokoro-82M (모델·보이스) | 안내방송 음성 생성 (PC에서 오프라인 생성, 앱엔 결과 오디오만 포함) | [hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) via [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) model-files-v1.0 | Apache 2.0 | 아니오 |

## 기내 소음 음색 필터 (앱에 포함)

| 파일 | 만든 원본 | 라이선스 | 출처 표기 |
|---|---|---|---|
| `public/audio/cabin/a320.wav` | Kinoton · Freesound 438972 (아래 표) 의 중앙값 스펙트럼 | CC0 파생 | 아니오 |
| `public/audio/cabin/b737.wav` | fassaria · Freesound 433005 | CC0 파생 | 아니오 |
| `public/audio/cabin/b777.wav` | digifishmusic · Freesound 396292 | CC BY 4.0 파생 | **예**: 앱 크레딧에 "Cabin ambience based on a recording by digifishmusic (freesound.org), CC BY 4.0" |

## 기내 소음 실제 녹음 (원본 · 사운드 랩 비교용)

원본은 `scripts/sound/raw/`(git 제외), 90초 루프는 `scripts/sound/make_cabin_loop.py`로 생성. 앱에 넣는 것만 확정 후 이 표의 위 표로 옮김.

| 녹음 | 출처 | 라이선스 | 출처 표기 |
|---|---|---|---|
| Airbus A320 in flight | [Kinoton · Freesound 438972](https://freesound.org/people/Kinoton/sounds/438972/) | CC0 | 아니오 |
| Boeing 737 in flight | [fassaria · Freesound 433005](https://freesound.org/people/fassaria/sounds/433005/) | CC0 | 아니오 |
| Large jet in flight | [richwise · Freesound 451741](https://freesound.org/people/richwise/sounds/451741/) | CC0 | 아니오 |
| Boeing 777 business, binaural | [digifishmusic · Freesound 396292](https://freesound.org/people/digifishmusic/sounds/396292/) | CC BY 4.0 | **예**: "Cabin ambience by digifishmusic (freesound.org), CC BY 4.0" |

## 예정
- Poly Haven / ambientCG — 스티커 실사 재질, HDRI (CC0)
- 3D 캐리어 — 오픈소스 우선 (Sketchfab CC0/CC-BY 등), 모델마다 작성자·링크 기록
