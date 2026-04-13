/**
 * Sort Cat - Game Logic (Stability Optimized)
 */

const CONFIG = {
    maxCatsPerTube: 4,
    animationDuration: 500,
    patterns: [
        { id: 'calico', name: '三毛猫' },
        { id: 'tabby', name: 'キジトラ' },
        { id: 'tuxedo', name: 'ハチワレ' },
        { id: 'siamese', name: 'シャム' },
        { id: 'white', name: '白猫' },
        { id: 'black', name: '黒猫' },
        { id: 'russian', name: 'ロシアンブルー' },
        { id: 'ginger', name: '茶トラ' },
        { id: 'cow', name: '牛柄猫' },
        { id: 'tortie', name: 'サビ猫' }
    ]
};

function preloadAssets() {
    CONFIG.patterns.forEach(pattern => {
        const img = new Image();
        const suffix = (pattern.id === 'white') ? '_centered_v11.png' : '_tight_v11.png';
        img.src = `assets/images/cat_${pattern.id}${suffix}`;
    });
    const towerImg = new Image();
    towerImg.src = 'assets/images/cat_tower_v102.png';
}

let gameState = {
    level: 1,
    tubes: [],
    initialTubes: [],
    selectedTubeIndex: null,
    animatingCount: 0, // 進行中のアニメーション数
    history: [],
    isMuted: false,
    bgmStarted: false,
    isTransitioning: false,
    clearedTubes: []
};

const SAVE_KEY = 'nekozoroe_level_v1';
const ADMOB_CONFIG = {
    appId: "ca-app-pub-9138341481603997~6409773553",
    rewardedId: "ca-app-pub-9138341481603997/4138104480"
};

const bgm = new Audio('assets/sounds/bgm.mp3');
bgm.loop = true;
bgm.volume = 0.3;

/** --- CORE --- **/

function setupLevel(level) {
    const numPatterns = Math.min(3 + Math.floor(level / 3), CONFIG.patterns.length);
    const numEmptyTubes = 2;
    let catPool = [];
    for (let i = 0; i < numPatterns; i++) {
        for (let j = 0; j < CONFIG.maxCatsPerTube; j++) catPool.push(CONFIG.patterns[i].id);
    }
    catPool.sort(() => Math.random() - 0.5);
    gameState.tubes = [];
    for (let i = 0; i < numPatterns; i++) gameState.tubes.push(catPool.splice(0, CONFIG.maxCatsPerTube));
    for (let i = 0; i < numEmptyTubes; i++) gameState.tubes.push([]);
    gameState.selectedTubeIndex = null;
    gameState.isAnimating = false;
    gameState.isTransitioning = false;
    gameState.history = []; 
    gameState.clearedTubes = [];
    document.getElementById('level-number').innerText = level;
    gameState.initialTubes = JSON.parse(JSON.stringify(gameState.tubes));
}

function renderTubes() {
    const container = document.getElementById('tube-container');
    if (!container) return;
    container.innerHTML = '';
    gameState.tubes.forEach((cats, index) => {
        const tubeEl = document.createElement('div');
        tubeEl.className = 'tube';
        if (gameState.selectedTubeIndex === index) tubeEl.classList.add('selected');
        if (isTubeComplete(index)) tubeEl.classList.add('completed');
        cats.forEach(catId => {
            const catEl = document.createElement('div');
            catEl.className = `cat sleeping cat-${catId}`;
            tubeEl.appendChild(catEl);
        });
        tubeEl.onclick = () => handleTubeClick(index);
        container.appendChild(tubeEl);
    });
}

function handleTubeClick(index) {
    if (gameState.isTransitioning) return;

    if (gameState.selectedTubeIndex === null) {
        // 現在のアニメーションにかかわらず、現在のチューブの状態（中身）を見て選択
        if (gameState.tubes[index].length > 0) {
            gameState.selectedTubeIndex = index;
            renderTubes();
        }
    } else {
        if (gameState.selectedTubeIndex === index) {
            gameState.selectedTubeIndex = null;
            renderTubes();
        } else {
            const count = getMoveableCount(gameState.selectedTubeIndex, index);
            if (count > 0) {
                executeMove(gameState.selectedTubeIndex, index, count);
            } else if (gameState.tubes[index].length > 0) {
                // 移動できない場合、クリックしたチューブを選択状態にする
                gameState.selectedTubeIndex = index;
                renderTubes();
            }
        }
    }
}

function getMoveableCount(fromIndex, toIndex) {
    const fromTube = gameState.tubes[fromIndex];
    const toTube = gameState.tubes[toIndex];
    if (fromTube.length === 0 || toTube.length >= CONFIG.maxCatsPerTube) return 0;
    const topCatId = fromTube[fromTube.length - 1];
    if (toTube.length > 0 && toTube[toTube.length - 1] !== topCatId) return 0;
    let sameCount = 0;
    for (let i = fromTube.length - 1; i >= 0; i--) {
        if (fromTube[i] === topCatId) sameCount++; else break;
    }
    return Math.min(sameCount, CONFIG.maxCatsPerTube - toTube.length);
}

async function executeMove(fromIndex, toIndex, count) {
    gameState.animatingCount++;
    // 移動開始時に即座にデータを更新し、履歴に保存
    gameState.history.push(JSON.parse(JSON.stringify(gameState.tubes)));
    
    const fromTubeEl = document.querySelectorAll('.tube')[fromIndex];
    const toTubeEl = document.querySelectorAll('.tube')[toIndex];
    const fromRect = fromTubeEl.getBoundingClientRect();
    const toRect = toTubeEl.getBoundingClientRect();
    
    fromTubeEl.classList.add('tilting');
    const movingSelected = gameState.selectedTubeIndex;
    gameState.selectedTubeIndex = null;

    const animationPromises = [];
    for (let i = 0; i < count; i++) {
        const catId = gameState.tubes[fromIndex].pop();
        // データ更新後、即座にレンダリングして見た目の整合性を保つ
        renderTubes();
        animationPromises.push(animateSingleCat(catId, fromRect, toRect, toIndex, toTubeEl, i));
        await wait(100); // サクサク進めるために間隔を短縮
    }
    
    fromTubeEl.classList.remove('tilting');
    
    // アニメーション完了を待つ（クリア判定などのため）
    await Promise.all(animationPromises);
    gameState.animatingCount--;

    if (isTubeComplete(toIndex) && !gameState.clearedTubes.includes(toIndex)) {
        gameState.clearedTubes.push(toIndex);
        renderTubes();
        const tubeEl = document.querySelectorAll('.tube')[toIndex];
        if (tubeEl) tubeEl.classList.add('vibrate-once');
        playPurr();
    }

    // 全てのアニメーションが終わったタイミングで勝利判定
    if (gameState.animatingCount === 0 && checkWin()) {
        gameState.isTransitioning = true;
        document.getElementById('victory-overlay').classList.remove('hidden');
        document.querySelectorAll('.cat').forEach((cat, i) => setTimeout(() => cat.classList.add('jumping'), i * 50));
        setTimeout(() => {
            document.getElementById('victory-overlay').classList.add('hidden');
            gameState.level++;
            saveProgress(gameState.level);
            setupLevel(gameState.level);
            renderTubes();
        }, 1800);
    }
}

async function animateSingleCat(catId, fromRect, toRect, toIndex, toTubeEl, index) {
    playMeow();
    const flyingCat = document.createElement('div');
    flyingCat.className = `flying-cat cat-${catId}`;
    flyingCat.style.left = `${fromRect.left + (fromRect.width - 50) / 2}px`;
    flyingCat.style.top = `${fromRect.top - 20}px`;
    document.getElementById('flying-cat-container').appendChild(flyingCat);
    await wait(100);
    flyingCat.style.transform = `translateY(${-50 - (index * 5)}px)`;
    await wait(200);
    flyingCat.style.left = `${toRect.left + (toRect.width - 50) / 2}px`;
    flyingCat.style.top = `${toRect.top - 80}px`;
    await wait(500);
    toTubeEl.classList.add('tilting-reverse');
    flyingCat.style.top = `${toRect.top + (toRect.height * 0.2)}px`;
    flyingCat.style.opacity = '0';
    await wait(200);
    gameState.tubes[toIndex].push(catId);
    toTubeEl.classList.remove('tilting-reverse');
    flyingCat.remove();
    renderTubes();
}

function checkWin() { return gameState.tubes.every((cats, index) => cats.length === 0 || isTubeComplete(index)); }
function isTubeComplete(index) {
    const cats = gameState.tubes[index];
    if (cats.length < CONFIG.maxCatsPerTube) return false;
    return cats.every(cat => cat === cats[0]);
}

/** --- UTILS --- **/
function playMeow() { if (!gameState.isMuted) { const a = new Audio('assets/sounds/meow.mp3'); a.playbackRate = 0.8 + Math.random() * 0.6; a.volume = 0.6; a.play().catch(() => {}); } }
function playPurr() { if (!gameState.isMuted) { const a = new Audio('assets/sounds/purr.mp3'); a.volume = 0.7; a.play().catch(() => { if (window.Capacitor && window.Capacitor.Plugins.Haptics) window.Capacitor.Plugins.Haptics.vibrate(); }); } }
function startAudio(force = false) { if ((force || !gameState.bgmStarted) && !gameState.isMuted) bgm.play().then(() => { gameState.bgmStarted = true; }).catch(() => {}); }
function toggleMute() { gameState.isMuted = !gameState.isMuted; document.getElementById('mute-btn').innerText = gameState.isMuted ? '🔇' : '🔊'; if (gameState.isMuted) bgm.pause(); else if (gameState.bgmStarted) bgm.play(); }
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function saveProgress(l) { localStorage.setItem(SAVE_KEY, l.toString()); }
function loadProgress() { const s = localStorage.getItem(SAVE_KEY); return s ? parseInt(s, 10) : 1; }

/** --- TUTORIAL --- **/
let currentTutorialSlide = 0;
function showTutorial() {
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) { overlay.classList.remove('hidden'); currentTutorialSlide = 0; updateTutorialUI(); }
}
function updateTutorialUI() {
    const slides = document.querySelectorAll('.tutorial-slide');
    const dots = document.querySelectorAll('.tutorial-dots .dot');
    if (slides.length === 0) return;
    slides.forEach((s, i) => s.classList.toggle('active', i === currentTutorialSlide));
    dots.forEach((d, i) => d.classList.toggle('active', i === currentTutorialSlide));
    document.getElementById('tutorial-next-btn').innerText = (currentTutorialSlide === slides.length - 1) ? 'はじめる！' : 'つぎへ';
}
function nextTutorialSlide() {
    const slides = document.querySelectorAll('.tutorial-slide');
    if (currentTutorialSlide < slides.length - 1) { currentTutorialSlide++; updateTutorialUI(); }
    else { const o = document.getElementById('tutorial-overlay'); if (o) o.classList.add('hidden'); localStorage.setItem('nekozoroe_tutorial_seen', 'true'); }
}

/** --- ADS --- **/
async function initAdMob() {
    try {
        const Capacitor = window.Capacitor;
        const { AdMob } = (Capacitor && Capacitor.Plugins) ? Capacitor.Plugins : {};
        if (AdMob) await AdMob.initialize({ requestTrackingAuthorization: true }); 
    } catch (e) {}
}
async function showRewardedAd() {
    try {
        const Capacitor = window.Capacitor;
        const { AdMob } = (Capacitor && Capacitor.Plugins) ? Capacitor.Plugins : {};
        if (!AdMob) return true;
        await AdMob.prepareRewardVideoAd({ adId: ADMOB_CONFIG.rewardedId });
        const reward = await AdMob.showRewardVideoAd();
        return !!reward;
    } catch (e) { alert('広告の読み込みに失敗しました。'); return false; }
}
async function addExtraTube() {
    if (gameState.tubes.length > (gameState.initialTubes.length + 1)) { alert('これ以上追加できません。'); return; }
    if (confirm('広告を視聴して、新しいキャットタワーを追加しますか？\n（クリアがぐっと楽になります！）')) {
        const success = await showRewardedAd();
                if (success) { 
            // 重要：タワーを追加する前の状態を履歴に保存する
            gameState.history.push(JSON.parse(JSON.stringify(gameState.tubes)));
            gameState.tubes.push([]); 
            renderTubes(); 
        }
    }
}

/** --- SYSTEM --- **/
function startGame(level) {
    gameState.level = level; saveProgress(level); startAudio(true);
    document.getElementById('start-screen').classList.add('fade-out');
    setupLevel(gameState.level); renderTubes();
}

function initGame() {
    preloadAssets();
    const savedLevel = loadProgress();
    const continueBtn = document.getElementById('start-continue-btn');
    if (savedLevel > 1 && continueBtn) { continueBtn.classList.remove('hidden'); continueBtn.innerText = `つづきから (Level ${savedLevel})`; }
    
    // UI Event Listeners
    document.getElementById('reset-btn').onclick = () => { 
        if (gameState.animatingCount > 0) return;
        if(confirm('最初からやり直しますか？')) { setupLevel(gameState.level); renderTubes(); } 
    };
    document.getElementById('undo-btn').onclick = () => { 
        if (gameState.animatingCount > 0) return;
        if(gameState.history.length > 0) { 
            const prevState = gameState.history[gameState.history.length - 1];
            // 履歴の状態と今の状態を比べて、タワーが減るかどうかチェック
            if (prevState.length < gameState.tubes.length) {
                if (!confirm("追加したタワーが消えてしまいますが、戻してよろしいですか？")) {
                    return;
                }
            }
            gameState.tubes = gameState.history.pop(); 
            renderTubes(); 
        }
    };
    document.getElementById('mute-btn').onclick = () => toggleMute();
    document.getElementById('add-tube-btn').onclick = () => {
        if (gameState.animatingCount > 0) return;
        addExtraTube();
    };
    document.getElementById('start-new-btn').onclick = () => {
        startGame(1);
        if (!localStorage.getItem('nekozoroe_tutorial_seen')) setTimeout(showTutorial, 600);
    };
    if (continueBtn) continueBtn.onclick = () => startGame(loadProgress());
    document.getElementById('tutorial-next-btn').onclick = nextTutorialSlide;

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) bgm.pause(); else if (!gameState.isMuted && gameState.bgmStarted) bgm.play().catch(() => {});
    });
    
    initAdMob();
}

initGame();