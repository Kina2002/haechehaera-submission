# 해체해라 사운드 시안 08 · 스트라이크·아웃·세이프

**2026-10-08 · 새 후보 · 게임 미적용**

사용자 선택 방향: **실제 심판처럼 굵고 힘 있게**. 이번에는 성우의 실제 영어 판정 녹음을 발췌·편집했습니다.

[재생 화면](index.html) · [B 세 가지 이어 듣기](audio/00-b-three.mp3) · [A 세 가지 이어 듣기](audio/00-a-three.mp3)

## 비교할 두 가지

- **A · 원래 발성:** 원본 녹음을 필요한 단어 구간으로 자르고, 불필요한 저음·고음을 정리했습니다.
- **B · 굵고 힘 있게:** 같은 구간에 낮은 울림과 약한 압축을 보강했습니다. 음높이와 발성 속도를 바꾸지 않았습니다.
- A/B의 평균 진폭은 판정별로 같게 맞췄습니다. 단순한 재생 음량 차이보다 음색을 비교하기 위한 구성입니다. 기본 플레이어 음량은 이전과 같은 65%입니다.

| 판정 | 길이 | A | B | 비교 |
| --- | --- | --- | --- | --- |
| 스트라이크 | 0.35초 | [원래 발성](audio/strike-a.mp3) | [굵게](audio/strike-b.mp3) | [A → B](audio/strike-ab.mp3) |
| 아웃 | 1.12초 | [원래 발성](audio/out-a.mp3) | [굵게](audio/out-b.mp3) | [A → B](audio/out-ab.mp3) |
| 세이프 | 0.68초 | [원래 발성](audio/safe-a.mp3) | [굵게](audio/safe-b.mp3) | [A → B](audio/safe-ab.mp3) |

이어 듣기는 Strike → Out → Safe 순서로 3.24초입니다. 셋 중 서로 다른 버전을 선택해도 됩니다. 현재 어떤 버전도 선택 완료로 취급하지 않습니다.

## 출처와 편집

- 원음: **American Baseball The Umpire.wav**, **jcookvoice**, Freesound 625473, 2022-03-26.
- [제작자 게시물](https://freesound.org/people/jcookvoice/sounds/625473/)에 훈련받은 성우의 심판 콜 녹음이며 **CC0**로 공개되어 있습니다. [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- 사용한 파일은 게시물에서 제공하는 **고음질 MP3 미리듣기**입니다. 원본 WAV를 다운로드했다고 표기하지 않습니다. [다운로드한 MP3](sources/umpire-jcookvoice-preview.mp3)와 [출처·해시](sources/source.json)를 보관합니다.
- 스트라이크는 긴 삼진 판정의 앞 단어, 아웃은 첫 판정의 뒤 단어, 세이프는 마지막 짧은 판정에서 발췌했습니다. [자르기 구간](sources/cuts.json).
- 직접 새로 녹음하거나 AI로 목소리를 복제한 결과가 아닙니다. 기존 녹음의 발췌와 음색·음량 편집입니다. 원 제작자가 이 게임을 보증한다는 의미는 없습니다.
- `make_v08.py`로 75~10,500Hz 범위 정리, B의 130~360Hz 울림 보강·약한 병렬 압축, 앞뒤 경계 처리, 음량 맞춤을 수행했습니다.

## 검사와 현재 상태

- [음원 검사](audio-checks.json): WAV·MP3 11쌍 디코딩, 길이, 스테레오 채널, 유효 샘플, 진폭, 4배 보간 피크, 시작·끝 경계 확인. 판정별 A/B RMS 차이 0.01dB 이내. WAV 44.1kHz / 16-bit, MP3 192kbps.
- [브라우저 검사](browser-checks.json): 음원 11개 로딩, 이어 듣기 재생 진행, 정지·시간 초기화 확인. 콘솔 오류·가로 넘침 없음. [화면](preview.png).
- 단어 구간을 찾기 위해 로컬 음성 인식도 참고했습니다. 거친 외침은 일부 오인식되므로 발음이 자동 검증되었다고 주장하지 않습니다. 최종 발음·잘린 느낌·힘·선호도는 사용자 청취 확인 대상입니다.
- 다른 사운드 시안과 사용자 제공 홈런 환호·헛스윙·투구의 선택 상태는 유지했습니다. 실제 게임 소스·자산·공개 사이트에는 연결하지 않았습니다.

## 재생성

`make_v08.py --source sources/umpire-jcookvoice-preview.mp3 --cuts sources/cuts.json --out 새폴더 --deps 패키지경로`로 다시 만듭니다. `--out`은 존재하지 않는 폴더를 사용합니다. `build_preview.py`는 v07의 화면 스타일을 참조합니다.

`transcribe_source.py`는 선택적인 로컬 음성 인식 보조 도구입니다. faster-whisper, CPU int8, base.en을 사용하며 Windows에서는 모델 캐시를 짧은 경로에 두는 편이 안전합니다. 이 도구는 음원 생성에 필요하지 않습니다.
