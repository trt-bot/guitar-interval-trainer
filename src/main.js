import './style.css';
import { Fretboard } from './components/Fretboard.js';
import { Learn } from './components/Learn.js';
import { EarTrainer } from './components/EarTrainer.js';
import { FretboardTrainer } from './components/FretboardTrainer.js';
import { NOTES, INTERVALS, TUNINGS, STRING_NAMES } from './utils/musicTheory.js';
import { synth } from './utils/guitarSynth.js';

class App {
  constructor() {
    this.activeTab = 'explore'; // 'learn', 'explore', 'ear-trainer', 'quiz'
    this.tuningName = 'standard';
    this.displayMode = 'notes'; // 'notes', 'absolute'
    this.rootNoteMidi = 48; // C3 (root reference note for explorer)
    
    // Sub-components
    this.explorerFretboard = null;
    this.learnComponent = null;
    this.earTrainerComponent = null;
    this.fretboardTrainerComponent = null;
  }

  init() {
    this.renderAppShell();
    this.setupGlobalControls();
    
    // Initialize components
    this.initExplorer();
    this.learnComponent = new Learn(document.getElementById('learn-tab-content'));
    this.earTrainerComponent = new EarTrainer(document.getElementById('ear-trainer-tab-content'));
    this.fretboardTrainerComponent = new FretboardTrainer(document.getElementById('quiz-tab-content'));

    // Handle tab switching
    this.setupTabNavigation();

    // Setup audio activator banner
    this.setupAudioBanner();

    // Trigger initial tab
    this.switchTab('explore');
  }

  renderAppShell() {
    const appEl = document.getElementById('app');
    appEl.innerHTML = `
      <!-- Audio activation warning banner -->
      <div class="audio-banner" id="audio-activation-banner">
        <div class="audio-banner-text">
          <i class="fa-solid fa-guitar"></i>
          <span><strong>Guitar Synth Ready:</strong> Click "Activate Audio" to enable organic plucked-string sound feedback!</span>
        </div>
        <button id="activate-audio-btn">Activate Audio</button>
      </div>

      <!-- App Header -->
      <header>
        <div class="logo-section">
          <i class="fa-solid fa-guitar"></i>
          <h1>Fretboard Intervals</h1>
        </div>
        <nav>
          <button class="nav-btn active" data-tab="explore"><i class="fa-solid fa-compass"></i> Explorer</button>
          <button class="nav-btn" data-tab="learn"><i class="fa-solid fa-book-open"></i> Learn Theory</button>
          <button class="nav-btn" data-tab="ear-trainer"><i class="fa-solid fa-ear-listen"></i> Ear Trainer</button>
          <button class="nav-btn" data-tab="quiz"><i class="fa-solid fa-bullseye"></i> Fretboard Quiz</button>
        </nav>
      </header>

      <!-- Main Layout Grid -->
      <main class="dashboard-grid">
        <!-- Center Stage / Active Tab View -->
        <section class="tab-views">
          
          <!-- Tab 1: Explorer (Free Play) -->
          <div id="explore-tab-content" class="tab-content active">
            <div class="glass-card">
              <h3 class="card-title"><i class="fa-solid fa-compass"></i> Fretboard Explorer</h3>
              <p class="explorer-instructions">
                Set a reference root note, select notes on the neck to hear their plucked tones, and see relative intervals color-coded dynamically. 
                Hover over the interval legend below to trace note placements.
              </p>
              
              <!-- Root note picker selector -->
              <div class="selected-notes-display">
                <h4>Set Root Note:</h4>
                <div class="note-bubbles" id="root-picker-container">
                  <!-- Injected Root Note selector buttons -->
                </div>
              </div>

              <!-- Main Fretboard Widget -->
              <div id="explorer-fretboard-container"></div>

              <!-- Interval Color Legend -->
              <h4 style="margin: 2rem 0 0.5rem; font-family: var(--font-display); font-size: 0.9rem; text-transform: uppercase; color: var(--text-muted); text-align: center;">Interval Legend (Hover to Highlight)</h4>
              <div class="legend-container" id="interval-legend-container">
                <!-- Color dots mapping -->
              </div>
            </div>
          </div>

          <!-- Tab 2: Learn Theory -->
          <div id="learn-tab-content" class="tab-content"></div>

          <!-- Tab 3: Ear Trainer Game -->
          <div id="ear-trainer-tab-content" class="tab-content"></div>

          <!-- Tab 4: Fretboard Quiz Game -->
          <div id="quiz-tab-content" class="tab-content"></div>

        </section>

        <!-- Right Sidebar (Global Settings) -->
        <aside class="controls-sidebar">
          
          <!-- Instrument Settings -->
          <div class="glass-card">
            <h3 class="card-title"><i class="fa-solid fa-sliders"></i> Settings</h3>
            
            <div class="control-group" style="margin-bottom: 1.25rem;">
              <label for="tuning-select">Guitar Tuning</label>
              <select id="tuning-select" class="custom-select">
                <option value="standard">Standard (E A D G B E)</option>
                <option value="dropD">Drop D (D A D G B E)</option>
                <option value="halfStepDown">Half-Step Down (Eb Ab Db Gb Bb Eb)</option>
                <option value="dadgad">DADGAD</option>
              </select>
            </div>

            <div class="control-group" style="margin-bottom: 1.25rem;">
              <label for="display-mode-select">Fretboard Labels</label>
              <select id="display-mode-select" class="custom-select">
                <option value="notes">Show Relative Intervals (R, b3, 5)</option>
                <option value="absolute">Show Absolute Notes (C, E, G#)</option>
              </select>
            </div>

            <div class="control-group" style="margin-bottom: 1.25rem;">
              <label>Volume</label>
              <div class="volume-slider-container">
                <button class="mute-btn" id="mute-btn"><i class="fa-solid fa-volume-high" id="mute-icon"></i></button>
                <input type="range" class="volume-slider" id="volume-range" min="0" max="1" step="0.05" value="0.5">
              </div>
            </div>
            
            <div class="control-group">
              <div class="toggle-group">
                <span style="font-size: 0.9rem; font-weight: 500;">Show Octave Numbers</span>
                <label class="switch">
                  <input type="checkbox" id="octaves-toggle">
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <div class="control-group" style="margin-top: 1.25rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
              <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Sound Source</span>
              <div id="audio-engine-status" style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-top: 0.25rem;">
                <i class="fa-solid fa-guitar"></i> Synthesizer (Active)
              </div>
            </div>
          </div>

          <!-- Quick Tip Card -->
          <div class="glass-card" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(236, 72, 153, 0.05));">
            <h4 style="margin: 0 0 0.5rem; font-family: var(--font-display); color: var(--color-root);"><i class="fa-solid fa-lightbulb"></i> Pro Practice Tip</h4>
            <p style="font-size: 0.85rem; line-height: 1.5; color: var(--text-muted); margin: 0;">
              Guitar visual shapes are uniform except when crossing standard 3rd-to-2nd (G to B) strings. 
              Always shift shapes up by <strong>1 fret</strong> when crossing this threshold!
            </p>
          </div>

        </aside>
      </main>

      <!-- Footer -->
      <footer>
        <div>
          © 2026 Guitar Interval Trainer | Powered by Web Audio Synthesis
        </div>
        <div class="footer-links">
          <a href="#" class="nav-btn" data-tab="learn"><i class="fa-solid fa-graduation-cap"></i> Theory Guide</a>
          <a href="https://github.com" target="_blank"><i class="fa-brands fa-github"></i> Open Source</a>
        </div>
      </footer>
    `;
  }

  setupGlobalControls() {
    // Tuning select
    const tuningSelect = document.getElementById('tuning-select');
    tuningSelect.addEventListener('change', (e) => {
      this.tuningName = e.target.value;
      this.updateAllComponents();
    });

    // Display mode select
    const displayModeSelect = document.getElementById('display-mode-select');
    displayModeSelect.addEventListener('change', (e) => {
      this.displayMode = e.target.value;
      this.updateAllComponents();
    });

    // Octaves toggle
    const octavesToggle = document.getElementById('octaves-toggle');
    octavesToggle.addEventListener('change', (e) => {
      this.updateAllComponents();
    });

    // Volume range
    const volumeRange = document.getElementById('volume-range');
    volumeRange.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      synth.setVolume(vol);
      this.updateMuteIcon(vol === 0);
    });

    // Mute button
    const muteBtn = document.getElementById('mute-btn');
    muteBtn.addEventListener('click', () => {
      const muted = synth.toggleMute();
      this.updateMuteIcon(muted);
    });
  }

  updateMuteIcon(isMuted) {
    const icon = document.getElementById('mute-icon');
    if (isMuted) {
      icon.className = 'fa-solid fa-volume-xmark';
      icon.style.color = 'var(--error)';
    } else {
      icon.className = 'fa-solid fa-volume-high';
      icon.style.color = '';
    }
  }

  updateAllComponents() {
    const showOctaves = document.getElementById('octaves-toggle').checked;
    
    // Update Explorer fretboard
    if (this.explorerFretboard) {
      this.explorerFretboard.update({
        tuningName: this.tuningName,
        displayMode: this.displayMode,
        showOctaves: showOctaves
      });
    }

    // Update Fretboard Trainer tuning
    if (this.fretboardTrainerComponent) {
      this.fretboardTrainerComponent.updateTuning(this.tuningName);
    }
  }

  initExplorer() {
    // 1. Build Root Note Picker
    const picker = document.getElementById('root-picker-container');
    picker.innerHTML = '';

    // C is index 0 in NOTES. We map C as default.
    // Let's create buttons for notes C, C#, D, etc.
    NOTES.forEach(noteName => {
      const btn = document.createElement('button');
      btn.className = 'note-bubble';
      
      // Calculate MIDI note value in the 3rd octave
      const midiVal = 48 + NOTES.indexOf(noteName);
      
      if (noteName === NOTES[this.rootNoteMidi % 12]) {
        btn.classList.add('is-root');
      }

      btn.textContent = noteName;
      btn.addEventListener('click', () => {
        this.rootNoteMidi = midiVal;
        
        // Update root selector styling
        picker.querySelectorAll('.note-bubble').forEach(b => {
          if (b.textContent === noteName) b.classList.add('is-root');
          else b.classList.remove('is-root');
        });

        // Update fretboard root reference
        this.explorerFretboard.update({ rootNoteMidi: this.rootNoteMidi });
      });

      picker.appendChild(btn);
    });

    // 2. Instantiate Explorer Fretboard
    const fretboardContainer = document.getElementById('explorer-fretboard-container');
    const showOctaves = document.getElementById('octaves-toggle').checked;
    this.explorerFretboard = new Fretboard(fretboardContainer, {
      tuningName: this.tuningName,
      displayMode: this.displayMode,
      rootNoteMidi: this.rootNoteMidi,
      showOctaves: showOctaves
    });

    // 3. Build Interval Color Legend
    const legendContainer = document.getElementById('interval-legend-container');
    legendContainer.innerHTML = '';

    INTERVALS.forEach(interval => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      
      const dot = document.createElement('span');
      dot.className = 'legend-color-dot';
      dot.style.backgroundColor = `var(--color-${interval.short === 'oct' ? 'octave' : interval.short})`;
      
      const label = document.createElement('span');
      label.textContent = `${interval.short.toUpperCase()} (${interval.name})`;

      item.appendChild(dot);
      item.appendChild(label);

      // Interactive hover highlighting
      item.addEventListener('mouseenter', () => {
        // Highlight all fretboard notes matching this interval
        const markers = fretboardContainer.querySelectorAll(`.note-marker.interval-${interval.short}`);
        markers.forEach(m => {
          m.style.transform = 'scale(1.25)';
          m.style.boxShadow = '0 0 15px currentColor';
        });
      });

      item.addEventListener('mouseleave', () => {
        // Reset scale
        const markers = fretboardContainer.querySelectorAll(`.note-marker.interval-${interval.short}`);
        markers.forEach(m => {
          m.style.transform = '';
          m.style.boxShadow = '';
        });
      });

      // Clicking legend plays interval relative to selected explorer root note
      item.addEventListener('click', () => {
        const targetMidi = this.rootNoteMidi + interval.semitones;
        synth.playInterval(this.rootNoteMidi, targetMidi, 'ascending');
      });

      legendContainer.appendChild(item);
    });
  }

  setupTabNavigation() {
    const navButtons = document.querySelectorAll('header nav .nav-btn, footer .footer-links a');
    
    const handleSwitch = (tabName) => {
      this.switchTab(tabName);
      
      // Update header nav active states (if tab matches)
      document.querySelectorAll('header nav .nav-btn').forEach(btn => {
        if (btn.dataset.tab === tabName) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    };

    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = btn.dataset.tab;
        if (tabName) {
          handleSwitch(tabName);
        }
      });
    });
  }

  switchTab(tabName) {
    this.activeTab = tabName;

    // Toggle tab visibility in DOM
    const views = ['explore', 'learn', 'ear-trainer', 'quiz'];
    views.forEach(v => {
      const el = document.getElementById(`${v}-tab-content`);
      if (v === tabName) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Mount or refresh specific tab content
    if (tabName === 'explore') {
      this.initExplorer();
      this.updateAllComponents();
    } else if (tabName === 'learn') {
      this.learnComponent.mount();
    } else if (tabName === 'ear-trainer') {
      this.earTrainerComponent.mount();
    } else if (tabName === 'quiz') {
      this.fretboardTrainerComponent.mount();
    }
  }

  setupAudioBanner() {
    const banner = document.getElementById('audio-activation-banner');
    const btn = document.getElementById('activate-audio-btn');
    const statusText = document.getElementById('audio-engine-status');

    // Update status text helper
    const updateStatusText = (status) => {
      if (status === 'loading') {
        statusText.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color: var(--color-M2)"></i> Loading samples...`;
      } else if (status === 'loaded') {
        statusText.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--success)"></i> Premium Acoustic (FluidR3)`;
      } else if (status === 'failed') {
        statusText.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color: var(--error)"></i> Synth Fallback (Offline)`;
      }
    };

    // Bind synth status changes
    synth.onStatusChange = (status) => {
      updateStatusText(status);
      
      // Also update banner text if it's still visible
      const bannerSpan = banner.querySelector('.audio-banner-text span');
      if (bannerSpan) {
        if (status === 'loading') {
          bannerSpan.innerHTML = `<strong>Loading Premium Samples:</strong> Downloading high-quality steel guitar sound library...`;
        } else if (status === 'loaded') {
          bannerSpan.innerHTML = `<strong>Acoustic Guitar Loaded:</strong> Premium physical-mode samples are ready! Click Activate.`;
        } else if (status === 'failed') {
          bannerSpan.innerHTML = `<strong>Synthesis Mode:</strong> Could not load CDN samples. Click Activate for synthesized sound.`;
        }
      }
    };

    const activate = () => {
      synth.init();
      banner.style.transition = 'all 0.3s ease';
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        banner.style.display = 'none';
      }, 300);
    };

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      activate();
    });

    // Activate on first user gesture anywhere
    document.addEventListener('click', activate, { once: true });
    document.addEventListener('keydown', activate, { once: true });
  }
}

// Instantiate and start app on load
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
