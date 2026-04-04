/**
 * Sort Cat - Game Logic
 */

const CONFIG = {
    maxCatsPerTube: 4,
    animationDuration: 500, // ms
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

/**
 * Preload all image assets to prevent delays when levels start.
 */
function preloadAssets() {
    console.log("Preloading cat assets...");
    CONFIG.patterns.forEach(pattern => {
        const img = new Image();
        // White cat is currently the only one using 'centered' logic in CSS
        const suffix = (pattern.id === 'white') ? '_centered_v11.png' : '_tight_v11.png';
        const url = `assets/images/cat_${pattern.id}${suffix}`;
        img.src = url;
    });

    // Also preload tower images
    ['cat_tower_v102.png'].forEach(filename => {
        const img = new Image();
        img.src = `assets/images/${filename}`;
    });
}

let gameState = {
    level: 1,
    tubes: [],
    initialTubes: [], // Store the starting configuration of the level
    selectedTubeIndex: null,
    isAnimating: false,
    history: [],
    isMuted: false,
    bgmStarted: false,
    isTransitioning: false,
    clearedTubes: [] // Tracks indices of tubes that have already played completion effects
};

const SAVE_KEY = 'nekozoroe_level_v1';

// AdMob Configuration (Real IDs from user)
const ADMOB_CONFIG = {
    appId: "ca-app-pub-9138341481603997~6409773553",
    rewardedId: "ca-app-pub-9138341481603997/4138104480"
};

console.log("GameState Initialized");

const bgm = new Audio('assets/sounds/bgm.mp3');
bgm.loop = true;
bgm.volume = 0.3;

// Initialize Game
function initGame() {
    setupLevel(gameState.level);
    renderTubes();
    setupEventListeners();
}

/**
 * Level Setup
 * @param {number} level 
 */
function setupLevel(level) {
    const numPatterns = Math.min(3 + Math.floor(level / 3), CONFIG.patterns.length);
    const numEmptyTubes = 2;
    const totalTubes = numPatterns + numEmptyTubes;
    
    // Create pool of cats
    let catPool = [];
    for (let i = 0; i < numPatterns; i++) {
        for (let j = 0; j < CONFIG.maxCatsPerTube; j++) {
            catPool.push(CONFIG.patterns[i].id);
        }
    }

    // Shuffle cats
    catPool.sort(() => Math.random() - 0.5);

    // Distribute into tubes
    gameState.tubes = [];
    for (let i = 0; i < numPatterns; i++) {
        gameState.tubes.push(catPool.splice(0, CONFIG.maxCatsPerTube));
    }
    for (let i = 0; i < numEmptyTubes; i++) {
        gameState.tubes.push([]);
    }

    gameState.selectedTubeIndex = null;
    gameState.isAnimating = false;
    gameState.isTransitioning = false;
    gameState.history = []; 
    gameState.clearedTubes = []; // Reset cleared tubes tracking

    // Pre-populate clearedTubes if starting with already sorted tubes (rare but safe)
    gameState.tubes.forEach((tube, idx) => {
        if (isTubeComplete(idx)) {
            gameState.clearedTubes.push(idx);
        }
    });
    document.getElementById('level-number').innerText = level;

    // Save initial state for Reset button - Deep Copy
    gameState.initialTubes = JSON.parse(JSON.stringify(gameState.tubes));
    console.log("Level Setup Complete. Initial state saved.", gameState.initialTubes);

    updateLayoutMode();
}

/**
 * Update layout mode based on tube count
 */
function updateLayoutMode() {
    // Keep sizes consistent as requested. Removing compact layout logic.
}

/**
 * Render Tubes to DOM
 */
function renderTubes() {
    const container = document.getElementById('tube-container');
    container.innerHTML = '';

    gameState.tubes.forEach((cats, index) => {
        const tubeEl = document.createElement('div');
        tubeEl.className = 'tube';
        tubeEl.dataset.index = index;
        
        if (gameState.selectedTubeIndex === index) {
            tubeEl.classList.add('selected');
        }

        // Add completed class if tube is full with same cats (static highlight)
        if (isTubeComplete(index)) {
            tubeEl.classList.add('completed');
        }

        cats.forEach(catId => {
            const catEl = document.createElement('div');
            catEl.className = `cat sleeping cat-${catId}`;
            tubeEl.appendChild(catEl);
        });

        tubeEl.addEventListener('click', () => handleTubeClick(index));
        container.appendChild(tubeEl);
    });
}

/**
 * Validation Logic (Check how many cats can move)
 */
function getMoveableCount(fromIndex, toIndex) {
    const fromTube = gameState.tubes[fromIndex];
    const toTube = gameState.tubes[toIndex];

    if (fromTube.length === 0) return 0;
    if (toTube.length >= CONFIG.maxCatsPerTube) return 0;

    const topCatId = fromTube[fromTube.length - 1];
    const targetTopCat = toTube[toTube.length - 1];

    // Allowed if destination is empty or same pattern
    if (toTube.length > 0 && targetTopCat !== topCatId) return 0;

    // Count identical cats at the top of the source tube
    let sameCount = 0;
    for (let i = fromTube.length - 1; i >= 0; i--) {
        if (fromTube[i] === topCatId) sameCount++;
        else break;
    }

    // Check available space in the target tube
    const availableSpace = CONFIG.maxCatsPerTube - toTube.length;
    return Math.min(sameCount, availableSpace);
}

/**
 * Handle Tube Click
 * @param {number} index 
 */
function handleTubeClick(index) {
    if (gameState.isTransitioning) return;

    // Allow selecting or changing the "from" tube even during animation
    if (gameState.selectedTubeIndex === null) {
        if (gameState.tubes[index].length > 0) {
            gameState.selectedTubeIndex = index;
            renderTubes();
        }
    } else {
        if (gameState.selectedTubeIndex === index) {
            gameState.selectedTubeIndex = null;
            renderTubes();
        } else {
            // Only block "Confirm Move" (execution) while animating
            if (gameState.isAnimating) {
                // Let the user change their "from" selection instead
                if (gameState.tubes[index].length > 0) {
                    gameState.selectedTubeIndex = index;
                    renderTubes();
                }
                return;
            }

            const count = getMoveableCount(gameState.selectedTubeIndex, index);
            if (count > 0) {
                executeMove(gameState.selectedTubeIndex, index, count);
            } else {
                // If move is invalid, switch selected tube to the clicked one
                if (gameState.tubes[index].length > 0) {
                    gameState.selectedTubeIndex = index;
                    renderTubes();
                }
            }
        }
    }
}

/**
 * Animation & State Logic (Streaming Move for Multiple Cats)
 */
async function executeMove(fromIndex, toIndex, count) {
    gameState.isAnimating = true;
    gameState.history.push(JSON.parse(JSON.stringify(gameState.tubes)));

    const fromTubeEl = document.querySelectorAll('.tube')[fromIndex];
    const toTubeEl = document.querySelectorAll('.tube')[toIndex];
    const fromRect = fromTubeEl.getBoundingClientRect();
    const toRect = toTubeEl.getBoundingClientRect();

    // 1. Tilt Source Tube
    fromTubeEl.classList.add('tilting');
    
    // Immediately clear selected state so user can pick next source
    gameState.selectedTubeIndex = null;

    const animationPromises = [];

    for (let i = 0; i < count; i++) {
        const catId = gameState.tubes[fromIndex].pop();
        renderTubes(); // Remove the cat from the source tube DOM
        
        // Start individual cat animation
        animationPromises.push(animateSingleCat(catId, fromRect, toRect, toIndex, toTubeEl, i));
        
        await wait(250); 
    }

    // 2. Return source tube to default state as soon as cats are out
    fromTubeEl.classList.remove('tilting');

    // Wait for all flying cats to arrive at the destination
    await Promise.all(animationPromises);

    gameState.isAnimating = false;

    // Check if the destination tube just became complete
    if (isTubeComplete(toIndex) && !gameState.clearedTubes.includes(toIndex)) {
        gameState.clearedTubes.push(toIndex);
        renderTubes(); // Update to show 'completed' static highlight
        
        // Add the one-time vibration effect
        const tubeEl = document.querySelectorAll('.tube')[toIndex];
        if (tubeEl) {
            tubeEl.classList.add('vibrate-once');
        }
        
        playPurr();
    }

    if (checkWin()) {
        gameState.isTransitioning = true;
        
        // Show victory overlay
        const overlay = document.getElementById('victory-overlay');
        overlay.classList.remove('hidden');

        // Make cats jump for celebration
        document.querySelectorAll('.cat').forEach((cat, i) => {
            setTimeout(() => {
                cat.classList.add('jumping');
            }, i * 50); // Staggered jump
        });

        setTimeout(() => {
            overlay.classList.add('hidden');
            gameState.level++;
            saveProgress(gameState.level); // Save progress after clearing a level
            setupLevel(gameState.level);
            renderTubes();
        }, 1800); // Slightly longer for celebration
    }
}

/**
 * Single Cat Animation Sequence
 */
async function animateSingleCat(catId, fromRect, toRect, toIndex, toTubeEl, index) {
    playMeow();

    // 1. Create and position the flying cat
    const flyingCat = document.createElement('div');
    flyingCat.className = `flying-cat cat-${catId}`;
    flyingCat.style.left = `${fromRect.left + (fromRect.width - 50) / 2}px`;
    flyingCat.style.top = `${fromRect.top - 20}px`;
    document.getElementById('flying-cat-container').appendChild(flyingCat);

    await wait(100);

    // 2. Jump Out and Walk (with a slight vertical offset for different cats in the row)
    flyingCat.style.transform = `translateY(${-50 - (index * 5)}px)`; // Stack slightly higher
    await wait(200);
    
    // Smooth transition to destination
    flyingCat.style.left = `${toRect.left + (toRect.width - 50) / 2}px`;
    flyingCat.style.top = `${toRect.top - 80}px`;
    
    await wait(500);

    // 3. Destination Tube Tilts to Welcome (triggered for every cat)
    toTubeEl.classList.add('tilting-reverse');
    
    // 4. Jump In
    flyingCat.style.top = `${toRect.top + (toRect.height * 0.2)}px`;
    flyingCat.style.opacity = '0';
    
    await wait(200);
    
    // 5. Land and update state
    gameState.tubes[toIndex].push(catId);
    toTubeEl.classList.remove('tilting-reverse');
    flyingCat.remove();
    renderTubes(); // Update destination tube DOM
}

/**
 * Win Condition
 */
function checkWin() {
    return gameState.tubes.every((cats, index) => {
        if (cats.length === 0) return true;
        return isTubeComplete(index);
    });
}

/**
 * Checks if a tube is full and contains only one type of cat.
 */
function isTubeComplete(index) {
    const cats = gameState.tubes[index];
    if (cats.length < CONFIG.maxCatsPerTube) return false;
    return cats.every(cat => cat === cats[0]);
}

/**
 * Sound Logic (Nyanyameow!)
 */
/**
 * List of 10 different cat meow sounds for variety.
 * Using royalty-free preview MP3s from Mixkit.
 */
const MEOW_SOUNDS = [
    'assets/sounds/meow.mp3'
];

/**
 * Plays a cat meow sound.
 * We now use a stable Envato CDN URL that doesn't have 403 hotlink protection.
 */
function playMeow() {
    if (gameState.isMuted) return;
    
    // Ensure Audio context starts
    startAudio();

    try {
        const randomIndex = Math.floor(Math.random() * MEOW_SOUNDS.length);
        const soundUrl = MEOW_SOUNDS[randomIndex];
        const audio = new Audio(soundUrl);
        
        audio.preservesPitch = false;
        if (audio.webkitPreservesPitch !== undefined) audio.webkitPreservesPitch = false;
        if (audio.mozPreservesPitch !== undefined) audio.mozPreservesPitch = false;
        
        audio.playbackRate = 0.8 + Math.random() * 0.6;
        audio.volume = 0.6;
        audio.play().catch(err => console.log("SE Play Error:", err));

        // Trim the audio to 2.3 seconds to remove suspected human voice noise at the end
        setTimeout(() => {
            if (!audio.paused) {
                // Fade out slightly before stopping to avoid clicks
                const fadeInterval = setInterval(() => {
                    if (audio.volume > 0.05) {
                        audio.volume -= 0.05;
                    } else {
                        audio.pause();
                        clearInterval(fadeInterval);
                    }
                }, 10);
            }
        }, 2200); // Start fade at 2.2s, stop by 2.3s
    } catch (e) {
        console.log("Audio creation failed", e);
    }
}

/**
 * Plays a purring sound for completed tubes.
 * FALLBACK: If purr.mp3 is missing, it generates a synthetic vibration sound.
 */
function playPurr() {
    if (gameState.isMuted) return;
    
    try {
        const audio = new Audio('assets/sounds/purr.mp3');
        audio.volume = 0.7;
        audio.play().catch(err => {
            console.log("Using organic synthetic purr fallback...");
            generateOrganicPurr();
        });
        
        // Removed BGM Ducking as requested by user
    } catch (e) {
        generateOrganicPurr();
    }
}

/**
 * Temporarily lowers BGM volume to make the purr audible.
 */
function duckBGM(durationMs) {
    if (gameState.isMuted) return;
    const originalVolume = bgm.volume;
    bgm.volume = 0.02; // Almost silent to highlight the purr
    
    setTimeout(() => {
        if (!gameState.isMuted) {
            bgm.volume = originalVolume;
        }
    }, durationMs);
}

/**
 * Generates a realistic low-frequency vibrating purr sound using Web Audio API.
 */
/**
 * Generates an organic, noise-based vibrating purr sound.
 * Uses Brown Noise + Sinusoidal Modulation + Resonant Filtering for realism.
 */
function generateOrganicPurr() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    console.log("Organic Purr Engine Started!");
    
    // Haptic Feedback
    if ("vibrate" in navigator) {
        navigator.vibrate([150, 50, 150, 50, 150, 50, 150, 50, 150, 50, 150, 50, 150, 50, 150, 50]);
    }

    const duration = 2.0;
    const sampleRate = ctx.sampleRate;
    const bufferSize = sampleRate * duration;
    const brownBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = brownBuffer.getChannelData(0);
    
    // 1. Generate Brown Noise (Turbulence/Air feel)
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 4.5; // Boost amplitude
    }
    
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = brownBuffer;
    
    // 2. Fundamental Body (Tonal vibration)
    const bodyOsc = ctx.createOscillator();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(80, ctx.currentTime);

    // 3. Resonant Filter (Throat resonance)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    filter.Q.setValueAtTime(10, ctx.currentTime); // High resonance for "thump"
    
    // 4. Amplitude Modulation LFO (Rhythmic Breathing Pulse)
    const amLfo = ctx.createOscillator();
    amLfo.type = 'sine';
    amLfo.frequency.setValueAtTime(20, ctx.currentTime); // 20Hz vibration pulse
    
    const amGain = ctx.createGain();
    amGain.gain.setValueAtTime(0, ctx.currentTime);
    
    // Using AM Modulation
    amLfo.connect(amGain.gain);
    
    // Main Volume Envelope
    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0, ctx.currentTime);
    mainGain.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 0.2);
    mainGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    // Connections
    // Combine noise and body
    const mixBus = ctx.createGain();
    noiseSource.connect(mixBus);
    bodyOsc.connect(mixBus);
    
    mixBus.connect(filter);
    filter.connect(amGain);
    amGain.connect(mainGain);
    mainGain.connect(ctx.destination);

    // Play!
    noiseSource.start();
    bodyOsc.start();
    amLfo.start();
    
    noiseSource.stop(ctx.currentTime + duration);
    bodyOsc.stop(ctx.currentTime + duration);
    amLfo.stop(ctx.currentTime + duration);
    
    setTimeout(() => ctx.close(), duration * 1000 + 100);
}

/**
 * Initializes and starts the background music and unlocks Web Audio.
 */
function startAudio(force = false) {
    if ((force || !gameState.bgmStarted) && !gameState.isMuted) {
        bgm.play().then(() => {
            gameState.bgmStarted = true;
            console.log("BGM Started successfully");
        }).catch(err => {
            console.log("BGM Autoplay blocked, waiting for interaction");
        });
    }
}

function toggleMute() {
    gameState.isMuted = !gameState.isMuted;
    const muteBtn = document.getElementById('mute-btn');
    if (gameState.isMuted) {
        bgm.pause();
        muteBtn.innerText = '🔇';
    } else {
        if (gameState.bgmStarted) bgm.play();
        else startAudio();
        muteBtn.innerText = '🔊';
    }
}
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Persistence Logic
 */
function saveProgress(level) {
    try {
        localStorage.setItem(SAVE_KEY, level.toString());
        console.log("Progress saved: Level", level);
    } catch (e) {
        console.error("Failed to save progress", e);
    }
}

function loadProgress() {
    try {
        const savedLevel = localStorage.getItem(SAVE_KEY);
        return savedLevel ? parseInt(savedLevel, 10) : 1;
    } catch (e) {
        console.error("Failed to load progress", e);
        return 1;
    }
}

function initGame() {
    // Start preloading immediately
    preloadAssets();

    // Check for saved progress
    const savedLevel = loadProgress();
    const continueBtn = document.getElementById('start-continue-btn');
    const newGameBtn = document.getElementById('start-new-btn');
    const startScreen = document.getElementById('start-screen');
    const gameContainer = document.getElementById('game-container');

    if (savedLevel > 1) {
        gameState.level = savedLevel;
        if (continueBtn) {
            continueBtn.classList.remove('hidden');
            continueBtn.innerText = `つづきから (Level ${savedLevel})`;
        }
    }

    const startGame = (level) => {
        console.log(`Starting Game at Level ${level}...`);
        gameState.level = level;
        saveProgress(level);
        
        // 1. Initialize Audio (BGM & SE)
        startAudio(true); 
        
        // 2. Transition View
        startScreen.classList.add('fade-out');
        gameContainer.classList.remove('hidden');
        
        // 3. Setup Level and DRAW
        setupLevel(gameState.level);
        renderTubes();
    };

    if (continueBtn) {
        continueBtn.addEventListener('click', () => startGame(gameState.level));
    }

    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            if (gameState.level > 1) {
                if (!confirm("最初からやり直しますか？（現在の進捗は消えてしまいます）")) {
                    return;
                }
            }
            startGame(1);
        });
    }

    // Initialize UI listeners (Mute, Undo, etc.)
    document.getElementById('reset-btn').addEventListener('click', () => resetLevel());
    document.getElementById('undo-btn').addEventListener('click', () => undoMove());
    document.getElementById('add-tube-btn').addEventListener('click', () => addExtraTube());
    document.getElementById('mute-btn').addEventListener('click', () => toggleMute());

    // --- Background/Foreground BGM Handling ---
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // App is minimized or screen was locked
            bgm.pause();
        } else {
            // App is back in foreground
            if (!gameState.isMuted && gameState.bgmStarted) {
                bgm.play().catch(err => console.log("BGM Restore Error:", err));
            }
        }
    });

    // Setup first level but keep it hidden until start
    setupLevel(gameState.level);

    // Initialize AdMob
    initAdMob();
}

/**
 * AdMob Integration
 */
async function initAdMob() {
    try {
        const { AdMob } = Capacitor.Plugins;
        if (!AdMob) return;

        await AdMob.initialize({
            requestTrackingAuthorization: true,
        });
        console.log("AdMob Initialized");
    } catch (e) {
        console.error("AdMob Init Failed:", e);
    }
}

async function showRewardedAd() {
    try {
        const { AdMob } = Capacitor.Plugins;
        if (!AdMob) {
            // Fallback for browser testing
            console.warn("AdMob plugin not found. Faking reward.");
            return true;
        }

        // Prepare (Load) the ad
        await AdMob.prepareRewardVideoAd({
            adId: ADMOB_CONFIG.rewardedId,
        });

        // Show the ad
        const reward = await AdMob.showRewardVideoAd();
        
        if (reward) {
            console.log("Reward earned:", reward);
            return true;
        }
        return false;
    } catch (e) {
        console.error("AdMob Reward Error:", e);
        // If ad fails to load or show, we might want to give the reward anyway to not frustrate the user, 
        // but for now let's just alert.
        alert("広告の読み込みに失敗しました。時間をおいて再度お試しください。");
        return false;
    }
}

function resetLevel() {
    if (confirm("ステージの最初に戻ります。よろしいですか？")) {
        gameState.tubes = JSON.parse(JSON.stringify(gameState.initialTubes));
        gameState.history = [];
        gameState.selectedTubeIndex = null;
        gameState.isAnimating = false;
        renderTubes();
    }
}

function undoMove() {
    if (gameState.history.length > 0) {
        const prevState = gameState.history[gameState.history.length - 1];
        // Check if undoing will remove a tower that was added
        if (prevState.length < gameState.tubes.length) {
            if (!confirm("追加したタワーが消えてしまいますが、戻してよろしいですか？")) {
                return;
            }
        }
        gameState.tubes = gameState.history.pop();
        renderTubes();
    }
}

async function addExtraTube() {
    // Only allow adding one extra tube per level to keep balance
    if (gameState.tubes.length > (gameState.initialTubes.length + 1)) {
        alert("これ以上タワーを追加することはできません。");
        return;
    }

    if (confirm("広告を視聴して、新しいキャットタワーを追加しますか？\n（クリアがぐっと楽になります！）")) {
        const success = await showRewardedAd();
        if (success) {
            gameState.tubes.push([]);
            renderTubes();
            console.log("Extra tower added via Reward Ad.");
        }
    }
}

// Start
initGame();
