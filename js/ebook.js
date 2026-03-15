/* ============================================
   전자책 인터랙션 스크립트
   페이지 넘기기, 목차, 다크모드, 진행률, 폰트 크기
   ============================================ */

(function () {
  'use strict';

  // ── DOM 요소 캐싱 ──
  const pages = document.querySelectorAll('.page');
  const totalPages = pages.length;
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const pageIndicator = document.getElementById('pageIndicator');
  const progressFill = document.getElementById('progressFill');
  const tocToggle = document.getElementById('tocToggle');
  const tocSidebar = document.getElementById('tocSidebar');
  const tocClose = document.getElementById('tocClose');
  const tocOverlay = document.getElementById('tocOverlay');
  const tocLinks = document.querySelectorAll('.toc-link');
  const tocPageLinks = document.querySelectorAll('.toc-page-link');
  const themeToggle = document.getElementById('themeToggle');
  const fontDecrease = document.getElementById('fontDecrease');
  const fontIncrease = document.getElementById('fontIncrease');

  // ── 상태 변수 ──
  let currentPage = 0;
  let isAnimating = false;
  const fontSizes = ['font-small', '', 'font-large', 'font-xlarge'];
  let fontIndex = 1; // 기본 크기

  // ── 페이지 이동 함수 ──
  function goToPage(targetPage, direction) {
    // 유효 범위 체크 및 애니메이션 중 방지
    if (targetPage < 0 || targetPage >= totalPages || targetPage === currentPage || isAnimating) return;
    isAnimating = true;

    const currentEl = pages[currentPage];
    const targetEl = pages[targetPage];

    // 이동 방향 결정 (direction이 없으면 자동 계산)
    const dir = direction || (targetPage > currentPage ? 'next' : 'prev');

    // 현재 페이지 퇴장 애니메이션
    currentEl.classList.remove('active');
    currentEl.classList.add(dir === 'next' ? 'exit-left' : 'exit-right');

    // 타겟 페이지 초기 위치 설정
    targetEl.style.transition = 'none';
    targetEl.classList.remove('exit-left', 'exit-right');
    targetEl.style.transform = dir === 'next' ? 'translateX(60px)' : 'translateX(-60px)';
    targetEl.style.opacity = '0';

    // 강제 리플로우 후 애니메이션 시작
    targetEl.offsetHeight;
    targetEl.style.transition = '';
    targetEl.classList.add('active');
    targetEl.style.transform = '';
    targetEl.style.opacity = '';

    // 페이지 상태 업데이트
    currentPage = targetPage;
    updateUI();

    // 페이지 스크롤 위치 초기화
    targetEl.scrollTop = 0;

    // 애니메이션 완료 후 클래스 정리
    setTimeout(() => {
      currentEl.classList.remove('exit-left', 'exit-right');
      isAnimating = false;
    }, 500);
  }

  // ── UI 업데이트 ──
  function updateUI() {
    // 페이지 번호 표시
    pageIndicator.textContent = `${currentPage + 1} / ${totalPages}`;

    // 진행률 바 업데이트
    const progress = ((currentPage + 1) / totalPages) * 100;
    progressFill.style.width = progress + '%';

    // 이전/다음 버튼 활성화 상태
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage === totalPages - 1;

    // 사이드바 목차 활성 표시
    tocLinks.forEach(link => {
      link.classList.toggle('active', parseInt(link.dataset.page) === currentPage);
    });
  }

  // ── 목차 사이드바 토글 ──
  function openToc() {
    tocSidebar.classList.add('open');
    tocOverlay.classList.add('show');
  }

  function closeToc() {
    tocSidebar.classList.remove('open');
    tocOverlay.classList.remove('show');
  }

  // ── 다크모드 토글 ──
  function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('ebook-theme', isDark ? 'light' : 'dark');
  }

  // ── 폰트 크기 조절 ──
  function changeFontSize(delta) {
    // 이전 클래스 제거
    if (fontSizes[fontIndex]) {
      document.body.classList.remove(fontSizes[fontIndex]);
    }

    // 인덱스 변경 (범위 제한)
    fontIndex = Math.max(0, Math.min(fontSizes.length - 1, fontIndex + delta));

    // 새 클래스 적용
    if (fontSizes[fontIndex]) {
      document.body.classList.add(fontSizes[fontIndex]);
    }

    localStorage.setItem('ebook-font-index', fontIndex);
  }

  // ── 저장된 설정 복원 ──
  function restoreSettings() {
    // 테마 복원
    const savedTheme = localStorage.getItem('ebook-theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // 폰트 크기 복원
    const savedFont = localStorage.getItem('ebook-font-index');
    if (savedFont !== null) {
      fontIndex = parseInt(savedFont);
      if (fontSizes[fontIndex]) {
        document.body.classList.add(fontSizes[fontIndex]);
      }
    }
  }

  // ── 이벤트 바인딩 ──
  // 이전/다음 버튼
  prevBtn.addEventListener('click', () => goToPage(currentPage - 1, 'prev'));
  nextBtn.addEventListener('click', () => goToPage(currentPage + 1, 'next'));

  // 키보드 네비게이션
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      goToPage(currentPage - 1, 'prev');
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      goToPage(currentPage + 1, 'next');
    } else if (e.key === 'Escape') {
      closeToc();
    }
  });

  // 스와이프 네비게이션 (모바일)
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const diffX = e.changedTouches[0].screenX - touchStartX;
    const diffY = e.changedTouches[0].screenY - touchStartY;

    // 수평 스와이프가 수직보다 클 때만 페이지 이동
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 60) {
      if (diffX < 0) {
        goToPage(currentPage + 1, 'next');
      } else {
        goToPage(currentPage - 1, 'prev');
      }
    }
  }, { passive: true });

  // 목차 토글
  tocToggle.addEventListener('click', openToc);
  tocClose.addEventListener('click', closeToc);
  tocOverlay.addEventListener('click', closeToc);

  // 사이드바 목차 링크 클릭
  tocLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = parseInt(link.dataset.page);
      goToPage(targetPage);
      closeToc();
    });
  });

  // 목차 페이지 내 링크 클릭
  tocPageLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = parseInt(link.dataset.page);
      goToPage(targetPage);
    });
  });

  // 다크모드 토글
  themeToggle.addEventListener('click', toggleTheme);

  // 폰트 크기 조절
  fontDecrease.addEventListener('click', () => changeFontSize(-1));
  fontIncrease.addEventListener('click', () => changeFontSize(1));

  // ── 초기화 ──
  restoreSettings();
  updateUI();
})();
