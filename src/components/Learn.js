/* Learn and Music Theory Component */
import { Fretboard } from './Fretboard.js';
import { NOTES, INTERVALS, getFretDetails } from '../utils/musicTheory.js';
import { synth } from '../utils/guitarSynth.js';

export class Learn {
  constructor(container) {
    this.container = container;
    this.currentTopicIndex = 0;
    
    // Embed a mini-fretboard for interactive shapes
    this.miniFretboard = null;
    this.selectedShape = 'octave'; // 'octave', 'p5', 'm3', 'M3', 'p4'
    this.shapeRootMidi = 45; // A2 (5th string open or 6th string 5th fret)
    
    // Quiz state
    this.quizAnswers = {}; // Map of question index -> selectedOption index
    
    this.topics = [
      {
        title: '1. What is an Interval?',
        render: () => this.renderWhatIsInterval()
      },
      {
        title: '2. Horizontal Intervals',
        render: () => this.renderHorizontalIntervals()
      },
      {
        title: '3. Cross-String Shapes',
        render: () => this.renderCrossString()
      },
      {
        title: '4. The G-to-B Offset',
        render: () => this.renderGBOffset()
      },
      {
        title: '5. Quick Theory Quiz',
        render: () => this.renderQuiz()
      }
    ];

    this.quizQuestions = [
      {
        question: 'How many semitones (or frets) make up a Perfect 5th interval?',
        options: [
          '5 semitones (5 frets)',
          '7 semitones (7 frets)',
          '6 semitones (6 frets)',
          '12 semitones (12 frets)'
        ],
        correctIndex: 1,
        explanation: 'A Perfect 5th consists of 7 semitones (e.g. C to G). On a single guitar string, this is exactly 7 frets away!'
      },
      {
        question: 'Which shape represents a Perfect 4th on the lower strings (e.g. from E to A string)?',
        options: [
          'Same fret, next higher string',
          'Up 2 frets, next higher string',
          'Down 1 fret, next higher string',
          'Up 2 frets, skip one string'
        ],
        correctIndex: 0,
        explanation: 'Since adjacent lower strings are tuned 5 semitones (a Perfect 4th) apart, playing the same fret on the next higher string yields a Perfect 4th!'
      },
      {
        question: 'What is the "G-to-B string shift"?',
        options: [
          'The B string is tuned higher than normal, so all shapes must be shifted down.',
          'The interval between G and B strings is a Major 3rd (4 semitones) instead of a Perfect 4th (5 semitones), requiring vertical shapes crossing them to shift up by 1 fret.',
          'The G and B strings are identical, so shapes don\'t change.',
          'It refers to changing tunings to Drop D.'
        ],
        correctIndex: 1,
        explanation: 'Because the G-to-B interval is a Major 3rd (4 semitones) rather than a Perfect 4th (5 semitones), any cross-string shape crossing from G to B must be shifted up by 1 fret to compensate for the missing semitone.'
      }
    ];
  }

  mount() {
    this.renderLayout();
    this.loadTopic(0);
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="learn-grid">
        <div class="learn-sidebar" id="learn-sidebar"></div>
        <div class="learn-body glass-card" id="learn-body"></div>
      </div>
    `;

    // Render sidebar topic buttons
    const sidebar = this.container.querySelector('#learn-sidebar');
    this.topics.forEach((topic, idx) => {
      const btn = document.createElement('button');
      btn.className = `learn-topic-btn ${idx === this.currentTopicIndex ? 'active' : ''}`;
      btn.textContent = topic.title;
      btn.addEventListener('click', () => this.loadTopic(idx));
      sidebar.appendChild(btn);
    });
  }

  loadTopic(index) {
    this.currentTopicIndex = index;
    
    // Update sidebar active states
    const buttons = this.container.querySelectorAll('.learn-topic-btn');
    buttons.forEach((btn, idx) => {
      if (idx === index) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Render topic body
    const body = this.container.querySelector('#learn-body');
    body.innerHTML = '';
    
    // Call the specific topic renderer
    this.topics[index].render();

    // Scroll learn-body into view if on mobile
    if (window.innerWidth < 768) {
      body.scrollIntoView({ behavior: 'smooth' });
    }
  }

  renderWhatIsInterval() {
    const body = this.container.querySelector('#learn-body');
    body.innerHTML = `
      <h3>What is a Musical Interval?</h3>
      <p>
        In music theory, an <strong>interval</strong> is the distance in pitch between two notes. 
        It is the fundamental building block of melody, chords, and scales.
      </p>
      <p>
        On the guitar, the smallest interval is a <strong>semitone</strong> (or half-step), which corresponds 
        exactly to <strong>one fret</strong>. A <strong>whole tone</strong> (whole-step) corresponds to 
        <strong>two frets</strong>.
      </p>
      
      <div class="theory-highlight" style="background: rgba(255,255,255,0.02); border-left: 4px solid var(--color-root); padding: 1rem; margin: 1.5rem 0; border-radius: 0 8px 8px 0;">
        <h4 style="margin: 0 0 0.5rem; color: var(--color-root);">Core Interval Chart (Within 1 Octave):</h4>
        <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.9rem; columns: 2;">
          <li>Minor 2nd (m2): 1 semitone</li>
          <li>Major 2nd (M2): 2 semitones</li>
          <li>Minor 3rd (m3): 3 semitones</li>
          <li>Major 3rd (M3): 4 semitones</li>
          <li>Perfect 4th (P4): 5 semitones</li>
          <li>Tritone (d5/b5): 6 semitones</li>
          <li>Perfect 5th (P5): 7 semitones</li>
          <li>Minor 6th (m6): 8 semitones</li>
          <li>Major 6th (M6): 9 semitones</li>
          <li>Minor 7th (m7): 10 semitones</li>
          <li>Major 7th (M7): 11 semitones</li>
          <li>Octave (Oct): 12 semitones</li>
        </ul>
      </div>

      <p>
        Learning intervals by ear allows you to translate the music you hear in your head directly to the fretboard. 
        Learning them visually allows you to recognize chord shapes, scale shapes, and arpeggios instantaneously.
      </p>
      <button class="next-question-btn" id="learn-next-btn">Next Topic <i class="fa-solid fa-arrow-right"></i></button>
    `;

    body.querySelector('#learn-next-btn').addEventListener('click', () => this.loadTopic(1));
  }

  renderHorizontalIntervals() {
    const body = this.container.querySelector('#learn-body');
    body.innerHTML = `
      <h3>Horizontal Intervals (Single String)</h3>
      <p>
        Because one fret equals one semitone, visual intervals on a single string are direct translations 
        of semitone counts. For example:
      </p>
      <ul>
        <li>If you play a note, and then play <strong>3 frets up</strong>, that is a <strong>Minor 3rd</strong>.</li>
        <li>If you play a note, and then play <strong>7 frets up</strong>, that is a <strong>Perfect 5th</strong>.</li>
        <li><strong>12 frets up</strong> is an <strong>Octave</strong>, where the note repeats at double the frequency.</li>
      </ul>
      <p>
        Practice playing a root note, and then slide up/down to target intervals on a single string. 
        Try it on the fretboard below! Let's set the root to <strong>A</strong> on the 6th string (5th fret).
      </p>

      <div class="learn-interactive-preview">
        <h4 style="margin: 0 0 1rem; text-align: center;">Interactive Single String Visualizer (6th String)</h4>
        <div id="mini-fretboard-container"></div>
      </div>

      <p>
        Notice how the note letters wrap around after 12 frets. Play the root and try sliding to the 3rd (3 frets up, 8th fret) or the 5th (7 frets up, 12th fret) to hear the intervals!
      </p>
      <button class="next-question-btn" id="learn-next-btn">Next Topic <i class="fa-solid fa-arrow-right"></i></button>
    `;

    // Instantiate a mini fretboard showing notes on string 5 (Low E is index 5)
    const container = body.querySelector('#mini-fretboard-container');
    
    // A2 is MIDI 45, Low E open is 40, so 6th string (index 5) fret 5 is note A (MIDI 45)
    this.miniFretboard = new Fretboard(container, {
      tuningName: 'standard',
      displayMode: 'intervals',
      rootNoteMidi: 45 // Root is A
    });

    // Mark only the notes on the 6th string (index 5) to keep it focused
    const markedNotes = [];
    const rootMidi = 45; // A on 6th string fret 5
    for (let f = 0; f < 16; f++) {
      const details = getFretDetails(5, f, 'standard');
      const diff = (details.midiNote - rootMidi);
      if (diff >= 0 && diff <= 12) {
        const intervalObj = INTERVALS.find(i => i.semitones === diff);
        if (intervalObj) {
          markedNotes.push({
            stringIndex: 5,
            fretIndex: f,
            colorClass: `interval-${intervalObj.short}`,
            label: diff === 0 ? 'R' : intervalObj.short
          });
        }
      }
    }
    this.miniFretboard.update({ markedNotes });

    body.querySelector('#learn-next-btn').addEventListener('click', () => this.loadTopic(2));
  }

  renderCrossString() {
    const body = this.container.querySelector('#learn-body');
    body.innerHTML = `
      <h3>Cross-String Shapes (Standard Geometry)</h3>
      <p>
        Because shifting to a higher string is easier than sliding far up the neck, guitarists rely on 
        <strong>vertical shape patterns</strong>.
      </p>
      <p>
        In standard guitar tuning, most strings are tuned a <strong>Perfect 4th (5 semitones)</strong> apart:
        Low E to A (5 semitones), A to D (5 semitones), D to G (5 semitones).
        This leads to highly consistent shapes on these strings:
      </p>

      <div class="learn-shape-selector" id="shape-selector">
        <button class="mini-btn ${this.selectedShape === 'octave' ? 'active' : ''}" data-shape="octave">Octave (12 semitones)</button>
        <button class="mini-btn ${this.selectedShape === 'p5' ? 'active' : ''}" data-shape="p5">Perfect 5th (7 semitones)</button>
        <button class="mini-btn ${this.selectedShape === 'p4' ? 'active' : ''}" data-shape="p4">Perfect 4th (5 semitones)</button>
        <button class="mini-btn ${this.selectedShape === 'M3' ? 'active' : ''}" data-shape="M3">Major 3rd (4 semitones)</button>
        <button class="mini-btn ${this.selectedShape === 'm3' ? 'active' : ''}" data-shape="m3">Minor 3rd (3 semitones)</button>
      </div>

      <div class="learn-interactive-preview">
        <h4 style="margin: 0 0 0.5rem; text-align: center;" id="shape-name-display">Octave Shape</h4>
        <div id="mini-fretboard-container"></div>
      </div>

      <div id="shape-explanation" style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 1.5rem;">
        <!-- Explanation populated dynamically -->
      </div>

      <button class="next-question-btn" id="learn-next-btn">Next Topic <i class="fa-solid fa-arrow-right"></i></button>
    `;

    const selector = body.querySelector('#shape-selector');
    const display = body.querySelector('#shape-name-display');
    const explanation = body.querySelector('#shape-explanation');
    const fContainer = body.querySelector('#mini-fretboard-container');

    this.miniFretboard = new Fretboard(fContainer, {
      tuningName: 'standard',
      displayMode: 'hidden',
      rootNoteMidi: 45 // A
    });

    const updateShapeUI = (shapeName) => {
      this.selectedShape = shapeName;
      
      // Update buttons
      selector.querySelectorAll('button').forEach(btn => {
        if (btn.dataset.shape === shapeName) btn.classList.add('active');
        else btn.classList.remove('active');
      });

      // Configure highlighted frets on mini fretboard
      let marked = [];
      let explanationHtml = '';
      let title = '';
      
      const rootString = 5; // Low E
      const rootFret = 5;   // A (MIDI 45)

      if (shapeName === 'octave') {
        title = 'Octave Shape';
        explanationHtml = '<strong>Octave Shape:</strong> Go up 2 frets and cross 2 strings higher (Low E string fret 5 to D string fret 7). This is a foundational shape for guitarists!';
        marked = [
          { stringIndex: 5, fretIndex: 5, colorClass: 'interval-r', label: 'R' },
          { stringIndex: 3, fretIndex: 7, colorClass: 'interval-oct', label: 'Oct' }
        ];
      } else if (shapeName === 'p5') {
        title = 'Perfect 5th (Power Chord)';
        explanationHtml = '<strong>Perfect 5th Shape:</strong> Go up 2 frets and cross 1 string higher (Low E string fret 5 to A string fret 7). This forms the core of a rock "power chord".';
        marked = [
          { stringIndex: 5, fretIndex: 5, colorClass: 'interval-r', label: 'R' },
          { stringIndex: 4, fretIndex: 7, colorClass: 'interval-P5', label: 'P5' }
        ];
      } else if (shapeName === 'p4') {
        title = 'Perfect 4th';
        explanationHtml = '<strong>Perfect 4th Shape:</strong> Same fret, cross 1 string higher (Low E string fret 5 to A string fret 5). Since standard strings are tuned a 4th apart, same-fret crossing gives you a 4th.';
        marked = [
          { stringIndex: 5, fretIndex: 5, colorClass: 'interval-r', label: 'R' },
          { stringIndex: 4, fretIndex: 5, colorClass: 'interval-P4', label: 'P4' }
        ];
      } else if (shapeName === 'M3') {
        title = 'Major 3rd';
        explanationHtml = '<strong>Major 3rd Shape:</strong> Down 1 fret, cross 1 string higher (Low E string fret 5 to A string fret 4). A Major 3rd is 4 semitones, so we back up 1 fret from the Perfect 4th shape.';
        marked = [
          { stringIndex: 5, fretIndex: 5, colorClass: 'interval-r', label: 'R' },
          { stringIndex: 4, fretIndex: 4, colorClass: 'interval-M3', label: 'M3' }
        ];
      } else if (shapeName === 'm3') {
        title = 'Minor 3rd';
        explanationHtml = '<strong>Minor 3rd Shape:</strong> Down 2 frets, cross 1 string higher (Low E string fret 5 to A string fret 3). A Minor 3rd is 3 semitones, so we back up 2 frets from the Perfect 4th shape.';
        marked = [
          { stringIndex: 5, fretIndex: 5, colorClass: 'interval-r', label: 'R' },
          { stringIndex: 4, fretIndex: 3, colorClass: 'interval-m3', label: 'm3' }
        ];
      }

      display.textContent = title;
      explanation.innerHTML = explanationHtml;
      
      this.miniFretboard.update({
        markedNotes: marked,
        rootNoteMidi: 45
      });
    };

    // Bind selector click events
    selector.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn) {
        updateShapeUI(btn.dataset.shape);
      }
    });

    // Initialize with active shape
    updateShapeUI(this.selectedShape);

    body.querySelector('#learn-next-btn').addEventListener('click', () => this.loadTopic(3));
  }

  renderGBOffset() {
    const body = this.container.querySelector('#learn-body');
    body.innerHTML = `
      <h3>The G-to-B Tuning Anomaly</h3>
      <p>
        The guitar neck is perfectly consistent, with one exception: <strong>the interval between the G (3rd) and B (2nd) string is a Major 3rd (4 semitones)</strong>, rather than a Perfect 4th (5 semitones).
      </p>
      <p>
        Because of this, any shape that crosses from the G string to the B string has "lost" 1 semitone of distance in tuning. To compensate for this and make the interval sound identical, <strong>you must shift the higher note up by 1 fret</strong>!
      </p>
      
      <div class="learn-interactive-preview">
        <h4 style="margin: 0 0 1rem; text-align: center;">Visualizing the Shift (Root G string vs Root D string)</h4>
        <div id="mini-fretboard-container"></div>
      </div>

      <div style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 1.5rem;">
        <p>
          Compare the two <strong>Perfect 5ths</strong> shown above:
        </p>
        <ul>
          <li><strong>Lower strings (D to G string)</strong>: Root is on D string fret 5, 5th is on G string fret 7 (standard power chord: <strong>up 2 frets</strong>).</li>
          <li><strong>Crossing G to B string</strong>: Root is on G string fret 5. Because of the tuning shift, the 5th must go to B string fret 8 (shifted: <strong>up 3 frets</strong>!).</li>
        </ul>
      </div>

      <button class="next-question-btn" id="learn-next-btn">Next: Quiz Yourself! <i class="fa-solid fa-arrow-right"></i></button>
    `;

    const fContainer = body.querySelector('#mini-fretboard-container');
    this.miniFretboard = new Fretboard(fContainer, {
      tuningName: 'standard',
      displayMode: 'hidden'
    });

    // Set two groups of marked notes showing the comparison
    const marked = [
      // Standard shape on D (3) and G (2)
      { stringIndex: 3, fretIndex: 5, colorClass: 'interval-r', label: 'R' },
      { stringIndex: 2, fretIndex: 7, colorClass: 'interval-P5', label: 'P5' },

      // Shifted shape on G (2) and B (1)
      { stringIndex: 2, fretIndex: 5, colorClass: 'interval-r', label: 'R' },
      { stringIndex: 1, fretIndex: 8, colorClass: 'interval-P5', label: 'P5 (Shifted)' }
    ];

    this.miniFretboard.update({ markedNotes: marked });

    body.querySelector('#learn-next-btn').addEventListener('click', () => this.loadTopic(4));
  }

  renderQuiz() {
    const body = this.container.querySelector('#learn-body');
    
    let quizHtml = `
      <h3>Guitar Interval Quiz</h3>
      <p>Test your understanding of guitar fretboard intervals! Answer the questions below for instant feedback.</p>
    `;

    this.quizQuestions.forEach((q, qIdx) => {
      const selectedOptIdx = this.quizAnswers[qIdx];
      const isAnswered = selectedOptIdx !== undefined;

      quizHtml += `
        <div class="quiz-box" data-qidx="${qIdx}" style="margin-bottom: 1.5rem;">
          <div class="quiz-question">${qIdx + 1}. ${q.question}</div>
          <div class="quiz-options">
      `;

      q.options.forEach((opt, optIdx) => {
        let optClass = '';
        let icon = '';

        if (isAnswered) {
          if (optIdx === q.correctIndex) {
            optClass = 'correct';
            icon = '<i class="fa-solid fa-circle-check"></i>';
          } else if (optIdx === selectedOptIdx) {
            optClass = 'incorrect';
            icon = '<i class="fa-solid fa-circle-xmark"></i>';
          }
        }

        quizHtml += `
          <button class="quiz-option-btn ${optClass}" data-optidx="${optIdx}" ${isAnswered ? 'disabled' : ''}>
            <span>${opt}</span>
            <span>${icon}</span>
          </button>
        `;
      });

      quizHtml += `
          </div>
      `;

      if (isAnswered) {
        const isCorrect = selectedOptIdx === q.correctIndex;
        quizHtml += `
          <div class="quiz-feedback" style="color: ${isCorrect ? 'var(--success)' : 'var(--error)'}">
            <i class="fa-solid ${isCorrect ? 'fa-check' : 'fa-xmark'}"></i>
            <span>${isCorrect ? 'Correct!' : 'Incorrect.'} ${q.explanation}</span>
          </div>
        `;
      }

      quizHtml += `
        </div>
      `;
    });

    body.innerHTML = quizHtml;

    // Bind event listeners for option buttons
    body.querySelectorAll('.quiz-option-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const optionBtn = e.currentTarget;
        const quizBox = optionBtn.closest('.quiz-box');
        const qIdx = parseInt(quizBox.dataset.qidx, 10);
        const optIdx = parseInt(optionBtn.dataset.optidx, 10);

        this.quizAnswers[qIdx] = optIdx;

        // Play feedback sounds
        const correct = optIdx === this.quizQuestions[qIdx].correctIndex;
        if (correct) {
          // Play ascending minor/major chord or chime
          synth.playMidiNote(60, 0.4, 0); // C4
          synth.playMidiNote(64, 0.4, 0.08); // E4
          synth.playMidiNote(67, 0.6, 0.16); // G4
        } else {
          // Play buzzing low interval sound
          synth.playMidiNote(45, 0.3, 0); // A2
          synth.playMidiNote(46, 0.4, 0.05); // Bb2 (dissonant semitone)
        }

        // Re-render quiz to show feedback
        this.renderQuiz();
      });
    });
  }
}
