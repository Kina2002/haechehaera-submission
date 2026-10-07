# 해체해라 사운드 시안 03 · 심판 목소리와 불꽃놀이

**2026-10-08 · 게임 미적용 · v01/v02 보존**

> **검토 결과: 보류 (2026-10-08).** 사용자 피드백에 따라 스트라이크·아웃·홈런 불꽃놀이 세 종류 모두 채택을 보류합니다. 원본은 비교용으로 보관하며 게임에는 적용하지 않습니다. 다음 시안은 [중계진·관객·치어리더 등장 BGM](../사운드-2026-10-08-v04/README.md)입니다.

[시안 재생 화면](index.html) · [새 소리 세 가지 이어 듣기](audio/00-new-three.mp3) (10.89초)

## 이번 요청 반영

| 상황 | 변경 내용 | 듣기 |
| --- | --- | --- |
| 스트라이크 | 합성 남성 목소리로 “스트라이크!” 발성. 앞쪽 모음을 늘리고 끝소리를 유지한 1.33초 호출 | [MP3](audio/01-strike-voice.mp3) · [WAV](audio/01-strike-voice.wav) |
| 아웃 | 같은 합성 목소리로 “아웃!”을 짧게 마무리하는 0.63초 호출 | [MP3](audio/02-out-voice.mp3) · [WAV](audio/02-out-voice.wav) |
| 홈런 축하 | 실제 불꽃놀이 녹음 중 큰 폭발과 퍼지는 잔불이 이어지는 구간을 편집. 저음·잔불·평균 음량을 보강한 7.64초 시안 | [MP3](audio/03-fireworks-show.mp3) · [WAV](audio/03-fireworks-show.wav) |

- 목소리는 특정 실제 심판을 흉내 내거나 복제한 녹음이 아닌 일반 합성 음성입니다. 실제 성우의 고함 연기와 동일하다고 주장하지 않습니다.
- 영어 야구장 발성과도 비교할 수 있도록 [Strike!](audio/04-strike-english.mp3)와 [Out!](audio/05-out-english.mp3)을 함께 보관했습니다.
- [홈런 폭죽 수정 전후](audio/06-fireworks-before-after.mp3)는 v02 합성음 4초 뒤에 v03의 녹음 편집본을 들려줍니다.
- 홈런의 배트 접촉음과 헛스윙은 v02 시안을 보존했습니다. 이번에는 판정 목소리와 홈런 축하음만 수정했습니다.

## 음원 출처

### 심판 합성 목소리

- Microsoft Edge TTS를 [edge-tts](https://github.com/rany2/edge-tts)로 호출했습니다. 외부에 전달한 문장은 “스트라이크!”, “아웃!”, “Strike!”, “Out!” 네 가지입니다.
- 기본 한국어: `ko-KR-HyunsuMultilingualNeural`. 영어 비교: `en-US-GuyNeural`.
- 생성 설정과 원문은 [sources/voice-generation.json](sources/voice-generation.json)에 기록했습니다. 생성한 원본 MP3도 `sources/`에 보관했습니다.
- 길이, 음색과 음량을 후처리했습니다. 사용자 음성이나 특정인의 음성 샘플은 사용하지 않았습니다.

### 실제 불꽃놀이 녹음

- 제목: **Fireworks Piece** / 제작자: **stephan**.
- 원본: [Wikimedia Commons 파일 설명](https://commons.wikimedia.org/wiki/File:Fireworks_piece.ogg) · [확인한 판본](https://commons.wikimedia.org/w/index.php?title=File:Fireworks_piece.ogg&oldid=1053774391).
- 파일 설명에 제작자가 퍼블릭 도메인으로 공개한 녹음으로 명시되어 있습니다. 2007년 6월 2일 독일 뒤셀도르프 불꽃놀이 녹음입니다.
- [원본 OGG](sources/fireworks-piece-stephan.ogg)를 보존했습니다. 43.35~50.85초 구간을 발췌해 저음·존재감·다이내믹·앞뒤 여백·마무리 페이드를 편집했습니다.
- 녹음의 원래 스테레오 공간감을 사용했습니다. 녹음에 담긴 불꽃의 소리이지, 게임에서 폭죽을 실행하는 기능은 아닙니다.

## 파일과 검사

- WAV: 44.1 kHz / 스테레오 / 16-bit. MP3: 192 kbps.
- WAV 7개 및 MP3 7개를 실제 디코딩하여 길이·유효 샘플·무음/진폭·양끝 경계를 검사했습니다. 음원별 측정은 [audio-checks.json](audio-checks.json)에 있습니다.
- 파형을 4배 보간해 피크를 제한했습니다. 음량 수치는 sample peak/RMS이며 방송용 LUFS 검증을 뜻하지 않습니다.
- 직접 귀로 듣는 발음·고함의 자연스러움·불꽃놀이 느낌 평가는 사용자 확인 대상입니다.
- 생성/편집 원본: `make_v03.py`. Python과 numpy/scipy/soundfile/imageio-ffmpeg/lameenc를 사용합니다. 출력 경로는 기존 파일이 없는 새 폴더로 지정합니다.
- 게임 소스·자산 목록·실행 파일·공개 사이트는 변경하지 않았습니다.
