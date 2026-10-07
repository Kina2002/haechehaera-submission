"""Import the selected latest sounds, preserving their bytes and provenance."""
from pathlib import Path
import hashlib
import json
import shutil

GAME = Path(__file__).resolve().parents[1]
REPO = GAME.parents[1]
DRAFTS = REPO/'시안'
LATEST = REPO/'사운드/최신-적용본-2026-10-08-v01'
v1 = '사운드-2026-10-08-v01/audio/'
v7 = '사운드-2026-10-08-v07/audio/'
v9 = '사운드-2026-10-08-v09/audio/'
selected = '사용자-선택-효과음-2026-10-08-v01/local-audio/'
tracks = [
 ('bgm-main','오늘도 해체는 없다',v1+'bgm-01-play-ball.wav','bgm',.60),
 ('bgm-club','우리 동네 야구단',v1+'bgm-02-our-club.wav','bgm',.60),
 ('bgm-tense','9회말 풀카운트',v1+'bgm-03-full-count.wav','bgm',.55),
 ('pitch','투구',selected+'ElevenLabs_Pitcher_throwing_a_fastball,_whoosh_sound.mp3','field',.70),
 ('miss','헛스윙',selected+'floraphonic-swing-whoosh-1-198494.mp3','field',.75),
 ('crowd-hr','우리 홈런 관중 환호',selected+'homerun-crowd-first4.mp3','crowd',.70),
 ('crowd-entrance','경기 입장 관중 웅성거림','사운드-2026-10-08-v10/audio/entrance-crowd-murmur.mp3','ambience',.90),
 ('bat','일반 타격',v7+'06-bat-louder.mp3','field',.80),
 ('bat-hr','홈런 타격',v7+'07-homerun-bat-louder.mp3','field',.85),
 ('strike','스트라이크',v9+'strike-new.mp3','judge',.85),
 ('out','아웃',v9+'out-new.mp3','judge',.90),
 ('safe','세이프',v9+'safe-b.mp3','judge',.72),
 ('commentary','중계진 마이크 테스트',v7+'01-commentary-mic-aa.mp3','reaction',.65),
 ('rival-fans','상대 관객 조롱',v7+'02-rival-fans-tease.mp3','reaction',.65),
 ('sad-fans','우리 관객 우울',v7+'03-home-fans-sad.mp3','reaction',.65),
 ('home-cheer','우리 치어리더 응원',v7+'04-home-cheer-support.mp3','reaction',.65),
 ('rival-cheer','상대 치어리더 트럼펫',v7+'05-rival-cheer-rising.mp3','reaction',.62),
 ('glove','포구',v1+'sfx-glove.mp3','field',.65),
 ('win','승리',v1+'sfx-win.mp3','stinger',.65),
 ('loss','패배',v1+'sfx-loss.mp3','stinger',.65),
 ('achievement','업적 달성',v1+'sfx-achievement.mp3','stinger',.60),
 ('warm-event','따뜻한 구단 소식',v1+'sfx-warm_event.mp3','stinger',.60),
 ('bad-event','실망스러운 구단 소식',v1+'sfx-bad_event.mp3','stinger',.60),
 ('mlb','MLB 진출',v1+'sfx-mlb.mp3','stinger',.65),
 ('click','메뉴 선택',v1+'sfx-click.mp3','ui',.28),
 ('confirm','선택 완료',v1+'sfx-confirm.mp3','ui',.40),
]
manifest_path = GAME/'assets/manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
catalog, sources = {}, []
LATEST.mkdir(parents=True, exist_ok=True)
for key,title,source,channel,gain in tracks:
    src = DRAFTS/source
    content = src.read_bytes()
    sha = hashlib.sha256(content).hexdigest()
    asset = 'assets/'+sha[:20]+src.suffix
    target = GAME/asset
    if target.exists():
        assert target.read_bytes() == content
    else:
        shutil.copy2(src,target)
    mime = 'audio/wav' if src.suffix=='.wav' else 'audio/mpeg'
    manifest[asset] = dict(mime=mime,sha256=sha,bytes=len(content))
    catalog[key] = dict(src=asset,title=title,channel=channel,gain=gain)
    sources.append(dict(id=key,title=title,source='시안/'+source,
        game_asset=str((Path('구현')/GAME.name/asset).as_posix()),sha256=sha,
        bytes=len(content),unchanged_copy=True,repository_included=True))
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(GAME/'src/audio-assets.js').write_text('window.HAECHE_AUDIO_ASSETS = '+json.dumps(catalog,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
(LATEST/'manifest.json').write_text(json.dumps(dict(date='2026-10-08',status='game_integrated',
    request='최신 사운드 파일과 GitHub 저장 및 게임 상황별 적용',tracks=sources,
    excluded=['이전 스트라이크·아웃·세이프 변형','보류한 불꽃놀이','비교용 이어 듣기 파일','이전 합성 투구·헛스윙']),
    ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Imported {len(catalog)} audio assets ({sum(x["bytes"] for x in sources):,} bytes).')
