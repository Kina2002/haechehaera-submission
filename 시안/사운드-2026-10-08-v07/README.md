# 해체해라 사운드 시안 07 · 에코 아, 아 / 어머, 또요↗?

**2026-10-08 · 게임 미적용 · 이전 시안 보존**

[재생 화면](index.html) · [수정본 두 가지 이어 듣기](audio/00-revised-all.mp3)

## 이번 변경

| 상황 | 수정 | 듣기 |
| --- | --- | --- |
| 중계진 | 마이크 테스트처럼 **아, 아** 두 번 발성하고 에코가 반복되며 사라지는 1.71초 소리 | [MP3](audio/01-commentary-mic-aa.mp3) · [이전 → 수정](audio/00-mic-before-after.mp3) |
| 상대 치어리더 | 「어머, 또요?」 트럼펫의 **마지막 두 음과 음을 꺾는 방향을 위로**. 앞부분과 반주 유지, 5초 | [MP3](audio/05-rival-cheer-rising.mp3) · [이전 → 수정](audio/00-trumpet-before-after.mp3) |

마이크 → 트럼펫 이어 듣기는 7.36초입니다. 플레이어 음량은 이전과 같은 65%이고, 전후 비교 조각을 개별 정규화하지 않았습니다.

## 제작과 출처

- 마이크: Microsoft Edge TTS를 기존에 설치된 [edge-tts](https://github.com/rany2/edge-tts)로 호출했습니다. 외부에 전달한 원문은 **아.** 한 단어입니다. 일반 합성 남성 목소리 `ko-KR-HyunsuMultilingualNeural`이며 특정 실제 중계진을 모사하지 않습니다.
- 한 모음을 음높이 유지 시간 조절로 두 길이로 만들고, 0.16초 간격으로 배치했습니다. 마이크 음색 필터와 0.12/0.24/0.36/0.48/0.60초 에코를 추가했습니다. 켜짐 클릭은 작게 유지했습니다.
- [음성 생성 설정](sources/voice-generation.json)과 [원본 합성 음성](sources/mic-check-hyunsu.mp3)을 보관합니다.
- 트럼펫: v06 MIDI를 읽고 6.25박 이후 주선율 D5→G5, 마지막 뮤트 트럼펫 G4→A5로 변경했습니다. 두 음의 하향 굴곡을 상향 굴곡으로 바꿨습니다. 앞부분과 반주 MIDI 이벤트는 그대로입니다. 132BPM, [악보](midi/05-rival-cheer-rising.mid).
- 악기는 S. Christian Collins의 [GeneralUser GS 2.0.3](https://github.com/mrbumpy409/GeneralUser-GS), 렌더링은 FluidSynth 2.6.1입니다. [악기 라이선스](sources/LICENSE-GeneralUser.txt).
- `make_v07.py`는 음원 제작·검사를, `build_preview.py`는 독립 재생 화면 생성을 담당합니다. 이전 v06 생성기와 재생 스타일을 참조합니다.

## 유지한 소리와 상태

- 일반·홈런 타격음, 상대 관객 조롱, 우리 관객 우울, 우리 치어리더 응원 5종은 v06 WAV·MP3와 바이트가 같습니다.
- 사용자 선택 홈런 환호·헛스윙·투구 소리는 [선택 완료·게임 적용 전](../사용자-선택-효과음-2026-10-08-v01/README.md) 상태입니다.
- 스트라이크·아웃·불꽃놀이는 보류입니다. 실제 게임과 공개 사이트에는 이번 소리를 연결하지 않았습니다.

## 확인

- [음원 검사](audio-checks.json): WAV/MP3 10쌍의 디코딩·길이·채널·유효 샘플·진폭·경계·4배 보간 피크 확인. 기존 5종 바이트 일치. 44.1kHz 스테레오, MP3 192kbps.
- [브라우저 검사](browser-checks.json): 음원 10개 로딩·이어 듣기 재생 진행·모두 정지 확인. 콘솔 오류·가로 넘침 없음. [확인 화면](preview.png).
- 청감·발음의 자연스러움·선호도는 사용자 청취로 확인할 대상입니다.

## 재생성

`make_v07.py --out`은 존재하지 않는 새 출력 폴더를, `--previous`는 v06 폴더를 사용합니다. `--deps`, `--fluidsynth`, `--soundfont`는 기존 로컬 도구 경로입니다. 원본 음성을 재사용하려면 `--voice-source sources/mic-check-hyunsu.mp3`를 지정합니다.
