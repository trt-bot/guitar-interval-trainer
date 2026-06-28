/* Interactive Visual Fretboard Component */
import { getFretDetails, getIntervalSemitones, getIntervalBySemitones, TUNINGS } from '../utils/musicTheory.js';
import { synth } from '../utils/guitarSynth.js';

export class Fretboard {
  /**
   * @param {HTMLElement} container - The element to render the fretboard into.
   * @param {Object} options - Configuration options.
   */
  constructor(container, options = {}) {
    this.container = container;
    
    // Default configuration
    this.tuningName = options.tuningName || 'standard';
    this.displayMode = options.displayMode || 'notes'; // 'notes', 'intervals', 'hidden'
    this.rootNoteMidi = options.rootNoteMidi || null;  // MIDI number of the root note
    this.onFretClick = options.onFretClick || null;    // Click callback
    this.showOctaves = options.showOctaves !== undefined ? options.showOctaves : false;
    
    // Total frets: 0 (open) + 15 frets
    this.totalFrets = 16;
    this.markedNotes = []; // Array of { stringIndex, fretIndex, colorClass, label }

    // Precalculate realistic logarithmic fret positions (stretched to 100%)
    this.fretPositions = this.calculateFretPositions();
    this.fretCenters = this.calculateFretCenters();

    this.render();
  }

  /**
   * Calculates stretched logarithmic positions for frets 0 to 15.
   */
  calculateFretPositions() {
    const scaleMax = 1 - Math.pow(2, -(this.totalFrets - 1) / 12); // Max factor for fret 15
    const positions = [0]; // Fret 0 (Nut) is at 0%
    
    for (let f = 1; f < this.totalFrets; f++) {
      const distFactor = 1 - Math.pow(2, -f / 12);
      const percentage = (distFactor / scaleMax) * 100;
      positions.push(percentage);
    }
    return positions;
  }

  /**
   * Calculates center percentage position for each fret space.
   */
  calculateFretCenters() {
    const centers = [ -3.5 ]; // Fret 0 (open string) notes are placed left of the nut
    for (let f = 1; f < this.totalFrets; f++) {
      const center = (this.fretPositions[f - 1] + this.fretPositions[f]) / 2;
      centers.push(center);
    }
    return centers;
  }

  /**
   * Update configuration and re-render.
   */
  update(config = {}) {
    if (config.tuningName !== undefined) this.tuningName = config.tuningName;
    if (config.displayMode !== undefined) this.displayMode = config.displayMode;
    if (config.rootNoteMidi !== undefined) this.rootNoteMidi = config.rootNoteMidi;
    if (config.markedNotes !== undefined) this.markedNotes = config.markedNotes;
    if (config.showOctaves !== undefined) this.showOctaves = config.showOctaves;
    
    this.render();
  }

  /**
   * Marks a note or interval on the fretboard.
   */
  setMarkedNotes(notes) {
    this.markedNotes = notes;
    this.render();
  }

  /**
   * Clears all marked notes.
   */
  clearMarkedNotes() {
    this.markedNotes = [];
    this.render();
  }

  /**
   * Renders the fretboard markup and binds click events.
   */
  render() {
    this.container.innerHTML = '';

    const scrollWrapper = document.createElement('div');
    scrollWrapper.className = 'fretboard-scroll-wrapper';

    const canvas = document.createElement('div');
    canvas.className = 'fretboard-canvas';

    // 1. Draw fret wires
    // We draw frets 1 to 15 (skip nut at 0% since it's the left border)
    for (let f = 1; f < this.totalFrets; f++) {
      const fretWire = document.createElement('div');
      fretWire.className = 'fret';
      fretWire.style.left = `${this.fretPositions[f]}%`;
      canvas.appendChild(fretWire);
    }

    // 2. Draw fret markers (Pearl dots at 3, 5, 7, 9, 12, 15)
    const markerOverlay = document.createElement('div');
    markerOverlay.className = 'fret-markers';

    const markers = [3, 5, 7, 9, 12, 15];
    markers.forEach(f => {
      const centerPos = this.fretCenters[f];
      if (f === 12) {
        // Double dots at the 12th fret
        const topDot = document.createElement('div');
        topDot.className = 'pearl-dot double-top';
        topDot.style.left = `${centerPos}%`;
        
        const bottomDot = document.createElement('div');
        bottomDot.className = 'pearl-dot double-bottom';
        bottomDot.style.left = `${centerPos}%`;

        markerOverlay.appendChild(topDot);
        markerOverlay.appendChild(bottomDot);
      } else {
        const dot = document.createElement('div');
        dot.className = 'pearl-dot';
        dot.style.left = `${centerPos}%`;
        markerOverlay.appendChild(dot);
      }
    });
    canvas.appendChild(markerOverlay);

    // 3. Draw Strings
    const stringContainer = document.createElement('div');
    stringContainer.className = 'strings-container';

    // Draw strings 1 to 6
    // String index 0 is high E (thinnest), index 5 is low E (thickest)
    const strings = [];
    for (let s = 0; s < 6; s++) {
      const stringEl = document.createElement('div');
      stringEl.className = 'guitar-string';
      
      // Calculate string thickness
      // Thin string 0 (High E) is ~1px. Thick string 5 (Low E) is ~3.5px
      const thickness = 1 + (5 - s) * 0.5;
      stringEl.style.height = `${thickness}px`;
      
      stringContainer.appendChild(stringEl);
      strings.push(stringEl);
    }
    canvas.appendChild(stringContainer);

    // 4. Draw Fret Tap Zones & Note Markers
    const interactiveOverlay = document.createElement('div');
    interactiveOverlay.className = 'interactive-frets';

    // Map marked notes for fast lookup: "string-fret" -> markedDetails
    const markedMap = new Map();
    this.markedNotes.forEach(m => {
      markedMap.set(`${m.stringIndex}-${m.fretIndex}`, m);
    });

    // 6 strings, 16 frets (0 = open, 1-15 fretted)
    for (let s = 0; s < 6; s++) {
      const openMidi = TUNINGS[this.tuningName].notes[s];

      for (let f = 0; f < this.totalFrets; f++) {
        const fretDetails = getFretDetails(s, f, this.tuningName);
        const midi = fretDetails.midiNote;
        
        // Tap Zone dimensions
        const startX = f === 0 ? -5 : this.fretPositions[f - 1];
        const endX = this.fretPositions[f];
        const width = endX - startX;
        
        const tapZone = document.createElement('div');
        tapZone.className = 'fret-tap-zone';
        tapZone.style.left = `${startX}%`;
        tapZone.style.width = `${width}%`;
        // Align vertically based on string index (0 to 5)
        tapZone.style.top = `${(s / 5) * 85 + 2.5}%`;
        tapZone.style.height = '15%';

        // Check if this fret is marked to highlight
        const markedInfo = markedMap.get(`${s}-${f}`);
        const isRoot = this.rootNoteMidi !== null && (midi % 12 === this.rootNoteMidi % 12);
        
        // Decide if we should render a note marker on this fret
        // In free-play explorer, if displayMode is not hidden, we can show notes.
        // Or if it is explicitly marked, we always show it.
        let shouldRenderMarker = false;
        let colorClass = '';
        let labelText = '';

        if (markedInfo) {
          shouldRenderMarker = true;
          colorClass = markedInfo.colorClass || '';
          labelText = markedInfo.label || '';
        } else if (this.displayMode === 'notes' && this.rootNoteMidi !== null) {
          // If a root note is selected in explorer mode, show relative intervals
          shouldRenderMarker = true;
          const semitones = getIntervalSemitones(this.rootNoteMidi, midi);
          const intervalObj = getIntervalBySemitones(semitones);
          colorClass = `interval-${intervalObj.short}`;
          labelText = isRoot ? 'R' : intervalObj.short;
        } else if (this.displayMode === 'absolute') {
          // Show absolute notes (C, D, E, etc.)
          shouldRenderMarker = true;
          labelText = this.showOctaves ? fretDetails.label : fretDetails.noteName;
          colorClass = isRoot ? 'note-root' : 'interval-M2'; // neutral color
        }

        if (shouldRenderMarker) {
          const marker = document.createElement('div');
          marker.className = `note-marker ${colorClass} ${isRoot ? 'note-root' : ''}`;
          
          // Display value based on settings
          if (this.displayMode === 'hidden' && !markedInfo) {
            marker.textContent = '';
          } else {
            marker.textContent = labelText || (this.displayMode === 'intervals' && this.rootNoteMidi !== null
              ? (isRoot ? 'R' : getIntervalBySemitones(getIntervalSemitones(this.rootNoteMidi, midi)).short)
              : fretDetails.noteName);
          }

          tapZone.appendChild(marker);
        }

        // Fret click event listener
        tapZone.addEventListener('mousedown', (e) => {
          e.preventDefault();
          
          // Play physical synth pluck
          synth.playMidiNote(midi);

          // Animate string vibration
          const stringEl = strings[s];
          stringEl.classList.remove('vibrating');
          // Trigger reflow to restart animation
          void stringEl.offsetWidth;
          stringEl.classList.add('vibrating');
          setTimeout(() => stringEl.classList.remove('vibrating'), 400);

          // Animate note marker pluck bounce
          const markerEl = tapZone.querySelector('.note-marker');
          if (markerEl) {
            markerEl.classList.remove('plucked');
            void markerEl.offsetWidth;
            markerEl.classList.add('plucked');
            setTimeout(() => markerEl.classList.remove('plucked'), 300);
          }

          // Trigger custom callback
          if (this.onFretClick) {
            this.onFretClick(s, f, fretDetails);
          }
        });

        interactiveOverlay.appendChild(tapZone);
      }
    }
    canvas.appendChild(interactiveOverlay);
    scrollWrapper.appendChild(canvas);

    // 5. Draw Fret Number Indicators at bottom (Frets 3, 5, 7, 9, 12, 15)
    const numbersContainer = document.createElement('div');
    numbersContainer.className = 'fret-numbers';
    // Match height/width spacing
    numbersContainer.style.position = 'relative';
    numbersContainer.style.height = '20px';

    const numberedFrets = [1, 3, 5, 7, 9, 12, 15];
    numberedFrets.forEach(f => {
      const numDiv = document.createElement('div');
      numDiv.className = 'fret-number';
      numDiv.style.left = `${this.fretCenters[f]}%`;
      numDiv.style.width = '20px';
      numDiv.textContent = f;
      numbersContainer.appendChild(numDiv);
    });
    scrollWrapper.appendChild(numbersContainer);

    this.container.appendChild(scrollWrapper);
  }
}
