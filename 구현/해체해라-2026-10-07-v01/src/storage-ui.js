function showStorageNotice(status) {
  document.querySelector('#storageNotice')?.remove();
  if (!['blocked', 'recovered', 'unavailable'].includes(status)) return;
  const panel = document.createElement('section');
  panel.id = 'storageNotice';
  panel.className = 'panel storage-notice';
  panel.setAttribute('role', 'status');
  if (status === 'recovered') {
    panel.innerHTML = '<p>최근 복구용 저장본으로 이어갑니다. 손상된 원본도 별도로 보관합니다.</p><button class="small" data-storage-dismiss>확인</button>';
  } else if (status === 'unavailable') {
    panel.innerHTML = '<p>브라우저에 저장할 수 없습니다. 진행을 보관하려면 설정에서 백업 파일을 내려받으세요.</p>';
  } else {
    panel.innerHTML = '<p>저장 자료를 읽지 못해 자동 저장을 멈췄습니다. 기존 원본은 그대로 보존했습니다.</p><div class="row wrap"><button data-storage-backup>저장 원본 내려받기</button><button data-storage-fresh>원본 보관 후 새로 시작</button></div>';
  }
  document.querySelector('#header').insertAdjacentElement('afterend', panel);
}
document.addEventListener('click', event => {
  if (event.target.closest('[data-storage-dismiss]')) document.querySelector('#storageNotice')?.remove();
  if (event.target.closest('[data-storage-backup]')) {
    const raw = saveStore.original();
    if (raw === null) return;
    const url = URL.createObjectURL(new Blob([raw], {type:'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = '해체해라-저장원본-' + new Date().toISOString().slice(0,10) + '.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (event.target.closest('[data-storage-fresh]')) {
    confirmBox('원본 보관 후 새로 시작', '손상된 저장 원본을 별도로 보관하고 새 저장을 시작합니다. 원본은 위 버튼으로 파일로도 내려받을 수 있습니다.', () => {
      const result = saveStore.startFresh();
      if (!result.ok) { toast('원본을 보관할 공간이 부족해 기존 저장을 유지했습니다.'); return; }
      save();
      if (!saveError) { document.querySelector('#storageNotice')?.remove(); toast('원본을 보관했습니다. 새 구단을 만들 수 있습니다.'); }
    });
  }
});
