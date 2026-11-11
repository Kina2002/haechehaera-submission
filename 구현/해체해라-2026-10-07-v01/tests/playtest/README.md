# 실제 게임 플레이 시험 (다섯 유저)

데스크톱 앱(Electron)을 창 없이 띄워 **실제 게임 화면의 버튼을 눌러** 한 유저 유형으로 리그를 오릅니다. 결과 보고서는 [P28 다섯 유저 실제 게임 플레이 시험](../../문서/SPEC-기능별-2026-10-07-v01/P28-다섯-유저-실제-게임-플레이-시험.md)입니다.

## 파일

| 파일 | 하는 일 |
|---|---|
| `personas.cjs` | 다섯 유저 유형(아끼는·보통·무리하는·육성형·스타 지키기)의 규칙과 비교용 `normal_ticket`(보통 유저 + 입장료 조정) |
| `page-driver.js` | 게임 화면 안에서 도는 스크립트. 새 게임 → 경기(자동 배치 → 시작 → 입장 연출 건너뛰기 → 남은 경기 스킵) → 시즌 끝 → 오프시즌(재계약·영입·시설·경기장·은퇴·MLB·회생권·대출) → 다음 시즌 시작. 버튼이 없어 게임 함수를 부른 곳은 `fallback`으로 남깁니다 |
| `run-user.cjs` | 한 유저를 여러 번 나눠 실행(한 번에 `--chunk` 시즌)하고 결과를 모읍니다. 저장은 `--data` 폴더에 남아 다음 실행이 이어 갑니다 |
| `run-all.cjs` | 여러 유저를 차례로(또는 동시에) 실행 |
| `summarize.cjs` | 결과 폴더를 표(`summary-all.md`)와 JSON(`summary-all.json`)으로 정리 |
| `extract-games.cjs` | 실행 기록(`<data>/../<유저>-work`)에서 `<유저>.games.jsonl`(경기마다 한 줄)을 다시 만듦 |
| `run-audit.cjs` | 끝난 저장에 읽기 전용 스크립트를 돌림: `audit-save.js`(노화·여론 정산·승강·상금·회생권·같은 이름·입장료와 수요·저장 크기), `audit-rebuilds.js`(재창단 때 남은 선수), `screen-text.js`(주요 화면 글·그림 캐시·저장 한 번 시간) |

## 돌리는 법 (Windows PowerShell)

```powershell
$node = "node.exe 경로"
# 한 유저를 1부 승격까지 (처음부터)
& $node tests\playtest\run-user.cjs --user=normal --goal=promotion --fresh --data="C:\임시\playtest\normal" --out="C:\임시\playtest\결과"
# 같은 저장으로 1부 우승까지 이어서
& $node tests\playtest\run-user.cjs --user=normal --goal=title --data="C:\임시\playtest\normal" --out="C:\임시\playtest\결과"
# 다섯 유저를 하나씩 차례로
& $node tests\playtest\run-all.cjs --users=thrifty,normal,aggressive,youth,star --parallel=1 --fresh --data-root="C:\임시\playtest" --out="C:\임시\playtest\결과"
& $node tests\playtest\summarize.cjs "C:\임시\playtest\결과"
# 끝난 저장 다시 읽기
& $node tests\playtest\run-audit.cjs "C:\임시\playtest" tests\playtest\audit-save.js "C:\임시\playtest\결과\audit-saves.json"
```

- 명령은 게임 폴더(`구현\해체해라-2026-10-07-v01`)에서 실행합니다. 데스크톱 앱 경로는 `--electron`(기본 `D:\해체해라-앱\electron\electron.exe`)으로 바꿉니다.
- `--data`는 참가자 저장 폴더(`D:\해체해라-앱\저장`)를 쓰지 못하게 막아 두었습니다.
- 그 밖의 옵션: `--max-seasons=40`(시즌 상한), `--chunk=4`(한 번 실행에 시즌 수), `--minutes=14`(한 번 실행의 시간 상한), `--max-launches=40`.
- **동시에 여러 개를 돌리지 마세요.** 게임 한 개가 메모리를 1.5\~2.5GB 씁니다(8GB 컴퓨터에서 4개를 동시에 돌리자 앱이 메모리 부족으로 죽었습니다). `--parallel=1`을 권합니다.
- 유저 한 명이 한 시즌에 30\~60초쯤 걸립니다.
- 결과: `<유저>.summary.json`(요약·시즌 기록·자동으로 잡힌 문제), `<유저>.seasons.jsonl`(시즌마다 한 줄), `<유저>.games.jsonl`(경기마다 한 줄: 시즌·라운드·리그·결과·점수·홈 여부·자금 변화·여론·걸린 시간), `<유저>.launches.jsonl`(실행마다 한 줄, 알림 문구·사건), `<유저>.console.txt`(진행 출력).
- 실행이 중간에 강제로 끊기면 그 실행의 시즌 줄은 남지 않습니다. 다음 실행이 저장의 리그 기록으로 순위·승무패만 채우고 `partial: true`로 표시합니다.
- 2026-11-12 결과: [results-20261112-v01](results-20261112-v01/summary-all.md)(다섯 유저 40시즌 + 비교용 25시즌, 약 1.6MB).
