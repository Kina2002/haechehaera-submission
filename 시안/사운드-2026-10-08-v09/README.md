# 세이프를 참고한 스트라이크·아웃 시안 v09

**게임 미적용.** 세이프는 사용자가 비교적 괜찮다고 한 참고 소리이며, 최종 채택을 의미하지 않습니다. 새 두 판정도 사용자 청취를 기다리는 시안입니다.

- `index.html`: 세이프 → 새 스트라이크 → 새 아웃 이어 듣기, 개별 재생, 이전 버전과 비교.
- `audio/safe-a.*`, `audio/safe-b.*`: v08의 파일을 바이트 그대로 복사했습니다. 첫 비교는 이전 화면의 기본 B를 사용합니다.
- `audio/strike-new.*`, `audio/out-new.*`: 세이프 B를 참고 음성으로 사용해 Chatterbox-Nano로 생성한 **AI 음성**입니다.
- `sources/`: 선정한 생성 원본, 참고용 세이프 반복 파일, 생성 설정과 출처, 모델 라이선스.
- `audio-checks.json`: 길이·유효 샘플·최댓값·시작/끝 경계·WAV/MP3 검사.
- `word-checks.json`: 목표 단어를 프롬프트로 주지 않은 로컬 음성 인식 결과. 청감 검사나 목소리 일치 보증은 아닙니다.
- 최종 길이: 스트라이크 0.733초, 아웃 0.677초, 기준 세이프 0.675초. 이어 듣기 3.284초.

## 제작 방식과 한계

기존 녹음을 더 잘라내는 방식은 단어 경계가 붙어 발음이 어색해져 최종 시안에서 제외했습니다. 이번에는 `Strike!`, `Out!`을 각각 새로 생성했습니다.

참고 세이프는 파일 전체가 0.675초로 매우 짧습니다. 모델의 5초 초과 입력 조건을 맞추기 위해 같은 샘플을 9회 반복했습니다. 반복으로 새로운 발성 정보가 생기지는 않으므로, 같은 목소리처럼 들리는지와 외침의 힘은 실제 청취로 판단해야 합니다.

생성 시 모델 기본 Perth 워터마크를 사용했습니다. 생성 후 앞뒤 무음을 정리하고 시작/끝을 짧게 페이드 처리했으며, 44.1kHz 스테레오로 변환했습니다. 짧게 튀는 소리는 4:1 압축과 35ms 복원 시간으로 제어해 세이프와 평균 음량 차이가 약 1.9~2.8dB 이내가 되도록 했습니다. 음높이나 말하는 속도는 바꾸지 않았습니다. 선택한 생성 원본도 보관합니다.

스트라이크 6개·아웃 3개를 생성했고, 미리듣기에는 스트라이크 seed 101과 아웃 seed 34를 넣었습니다. 두 단어는 개별 원본과 최종 이어 듣기 모두에서 각각 `STRIKE!`, `OUT!`으로 인식됐습니다. 기존 세이프는 최종 이어 듣기에서 `SAVE!`로 오인식되었으므로, 자동 인식을 정확한 발음 판정으로 사용하지 않습니다. 목소리의 유사함·힘·자연스러움은 사용자 청취 확인 대상입니다. 최종 인식 결과는 `final-word-checks.json`에 있습니다.

## 출처

- 참고 녹음: [jcookvoice — American Baseball The Umpire.wav](https://freesound.org/people/jcookvoice/sounds/625473/), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). 실제 사용 원본은 공개 HQ MP3 미리듣기이며 v08 `sources`에 보관되어 있습니다.
- 생성 모델: [ResembleAI/Chatterbox-Nano](https://huggingface.co/ResembleAI/chatterbox-nano), MIT. 모델 파일은 저장소에 포함하지 않습니다.
- 생성 코드: [Chatterbox](https://github.com/resemble-ai/chatterbox), 커밋 `5de7a54aa4e5e2baadb0182dde554908b48b85c2`. 라이선스 사본은 `sources/Chatterbox-LICENSE.txt`에 있습니다.
- 새 판정은 참고 녹음을 바탕으로 생성한 AI 시안입니다. 원래 성우가 새로 녹음하거나 검수한 결과로 표시하지 않습니다.

## 다시 만들기

1. 짧은 경로의 격리된 Python 패키지 폴더에 위 커밋의 Chatterbox를 설치합니다. Windows에서는 모델 캐시도 짧은 경로를 사용합니다.
2. `generate_voice.py --deps <패키지폴더> --cache <모델캐시> --reference ../사운드-2026-10-08-v08/audio/safe-b.wav --out <새 생성폴더> --seeds 12 23 34`로 생성합니다. 스트라이크 추가 후보는 별도 새 폴더에 `--seeds 41 77 101 --calls strike`로 만들었습니다. 검증된 로컬 모델 폴더가 있으면 `--model-dir`로 지정할 수 있습니다.
3. `check_words.py`를 별도 faster-whisper 환경에서 실행하여 잘못 생성된 단어를 검사합니다. 입력 목표 단어를 음성 인식기에 힌트로 주지 않습니다.
4. `make_v09.py --previous ../사운드-2026-10-08-v08 --strike <선정 원본> --out-call <선정 원본> --out <새 마스터폴더> --deps <numpy/scipy/soundfile/lameenc 폴더>`로 출력합니다. 실제 선정 파일은 `audio-checks.json`에 기록됩니다.
5. 마스터 결과를 시안 폴더에 두고 `build_preview.py`를 실행합니다.

기존 게임, 공개 사이트, 이전 시안과 다른 효과음 선택 내역은 이 시안에 포함된 변경 대상이 아닙니다.
