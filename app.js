/**
 * Family Watch Referee - Main Application Logic
 * 10-foot Leanback TV experience for Fire TV & Android TV
 */

(function () {
  'use strict';

  // --- AUDIO SYNTHESIZER (Leanback remote chimes, zero external files) ---
  const AudioEngine = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
    },
    playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.08) {
      try {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {
        // Audio policy or headless silence fallback
      }
    },
    nav() { this.playTone(320, 'sine', 0.04, 0.04); },
    toggle() { this.playTone(540, 'triangle', 0.08, 0.07); },
    decide() {
      this.playTone(440, 'sine', 0.1, 0.08);
      setTimeout(() => this.playTone(660, 'sine', 0.15, 0.08), 100);
      setTimeout(() => this.playTone(880, 'triangle', 0.25, 0.1), 220);
    },
    error() {
      this.playTone(220, 'sawtooth', 0.12, 0.08);
      setTimeout(() => this.playTone(180, 'sawtooth', 0.18, 0.08), 120);
    }
  };

  // --- APPLICATION STATE ---
  const STATE = {
    currentScreen: 'selection', // 'selection' | 'thinking' | 'result' | 'player' | 'voice'
    focusedIndex: 0,
    focusableElements: [],
    catalog: [],
    lastResultsQueue: [],
    currentWinnerIndex: 0,
    currentWinner: null,
    playerTimer: null,
    playerProgressSec: 0,
    isPlaying: false,

    // Family Profiles
    profiles: {
      papa: {
        id: 'papa',
        name: 'Papa',
        avatar: '👨‍💼',
        role: 'Family Head',
        active: true,
        mood: 'Family',
        maxRuntime: 90,
        isKid: false
      },
      mummy: {
        id: 'mummy',
        name: 'Mummy',
        avatar: '👩‍🍳',
        role: 'Heart of House',
        active: true,
        mood: 'Comedy',
        maxRuntime: 90,
        isKid: false
      },
      bhai: {
        id: 'bhai',
        name: 'Bhai',
        avatar: '🎧',
        role: 'College Kid',
        active: true,
        mood: 'Action',
        maxRuntime: 120,
        isKid: false
      },
      chhotu: {
        id: 'chhotu',
        name: 'Chhotu',
        avatar: '🧒',
        role: 'Kids Mode',
        active: true,
        mood: 'Chill',
        maxRuntime: 60,
        isKid: true // Hard lock: U rating only
      }
    },

    activeProfileTab: 'papa'
  };

  // --- HOUSEHOLD MEMORY STORE (localStorage persistence) ---
  const MemoryStore = {
    KEY: 'family_watch_referee_memory_v1',
    load() {
      try {
        const raw = localStorage.getItem(this.KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.warn('Memory load error', e);
      }
      return {
        pastPicks: [], // array of { title, id, genre, mood, timestamp, dayOfWeek, hour }
        preferredGenres: {},
        lastPickTime: null
      };
    },
    save(data) {
      try {
        localStorage.setItem(this.KEY, JSON.stringify(data));
      } catch (e) {
        console.warn('Memory save error', e);
      }
    },
    recordPick(movie, activeProfiles) {
      const data = this.load();
      const now = new Date();
      const entry = {
        id: movie.id,
        title: movie.title,
        genre: movie.genre,
        moodTags: movie.moodTags,
        timestamp: now.getTime(),
        dayOfWeek: now.getDay(), // 0 = Sun, 6 = Sat
        isWeekend: (now.getDay() === 0 || now.getDay() === 6),
        hour: now.getHours(),
        members: activeProfiles.map(p => p.name)
      };

      data.pastPicks.unshift(entry);
      // Keep last 30 picks
      if (data.pastPicks.length > 30) data.pastPicks.pop();
      data.lastPickTime = entry.timestamp;

      // Update genre counts
      const mainGenre = movie.genre.split('/')[0].trim();
      data.preferredGenres[mainGenre] = (data.preferredGenres[mainGenre] || 0) + 1;

      this.save(data);
    },
    getHouseholdInsight() {
      const data = this.load();
      const now = new Date();
      const isWeekend = (now.getDay() === 0 || now.getDay() === 6);
      const isLateNight = (now.getHours() >= 21 || now.getHours() < 4);

      if (!data.pastPicks || data.pastPicks.length === 0) {
        return isWeekend 
          ? 'Weekend movie night! Pehli baar family consensus engine chal raha hai.'
          : 'Aaj weekday evening hai: Sabke schedules match karke sweet-spot runtime nikaalenge.';
      }

      const lastPick = data.pastPicks[0];
      const lastMood = lastPick.moodTags && lastPick.moodTags[0] ? lastPick.moodTags[0] : 'film';

      if (isWeekend) {
        return `Pichli baar "${lastPick.title}" (${lastMood}) dekhi thi. Weekend par sabko broad entertaining family title pasand aati hai!`;
      } else if (isLateNight) {
        return `Kal subah jaldi uthna hoga! Referee 90 min se kam runtime ko priority dega.`;
      } else {
        return `Pichli baar ${lastMood} dekhi thi, aaj household preferences ke hisaab se fresh compromise choose karenge.`;
      }
    },
    reset() {
      localStorage.removeItem(this.KEY);
    }
  };

  // --- CATALOG LOADER ---
  async function loadCatalog() {
    if (window.CATALOG && Array.isArray(window.CATALOG) && window.CATALOG.length > 0) {
      STATE.catalog = window.CATALOG;
      console.log('Synchronous catalog loaded:', STATE.catalog.length, 'movies');
      return;
    }
    try {
      const resp = await fetch('catalog.json');
      if (!resp.ok) throw new Error('Catalog fetch failed: ' + resp.status);
      STATE.catalog = await resp.json();
      console.log('Catalog loaded via fetch:', STATE.catalog.length, 'movies');
    } catch (err) {
      console.warn('Fallback: loading embedded catalog fallback', err);
      STATE.catalog = [
        { id: "m1", title: "Chai Aur Chandrayaan", genre: "Sci-Fi / Family", runtime: 92, ageRating: "U", moodTags: ["Family", "Chill", "Comedy"], synopsis: "Retired engineer builds satellite radio in terrace garden, reuniting four generations.", posterGradient: "linear-gradient(135deg, #1e3c72, #2a5298)" },
        { id: "m2", title: "Samosa Express 24/7", genre: "Comedy / Adventure", runtime: 88, ageRating: "U", moodTags: ["Comedy", "Chill", "Family"], synopsis: "Two bumbling cousins race across midnight Delhi traffic to save wedding recipe.", posterGradient: "linear-gradient(135deg, #f093fb, #f5576c)" },
        { id: "m3", title: "Gully Turbo", genre: "Action / Sports", runtime: 105, ageRating: "UA", moodTags: ["Action", "Thriller"], synopsis: "Underground electric go-kart racers defend neighborhood park.", posterGradient: "linear-gradient(135deg, #f12711, #f5af19)" },
        { id: "m4", title: "Jungle Ke Jadugar", genre: "Animation / Kids", runtime: 74, ageRating: "U", moodTags: ["Family", "Comedy", "Chill"], synopsis: "Baby tiger and anxious owl quest for magical dancing monsoon cloud tree.", posterGradient: "linear-gradient(135deg, #0ba360, #3cba92)" },
        { id: "m5", title: "Midnight In Manali", genre: "Mystery / Thriller", runtime: 115, ageRating: "UA", moodTags: ["Thriller", "Chill"], synopsis: "Snowbound tourists in vintage cottage decipher antique puzzle box.", posterGradient: "linear-gradient(135deg, #2c3e50, #3498db)" }
      ];
    }
  }

  // --- AI SCORING & COMPROMISE ARBITRATION ENGINE ---
  function scoreMovie(movie, activeProfiles, memoryData) {
    let score = 0;
    const reasons = [];

    // 1. HARD SAFETY CONSTRAINT: Chhotu (or any kid) active -> ONLY U rated movies allowed
    const hasKid = activeProfiles.some(p => p.isKid);
    if (hasKid && movie.ageRating !== 'U') {
      return { score: -9999, eligible: false, reasons: ['Kid safety hard block: not U-rated'] };
    }

    // 2. RUNTIME CONSTRAINT: Heavy penalty for exceeding anyone's max limit
    const minRuntimeLimit = Math.min(...activeProfiles.map(p => p.maxRuntime));
    if (movie.runtime > minRuntimeLimit) {
      const overMinutes = movie.runtime - minRuntimeLimit;
      score -= (overMinutes * 3.5); // Steep runtime penalty
      reasons.push(`Over limit by ${overMinutes}m`);
    } else {
      score += 15; // Positive bonus for fitting comfortably in all schedules
      reasons.push(`Fits runtime (${movie.runtime}m <= ${minRuntimeLimit}m)`);
    }

    // 3. MOOD CONSENSUS: Match each member's mood preference against movie.moodTags
    let matchedMembersCount = 0;
    activeProfiles.forEach(profile => {
      if (movie.moodTags.includes(profile.mood)) {
        score += 25;
        matchedMembersCount++;
        reasons.push(`${profile.name} gets ${profile.mood}`);
      } else {
        // Minor penalty for unrepresented member mood
        score -= 4;
      }
    });

    // Unanimity multiplier: if everyone or majority gets their mood, big boost
    if (matchedMembersCount === activeProfiles.length) {
      score += 40; // Total unanimous jackpot
      reasons.push('Unanimous mood hit');
    } else if (matchedMembersCount >= Math.ceil(activeProfiles.length / 2)) {
      score += 18;
    }

    // 4. HOUSEHOLD MEMORY: Variety adaptation & recent repeat penalty
    if (memoryData && memoryData.pastPicks && memoryData.pastPicks.length > 0) {
      // Recent repeat penalty
      const recentPicks = memoryData.pastPicks.slice(0, 5);
      const isRecent = recentPicks.some(p => p.id === movie.id);
      if (isRecent) {
        score -= 30; // Encourage variety
        reasons.push('Recently watched penalty');
      }

      // Time-of-day / Day-of-week synergy
      const now = new Date();
      const isWeekend = (now.getDay() === 0 || now.getDay() === 6);
      if (isWeekend && movie.genre.includes('Family')) {
        score += 8; // Weekend family boost
      }
      if (now.getHours() >= 21 && movie.runtime <= 90) {
        score += 10; // Late night bedtime consideration
      }
    }

    return { score, eligible: true, reasons };
  }

  function arbitrateDecision() {
    const activeProfiles = Object.values(STATE.profiles).filter(p => p.active);
    if (activeProfiles.length === 0) {
      alert('Kam se kam ek family member select karein!');
      return [];
    }

    const memoryData = MemoryStore.load();
    const scoredList = STATE.catalog.map(movie => {
      const evaluation = scoreMovie(movie, activeProfiles, memoryData);
      return {
        movie,
        score: evaluation.score,
        eligible: evaluation.eligible,
        reasons: evaluation.reasons
      };
    }).filter(item => item.eligible);

    // Sort descending by highest consensus score
    scoredList.sort((a, b) => b.score - a.score);
    return scoredList;
  }

  // --- HINGLISH EXPLANATION ENGINE (Offline Rule-Based + Optional Native Bedrock Bridge) ---
  async function explainPick(winner, activeMembers) {
    // Check if Native Kotlin Bedrock Bridge is available and configured
    if (window.BedrockNative && window.APP_CONFIG && window.APP_CONFIG.useBedrock) {
      try {
        const prompt = `You are the 'Family Watch Referee' for an Indian household Fire TV app.
Selected members: ${activeMembers.map(m => `${m.name} (wants ${m.mood}, max ${m.maxRuntime} min)`).join(', ')}.
Chosen movie: "${winner.title}" (${winner.genre}, ${winner.runtime} min, Age Rating: ${winner.ageRating}, Moods: ${winner.moodTags.join(', ')}).
In ONE natural, witty, friendly Hinglish sentence (under 18 words), explain why this is the perfect household compromise. Keep it fun and mention at least 2 members by name or role.`;

        console.log('Invoking native Bedrock bridge...');
        const responseJson = window.BedrockNative.invokeBedrock(prompt, JSON.stringify(window.APP_CONFIG));
        const res = JSON.parse(responseJson);
        if (res && res.success && res.explanation) {
          return { text: res.explanation, source: 'AMAZON BEDROCK (CLAUDE AI NATIVE)' };
        }
      } catch (e) {
        console.warn('Bedrock native call failed or timed out, seamlessly falling back to offline engine:', e);
      }
    }

    // High quality offline Hinglish compromise templates
    const hasKid = activeMembers.some(p => p.isKid);
    const hasPapa = activeMembers.some(p => p.id === 'papa');
    const hasMummy = activeMembers.some(p => p.id === 'mummy');
    const hasBhai = activeMembers.some(p => p.id === 'bhai');
    const minRuntime = Math.min(...activeMembers.map(p => p.maxRuntime));

    const explanations = [];

    if (hasKid && hasPapa) {
      explanations.push(`Chhotu ke liye safe U-rating, Papa ko mast story, aur ${winner.runtime} min mein bedtime sorted!`);
      explanations.push(`Chhotu ka strict filter on hai, Papa ki peace aur family ka mood ekdum match ho gaya!`);
    } else if (hasKid && hasMummy) {
      explanations.push(`Chhotu ke liye safe, Mummy ko wholesome entertainment, bina kisi argument ke final!`);
    } else if (hasPapa && hasBhai) {
      explanations.push(`Bhai ko dynamic thrills, Papa ko grounded pacing, aur ${winner.runtime} min mein movie khatam.`);
    } else if (hasMummy && hasPapa) {
      explanations.push(`Papa ki bedtime limit aur Mummy ka comedy mood ek saath compromise ho gaya!`);
    } else {
      explanations.push(`${winner.title} sabke mood (${winner.moodTags.join(', ')}) ka best common ground hai!`);
    }

    // Add runtime guarantee
    if (winner.runtime <= minRuntime) {
      explanations.push(`Sabki ${minRuntime} min limit ke andar hai aur kisi ko compromise ka guilt nahi hoga!`);
    }

    const chosen = explanations[Math.floor(Math.random() * explanations.length)];
    return { text: chosen, source: 'OFFLINE HINGLISH REFEREE' };
  }

  // --- 10-FOOT SPATIAL FOCUS MANAGER ---
  function updateFocusables() {
    const currentView = document.querySelector('.view-screen.active-screen');
    if (!currentView) return;

    // Collect all visible focusable elements within active view
    const elements = Array.from(
      currentView.querySelectorAll('button:not([disabled]), [tabindex="0"]:not([disabled])')
    ).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
    });

    STATE.focusableElements = elements;
    if (elements.length > 0) {
      let currentFocused = elements.find(el => el.classList.contains('focused') || el === document.activeElement);
      if (!currentFocused) {
        currentFocused = elements[0];
      }
      setFocus(currentFocused);
    }
  }

  function setFocus(el) {
    if (!el) return;
    STATE.focusableElements.forEach(item => item.classList.remove('focused'));
    el.classList.add('focused');
    el.focus();
    AudioEngine.nav();

    // If focused on profile card, update the config panel display
    if (el.classList.contains('profile-card')) {
      const profileId = el.getAttribute('data-id');
      selectProfileForConfig(profileId);
    }
  }

  function moveFocusSpatial(direction) {
    const current = document.querySelector('.view-screen.active-screen .focused') || document.activeElement;
    if (!current || STATE.focusableElements.length <= 1) return;

    const curRect = current.getBoundingClientRect();
    const curCenter = {
      x: curRect.left + curRect.width / 2,
      y: curRect.top + curRect.height / 2
    };

    let bestCandidate = null;
    let minDistance = Infinity;

    STATE.focusableElements.forEach(target => {
      if (target === current) return;
      const tRect = target.getBoundingClientRect();
      const tCenter = {
        x: tRect.left + tRect.width / 2,
        y: tRect.top + tRect.height / 2
      };

      const dx = tCenter.x - curCenter.x;
      const dy = tCenter.y - curCenter.y;

      let isValidDirection = false;
      let primaryDistance = 0;
      let secondaryDistance = 0;

      switch (direction) {
        case 'up':
          if (dy < -10) {
            isValidDirection = true;
            primaryDistance = Math.abs(dy);
            secondaryDistance = Math.abs(dx);
          }
          break;
        case 'down':
          if (dy > 10) {
            isValidDirection = true;
            primaryDistance = Math.abs(dy);
            secondaryDistance = Math.abs(dx);
          }
          break;
        case 'left':
          if (dx < -10) {
            isValidDirection = true;
            primaryDistance = Math.abs(dx);
            secondaryDistance = Math.abs(dy);
          }
          break;
        case 'right':
          if (dx > 10) {
            isValidDirection = true;
            primaryDistance = Math.abs(dx);
            secondaryDistance = Math.abs(dy);
          }
          break;
      }

      if (isValidDirection) {
        // Weighted Euclidean distance prioritizing direct axis alignment
        const distance = primaryDistance + (secondaryDistance * 1.8);
        if (distance < minDistance) {
          minDistance = distance;
          bestCandidate = target;
        }
      }
    });

    if (bestCandidate) {
      setFocus(bestCandidate);
    }
  }

  // --- PROFILE SELECTION & PREFERENCE HANDLING ---
  function selectProfileForConfig(profileId) {
    STATE.activeProfileTab = profileId;
    const profile = STATE.profiles[profileId];
    if (!profile) return;

    document.getElementById('focusedAvatar').textContent = profile.avatar;
    document.getElementById('focusedName').textContent = profile.name;

    // Update active mood buttons
    document.querySelectorAll('#moodOptions .mood-btn').forEach(btn => {
      const moodVal = btn.getAttribute('data-value');
      if (moodVal === profile.mood) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update active runtime buttons
    document.querySelectorAll('#timeOptions .time-btn').forEach(btn => {
      const timeVal = parseInt(btn.getAttribute('data-value'), 10);
      if (timeVal === profile.maxRuntime) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function toggleProfileActive(profileId) {
    const profile = STATE.profiles[profileId];
    if (!profile) return;

    profile.active = !profile.active;
    AudioEngine.toggle();

    const pill = document.getElementById(`pill-${profileId}`);
    if (pill) {
      if (profile.active) {
        pill.className = 'toggle-pill active';
        pill.querySelector('.pill-label').textContent = 'Watching';
      } else {
        pill.className = 'toggle-pill inactive';
        pill.querySelector('.pill-label').textContent = 'Skipping';
      }
    }
  }

  function setProfileMood(mood) {
    const profile = STATE.profiles[STATE.activeProfileTab];
    if (!profile) return;

    profile.mood = mood;
    AudioEngine.toggle();

    // Update label on profile card
    const label = document.getElementById(`${profile.id}-mood-label`);
    if (label) label.textContent = mood;

    selectProfileForConfig(profile.id);
  }

  function setProfileTime(minutes) {
    const profile = STATE.profiles[STATE.activeProfileTab];
    if (!profile) return;

    profile.maxRuntime = minutes;
    AudioEngine.toggle();

    // Update label on profile card
    const label = document.getElementById(`${profile.id}-time-label`);
    if (label) label.textContent = `${minutes}m`;

    selectProfileForConfig(profile.id);
  }

  // --- SCREEN SWITCHER ---
  function showScreen(screenId) {
    document.querySelectorAll('.view-screen').forEach(el => {
      el.classList.remove('active-screen');
      el.classList.add('hidden-screen');
    });

    const target = document.getElementById(screenId);
    if (target) {
      target.classList.remove('hidden-screen');
      target.classList.add('active-screen');
    }
    STATE.currentScreen = screenId.replace('screen', '').toLowerCase();

    // Update focusables for new screen
    setTimeout(() => {
      updateFocusables();
    }, 50);
  }

  // --- DECISION EXECUTION WORKFLOW ---
  async function triggerDecision() {
    AudioEngine.decide();

    // Show AI Thinking overlay
    showScreen('screenThinking');

    const activeMembers = Object.values(STATE.profiles).filter(p => p.active);
    const minTime = Math.min(...activeMembers.map(p => p.maxRuntime));
    const thinkingLimitEl = document.getElementById('thinkingLimit');
    if (thinkingLimitEl) thinkingLimitEl.textContent = `${minTime}m MAX`;

    // Dynamic thinking status texts
    const statuses = [
      "Analyzing household mood preferences...",
      "Simulating consensus across family members...",
      "Applying strict Chhotu kid-safety boundaries...",
      "Optimizing for bedtime and duration tolerance...",
      "Crafting Hinglish referee arbitration verdict..."
    ];

    let step = 0;
    const statusInterval = setInterval(() => {
      step++;
      if (step < statuses.length) {
        const statusEl = document.getElementById('thinkingStatus');
        if (statusEl) statusEl.textContent = statuses[step];
      }
    }, 300);

    // Compute decisions
    const rankedResults = arbitrateDecision();
    STATE.lastResultsQueue = rankedResults;
    STATE.currentWinnerIndex = 0;

    // Simulate 1.2s of thoughtful AI arbitration
    setTimeout(async () => {
      clearInterval(statusInterval);
      if (rankedResults.length === 0) {
        alert("Koi movie match nahi hui! Settings adjust karein.");
        showScreen('screenSelection');
        return;
      }
      await renderWinner(rankedResults[0], activeMembers);
      showScreen('screenResult');
    }, 1200);
  }

  async function renderWinner(resultItem, activeMembers) {
    const movie = resultItem.movie;
    STATE.currentWinner = movie;

    // Poster and Titles
    const poster = document.getElementById('winnerPoster');
    if (poster) {
      poster.style.background = movie.posterGradient || 'linear-gradient(135deg, #1e3c72, #2a5298)';
      poster.style.borderColor = movie.accentColor || '#4facfe';
    }

    document.getElementById('winnerTitle').textContent = movie.title;
    document.getElementById('winnerGenre').textContent = movie.genre;
    document.getElementById('winnerRuntime').textContent = `${movie.runtime} min`;
    document.getElementById('winnerMoods').textContent = movie.moodTags.join(', ');
    document.getElementById('winnerAgeBadge').textContent = movie.ageRating;
    document.getElementById('winnerSynopsis').textContent = movie.synopsis;

    // Match Score
    const scorePct = Math.min(99, Math.max(78, Math.round(85 + (resultItem.score / 6))));
    document.getElementById('winnerScoreTag').textContent = `Match Score: ${scorePct}%`;

    // Hinglish Explanation
    const explanationData = await explainPick(movie, activeMembers);
    document.getElementById('winnerExplanation').textContent = `"${explanationData.text}"`;
    document.getElementById('explanationSource').textContent = `REFEREE VERDICT (${explanationData.source}):`;

    // Metrics tags
    const metricsContainer = document.getElementById('compromiseMetrics');
    metricsContainer.innerHTML = '';
    resultItem.reasons.forEach(r => {
      const tag = document.createElement('div');
      tag.className = 'metric-tag';
      tag.textContent = `✓ ${r}`;
      metricsContainer.appendChild(tag);
    });

    // Record in Household Memory
    MemoryStore.recordPick(movie, activeMembers);
    updateHouseholdMemoryBanner();
  }

  function decideAgain() {
    AudioEngine.toggle();
    if (!STATE.lastResultsQueue || STATE.lastResultsQueue.length <= 1) {
      triggerDecision();
      return;
    }

    // Cycle to next best compromise option
    STATE.currentWinnerIndex = (STATE.currentWinnerIndex + 1) % STATE.lastResultsQueue.length;
    const activeMembers = Object.values(STATE.profiles).filter(p => p.active);
    const nextPick = STATE.lastResultsQueue[STATE.currentWinnerIndex];

    renderWinner(nextPick, activeMembers);
  }

  // --- SIMULATED PLAYER WORKFLOW ---
  function startPlayer() {
    AudioEngine.decide();
    if (!STATE.currentWinner) return;

    document.getElementById('playerTitle').textContent = STATE.currentWinner.title;
    document.getElementById('playerMeta').textContent = `${STATE.currentWinner.genre} • ${STATE.currentWinner.runtime}m • Compromise Approved`;
    document.getElementById('playerTotalTime').textContent = `${STATE.currentWinner.runtime}:00`;

    STATE.playerProgressSec = 0;
    STATE.isPlaying = true;
    updatePlayerUI();

    showScreen('screenPlayer');

    if (STATE.playerTimer) clearInterval(STATE.playerTimer);
    STATE.playerTimer = setInterval(() => {
      if (STATE.isPlaying) {
        STATE.playerProgressSec += 2;
        updatePlayerUI();
      }
    }, 1000);
  }

  function updatePlayerUI() {
    const totalSec = (STATE.currentWinner ? STATE.currentWinner.runtime : 90) * 60;
    const pct = Math.min(100, (STATE.playerProgressSec / totalSec) * 100);
    document.getElementById('progressFill').style.width = `${pct}%`;

    const mins = Math.floor(STATE.playerProgressSec / 60).toString().padStart(2, '0');
    const secs = (STATE.playerProgressSec % 60).toString().padStart(2, '0');
    document.getElementById('playerCurrentTime').textContent = `${mins}:${secs}`;

    const playBtn = document.getElementById('btnPlayerToggle');
    const icon = document.getElementById('playPauseIcon');
    if (STATE.isPlaying) {
      if (playBtn) playBtn.textContent = 'Pause (Space/OK)';
      if (icon) icon.textContent = '▶️';
    } else {
      if (playBtn) playBtn.textContent = 'Play (Space/OK)';
      if (icon) icon.textContent = '⏸️';
    }
  }

  function togglePlayerPlayback() {
    AudioEngine.toggle();
    STATE.isPlaying = !STATE.isPlaying;
    updatePlayerUI();
  }

  function exitPlayer() {
    AudioEngine.toggle();
    if (STATE.playerTimer) clearInterval(STATE.playerTimer);
    STATE.isPlaying = false;
    showScreen('screenResult');
  }

  // --- HOUSEHOLD MEMORY BANNER UPDATE ---
  function updateHouseholdMemoryBanner() {
    const bannerText = document.getElementById('memoryText');
    if (bannerText) {
      bannerText.textContent = MemoryStore.getHouseholdInsight();
    }
  }

  function updateClock() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeEl = document.getElementById('timeBadge');
    if (timeEl) timeEl.textContent = `${hours}:${minutes}`;

    const isWeekend = (now.getDay() === 0 || now.getDay() === 6);
    const contextEl = document.getElementById('contextBadge');
    if (contextEl) {
      contextEl.textContent = isWeekend ? 'Weekend Movie Night 🍿' : 'Weekday Prime Time 🛋️';
    }
  }

  // --- KEYBOARD & FIRE TV REMOTE D-PAD LISTENER ---
  function handleKeyDown(e) {
    const key = e.key;
    const keyCode = e.keyCode;

    // Android / Fire TV Remote Key Codes:
    // D-Pad Up: 19 or 'ArrowUp'
    // D-Pad Down: 20 or 'ArrowDown'
    // D-Pad Left: 21 or 'ArrowLeft'
    // D-Pad Right: 22 or 'ArrowRight'
    // D-Pad Center / OK / Enter: 23, 66 or 'Enter'
    // Back / Return: 4, 27 or 'Escape' / 'Back'
    // Play/Pause: 85, 126, 127

    switch (keyCode) {
      case 19: // DPAD_UP
      case 38: // ArrowUp
        e.preventDefault();
        moveFocusSpatial('up');
        break;

      case 20: // DPAD_DOWN
      case 40: // ArrowDown
        e.preventDefault();
        moveFocusSpatial('down');
        break;

      case 21: // DPAD_LEFT
      case 37: // ArrowLeft
        e.preventDefault();
        moveFocusSpatial('left');
        break;

      case 22: // DPAD_RIGHT
      case 39: // ArrowRight
        e.preventDefault();
        moveFocusSpatial('right');
        break;

      case 23: // DPAD_CENTER
      case 66: // ENTER
      case 13: // Enter
        e.preventDefault();
        handleEnterPress();
        break;

      case 4:  // Android BACK
      case 27: // Escape
        e.preventDefault();
        handleBackPress();
        break;

      case 85: // MEDIA_PLAY_PAUSE
      case 32: // Space
        if (STATE.currentScreen === 'selection') {
          e.preventDefault();
          triggerDecision();
        } else if (STATE.currentScreen === 'player') {
          e.preventDefault();
          togglePlayerPlayback();
        }
        break;
    }
  }

  function handleEnterPress() {
    const focused = document.querySelector('.view-screen.active-screen .focused') || document.activeElement;
    if (!focused) return;

    // Check if focused element is a Profile Card
    if (focused.classList.contains('profile-card')) {
      const profileId = focused.getAttribute('data-id');
      toggleProfileActive(profileId);
      return;
    }

    // Action buttons
    const action = focused.getAttribute('data-action');
    if (!action) return;

    switch (action) {
      case 'set-mood':
        setProfileMood(focused.getAttribute('data-value'));
        break;

      case 'set-time':
        setProfileTime(parseInt(focused.getAttribute('data-value'), 10));
        break;

      case 'decide':
        triggerDecision();
        break;

      case 'decide-again':
        decideAgain();
        break;

      case 'play-movie':
        startPlayer();
        break;

      case 'back-to-config':
        AudioEngine.toggle();
        showScreen('screenSelection');
        break;

      case 'toggle-play':
        togglePlayerPlayback();
        break;

      case 'exit-player':
        exitPlayer();
        break;

      case 'reset-memory':
        AudioEngine.toggle();
        MemoryStore.reset();
        updateHouseholdMemoryBanner();
        alert('Household memory reset done!');
        break;

      case 'voice-modal':
        AudioEngine.toggle();
        showScreen('screenVoice');
        break;

      case 'apply-voice':
        AudioEngine.toggle();
        // Simulate applying voice intent: Papa & Mummy want Comedy 90m
        STATE.profiles.papa.mood = 'Comedy';
        STATE.profiles.papa.maxRuntime = 90;
        STATE.profiles.mummy.mood = 'Comedy';
        STATE.profiles.mummy.maxRuntime = 90;
        selectProfileForConfig(STATE.activeProfileTab);
        showScreen('screenSelection');
        break;

      case 'cancel-voice':
        AudioEngine.toggle();
        showScreen('screenSelection');
        break;
    }
  }

  function handleBackPress() {
    AudioEngine.toggle();
    if (STATE.currentScreen === 'player') {
      exitPlayer();
    } else if (STATE.currentScreen === 'result') {
      showScreen('screenSelection');
    } else if (STATE.currentScreen === 'voice') {
      showScreen('screenSelection');
    } else if (STATE.currentScreen === 'selection') {
      // In Android native wrapper, let Android finish the activity or notify
      if (window.AndroidApp && window.AndroidApp.finishApp) {
        window.AndroidApp.finishApp();
      }
    }
  }

  // --- INITIALIZATION ---
  async function init() {
    console.log('Family Watch Referee Initializing...');
    await loadCatalog();

    updateClock();
    setInterval(updateClock, 30000);
    updateHouseholdMemoryBanner();

    // Setup initial focus
    selectProfileForConfig('papa');
    updateFocusables();

    // Register Key Listener
    window.addEventListener('keydown', handleKeyDown);

    // Support Click for testing in standard browser
    document.addEventListener('click', (e) => {
      const target = e.target.closest('button, .profile-card, [tabindex="0"]');
      if (target) {
        setFocus(target);
        handleEnterPress();
      }
    });

    console.log('Family Watch Referee Ready for Fire TV Leanback.');
  }

  window.addEventListener('DOMContentLoaded', init);

})();
