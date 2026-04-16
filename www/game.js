/**
 * Sort Cat - Game Logic (Stability Optimized)
 */

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyClOYAH5OCY7SZIh6UCrq4Trvx0P1nNxIE",
    authDomain: "nekozoroe.firebaseapp.com",
    projectId: "nekozoroe",
    storageBucket: "nekozoroe.firebasestorage.app",
    messagingSenderId: "1022247326501",
    appId: "1:1022247326501:web:a2693913ab3db5ea4540cc"
};

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let currentUid = null;

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
    clearedTubes: [],
    currentVersion: '1.0.5', // 現在のバージョン
    latestVersion: '1.0.5', // モック最新バージョン（実際は外部から取得可能）
    bgCatInterval: null,
    adPrepared: false, // 広告の準備状態
    isTimeAttack: false,
    timeAttackStart: null,
    timeAttackInterval: null
};

const SAVE_KEY = 'nekozoroe_level_v1';
const ADMOB_CONFIG = {
    appId: "ca-app-pub-9138341481603997~6409773553",
    rewardedId: "ca-app-pub-9138341481603997/4138104480"
};

const bgm = new Audio('assets/sounds/bgm_v2.mp3');
bgm.loop = true;
const homeBgm = new Audio('assets/sounds/home_bgm.mp3');
homeBgm.loop = true;

const meow = new Audio('assets/sounds/meow.mp3');

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
            const completedLevel = gameState.level;
            gameState.level++;
            saveProgress(gameState.level);
            if (gameState.isTimeAttack && completedLevel >= 10) {
                const elapsed = stopTimer();
                gameState.isTimeAttack = false;
                gameState.isTransitioning = false;
                showTimeAttackResult(elapsed);
            } else {
                setupLevel(gameState.level);
                renderTubes();
                document.getElementById('tube-container').scrollTop = 0;
            }
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
function playMeow() { if (!gameState.isMuted) { const a = new Audio('assets/sounds/meow.mp3'); a.playbackRate = 0.8 + Math.random() * 0.6; a.volume = 0.3; a.play().catch(() => {}); } }
function playPurr() { if (!gameState.isMuted) { const a = new Audio('assets/sounds/purr.mp3'); a.volume = 0.7; a.play().catch(() => { if (window.Capacitor && window.Capacitor.Plugins.Haptics) window.Capacitor.Plugins.Haptics.vibrate(); }); } }
function startAudio(force = false) { if ((force || !gameState.bgmStarted) && !gameState.isMuted) bgm.play().then(() => { gameState.bgmStarted = true; }).catch(() => {}); }
function toggleMute() { gameState.isMuted = !gameState.isMuted; document.getElementById('mute-btn').innerText = gameState.isMuted ? '🔇' : '🔊'; if (gameState.isMuted) { bgm.pause(); homeBgm.pause(); } else if (gameState.bgmStarted) { bgm.play(); } else { homeBgm.play().catch(() => {}); } }
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function saveProgress(l) { localStorage.setItem(SAVE_KEY, l.toString()); }
function loadProgress() { const s = localStorage.getItem(SAVE_KEY); return s ? parseInt(s, 10) : 1; }

/** --- TIME ATTACK & RANKING --- **/

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(1);
    const sPadded = parseFloat(s) < 10 ? '0' + s : s;
    return `${m}:${sPadded}`;
}

function startTimer() {
    gameState.timeAttackStart = Date.now();
    const timerEl = document.getElementById('timer-display');
    timerEl.classList.remove('hidden');
    clearInterval(gameState.timeAttackInterval);
    gameState.timeAttackInterval = setInterval(() => {
        const elapsed = (Date.now() - gameState.timeAttackStart) / 1000;
        document.getElementById('timer-value').textContent = formatTime(elapsed);
    }, 100);
}

function stopTimer() {
    clearInterval(gameState.timeAttackInterval);
    gameState.timeAttackInterval = null;
    document.getElementById('timer-display').classList.add('hidden');
    if (gameState.timeAttackStart) {
        const elapsed = (Date.now() - gameState.timeAttackStart) / 1000;
        gameState.timeAttackStart = null;
        return elapsed;
    }
    return 0;
}

function startTimeAttack() {
    gameState.isTimeAttack = true;
    startGame(1);
    startTimer();
}

function goHome() {
    bgm.pause();
    gameState.bgmStarted = false;
    if (!gameState.isMuted) homeBgm.play().catch(() => {});
    gameState.bgCatInterval = setInterval(spawnBackgroundCat, 1500);
    document.getElementById('start-screen').classList.remove('fade-out');
    window.scrollTo(0, 0);
    const savedLevel = loadProgress();
    const continueBtn = document.getElementById('start-continue-btn');
    if (savedLevel > 1 && continueBtn) { continueBtn.classList.remove('hidden'); continueBtn.innerText = `つづきから (Level ${savedLevel})`; }
}

function showNicknameModal() {
    return new Promise(resolve => {
        const modal = document.getElementById('nickname-modal');
        const input = document.getElementById('nickname-input');
        const saveBtn = document.getElementById('nickname-save-btn');
        const saved = localStorage.getItem('nekozoroe_nickname');
        if (saved) input.value = saved;
        modal.classList.remove('hidden');
        const handleSave = () => {
            const name = input.value.trim();
            if (!name) return;
            localStorage.setItem('nekozoroe_nickname', name);
            modal.classList.add('hidden');
            resolve(name);
        };
        saveBtn.onclick = handleSave;
    });
}

async function showTimeAttackResult(elapsed) {
    const overlay = document.getElementById('ta-result-overlay');
    const timeEl = document.getElementById('ta-result-time');
    if (!overlay || !timeEl) return;
    timeEl.textContent = formatTime(elapsed);
    overlay.classList.remove('hidden');
    document.getElementById('ta-save-btn').onclick = async () => {
        overlay.classList.add('hidden');
        let nickname = localStorage.getItem('nekozoroe_nickname');
        if (!nickname) nickname = await showNicknameModal();
        if (nickname) await saveRanking(10, elapsed);
        showRanking('time');
    };
    document.getElementById('ta-skip-btn').onclick = () => {
        overlay.classList.add('hidden');
        goHome();
    };
}

async function showRanking(defaultTab = 'level') {
    const overlay = document.getElementById('ranking-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    await loadRankingTab(defaultTab);
}

async function loadRankingTab(tab) {
    document.querySelectorAll('.ranking-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    const list = document.getElementById('ranking-list');
    list.innerHTML = '<p class="ranking-loading">読み込み中...</p>';
    const rankings = await getRankings(tab);
    if (rankings.length === 0) {
        list.innerHTML = '<p class="ranking-loading">まだ記録がありません</p>';
        return;
    }
    list.innerHTML = rankings.map((entry, i) => {
        const name = entry.nickname || '名無しさん';
        const score = tab === 'level' ? `Lv.${entry.level}` : formatTime(entry.bestTime);
        const isMe = entry.uid === currentUid;
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return `<div class="ranking-item${isMe ? ' ranking-me' : ''}"><span class="ranking-rank">${medal}</span><span class="ranking-name">${name}</span><span class="ranking-score">${score}</span></div>`;
    }).join('');
}

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
        if (AdMob) {
            await AdMob.initialize({ requestTrackingAuthorization: true }); 
            // 起動時に1回目のプリロード
            prepareAd();
        }
    } catch (e) {}
}

async function prepareAd() {
    try {
        const Capacitor = window.Capacitor;
        const { AdMob } = (Capacitor && Capacitor.Plugins) ? Capacitor.Plugins : {};
        if (!AdMob) return;
        
        await AdMob.prepareRewardVideoAd({ adId: ADMOB_CONFIG.rewardedId });
        gameState.adPrepared = true;
    } catch (e) {
        gameState.adPrepared = false;
    }
}

async function showRewardedAd() {
    try {
        const Capacitor = window.Capacitor;
        const { AdMob } = (Capacitor && Capacitor.Plugins) ? Capacitor.Plugins : {};
        if (!AdMob) return true;

        // 準備ができていない場合は、その場で準備を試みる
        if (!gameState.adPrepared) {
            await AdMob.prepareRewardVideoAd({ adId: ADMOB_CONFIG.rewardedId });
        }

        const reward = await AdMob.showRewardVideoAd();
        
        // 広告終了後にBGMを再開
        if (!gameState.isMuted && gameState.bgmStarted) {
            bgm.play().catch(() => {});
        }

        // 視聴完了後、次の広告をプリロードしておく
        gameState.adPrepared = false;
        prepareAd();

        return !!reward;
    } catch (e) { 
        // 失敗した場合でもBGMを再開
        if (!gameState.isMuted && gameState.bgmStarted) {
            bgm.play().catch(() => {});
        }
        // 失敗した場合は再度プリロードを試みる
        prepareAd();
        alert('広告の準備ができていません。少し待ってから再度お試しください。'); 
        return false; 
    }
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
    if (gameState.bgCatInterval) {
        clearInterval(gameState.bgCatInterval);
        gameState.bgCatInterval = null;
    }
    homeBgm.pause();
    homeBgm.currentTime = 0;
    gameState.level = level; saveProgress(level); startAudio(true);
    document.getElementById('start-screen').classList.add('fade-out');
    setupLevel(gameState.level); renderTubes();
}

async function spawnBackgroundCat() {
    const container = document.getElementById('background-cats-container');
    if (!container || document.getElementById('start-screen').classList.contains('fade-out')) return;

    const cat = document.createElement('div');
    cat.className = 'bg-cat';
    
    // ランダムな猫を選択
    const pattern = CONFIG.patterns[Math.floor(Math.random() * CONFIG.patterns.length)];
    const suffix = (pattern.id === 'white') ? '_centered_v11.png' : '_tight_v11.png';
    cat.style.backgroundImage = `url('assets/images/cat_${pattern.id}${suffix}')`;

    // 開始地点と終了地点をランダムに決定（画面外から画面外へ）
    const startSide = Math.floor(Math.random() * 4); // 0:上, 1:右, 2:下, 3:左
    let startX, startY, endX, endY;

    if (startSide === 0) { // 上から
        startX = Math.random() * 100; startY = -10;
        endX = Math.random() * 100; endY = 110;
    } else if (startSide === 1) { // 右から
        startX = 110; startY = Math.random() * 100;
        endX = -10; endY = Math.random() * 100;
    } else if (startSide === 2) { // 下から
        startX = Math.random() * 100; startY = 110;
        endX = Math.random() * 100; endY = -10;
    } else { // 左から
        startX = -10; startY = Math.random() * 100;
        endX = 110; endY = Math.random() * 100;
    }

    cat.style.left = `${startX}%`;
    cat.style.top = `${startY}%`;
    
    // 進行方向とランダムな回転を適用
    const scaleX = (endX < startX) ? -1 : 1;
    const rotation = (Math.random() - 0.5) * 720; // 720度（2回転）程度ランダムに回る
    cat.style.transform = `scaleX(${scaleX}) rotate(0deg)`;

    container.appendChild(cat);

    // アニメーション実行
    const duration = 15000 + Math.random() * 10000; // 15〜25秒
    cat.style.transition = `left ${duration}ms linear, top ${duration}ms linear, transform ${duration}ms linear`;
    
    setTimeout(() => {
        cat.style.left = `${endX}%`;
        cat.style.top = `${endY}%`;
        cat.style.transform = `scaleX(${scaleX}) rotate(${rotation}deg)`;
    }, 50);

    // 終了後に削除
    setTimeout(() => cat.remove(), duration + 100);
}

async function showBrandSplash() {
    const splash = document.getElementById('brand-splash');
    const logo = document.getElementById('brand-logo');
    if (!splash || !logo) return;

    // ロゴのフェードイン・アウト演出
    await wait(100);
    logo.classList.add('fade-in');
    await wait(1500); // 1.0s fade-in + 0.5s static
    logo.classList.remove('fade-in');
    await wait(1000); // 1.0s fade-out

    // 「タップしてスタート」テキストを表示
    const tapText = document.createElement('p');
    tapText.textContent = 'タップしてスタート';
    tapText.style.cssText = 'color:#999;font-size:1rem;position:absolute;bottom:25%;left:50%;transform:translateX(-50%);animation:fadeInTap 1s ease infinite alternate;';
    splash.appendChild(tapText);

    // ユーザーのタップを待ってからホーム画面へ遷移（これで音声再生許可を確実に取得）
    await new Promise(resolve => {
        const onTap = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // タップ時にBGMを再生（ユーザー操作なので確実に許可される）
            if (!gameState.isMuted) {
                homeBgm.play().catch(() => {});
            }
            splash.removeEventListener('click', onTap, true);
            splash.removeEventListener('touchend', onTap, true);
            resolve();
        };
        splash.addEventListener('click', onTap, true);
        splash.addEventListener('touchend', onTap, true);
    });

    // スプラッシュをフェードアウトして削除（pointer-eventsで下層への伝播を完全にブロック）
    splash.style.pointerEvents = 'none';
    splash.classList.add('fade-out');
    await wait(1000);
    splash.remove();
}

/** --- FIREBASE --- **/

async function initFirebase() {
    try {
        if (!firebase || !firebase.apps) return;
        if (firebase.apps.length === 0) {
            firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
        } else {
            firebaseApp = firebase.apps[0];
        }
        firebaseAuth = firebase.auth();
        firebaseDb = firebase.firestore();
        const userCredential = await firebaseAuth.signInAnonymously();
        currentUid = userCredential.user.uid;
        console.log('Firebase: 匿名ログイン成功', currentUid);
    } catch (e) {
        console.warn('Firebase初期化エラー:', e);
    }
}

async function saveRanking(level, time = null) {
    if (!firebaseDb || !currentUid) return;
    try {
        const nickname = localStorage.getItem('nekozoroe_nickname') || null;
        const ref = firebaseDb.collection('rankings').doc(currentUid);
        const existing = await ref.get();
        const data = existing.exists ? existing.data() : {};
        const newBestTime = time !== null
            ? (data.bestTime ? Math.min(time, data.bestTime) : time)
            : (data.bestTime || null);
        await ref.set({
            nickname: nickname || data.nickname || null,
            level: Math.max(level, data.level || 0),
            bestTime: newBestTime,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('ランキング保存完了:', level, time);
    } catch (e) {
        console.warn('ランキング保存エラー:', e);
    }
}

async function getRankings(type = 'level', limitCount = 10) {
    if (!firebaseDb) return [];
    try {
        let query;
        if (type === 'level') {
            query = firebaseDb.collection('rankings')
                .where('level', '>', 0)
                .orderBy('level', 'desc')
                .limit(limitCount);
        } else {
            query = firebaseDb.collection('rankings')
                .where('bestTime', '>', 0)
                .orderBy('bestTime', 'asc')
                .limit(limitCount);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn('ランキング取得エラー:', e);
        return [];
    }
}

function checkUpdate() {
    // 実際はここで外部API/JSONを取得する
    if (gameState.currentVersion !== gameState.latestVersion) {
        document.getElementById('update-overlay').classList.remove('hidden');
    }
}

function initGame() {
    showBrandSplash();
    setTimeout(checkUpdate, 2000); // スプラッシュ終了後にチェック
    
    // 背景猫の生成開始（頻度アップ：3000ms -> 1500ms）
    gameState.bgCatInterval = setInterval(spawnBackgroundCat, 1500);
    for(let i=0; i<5; i++) setTimeout(spawnBackgroundCat, i * 500); // 最初は多めに（3匹 -> 5匹）
    
    preloadAssets();
    const savedLevel = loadProgress();
    const continueBtn = document.getElementById('start-continue-btn');
    if (savedLevel > 1 && continueBtn) { continueBtn.classList.remove('hidden'); continueBtn.innerText = `つづきから (Level ${savedLevel})`; }
    
    // UI Event Listeners
    document.getElementById('reset-btn').onclick = () => { 
        if (gameState.animatingCount > 0) return;
        if(confirm('現在のレベルを最初からやり直しますか？')) { 
            // 初期配置を復元する
            gameState.tubes = JSON.parse(JSON.stringify(gameState.initialTubes));
            gameState.selectedTubeIndex = null;
            gameState.history = [];
            gameState.clearedTubes = [];
            renderTubes(); 
        } 
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
    document.getElementById('home-btn').onclick = () => {
        if (gameState.animatingCount > 0) return;
        if (gameState.isTimeAttack) { stopTimer(); gameState.isTimeAttack = false; }
        goHome();
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

    document.getElementById('update-now-btn').onclick = () => {
        const url = /iPhone|iPad|iPod/.test(navigator.userAgent) 
            ? 'https://apps.apple.com/app/id6761840479' 
            : 'https://play.google.com/store/apps/details?id=com.jirachi.nekozoroe';
        window.open(url, '_blank');
    };
    
    document.getElementById('update-later-btn').onclick = () => {
        document.getElementById('update-overlay').classList.add('hidden');
    };
    document.getElementById('time-attack-btn').onclick = () => startTimeAttack();
    document.getElementById('ranking-btn').onclick = () => showRanking('level');
    document.getElementById('ranking-close-btn').onclick = () => document.getElementById('ranking-overlay').classList.add('hidden');
    document.querySelectorAll('.ranking-tab').forEach(btn => { btn.onclick = () => loadRankingTab(btn.dataset.tab); });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) bgm.pause(); else if (!gameState.isMuted && gameState.bgmStarted) bgm.play().catch(() => {});
    });
    
    initAdMob();
    initFirebase();
}

initGame();