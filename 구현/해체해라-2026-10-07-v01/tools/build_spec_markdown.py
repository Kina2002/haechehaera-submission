"""Write one Markdown file per game feature, plus a linked contents page."""
from pathlib import Path
import re
from spec_data import ROOT, features, stats, facilities, numbers, future, groups

OUT = ROOT / '문서' / 'SPEC-기능별-2026-10-07-v01'

def filename(f):
    return f["id"] + '-' + f["title"].replace(' ', '-') + '.md'

def bullets(items):
    return '\n'.join('- ' + x for x in items)

def numbered(items):
    return '\n'.join(str(i) + '. ' + x for i, x in enumerate(items, 1))

def table(headers, rows):
    return '\n'.join(['| ' + ' | '.join(headers) + ' |', '| ' + ' | '.join(['---'] * len(headers)) + ' |'] + ['| ' + ' | '.join(row) + ' |' for row in rows])

def references(refs):
    links = []
    for name, symbol in refs:
        lines = (ROOT / 'src' / name).read_text(encoding='utf-8').splitlines()
        pattern = re.compile(r'function\s+' + re.escape(symbol) + r'\s*\(|(?:^|;)\s*' + re.escape(symbol) + r'\s*=\s*function|const\s+' + re.escape(symbol) + r'\s*=')
        matches = [i for i, line in enumerate(lines, 1) if pattern.search(line)]
        if matches:
            line = matches[-1]
            links.append(f'- [{name} {line}행](../../src/{name}) · `{symbol}`')
        else:
            links.append(f'- [{name}](../../src/{name}) · `{symbol}`')
    return '\n'.join(links)

def render_feature(f):
    status = '현재 구현 · 시험값 포함' if f['trial'] else '현재 구현'
    return f'''# {f['id']} {f['title']}

{f['purpose']}

**분야:** {f['category']}  
**상태:** {status}  
**기준:** 2026-10-07 로컬 구현본

[전체 기능 목차](README.md)

## 찾는 곳

{f['entry']}

## 화면에서 할 일

{numbered(f['steps'])}

## 적용 규칙

{bullets(f['rules'])}

## 막히는 조건과 예외

{bullets(f['blocks'])}

## 직접 확인할 항목

{chr(10).join('- [ ] ' + item for item in f['checks'])}

## 현재 확인된 범위

{f['evidence']}

자동검사 통과와 사용자 확인은 구별합니다. 위 체크박스는 직접 플레이하며 확인할 때 표시합니다.

## 개발 참고

{references(f['refs'])}
'''

files = {filename(f): render_feature(f) for f in features}
contents = ['# 해체해라 기능별 SPEC',
            '기능 하나당 Markdown 파일 하나로 나누었습니다. 목록에서 기능을 고르면 찾는 곳·사용 순서·규칙·제한·직접 확인할 항목을 볼 수 있습니다.',
            '**작성일:** 2026-10-07  \n**문서 버전:** v01  \n**기준:** 제공된 v27에서 이어온 현재 로컬 구현본',
            '## 문서 읽는 기준',
            '- **현재 구현:** 코드에 있는 기능입니다.\n- **시험값 포함:** 현재 플레이에 사용하는 금액·확률·체력 수치로, 이후 조정할 수 있습니다.\n- **직접 확인할 항목:** 사용자가 플레이하며 확인할 체크리스트입니다. 자동검사 결과를 사용자 확인으로 간주하지 않습니다.\n- 변경을 요청할 때는 **F10 수비 지시**처럼 기능 번호와 이름을 함께 말하면 됩니다.',
            '## 기능 목차']
for group in groups:
    contents += ['### ' + group,
                 '\n'.join(f'- [{f["id"]} {f["title"]}]({filename(f)})' for f in features if f['category'] == group)]
contents += ['## 기본 플레이 흐름',
             '저장 선택 → 팀 만들기 → 최초 12명 준비 → 출전 9명 편성 → 경기 → 결과와 결산 → 영입·훈련·시설·계약 → 다음 경기',
             '## 능력치 뜻', table(['능력', '뜻'], stats),
             '## 시설과 능력 연결', table(['분야', '시설', '효과'], facilities),
             '## 기준 숫자',
             '아래는 기본값입니다. 구단 시험 설정을 바꾸었다면 현재 구단의 수치는 다를 수 있습니다.',
             table(['항목', '기본값', '상태'], numbers),
             '## 현재 확인된 범위',
             table(['검사', '결과'], [('경기·운영 규칙', '52 / 52 통과'), ('심판 판정 연결', '16 / 16 통과'), ('계약과 이적', '15 / 15 통과'), ('저장 보호', '9 / 9 통과'), ('자동 경기', '3경기 완료 · 규칙 위반 0'), ('캐릭터', '216자세 · 126체형/파츠 검사 오류 0'), ('자산과 실행 파일', '원본 PNG 87개 바이트 일치 · 단일 파일 재생성 일치')]),
             '자동검사는 아웃·주자·득점·타순·기록과 일부 그림 좌표를 확인합니다. 모든 동작의 자연스러움, 모든 배색·파츠 조합, 장기 경영 난이도와 모바일 품질까지 확인한 결과는 아닙니다.',
             '### 근거 자료',
             '- [브라우저 검사 결과](../../tests/browser-checks.json)\n- [파일과 그림 검사 결과](../../tests/packaging-checks.json)\n- [저장 보호 검사 코드](../../tests/storage.test.cjs)\n- [현재 구현본 안내](../../README.txt)',
             '## 향후 구상',
             '[향후 구상과 보류 항목](향후-구상과-보류.md)에 따로 정리했습니다. 현재 기능과 함께 구현 완료로 취급하지 않습니다.']
files['README.md'] = '\n\n'.join(contents) + '\n'
files['향후-구상과-보류.md'] = '# 향후 구상과 보류 항목\n\n현재 기능의 사용 방법과 구별하여, 다음 개발 범위를 정할 때 검토할 항목입니다.\n\n[전체 기능 목차](README.md)\n\n' + '\n\n'.join('## ' + title + '\n\n' + text for title, text in future) + '\n'

if len(features) != 25 or len(files) != 27:
    raise ValueError('Unexpected feature count')
if OUT.exists():
    raise FileExistsError(f'Destination already exists: {OUT}')
OUT.mkdir()
for name, text in files.items():
    (OUT / name).write_text(text, encoding='utf-8')
print(f'Created {len(features)} feature Markdown files, README.md, and future scope file')
