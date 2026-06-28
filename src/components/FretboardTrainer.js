/* Fretboard Interval Quiz Game Component */
import { Fretboard } from './Fretboard.js';
import { INTERVALS, NOTES, getIntervalSemitones, getIntervalBySemitones, getFretDetails, TUNINGS } from '../utils/musicTheory.js';
import { synth } from '../utils/guitarSynth.js';

export class FretboardTrainer {
  constructor(container) {
    this.container = container;
    
    // Quiz state
    this.score = 0;
    this.totalQuestions = 0;
    this.streak = 0;
    
    this.quizMode = 'find-interval'; // 'find-interval' (click fret) or 'identify-interval' (click button)
    this.currentQuestion = null; // { rootMidi, rootPos: {s, f}, targetMidi, targetPos: {s, f}, interval, answered, userFret }
    this.fretboard = null;
    this.tuningName = 'standard';
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
        <!-- Stats and Mode selector -->
        <div class="game-score-banner">
          <div class="game-stat">
            <span class="game-stat-label">Score</span>
            <span class="game-stat-value" id="fret-score-display">0 / 0</span>
          </div>
          <div class="game-stat">
            <span class="game-stat-label">Streak</span>
            <span class="game-stat-value streak" id="fret-streak-display">🔥 0</span>
          </div>
          <div class="game-stat">
            <span class="game-stat-label">Trainer Mode</span>
            <select class="custom-select" id="quiz-mode-select" style="padding: 0.35rem 0.5rem; font-size: 0.85rem; width: auto; font-weight: 600;">
              <option value="find-interval">Locate on Fretboard 🎯</option>
              <option value="identify-interval">Name Highlighted Shape 🔍</option>
            </select>
          </div>
        </div>

        <!-- Main Question Banner -->
        <div class="quiz-fretboard-status">
          <div class="game-instructions" id="fret-instructions" style="margin-bottom: 0;">
            <!-- Instructions injected here -->
          </div>
        </div>

        <!-- Fretboard Area -->
        <div class="glass-card" style="padding: 1.5rem 1rem;">
          <div id="quiz-fretboard-container"></div>
          
          <!-- Choices grid for 'identify-interval' mode -->
          <div class="game-options-grid" id="fret-choices-grid" style="display: none; margin-top: 1.5rem;">
            <!-- Choice buttons injected here -->
          </div>

          <div class="game-feedback-text" id="fret-feedback-display"></div>
          
          <div style="text-align: center; margin-top: 1rem;">
            <button class="next-question-btn" id="fret-next-btn" style="display: none;">
              Next Question <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind event listeners
    this.container.querySelector('#quiz-mode-select').addEventListener('change', (e) => {
      this.quizMode = e.target.value;
      this.generateQuestion();
    });

    this.container.querySelector('#fret-next-btn').addEventListener('click', () => this.generateQuestion());

    // Initialize the Fretboard component
    const fContainer = this.container.querySelector('#quiz-fretboard-container');
    this.fretboard = new Fretboard(fContainer, {
      tuningName: this.tuningName,
      displayMode: 'hidden',
      onFretClick: (s, f, details) => this.handleFretboardClick(s, f, details)
    });
  }

  generateQuestion() {
    // Pick a random interval (excluding unison, m2 to Octave)
    const intervalIndex = 1 + Math.floor(Math.random() * (INTERVALS.length - 1));
    const selectedInterval = INTERVALS[intervalIndex];

    // Pick a random root note (MIDI 40 to 52, which is E2 to E3)
    const rootMidi = 40 + Math.floor(Math.random() * 13);
    const targetMidi = rootMidi + selectedInterval.semitones;

    // Pick a primary root fretboard location to display
    const tuning = TUNINGS[this.tuningName].notes;
    const rootPos = this.getRandomPositionForNote(rootMidi);
    
    // Find a nearby target location (within standard shapes)
    const targetPos = this.getNearestPositionForNote(targetMidi, rootPos);

    // Multiple choices for identify-interval mode
    const choices = [selectedInterval];
    const pool = INTERVALS.filter(i => i.short !== 'r' && i.short !== selectedInterval.short);
    while (choices.length < 4 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      choices.push(pool.splice(idx, 1)[0]);
    }
    const shuffledChoices = choices.sort(() => Math.random() - 0.5);

    this.currentQuestion = {
      rootMidi,
      rootPos,
      targetMidi,
      targetPos,
      interval: selectedInterval,
      choices: shuffledChoices,
      answered: false,
      userFret: null
    };

    // Update stats UI
    this.updateStats();
    
    const feedback = this.container.querySelector('#fret-feedback-display');
    feedback.innerHTML = '';
    
    const nextBtn = this.container.querySelector('#fret-next-btn');
    nextBtn.style.display = 'none';

    // Show/hide UI sections depending on mode
    const choicesGrid = this.container.querySelector('#fret-choices-grid');
    const instructions = this.container.querySelector('#fret-instructions');

    if (this.quizMode === 'find-interval') {
      choicesGrid.style.display = 'none';
      instructions.innerHTML = `Find the <strong>${selectedInterval.name}</strong> relative to the root note <span>R</span>.`;
      
      // Mark only the root note on the fretboard
      this.fretboard.update({
        tuningName: this.tuningName,
        displayMode: 'hidden',
        rootNoteMidi: rootMidi,
        markedNotes: [
          { stringIndex: rootPos.string, fretIndex: rootPos.fret, colorClass: 'interval-r', label: 'R' }
        ]
      });
    } else {
      // 'identify-interval' mode
      choicesGrid.style.display = 'grid';
      instructions.innerHTML = 'Identify the interval relationship between the root note <span>R</span> and the <span>blue note</span>.';
      
      // Render multiple choice buttons
      choicesGrid.innerHTML = '';
      shuffledChoices.forEach(choice => {
        const btn = document.createElement('div');
        btn.className = 'game-option-card';
        btn.textContent = choice.name;
        btn.addEventListener('click', () => this.handleChoiceAnswer(choice));
        choicesGrid.appendChild(btn);
      });

      // Mark BOTH root and target note on fretboard (target note is blue)
      this.fretboard.update({
        tuningName: this.tuningName,
        displayMode: 'hidden',
        rootNoteMidi: rootMidi,
        markedNotes: [
          { stringIndex: rootPos.string, fretIndex: rootPos.fret, colorClass: 'interval-r', label: 'R' },
          { stringIndex: targetPos.string, fretIndex: targetPos.fret, colorClass: 'interval-P5', label: '?' } // blue/P5 neutral color
        ]
      });
    }
  }

  /**
   * Handlers for user interactions
   */
  
  // Mode 1: Locate on Fretboard Click handler
  handleFretboardClick(stringIndex, fretIndex, fretDetails) {
    if (this.quizMode !== 'find-interval' || this.currentQuestion.answered) return;

    this.currentQuestion.answered = true;
    this.totalQuestions++;

    const clickedMidi = fretDetails.midiNote;
    const { rootMidi, targetMidi, interval, rootPos, targetPos } = this.currentQuestion;

    // Check if the clicked note name matches target note name (octave equivalence)
    const isCorrect = (clickedMidi % 12) === (targetMidi % 12);
    const feedback = this.container.querySelector('#fret-feedback-display');

    if (isCorrect) {
      this.score++;
      this.streak++;
      feedback.innerHTML = `<span style="color: var(--success);"><i class="fa-solid fa-circle-check"></i> Correct!</span> You found the <strong>${interval.name}</strong> (${fretDetails.noteName}).`;
      
      // Play correct chime
      synth.playMidiNote(64, 0.3, 0);
      synth.playMidiNote(67, 0.4, 0.08);

      // Display the correctly clicked note green
      this.fretboard.update({
        markedNotes: [
          { stringIndex: rootPos.string, fretIndex: rootPos.fret, colorClass: 'interval-r', label: 'R' },
          { stringIndex: stringIndex, fretIndex: fretIndex, colorClass: 'interval-M3', label: interval.short } // M3 is green
        ]
      });
    } else {
      this.streak = 0;
      feedback.innerHTML = `<span style="color: var(--error);"><i class="fa-solid fa-circle-xmark"></i> Incorrect.</span> That note is a <strong>${getIntervalBySemitones(getIntervalSemitones(rootMidi, clickedMidi)).name}</strong>. The <strong>${interval.name}</strong> is highlighted in red.`;

      // Play low buzz
      synth.playMidiNote(45, 0.3, 0);
      synth.playMidiNote(46, 0.4, 0.05);

      // Display root (gold), clicked note (red), and actual correct note (green)
      this.fretboard.update({
        markedNotes: [
          { stringIndex: rootPos.string, fretIndex: rootPos.fret, colorClass: 'interval-r', label: 'R' },
          { stringIndex: stringIndex, fretIndex: fretIndex, colorClass: 'interval-m2', label: 'X' }, // m2 is red
          { stringIndex: targetPos.string, fretIndex: targetPos.fret, colorClass: 'interval-M3', label: interval.short } // M3 is green
        ]
      });
    }

    this.updateStats();
    this.container.querySelector('#fret-next-btn').style.display = 'inline-flex';
  }

  // Mode 2: Name Highlighted Shape choice click handler
  handleChoiceAnswer(selectedOption) {
    if (this.quizMode !== 'identify-interval' || this.currentQuestion.answered) return;

    this.currentQuestion.answered = true;
    this.totalQuestions++;

    const { interval, rootPos, targetPos } = this.currentQuestion;
    const isCorrect = selectedOption.short === interval.short;
    const feedback = this.container.querySelector('#fret-feedback-display');

    // Style option cards
    const cards = this.container.querySelectorAll('.game-option-card');
    cards.forEach(card => {
      const optName = card.textContent;
      const opt = this.currentQuestion.choices.find(c => c.name === optName);
      
      if (opt.short === interval.short) {
        card.classList.add('correct');
      } else if (opt.short === selectedOption.short) {
        card.classList.add('incorrect');
      }
    });

    if (isCorrect) {
      this.score++;
      this.streak++;
      feedback.innerHTML = `<span style="color: var(--success);"><i class="fa-solid fa-circle-check"></i> Correct!</span> The interval is a <strong>${interval.name}</strong>.`;
      
      synth.playMidiNote(64, 0.3, 0);
      synth.playMidiNote(67, 0.4, 0.08);

      // Highlight target note in green (success)
      this.fretboard.update({
        markedNotes: [
          { stringIndex: rootPos.string, fretIndex: rootPos.fret, colorClass: 'interval-r', label: 'R' },
          { stringIndex: targetPos.string, fretIndex: targetPos.fret, colorClass: 'interval-M3', label: interval.short }
        ]
      });
    } else {
      this.streak = 0;
      feedback.innerHTML = `<span style="color: var(--error);"><i class="fa-solid fa-circle-xmark"></i> Incorrect.</span> The interval was a <strong>${interval.name}</strong>.`;

      synth.playMidiNote(45, 0.3, 0);
      synth.playMidiNote(46, 0.4, 0.05);

      // Highlight target note in red (failure)
      this.fretboard.update({
        markedNotes: [
          { stringIndex: rootPos.string, fretIndex: rootPos.fret, colorClass: 'interval-r', label: 'R' },
          { stringIndex: targetPos.string, fretIndex: targetPos.fret, colorClass: 'interval-m2', label: interval.short }
        ]
      });
    }

    this.updateStats();
    this.container.querySelector('#fret-next-btn').style.display = 'inline-flex';
  }

  /**
   * Helper routines for finding specific note positions on guitar
   */
  getRandomPositionForNote(midiNote) {
    const tuning = TUNINGS[this.tuningName].notes;
    const positions = [];

    // Find all valid positions on the fretboard (frets 1 to 9 to keep it in the lower-middle register)
    for (let s = 0; s < 6; s++) {
      const openMidi = tuning[s];
      const fret = midiNote - openMidi;
      if (fret >= 1 && fret <= 9) {
        positions.push({ string: s, fret });
      }
    }

    if (positions.length === 0) {
      // Fallback to open string or any fret up to 12
      for (let s = 0; s < 6; s++) {
        const openMidi = tuning[s];
        const fret = midiNote - openMidi;
        if (fret >= 0 && fret <= 12) {
          positions.push({ string: s, fret });
        }
      }
    }

    return positions[Math.floor(Math.random() * positions.length)];
  }

  getNearestPositionForNote(midiNote, referencePos) {
    const tuning = TUNINGS[this.tuningName].notes;
    const positions = [];

    // Scan all frets 0 to 15
    for (let s = 0; s < 6; s++) {
      const openMidi = tuning[s];
      const fret = midiNote - openMidi;
      if (fret >= 0 && fret <= 15) {
        positions.push({ string: s, fret });
      }
    }

    if (positions.length === 0) return { string: 0, fret: 0 };

    // Select the position closest to our reference position (heuristic score)
    let bestPos = positions[0];
    let minScore = Infinity;

    positions.forEach(pos => {
      const stringDist = Math.abs(pos.string - referencePos.string);
      const fretDist = Math.abs(pos.fret - referencePos.fret);
      
      // Heuristic score: we prefer string crossings (distance 1 or 2) over sliding far away.
      const score = fretDist * 1.5 + stringDist * 2;
      
      if (score < minScore) {
        minScore = score;
        bestPos = pos;
      }
    });

    return bestPos;
  }

  updateTuning(tuningName) {
    this.tuningName = tuningName;
    if (this.currentQuestion && !this.currentQuestion.answered) {
      this.generateQuestion();
    }
  }

  updateStats() {
    this.container.querySelector('#fret-score-display').textContent = `${this.score} / ${this.totalQuestions}`;
    this.container.querySelector('#fret-streak-display').textContent = `🔥 ${this.streak}`;
  }
}
