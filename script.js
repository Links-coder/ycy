'use strict';

// ===========================
// Constants
// ===========================
const ROW_UNIT = 8;   // matches CSS --row-unit
const GAP      = 5;   // matches CSS --gap

// 宽幅（2列）分配规律：每9张中第0、4张设为宽幅
// 产生节奏：宽-窄-窄-窄-宽-窄-窄-窄-窄，视觉上不规律但均匀
const WIDE_POSITIONS = new Set([0, 4]);
const PATTERN_LEN = 9;

// ===========================
// Navbar
// ===========================
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// ===========================
// Side Menu
// ===========================
const sideMenu  = document.getElementById('sideMenu');
const overlay   = document.getElementById('overlay');
const menuBtn   = document.getElementById('menuBtn');
const menuClose = document.getElementById('menuClose');

const openMenu  = () => { sideMenu.classList.add('open');    overlay.classList.add('show');    document.body.style.overflow = 'hidden'; };
const closeMenu = () => { sideMenu.classList.remove('open'); overlay.classList.remove('show'); document.body.style.overflow = ''; };

menuBtn.addEventListener('click', openMenu);
menuClose.addEventListener('click', closeMenu);
overlay.addEventListener('click', () => { closeMenu(); closeSearch(); });

// ===========================
// Search
// ===========================
const searchBar   = document.getElementById('searchBar');
const searchBtn   = document.getElementById('searchBtn');
const searchClose = document.getElementById('searchClose');
const searchInput = document.getElementById('searchInput');

const openSearch  = () => { searchBar.classList.add('open');    searchInput.focus(); };
const closeSearch = () => { searchBar.classList.remove('open'); searchInput.value = ''; applyFilter(activeFilter); };

searchBtn.addEventListener('click', openSearch);
searchClose.addEventListener('click', closeSearch);
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  document.querySelectorAll('.grid-item').forEach(item => {
    item.classList.toggle('hidden', q !== '' && !item.dataset.cat.includes(q));
  });
  recalcGrid();
});

// ===========================
// Hero Slider
// ===========================
const slides = document.querySelectorAll('.hero-slide');
const dots   = document.querySelectorAll('.dot');
let current = 0;
let slideTimer;

function goTo(idx) {
  slides[current].classList.remove('active');
  dots[current].classList.remove('active');
  current = (idx + slides.length) % slides.length;
  slides[current].classList.add('active');
  dots[current].classList.add('active');
}
const startSlider = () => { slideTimer = setInterval(() => goTo(current + 1), 5500); };
const resetSlider = () => { clearInterval(slideTimer); startSlider(); };

document.querySelector('.hero-prev').addEventListener('click', () => { goTo(current - 1); resetSlider(); });
document.querySelector('.hero-next').addEventListener('click', () => { goTo(current + 1); resetSlider(); });
dots.forEach(d => d.addEventListener('click', () => { goTo(+d.dataset.idx); resetSlider(); }));
startSlider();

// ===========================
// Masonry Grid — Core Logic
// ===========================

/**
 * 为一个 grid-item 计算应占的 grid-row span 数。
 * 原理：图片 img 高度 / row-unit = 需要几个行单元，保持原始比例。
 */
function calcRowSpan(item) {
  const img = item.querySelector('img');
  if (!img || img.offsetHeight === 0) return;
  const h = img.offsetHeight;
  const spans = Math.ceil((h + GAP) / (ROW_UNIT + GAP));
  item.style.gridRowEnd = `span ${Math.max(spans, 1)}`;
}

/**
 * 分配宽幅（2列）类：按照 visible index 的规律。
 * 宽幅 item 宽度变为 2 列，图片等比例放大，不裁切。
 */
function assignColWidths() {
  const visible = document.querySelectorAll('.grid-item:not(.hidden)');
  visible.forEach((item, i) => {
    const posInPattern = i % PATTERN_LEN;
    if (WIDE_POSITIONS.has(posInPattern)) {
      item.classList.add('col-2');
    } else {
      item.classList.remove('col-2');
    }
    // 重置行高，等待图片重绘后再计算
    item.style.gridRowEnd = '';
  });
}

/**
 * 对所有可见 item 重新计算行高 span。
 * 需要在 assignColWidths 之后调用，以获取正确宽度下的图片高度。
 */
function recalcRowSpans() {
  const visible = document.querySelectorAll('.grid-item:not(.hidden)');
  visible.forEach(item => {
    const img = item.querySelector('img');
    if (img && img.complete && img.naturalHeight > 0) {
      calcRowSpan(item);
    }
  });
}

/**
 * 完整重算：分配列宽 + 重算行高。
 */
function recalcGrid() {
  assignColWidths();
  // rAF 保证 DOM 更新后再读取 offsetHeight
  requestAnimationFrame(() => {
    recalcRowSpans();
  });
}

// ===========================
// Filter
// ===========================
const filterBtns = document.querySelectorAll('.filter-btn');
let activeFilter = 'all';

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    const galleryEl = document.getElementById('gallery');
    const navH = document.getElementById('navbar').offsetHeight;
    window.scrollTo({ top: galleryEl.offsetTop - navH, behavior: 'smooth' });
    applyFilter(activeFilter);
  });
});

function applyFilter(filter) {
  document.querySelectorAll('.grid-item').forEach(item => {
    item.classList.toggle('hidden', filter !== 'all' && item.dataset.cat !== filter);
  });
  recalcGrid();
  animateGrid();
}

function animateGrid() {
  const visible = document.querySelectorAll('.grid-item:not(.hidden)');
  visible.forEach((item, i) => {
    item.classList.remove('anim');
    item.style.animationDelay = `${Math.min(i * 0.025, 0.5)}s`;
    void item.offsetWidth;
    item.classList.add('anim');
  });
}

// ===========================
// Image Load Listeners
// ===========================
document.querySelectorAll('.grid-item img').forEach(img => {
  if (img.complete && img.naturalHeight > 0) {
    // 已缓存的图片直接计算
    calcRowSpan(img.closest('.grid-item'));
  } else {
    img.addEventListener('load', () => {
      calcRowSpan(img.closest('.grid-item'));
    });
  }
});

// 窗口 resize 时重算（比例变了）
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(recalcGrid, 150);
}, { passive: true });

// ===========================
// Lightbox
// ===========================
const lightbox        = document.getElementById('lightbox');
const lightboxImg     = document.getElementById('lightboxImg');
const lightboxInfo    = document.getElementById('lightboxInfo');
const lightboxCounter = document.getElementById('lightboxCounter');
const lightboxClose   = document.getElementById('lightboxClose');
const lightboxPrev    = document.getElementById('lightboxPrev');
const lightboxNext    = document.getElementById('lightboxNext');

let lbImages = [];
let lbIdx = 0;

function buildLbList() {
  lbImages = [];
  document.querySelectorAll('.grid-item:not(.hidden)').forEach(item => {
    lbImages.push({ src: item.querySelector('img').src, cat: item.dataset.cat });
  });
}

function showLb() {
  const d = lbImages[lbIdx];
  lightboxImg.style.opacity = '0';
  lightboxImg.src = d.src;
  lightboxImg.onload = () => { lightboxImg.style.opacity = '1'; };
  lightboxInfo.textContent = d.cat;
  lightboxCounter.textContent = `${lbIdx + 1} / ${lbImages.length}`;
}

function openLb(idx) {
  buildLbList();
  lbIdx = idx;
  showLb();
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

const closeLb = () => { lightbox.classList.remove('open'); document.body.style.overflow = ''; };
const lbPrev  = () => { lbIdx = (lbIdx - 1 + lbImages.length) % lbImages.length; showLb(); };
const lbNext  = () => { lbIdx = (lbIdx + 1) % lbImages.length; showLb(); };

document.querySelectorAll('.grid-item').forEach(item => {
  item.addEventListener('click', () => {
    buildLbList();
    const vis = Array.from(document.querySelectorAll('.grid-item:not(.hidden)'));
    const idx = vis.indexOf(item);
    if (idx !== -1) openLb(idx);
  });
});

lightboxClose.addEventListener('click', closeLb);
lightboxPrev.addEventListener('click', lbPrev);
lightboxNext.addEventListener('click', lbNext);
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLb(); });

document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape')     closeLb();
  if (e.key === 'ArrowLeft')  lbPrev();
  if (e.key === 'ArrowRight') lbNext();
});

// 触摸滑动灯箱
let lbTouchX = 0;
lightbox.addEventListener('touchstart', e => { lbTouchX = e.touches[0].clientX; }, { passive: true });
lightbox.addEventListener('touchend',   e => {
  const dx = e.changedTouches[0].clientX - lbTouchX;
  if (Math.abs(dx) > 50) dx < 0 ? lbNext() : lbPrev();
}, { passive: true });

// ===========================
// Category navigation clicks
// ===========================
function jumpToFilter(cat) {
  document.querySelector('#gallery').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => {
    filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === cat));
    activeFilter = cat;
    applyFilter(cat);
  }, 400);
}

document.querySelectorAll('.side-menu-cats p').forEach(p => {
  p.addEventListener('click', () => { closeMenu(); jumpToFilter(p.dataset.cat); });
});

document.querySelectorAll('.footer-cats span').forEach(s => {
  s.addEventListener('click', () => jumpToFilter(s.dataset.cat));
});

// ===========================
// Init
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  assignColWidths();
  animateGrid();
  // 等 rAF + 一点延迟，确保首屏图片高度可读
  requestAnimationFrame(() => {
    setTimeout(recalcRowSpans, 80);
  });
});
