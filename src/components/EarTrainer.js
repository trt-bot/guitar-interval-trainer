/* Ear Training Game Component - Intervals & Chord Quality */
import { Fretboard } from './Fretboard.js';
import { 
  INTERVALS, NOTES, STANDARD_CHORDS, GYPSY_JAZZ_CHORDS,
  getIntervalSemitones, getIntervalBySemitones, getFretDetails, TUNINGS 
} from '../utils/musicTheory.js';
import { synth } from '../utils/guitarSynth.js';

export class EarTrainer {
  constructor(container) {
    this.container = container;
    
    // Global Stats
    this.score = 0;
    this.totalQuestions = 0;
    this.streak = 0;
    
    // Mode toggle: 'intervals' or 'chords'
    this.earTrainerMode = 'intervals'; 
    
    // Interval mode state
    this.activeIntervals = [...INTERVALS.slice(1)];
    this.playbackMode = 'ascending'; // 'ascending', 'descending', 'harmonic'
    this.difficulty = 'all';
    this.currentIntervalQuestion = null;

    // Chord mode state
    this.chordPoolType = 'standard'; // 'standard' or 'gypsy-jazz'
    this.chordPlaybackStyle = 'strummed'; // 'strummed' or 'block'
    this.currentChordQuestion = null;

    this.fretboard = null;
  }

  mount() {
    this.score = 0;
    this.totalQuestions = 0;
    this.streak = 0;
    this.renderLayout();
    this.generateQuestion();
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="game-container">
        <!-- Main Mode Toggle -->
        <div class="glass-card" style="padding: 0.5rem; margin-bottom: 1rem; display: flex; gap: 0.5rem; justify-content: center; border-radius: 9999px;">
          <button class="nav-btn ${this.earTrainerMode === 'intervals' ? 'active' : ''}" id="mode-intervals-btn" style="flex: 1; padding: 0.5rem; font-size: 0.9rem; justify-content: center; font-weight: 700;">
            <i class="fa-solid fa-music"></i> Single-Note Intervals
          </button>
          <button class="nav-btn ${this.earTrainerMode === 'chords' ? 'active' : ''}" id="mode-chords-btn" style="flex: 1; padding: 0.5rem; font-size: 0.9rem; justify-content: center; font-weight: 700;">
            <i class="fa-solid fa-layer-group"></i> Guitar Chord Qualities
          </button>
        </div>

        <!-- Stats Banner -->
        <div class="game-score-banner">
          <div class="game-stat">
            <span class="game-stat-label">Score</span>
            <span class="game-stat-value" id="score-display">0 / 0</span>
          </div>
          <div class="game-stat">
            <span class="game-stat-label">Streak</span>
            <span class="game-stat-value streak" id="streak-display">🔥 0</span>
          </div>
          
          <!-- Contextual Playback Settings -->
          <div class="game-stat" id="playback-settings-container">
            <!-- Injected based on mode -->
          </div>
        </div>

        <!-- Filter / Settings Panel -->
        <div class="glass-card" style="padding: 1rem 1.5rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;" id="pool-selector-container">
            <!-- Injected based on mode -->
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);" id="audio-engine-description">
            Audio: Premium acoustic samples
          </div>
        </div>

        <!-- Main Game Card -->
        <div class="glass-card game-card">
          <div class="game-instructions" id="game-prompt-text">
            Listen to the interval and identify the relationship.
          </div>

          <button class="play-interval-btn" id="play-sound-btn">
            <i class="fa-solid fa-volume-high"></i> Play Sound
          </button>

          <div class="game-options-grid" id="choices-grid">
            <!-- Choice buttons injected here -->
          </div>

          <div class="game-feedback-text" id="feedback-display"></div>

          <button class="next-question-btn" id="next-btn" style="display: none;">
            Next Question <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>

        <!-- Visual Fretboard (shown on answer to visualize shapes) -->
        <div class="glass-card" id="fretboard-card" style="display: none; animation: fadeIn 0.4s ease-out;">
          <h4 style="margin: 0 0 0.5rem; font-family: var(--font-display); text-align: center;" id="fretboard-title-text">Fretboard Visualization</h4>
          <div id="ear-trainer-fretboard"></div>
          <div style="text-align: center; font-size: 0.8rem; color: var(--text-muted); margin-top: 0.75rem;" id="fretboard-desc-text">
            Here is one standard fretboard shape for this interval.
          </div>
        </div>
      </div>
    `;

    // Bind Mode Toggles
    this.container.querySelector('#mode-intervals-btn').addEventListener('click', () => this.switchTrainerMode('intervals'));
    this.container.querySelector('#mode-chords-btn').addEventListener('click', () => this.switchTrainerMode('chords'));

    this.container.querySelector('#play-sound-btn').addEventListener('click', () => this.playSound());
    this.container.querySelector('#next-btn').addEventListener('click', () => this.generateQuestion());

    // Initialize Fretboard instance
    const fretboardContainer = this.container.querySelector('#ear-trainer-fretboard');
    this.fretboard = new Fretboard(fretboardContainer, {
      tuningName: 'standard',
      displayMode: 'hidden'
    });

    this.renderContextualControls();
  }

  switchTrainerMode(mode) {
    if (this.earTrainerMode === mode) return;
    this.earTrainerMode = mode;

    // Toggle button styling
    const intBtn = this.container.querySelector('#mode-intervals-btn');
    const chdBtn = this.container.querySelector('#mode-chords-btn');
    if (mode === 'intervals') {
      intBtn.classList.add('active');
      chdBtn.classList.remove('active');
    } else {
      chdBtn.classList.add('active');
      intBtn.classList.remove('active');
    }

    // Reset scores when switching modes to keep quizzes fair
    this.score = 0;
    this.totalQuestions = 0;
    this.streak = 0;

    this.renderContextualControls();
    this.generateQuestion();
  }

  renderContextualControls() {
    const playbackContainer = this.container.querySelector('#playback-settings-container');
    const poolContainer = this.container.querySelector('#pool-selector-container');
    const promptText = this.container.querySelector('#game-prompt-text');

    if (this.earTrainerMode === 'intervals') {
      promptText.textContent = 'Listen to the interval and identify the relationship.';
      
      playbackContainer.innerHTML = `
        <span class="game-stat-label">Playback</span>
        <div class="ear-trainer-settings">
          <label><input type="radio" name="playback" value="ascending" ${this.playbackMode === 'ascending' ? 'checked' : ''}> Melodic ↗</label>
          <label><input type="radio" name="playback" value="descending" ${this.playbackMode === 'descending' ? 'checked' : ''}> Melodic ↘</label>
          <label><input type="radio" name="playback" value="harmonic" ${this.playbackMode === 'harmonic' ? 'checked' : ''}> Harmonic ⏸</label>
        </div>
      `;

      // Bind events for radio buttons
      playbackContainer.querySelectorAll('input[name="playback"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          this.playbackMode = e.target.value;
        });
      });

      poolContainer.innerHTML = `
        <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">Pool:</label>
        <select class="custom-select" id="difficulty-select" style="padding: 0.35rem 0.5rem; font-size: 0.85rem; width: auto;">
          <option value="all" ${this.difficulty === 'all' ? 'selected' : ''}>All Intervals (m2 to Octave)</option>
          <option value="thirds-fifths" ${this.difficulty === 'thirds-fifths' ? 'selected' : ''}>Beginner (3rds & 5ths)</option>
          <option value="basic-shapes" ${this.difficulty === 'basic-shapes' ? 'selected' : ''}>Intermediate (3rds, 4ths, 5ths, Octaves)</option>
        </select>
      `;

      // Bind pool selection change
      poolContainer.querySelector('#difficulty-select').addEventListener('change', (e) => {
        this.difficulty = e.target.value;
        this.updateIntervalPool();
        this.generateQuestion();
      });

      this.updateIntervalPool();
    } else {
      // Chords mode
      promptText.textContent = 'Listen to the chord voicing and identify the chord quality.';

      playbackContainer.innerHTML = `
        <span class="game-stat-label">Strum Style</span>
        <div class="ear-trainer-settings">
          <label><input type="radio" name="playback-chord" value="strummed" ${this.chordPlaybackStyle === 'strummed' ? 'checked' : ''}> Strummed ↗</label>
          <label><input type="radio" name="playback-chord" value="block" ${this.chordPlaybackStyle === 'block' ? 'checked' : ''}> Simultaneous ⏸</label>
        </div>
      `;

      playbackContainer.querySelectorAll('input[name="playback-chord"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          this.chordPlaybackStyle = e.target.value;
        });
      });

      poolContainer.innerHTML = `
        <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">Voicings Pool:</label>
        <select class="custom-select" id="chord-pool-select" style="padding: 0.35rem 0.5rem; font-size: 0.85rem; width: auto;">
          <option value="standard" ${this.chordPoolType === 'standard' ? 'selected' : ''}>Standard Guitar Chords</option>
          <option value="gypsy-jazz" ${this.chordPoolType === 'gypsy-jazz' ? 'selected' : ''}>Gypsy Jazz Chords (Specialized)</option>
        </select>
      `;

      poolContainer.querySelector('#chord-pool-select').addEventListener('change', (e) => {
        this.chordPoolType = e.target.value;
        this.generateQuestion();
      });
    }
  }

  updateIntervalPool() {
    if (this.difficulty === 'thirds-fifths') {
      this.activeIntervals = INTERVALS.filter(i => ['m3', 'M3', 'P5'].includes(i.short));
    } else if (this.difficulty === 'basic-shapes') {
      this.activeIntervals = INTERVALS.filter(i => ['m3', 'M3', 'P4', 'P5', 'oct'].includes(i.short));
    } else {
      this.activeIntervals = [...INTERVALS.slice(1)];
    }
  }

  playSound() {
    if (this.earTrainerMode === 'intervals') {
      if (!this.currentIntervalQuestion) return;
      const { rootMidi, targetMidi } = this.currentIntervalQuestion;
      synth.playInterval(rootMidi, targetMidi, this.playbackMode);
    } else {
      if (!this.currentChordQuestion) return;
      const { midiNotes } = this.currentChordQuestion;
      const isArpeggiated = this.chordPlaybackStyle === 'strummed';
      synth.playMidiChord(midiNotes, isArpeggiated);
    }
  }

  generateQuestion() {
    this.updateStats();
    
    const feedback = this.container.querySelector('#feedback-display');
    feedback.innerHTML = '';
    
    const nextBtn = this.container.querySelector('#next-btn');
    nextBtn.style.display = 'none';

    const fretboardCard = this.container.querySelector('#fretboard-card');
    fretboardCard.style.display = 'none';

    const grid = this.container.querySelector('#choices-grid');
    grid.innerHTML = '';

    if (this.earTrainerMode === 'intervals') {
      // 1. INTERVAL QUESTION
      const intervalIndex = Math.floor(Math.random() * this.activeIntervals.length);
      const selectedInterval = this.activeIntervals[intervalIndex];

      const rootMidi = 40 + Math.floor(Math.random() * 13);
      const targetMidi = rootMidi + selectedInterval.semitones;

      const choices = [selectedInterval];
      const pool = INTERVALS.filter(i => i.short !== 'r' && i.short !== selectedInterval.short);
      while (choices.length < 4 && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        choices.push(pool.splice(idx, 1)[0]);
      }
      const shuffledChoices = choices.sort(() => Math.random() - 0.5);

      this.currentIntervalQuestion = {
        rootMidi,
        targetMidi,
        interval: selectedInterval,
        choices: shuffledChoices,
        answered: false,
        userChoice: null
      };

      shuffledChoices.forEach(choice => {
        const btn = document.createElement('div');
        btn.className = 'game-option-card';
        btn.textContent = choice.name;
        btn.addEventListener('click', () => this.handleIntervalAnswer(choice, btn));
        grid.appendChild(btn);
      });

    } else {
      // 2. CHORD QUALITY QUESTION
      const activePool = this.chordPoolType === 'standard' ? STANDARD_CHORDS : GYPSY_JAZZ_CHORDS;
      
      const chordIndex = Math.floor(Math.random() * activePool.length);
      const selectedChord = activePool[chordIndex];

      // Pick root note (MIDI 40 to 52: E2 to E3)
      const rootMidi = 40 + Math.floor(Math.random() * 13);
      const midiNotes = selectedChord.intervals.map(val => rootMidi + val);

      const choices = [selectedChord];
      const pool = activePool.filter(c => c.name !== selectedChord.name);
      while (choices.length < 4 && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        choices.push(pool.splice(idx, 1)[0]);
      }
      const shuffledChoices = choices.sort(() => Math.random() - 0.5);

      this.currentChordQuestion = {
        rootMidi,
        midiNotes,
        chord: selectedChord,
        choices: shuffledChoices,
        answered: false,
        userChoice: null
      };

      shuffledChoices.forEach(choice => {
        const btn = document.createElement('div');
        btn.className = 'game-option-card';
        btn.textContent = choice.name;
        btn.addEventListener('click', () => this.handleChordAnswer(choice, btn));
        grid.appendChild(btn);
      });
    }

    setTimeout(() => this.playSound(), 300);
  }

  handleIntervalAnswer(selectedOption, optionEl) {
    if (this.currentIntervalQuestion.answered) return;

    this.currentIntervalQuestion.answered = true;
    this.currentIntervalQuestion.userChoice = selectedOption;
    this.totalQuestions++;

    const isCorrect = selectedOption.short === this.currentIntervalQuestion.interval.short;
    const feedback = this.container.querySelector('#feedback-display');

    const cards = this.container.querySelectorAll('.game-option-card');
    cards.forEach(card => {
      const optName = card.textContent;
      const opt = this.currentIntervalQuestion.choices.find(c => c.name === optName);
      if (opt.short === this.currentIntervalQuestion.interval.short) {
        card.classList.add('correct');
      } else if (opt.short === selectedOption.short) {
        card.classList.add('incorrect');
      }
    });

    if (isCorrect) {
      this.score++;
      this.streak++;
      feedback.innerHTML = `
        <span style="color: var(--success);"><i class="fa-solid fa-circle-check"></i> Correct!</span>
        <span style="font-weight: normal; margin-left: 0.5rem;">
          It is a <strong>${this.currentIntervalQuestion.interval.name}</strong> (${this.currentIntervalQuestion.interval.semitones} semitones).
        </span>
      `;
      synth.playMidiNote(64, 0.3, 0);
      synth.playMidiNote(67, 0.4, 0.08);
    } else {
      this.streak = 0;
      feedback.innerHTML = `
        <span style="color: var(--error);"><i class="fa-solid fa-circle-xmark"></i> Incorrect.</span>
        <span style="font-weight: normal; margin-left: 0.5rem;">
          The correct answer was <strong>${this.currentIntervalQuestion.interval.name}</strong>.
        </span>
      `;
      synth.playMidiNote(45, 0.3, 0);
      synth.playMidiNote(46, 0.4, 0.05);
    }

    this.updateStats();
    this.container.querySelector('#next-btn').style.display = 'inline-flex';
    this.showIntervalVisualShape();
  }

  handleChordAnswer(selectedOption, optionEl) {
    if (this.currentChordQuestion.answered) return;

    this.currentChordQuestion.answered = true;
    this.currentChordQuestion.userChoice = selectedOption;
    this.totalQuestions++;

    const isCorrect = selectedOption.name === this.currentChordQuestion.chord.name;
    const feedback = this.container.querySelector('#feedback-display');

    const cards = this.container.querySelectorAll('.game-option-card');
    cards.forEach(card => {
      const optName = card.textContent;
      const opt = this.currentChordQuestion.choices.find(c => c.name === optName);
      if (opt.name === this.currentChordQuestion.chord.name) {
        card.classList.add('correct');
      } else if (opt.name === selectedOption.name) {
        card.classList.add('incorrect');
      }
    });

    const rootNoteName = NOTES[this.currentChordQuestion.rootMidi % 12];
    const chordName = `${rootNoteName} ${this.currentChordQuestion.chord.short}`;

    if (isCorrect) {
      this.score++;
      this.streak++;
      feedback.innerHTML = `
        <span style="color: var(--success);"><i class="fa-solid fa-circle-check"></i> Correct!</span>
        <span style="font-weight: normal; margin-left: 0.5rem;">
          This voicing forms a <strong>${chordName}</strong> (${this.currentChordQuestion.chord.name}).
        </span>
      `;
      synth.playMidiNote(64, 0.3, 0);
      synth.playMidiNote(67, 0.4, 0.08);
    } else {
      this.streak = 0;
      feedback.innerHTML = `
        <span style="color: var(--error);"><i class="fa-solid fa-circle-xmark"></i> Incorrect.</span>
        <span style="font-weight: normal; margin-left: 0.5rem;">
          It was a <strong>${chordName}</strong> (${this.currentChordQuestion.chord.name}).
        </span>
      `;
      synth.playMidiNote(45, 0.3, 0);
      synth.playMidiNote(46, 0.4, 0.05);
    }

    this.updateStats();
    this.container.querySelector('#next-btn').style.display = 'inline-flex';
    this.showChordVisualShape();
  }

  showIntervalVisualShape() {
    const fretboardCard = this.container.querySelector('#fretboard-card');
    const title = this.container.querySelector('#fretboard-title-text');
    const desc = this.container.querySelector('#fretboard-desc-text');
    
    title.textContent = 'Fretboard Interval Mapping';
    desc.textContent = 'Here is one standard fretboard shape for this interval relative to the root note.';
    fretboardCard.style.display = 'block';

    const { rootMidi, targetMidi, interval } = this.currentIntervalQuestion;
    const shape = this.findBestShapeOnFretboard(rootMidi, targetMidi);

    if (shape) {
      this.fretboard.update({
        rootNoteMidi: rootMidi,
        displayMode: 'hidden',
        markedNotes: [
          { stringIndex: shape.rootString, fretIndex: shape.rootFret, colorClass: 'interval-r', label: 'R' },
          { stringIndex: shape.targetString, fretIndex: shape.targetFret, colorClass: `interval-${interval.short}`, label: interval.short }
        ]
      });
    }
  }

  showChordVisualShape() {
    const fretboardCard = this.container.querySelector('#fretboard-card');
    const title = this.container.querySelector('#fretboard-title-text');
    const desc = this.container.querySelector('#fretboard-desc-text');
    
    title.textContent = 'Fretboard Chord Tone Map';
    
    const rootNoteName = NOTES[this.currentChordQuestion.rootMidi % 12];
    const fullChordName = `${rootNoteName} ${this.currentChordQuestion.chord.name}`;
    desc.innerHTML = `This layout maps out <strong>all chord tones</strong> for <strong>${fullChordName}</strong> across the neck. Try finding standard visual shapes (like CAGED shapes) within these highlighted frets!`;
    fretboardCard.style.display = 'block';

    const { rootMidi, chord } = this.currentChordQuestion;

    // Get note markers for all chord tones across the neck
    const markedNotes = this.getChordNoteMarkers(rootMidi, chord.intervals);

    this.fretboard.update({
      rootNoteMidi: rootMidi,
      displayMode: 'hidden',
      markedNotes: markedNotes
    });
  }

  /**
   * Scans the fretboard and highlights all chord notes.
   * Color codes relative interval degrees (R=Gold, 3rd=Green, 5th=Blue, others=Magenta/Teal)
   */
  getChordNoteMarkers(rootMidi, chordIntervals) {
    const tuning = TUNINGS.standard.notes; // Open strings MIDI E4, B3, G3, D3, A2, E2
    const marked = [];

    // Scan all 6 strings and 16 frets
    for (let s = 0; s < 6; s++) {
      const openMidi = tuning[s];
      for (let f = 0; f < 16; f++) {
        const midi = openMidi + f;
        
        // Calculate semitone distance relative to root modulo 12
        let diff = (midi - rootMidi) % 12;
        if (diff < 0) diff += 12;

        // Is this pitch class in the chord?
        // Note: For Gypsy Jazz 6/9 chords, the 9th is 14 semitones, which is 2 modulo 12.
        const matchesInterval = chordIntervals.some(val => (val % 12) === diff);

        if (matchesInterval) {
          // Identify the exact chord interval quality to style
          // R = 0, 3rd = 3/4, 5th = 6/7/8, 6th = 9, 7th = 10/11, 9th = 2/14, b9th = 1/13
          let colorClass = 'interval-oct'; // default magenta
          let label = '';

          if (diff === 0) {
            colorClass = 'interval-r';
            label = 'R';
          } else if (diff === 3 || diff === 4) {
            colorClass = 'interval-M3'; // Green
            label = diff === 3 ? 'b3' : '3';
          } else if (diff === 7 || diff === 6 || diff === 8) {
            colorClass = 'interval-P5'; // Royal Blue
            label = diff === 7 ? '5' : (diff === 6 ? 'b5' : '#5');
          } else if (diff === 9) {
            colorClass = 'interval-M6'; // Lime Green
            label = '6';
          } else if (diff === 10 || diff === 11) {
            colorClass = 'interval-m7'; // Indigo/Teal
            label = diff === 10 ? '7' : 'M7';
          } else if (diff === 2) {
            colorClass = 'interval-M2'; // Orange
            label = '9';
          } else if (diff === 1) {
            colorClass = 'interval-m2'; // Red
            label = 'b9';
          }

          marked.push({
            stringIndex: s,
            fretIndex: f,
            colorClass,
            label
          });
        }
      }
    }

    return marked;
  }

  /**
   * Helper to find a standard visual fretboard shape to display for intervals.
   */
  findBestShapeOnFretboard(rootMidi, targetMidi) {
    const tuning = TUNINGS.standard.notes;
    const rootLocations = [];
    for (let s = 0; s < 6; s++) {
      const openMidi = tuning[s];
      const fret = rootMidi - openMidi;
      if (fret >= 0 && fret <= 12) {
        rootLocations.push({ string: s, fret });
      }
    }

    if (rootLocations.length === 0) return null;

    rootLocations.sort((a, b) => b.string - a.string);
    const selectedRoot = rootLocations[0];

    const targetLocations = [];
    for (let s = 0; s < 6; s++) {
      const openMidi = tuning[s];
      const fret = targetMidi - openMidi;
      if (fret >= 0 && fret <= 15) {
        targetLocations.push({ string: s, fret });
      }
    }

    if (targetLocations.length === 0) return null;

    let bestTarget = targetLocations[0];
    let minScore = Infinity;

    targetLocations.forEach(loc => {
      const stringDistance = Math.abs(loc.string - selectedRoot.string);
      const fretDistance = Math.abs(loc.fret - selectedRoot.fret);
      const score = fretDistance * 1.5 + stringDistance * 2;
      
      if (score < minScore) {
        minScore = score;
        bestTarget = loc;
      }
    });

    return {
      rootString: selectedRoot.string,
      rootFret: selectedRoot.fret,
      targetString: bestTarget.string,
      targetFret: bestTarget.fret
    };
  }

  updateStats() {
    this.container.querySelector('#score-display').textContent = `${this.score} / ${this.totalQuestions}`;
    this.container.querySelector('#streak-display').textContent = `🔥 ${this.streak}`;
  }
}
