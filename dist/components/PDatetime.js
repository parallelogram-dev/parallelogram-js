/**
 * PDatetime - Enhanced Datetime Picker Web Component
 *
 * A comprehensive datetime picker with calendar and time selection interfaces.
 * Supports both date-only and datetime modes with configurable time formats.
 *
 * @usage
 * Basic date picker:
 * <p-datetime name="eventDate" mode="date"></p-datetime>
 *
 * Datetime picker with 12-hour format:
 * <p-datetime name="appointment" mode="datetime" time-format="12"></p-datetime>
 *
 * With quick date presets:
 * <p-datetime name="deadline" mode="date" show-quick-dates quick-dates="yesterday,today,tomorrow"></p-datetime>
 *
 * With initial value:
 * <p-datetime name="meetingTime" mode="datetime" value="2024-01-15T14:30:00.000Z"></p-datetime>
 *
 * Date range picker:
 * <p-datetime name="eventDates" mode="date" range range-to="endDate" from-label="Start Date" to-label="End Date"></p-datetime>
 *
 * @attributes
 * - mode: "date" | "datetime" | "time" (default: "date") - Controls picker type (date, datetime, or time only)
 * - value: ISO date string - Current selected value (or start date in range mode)
 * - name: string - Form field name, creates hidden input for form submission
 * - time-format: "12" | "24" (default: "24") - Time display format
 * - show-quick-dates: boolean - Shows quick date preset buttons
 * - quick-dates: string - Comma-separated list of presets (yesterday,today,tomorrow)
 * - range: boolean - Enables date range mode with two date inputs
 * - range-to: string - Name for the end date field (creates second hidden input)
 * - from-label: string - Label for start date input (default: "From")
 * - to-label: string - Label for end date input (default: "To")
 * - range-to-value: ISO date string - End date value in range mode
 *
 * @events
 * - change: Fired when value changes, detail contains {value: isoString}
 *
 * @styling
 * CSS custom properties for theming:
 * - --p-surface: Background color (default: #fff)
 * - --p-border: Border color (default: #e5e7eb)
 * - --p-radius: Border radius (default: 12px)
 * - --p-shadow: Box shadow (default: 0 10px 30px rgba(0,0,0,.12))
 * - --p-accent: Accent color (default: #3b82f6)
 * - --p-primary: Primary color (default: #111)
 * - --p-muted: Muted background (default: #f8f9fb)
 *
 * @example
 * // JavaScript usage
 * const picker = document.querySelector('p-datetime');
 * picker.value = '2024-01-15T14:30:00.000Z';
 * picker.addEventListener('change', (e) => {
 *   // Handle the selected datetime value
 *   const selectedValue = e.detail.value;
 * });
 */
class PDatetime extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._view = new Date();
    this._step = 15;
    this._weekStart = 1;
    this._viewMode = 'day'; // 'day', 'month', 'year'
    this._animating = false;
    this._navigationDirection = null; // 'next' or 'prev'
    this._touchStartX = 0;
    this._touchEndX = 0;

    /* Mode configuration centralizes mode-specific behavior */
    this._modeConfig = {
      date: {
        showCalendar: true,
        showTime: false,
        showQuickDates: true,
        formatOpts: { dateStyle: 'medium' },
        placeholders: {
          single: 'Select date...',
          rangeFrom: 'Start date...',
          rangeTo: 'End date...'
        }
      },
      datetime: {
        showCalendar: true,
        showTime: true,
        showQuickDates: true,
        formatOpts: { dateStyle: 'medium', timeStyle: 'short' },
        placeholders: {
          single: 'Select date & time...',
          rangeFrom: 'Start date & time...',
          rangeTo: 'End date & time...'
        }
      },
      time: {
        showCalendar: false,
        showTime: true,
        showQuickDates: false,
        formatOpts: { timeStyle: 'short' },
        placeholders: {
          single: 'Select time...',
          rangeFrom: 'Start time...',
          rangeTo: 'End time...'
        }
      }
    };

    this.shadowRoot.innerHTML = `
          <style>
            /* Global Hidden Rule */
            [hidden] {
              display: none !important;
            }

            /* Host & Core Properties */
            :host {
              display: inline-block;
              position: relative;
              box-sizing: border-box;
              --datetime-padding-x: 0.75em;
              --datetime-padding-y: 0.375em;
              --datetime-text: currentColor;
              --datetime-muted: rgba(0, 0, 0, 0.5);
              --datetime-accent: #3b82f6;
              --datetime-hover: rgba(0, 0, 0, 0.05);
              --datetime-bg: #ffffff;
            }

            @media (prefers-color-scheme: dark) {
              :host {
                --datetime-muted: rgba(255, 255, 255, 0.5);
                --datetime-hover: rgba(255, 255, 255, 0.1);
              }
            }

            /* Field & Input Containers */
            .field {
              font: inherit;
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              display: flex;
              align-items: stretch;
              box-sizing: border-box;
              border-radius: inherit;
              overflow: hidden;
            }

            .input {
              padding: var(--datetime-padding-y) var(--datetime-padding-x);
              color: var(--datetime-text);
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
              flex: 1;
              min-width: 0;
              display: flex;
              align-items: center;
              transition: box-shadow 0.15s ease;
              border-radius: inherit;
            }

            .input:first-of-type:not(:only-of-type) {
              border-top-right-radius: 0;
              border-bottom-right-radius: 0;
            }

            .input:nth-of-type(2) {
              border-left: 1px solid rgba(0, 0, 0, 0.1);
              border-top-left-radius: 0;
              border-bottom-left-radius: 0;
            }

            .input.focused {
              box-shadow: inset 0 0 0 2px var(--datetime-accent);
            }

            .input[hidden] {
              display: none;
            }

            .input[data-placeholder]:empty::before {
              content: attr(data-placeholder);
              color: var(--datetime-muted);
              opacity: 0.6;
            }

            /* Buttons - Shared Styles */
            .nav button,
            .month-year,
            .calendar-btn,
            .day,
            .month,
            .year,
            .preset,
            .btn {
              background: none;
              border: none;
              cursor: pointer;
              color: inherit;
            }

            .calendar-btn {
              padding: 0 var(--datetime-padding-x);
              opacity: 0.7;
              display: flex;
              justify-content: center;
              align-items: center;
            }

            .calendar-btn:hover {
              background: var(--datetime-hover);
              color: var(--datetime-accent);
            }

            /* Panel */
            .panel {
              position: absolute;
              top: 100%;
              left: 0;
              margin-top: 0.5em;
              background: var(--datetime-bg);
              border: 1px solid rgba(0, 0, 0, 0.1);
              border-radius: 0.75em;
              box-shadow: 0 0.625em 1.875em rgba(0, 0, 0, 0.12);
              padding: 0.75em;
              z-index: 9;
              min-width: 20em;
              opacity: 0;
              transform: translateY(-0.5em);
              transition: all 0.15s ease;
              pointer-events: none;
            }

            .panel.open {
              opacity: 1;
              transform: translateY(0);
              pointer-events: all;
            }

            .panel[hidden] {
              display: none;
            }

            /* Navigation */
            .nav {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin: 0;
              padding-bottom: 0.75em;
            }

            .nav button {
              padding: 0.5em;
              border-radius: 0.5em;
              color: var(--datetime-muted);
              transition: all 0.15s ease;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .nav button:hover {
              background: var(--datetime-hover);
              color: var(--datetime-accent);
            }

            .month-year {
              font-weight: 600;
              padding: 0.25em 0.5em;
              border-radius: 0.5em;
              transition: background-color 0.15s ease;
              color: var(--datetime-text);
              display: flex;
              align-items: center;
              gap: 0.25em;
              font-size: 0.875em;
            }

            .month-year:hover {
              background: var(--datetime-hover);
              color: var(--datetime-accent);
            }

            .month-year:active {
              background: var(--datetime-hover);
              opacity: 0.8;
            }

            .month-year svg {
              opacity: 0.6;
              margin-left: 0.125em;
            }

            /* Grids - Container & Layout */
            .grid-container {
              padding-top: 0.75em;
              border-top: 1px solid rgba(0, 0, 0, 0.1);
              position: relative;
              overflow: hidden;
              height: 18.75em;
            }

            .grid {
              display: grid;
              grid-template-columns: repeat(7, 1fr);
              gap: 0.125em;
              justify-items: center;
              align-content: start;
              grid-template-rows: 2em repeat(6, 2.5em);
              height: 18em;
            }

            .grid.month-view,
            .grid.year-view {
              grid-template-columns: repeat(3, 1fr);
              grid-template-rows: repeat(4, 1fr);
              gap: 0.5em;
            }

            .grid--animating {
              position: absolute;
              top: 0.75em;
              left: 0;
              right: 0;
            }

            .grid.animating {
              transition: transform 0.5s cubic-bezier(0.5, 0, 0, 1);
            }

            .grid--prev.grid--out {
              transform: translateX(100%);
            }

            .grid--prev.grid--in {
              transform: translateX(-100%);
            }

            .grid--next.grid--out {
              transform: translateX(-100%);
            }

            .grid--next.grid--in {
              transform: translateX(100%);
            }

            .grid:not(.grid--in):not(.grid--out) {
              transform: translateX(0);
            }

            @media (prefers-reduced-motion: reduce) {
              .grid {
                transition: opacity 0.15s ease;
                transform: none !important;
              }
            }

            /* Grid Cells - Day/Month/Year */
            .wd {
              font-size: 0.75em;
              opacity: 0.6;
              font-weight: 600;
              padding: 0.5em 0;
              text-transform: uppercase;
            }

            .day,
            .month,
            .year {
              width: 100%;
              height: 2.5em;
              border-radius: 0.5em;
              font-size: 0.875em;
              transition: all 0.15s ease;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .day:hover,
            .month:hover,
            .year:hover {
              background: var(--datetime-hover);
            }

            .day.today,
            .month.today,
            .year.today {
              border: 2px solid var(--datetime-accent);
              position: relative;
            }

            .day.in-range {
              background: var(--datetime-accent);
              color: var(--datetime-bg);
              opacity: 0.6;
            }

            .day.selected,
            .month.selected,
            .year.selected,
            .day.range-start,
            .day.range-end {
              background: var(--datetime-accent);
              color: var(--datetime-bg);
              opacity: 1;
            }

            .month,
            .year {
              height: 3em;
            }

            .day:disabled {
              opacity: 0.3;
              cursor: not-allowed;
            }

            .day.range-hover {
              background: rgba(59, 130, 246, 0.1);
            }

            /* Time Picker */
            .time {
              display: flex;
              gap: 0.5em;
              align-items: center;
              justify-content: center;
              padding: 0.75em 0;
              border-top: 1px solid rgba(0, 0, 0, 0.1);
            }

            .time[hidden] {
              display: none;
            }

            .time-separator {
              font-size: 1.25em;
              color: var(--datetime-muted);
              font-weight: 600;
            }

            .time-select,
            .ampm {
              appearance: none;
              background-color: var(--datetime-bg);
              background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 9l4 -4l4 4" /><path d="M16 15l-4 4l-4 -4" /></svg>');
              background-position: right 0.5em center;
              background-repeat: no-repeat;
              background-size: 1em;
              border: 1px solid rgba(0, 0, 0, 0.1);
              border-radius: 0.5em;
              padding: 0.5em 1.75em 0.5em 0.75em;
              font-size: 0.875em;
              font-weight: 500;
              color: var(--datetime-text);
              cursor: pointer;
              transition: all 0.15s ease;
              min-width: 4em;
            }

            .time-select:hover,
            .ampm:hover {
              border-color: var(--datetime-accent);
              background-color: var(--datetime-hover);
            }

            .time-select:focus,
            .ampm:focus {
              outline: none;
              border-color: var(--datetime-accent);
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            /* Quick Dates & Presets */
            .quick-dates {
              display: flex;
              gap: 0.375em;
              padding: 0.75em 0;
              border-top: 1px solid rgba(0, 0, 0, 0.1);
              flex-wrap: wrap;
            }

            .quick-dates[hidden] {
              display: none;
            }

            .preset {
              padding: 0.375em 0.75em;
              border: 1px solid rgba(0, 0, 0, 0.1);
              border-radius: 1em;
              font-size: 0.8em;
              color: var(--datetime-muted);
            }

            .preset:hover {
              background: var(--datetime-accent);
              color: var(--datetime-bg);
              border-color: var(--datetime-accent);
            }

            /* Action Buttons */
            .actions {
              display: flex;
              gap: 0.5em;
              justify-content: space-between;
              padding-top: 0.75em;
              border-top: 1px solid rgba(0, 0, 0, 0.1);
            }

            .btn {
              border: 1px solid rgba(0, 0, 0, 0.1);
              background: var(--datetime-hover);
              border-radius: 0.5em;
              padding: 0.625em 1em;
              font-size: 0.875em;
              min-height: 2.5em;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              color: var(--datetime-text);
              transition: all 0.15s ease;
            }

            .btn:hover {
              background: rgba(0, 0, 0, 0.08);
              border-color: var(--datetime-accent);
            }

            .btn.primary {
              background: var(--datetime-accent);
              color: var(--datetime-bg);
              border-color: var(--datetime-accent);
            }

            .btn.primary:hover {
              opacity: 0.9;
            }

            /* Range Info */
            .range-info {
              padding: 0.5em 0.5em;
              margin-bottom: 0.75em;
              background: var(--datetime-hover);
              font-size: 0.8em;
              color: var(--datetime-muted);
              text-align: center;
            }
          </style>

          <div class="field">
            <div class="input" data-placeholder="Select date..."></div>
            <div class="input" hidden data-placeholder="End date..."></div>
            <button type="button" class="calendar-btn"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" /><path d="M8 14v4" /><path d="M12 14v4" /><path d="M16 14v4" /></svg></button>
          </div>

          <div class="panel" hidden>
            <div class="range-info" hidden>Click to select start date, then select end date</div>

            <div class="nav">
              <button class="prev"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l14 0" /><path d="M5 12l6 6" /><path d="M5 12l6 -6" /></svg></button>
              <div class="month-year">
                <span data-slot="month"></span>
                <span data-slot="year"></span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 9l4 -4l4 4" /><path d="M16 15l-4 4l-4 -4" /></svg>
              </div>
              <button class="next"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l14 0" /><path d="M19 12l-6 6" /><path d="M19 12l-6 -6" /></svg></button>
            </div>

            <div class="grid-container">
              <div class="grid"></div>
            </div>
            
            <div class="quick-dates" hidden></div>
            
            <div class="time" hidden>
              <select class="time-select hour-select"></select>
              <div class="time-separator">:</div>
              <select class="time-select minute-select"></select>
              <select class="ampm" hidden>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>

            <div class="actions">
              <button class="btn clear">Clear</button>
              <button class="btn primary apply">Apply</button>
            </div>
          </div>
        `;

    const inputs = this.shadowRoot.querySelectorAll('.input');
    this._input = inputs[0];
    this._toInput = inputs[1];
    this._btn = this.shadowRoot.querySelector('.calendar-btn');
    this._panel = this.shadowRoot.querySelector('.panel');
    this._gridContainer = this.shadowRoot.querySelector('.grid-container');
    this._grid = this.shadowRoot.querySelector('.grid');
    this._month = this.shadowRoot.querySelector('[data-slot="month"]');
    this._year = this.shadowRoot.querySelector('[data-slot="year"]');
    this._monthYearBtn = this.shadowRoot.querySelector('.month-year');
    this._timeWrap = this.shadowRoot.querySelector('.time');
    this._hourSelect = this.shadowRoot.querySelector('.hour-select');
    this._minuteSelect = this.shadowRoot.querySelector('.minute-select');
    this._ampm = this.shadowRoot.querySelector('.ampm');
    this._quickDates = this.shadowRoot.querySelector('.quick-dates');
    this._rangeInfo = this.shadowRoot.querySelector('.range-info');
    this._hidden = null;
    this._hiddenTo = null;
    this._currentField = 'from';
    this._rangeState = null; // 'selecting-from', 'selecting-to', or null
  }

  connectedCallback() {
    this._bindEvents();
    this._render();
    if (this.name) this._ensureHidden();

    // Update styles based on theme after DOM is ready
    requestAnimationFrame(() => {
      this._updateTheme();
    });
  }

  _updateTheme(theme = null) {
    const currentTheme = theme || this.getAttribute('theme');

    // If no theme specified, check if we should inherit from host
    const shouldInherit = !currentTheme || currentTheme === 'inherit';

    if (shouldInherit) {
      this._applyInheritTheme();
    } else {
      this._applyNamedTheme(currentTheme);
    }
  }

  _applyInheritTheme() {
    // Set theme attribute to inherit if not already set
    if (!this.hasAttribute('theme')) {
      this.setAttribute('theme', 'inherit');
    }

    // Apply computed styles from host to shadow DOM
    const computedStyles = getComputedStyle(this);
    const inputs = this.shadowRoot.querySelectorAll('input');

    inputs.forEach(input => {
      input.style.setProperty('--datetime-input-color', computedStyles.color);
      input.style.setProperty('--datetime-input-font-size', computedStyles.fontSize);
      input.style.setProperty('--datetime-input-font-family', computedStyles.fontFamily);
    });

    // Update the host CSS custom properties
    this.style.setProperty('--datetime-input-background', computedStyles.backgroundColor);
    this.style.setProperty('--datetime-input-color', computedStyles.color);
    this.style.setProperty('--datetime-input-font-size', computedStyles.fontSize);
    this.style.setProperty('--datetime-input-font-family', computedStyles.fontFamily);
  }

  _applyNamedTheme(themeName) {
    // Future: implement named themes like 'dark', 'light', 'material', etc.
    // For now, remove inherit attribute if it was set
    if (this.getAttribute('theme') === 'inherit') {
      this.removeAttribute('theme');
    }

    if (themeName && themeName !== 'inherit') {
      this.setAttribute('theme', themeName);
    }
  }

  static get observedAttributes() {
    return [
      'name',
      'value',
      'mode',
      'time-format',
      'show-quick-dates',
      'quick-dates',
      'range',
      'range-to',
      'from-label',
      'to-label',
      'range-to-value',
      'theme',
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'theme') {
      this._updateTheme(newValue);
    }

    if (this.isConnected) {
      this._render();
    }
  }

  _bindEvents() {
    this._btn.addEventListener('click', () => {
      if (this.isRange) {
        this._currentField = 'from';
        this._rangeState = 'selecting-from';
      }
      this._updateFocusRing();
      this.toggle();
    });
    this._input.addEventListener('click', () => {
      if (this.isRange) {
        this._currentField = 'from';
        this._rangeState = 'selecting-from';
      }
      this._updateFocusRing();
      this.open();
    });

    // For range mode, clicking either input opens the picker
    this._toInput.addEventListener('click', () => {
      this._currentField = 'to';
      this._rangeState = 'selecting-to';
      this._updateFocusRing();
      this.open();
    });

    this.shadowRoot.querySelector('.prev').addEventListener('click', () => {
      this._handlePrevClick();
    });

    this.shadowRoot.querySelector('.next').addEventListener('click', () => {
      this._handleNextClick();
    });

    /* Month/Year title click to change view mode */
    this._monthYearBtn.addEventListener('click', () => {
      this._handleMonthYearClick();
    });

    /* Touch/swipe gestures for mobile */
    this._gridContainer.addEventListener('touchstart', (e) => {
      this._touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    this._gridContainer.addEventListener('touchend', (e) => {
      this._touchEndX = e.changedTouches[0].screenX;
      this._handleSwipe();
    }, { passive: true });

    this.shadowRoot.querySelector('.clear').addEventListener('click', () => {
      if (this.isRange) {
        // Clear the focused field only
        if (this._currentField === 'to') {
          this.rangeToValue = '';
        } else {
          this.value = '';
        }
      } else {
        this.value = '';
      }
      this._emitChange();
      this._render();
    });

    this.shadowRoot.querySelector('.apply').addEventListener('click', () => {
      this.close();
    });

    /* Time select change handlers */
    this._hourSelect.addEventListener('change', () => this._syncTime());
    this._minuteSelect.addEventListener('change', () => this._syncTime());
    this._ampm.addEventListener('change', () => this._syncTime());

    document.addEventListener('click', e => {
      if (!this.contains(e.target)) this.close();
    });
  }

  get mode() {
    return this.getAttribute('mode') || 'date';
  }
  set mode(v) {
    this.setAttribute('mode', v);
  }
  get value() {
    return this.getAttribute('value') || '';
  }
  set value(v) {
    v ? this.setAttribute('value', v) : this.removeAttribute('value');
  }
  get name() {
    return this.getAttribute('name');
  }
  set name(v) {
    v ? this.setAttribute('name', v) : this.removeAttribute('name');
  }
  get timeFormat() {
    return this.getAttribute('time-format') || '24';
  }
  set timeFormat(v) {
    this.setAttribute('time-format', v);
  }
  get showQuickDates() {
    return this.hasAttribute('show-quick-dates');
  }
  set showQuickDates(v) {
    v ? this.setAttribute('show-quick-dates', '') : this.removeAttribute('show-quick-dates');
  }
  get quickDates() {
    return this.getAttribute('quick-dates') || 'yesterday,today,tomorrow';
  }
  set quickDates(v) {
    this.setAttribute('quick-dates', v);
  }
  get isRange() {
    return this.hasAttribute('range');
  }
  set isRange(v) {
    v ? this.setAttribute('range', '') : this.removeAttribute('range');
  }
  get rangeTo() {
    return this.getAttribute('range-to');
  }
  set rangeTo(v) {
    v ? this.setAttribute('range-to', v) : this.removeAttribute('range-to');
  }
  get fromLabel() {
    return this.getAttribute('from-label') || 'From';
  }
  set fromLabel(v) {
    this.setAttribute('from-label', v);
  }
  get toLabel() {
    return this.getAttribute('to-label') || 'To';
  }
  set toLabel(v) {
    this.setAttribute('to-label', v);
  }
  get rangeToValue() {
    return this.getAttribute('range-to-value') || '';
  }
  set rangeToValue(v) {
    v ? this.setAttribute('range-to-value', v) : this.removeAttribute('range-to-value');
  }

  open() {
    this._panel.hidden = false;
    requestAnimationFrame(() => {
      this._panel.classList.add('open');
    });
  }

  close() {
    this._panel.classList.remove('open');
    /* Remove focus ring when panel closes */
    this._input.classList.remove('focused');
    this._toInput.classList.remove('focused');
    setTimeout(() => {
      this._panel.hidden = true;
    }, 150);
  }

  toggle() {
    this._panel.hidden ? this.open() : this.close();
  }

  _render() {
    this._renderMode();
    this._renderCalendar();
    this._renderTime();
    this._renderInput();
    this._renderQuickDates();
  }

  _renderMode() {
    if (this.isRange) {
      this._input.hidden = false;  // Show first input (from date)
      this._toInput.hidden = false;  // Show second input (to date)
      this._rangeInfo.hidden = false;

      // Update range info text based on current state
      if (!this.value) {
        this._rangeInfo.textContent = `Click to select start date`;
      } else if (!this.rangeToValue) {
        this._rangeInfo.textContent = `Start date selected. Now select end date`;
      } else {
        this._rangeInfo.textContent = `Range selected. Click dates to modify.`;
      }
    } else {
      this._input.hidden = false;  // Show first input
      this._toInput.hidden = true;  // Hide second input
      this._rangeInfo.hidden = true;
    }
  }

  _renderCalendar() {
    const config = this._modeConfig[this.mode];

    /* Show/hide calendar and navigation based on mode config */
    this.shadowRoot.querySelector('.nav').hidden = !config.showCalendar;
    this._gridContainer.hidden = !config.showCalendar;

    if (!config.showCalendar) return;

    const year = this._view.getFullYear();
    const month = this._view.getMonth();

    /* Update title based on view mode */
    if (this._viewMode === 'year') {
      const startYear = year - 5;
      const endYear = year + 6;
      this._month.textContent = `${startYear} - ${endYear}`;
      this._year.textContent = '';
    } else if (this._viewMode === 'month') {
      this._month.textContent = String(year);
      this._year.textContent = '';
    } else {
      this._month.textContent = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(this._view);
      this._year.textContent = String(year);
    }

    /* Handle animation if navigating */
    if (this._navigationDirection && !this._animating) {
      this._animating = true;

      /* Clone current grid as the old grid */
      const oldGrid = this._grid.cloneNode(true);
      oldGrid.classList.add('grid--animating', `grid--${this._navigationDirection}`);

      /* Add old grid to container */
      this._gridContainer.appendChild(oldGrid);

      /* Prepare new grid with direction and 'in' class BEFORE RAF */
      this._grid.classList.add(`grid--${this._navigationDirection}`, 'grid--in');

      /* Trigger animation in next frame */
      requestAnimationFrame(() => {
        /* Add animating and out classes to start transition */
        oldGrid.classList.add('animating', 'grid--out');

        /* Start new grid transition */
        this._grid.classList.add('animating');
        this._grid.classList.remove('grid--in');

        /* Clean up after animation */
        setTimeout(() => {
          oldGrid.remove();
          this._grid.classList.remove('animating', `grid--${this._navigationDirection}`);
          this._animating = false;
          this._navigationDirection = null;
        }, 500);
      });
    }

    /* Route to correct view */
    if (this._viewMode === 'month') {
      this._renderMonthPicker();
      return;
    }
    if (this._viewMode === 'year') {
      this._renderYearPicker();
      return;
    }

    /* Day view (original calendar rendering) */
    const today = new Date();
    const selected = this.value ? new Date(this.value) : null;

    this._grid.classList.remove('month-view', 'year-view');

    const first = new Date(year, month, 1);
    const startDay = (first.getDay() - this._weekStart + 7) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    this._grid.innerHTML = '';

    // Weekday headers
    for (let d = 0; d < 7; d++) {
      const slotDay = (d + this._weekStart) % 7;
      const el = document.createElement('div');
      el.className = 'wd';
      el.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(
        new Date(2020, 5, slotDay + 1)
      );
      this._grid.appendChild(el);
    }

    // Empty cells
    for (let i = 0; i < startDay; i++) {
      this._grid.appendChild(document.createElement('div'));
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dt = new Date(year, month, day);
      const btn = document.createElement('button');
      btn.className = 'day';
      btn.textContent = String(day);

      if (dt.toDateString() === today.toDateString()) btn.classList.add('today');

      if (this.isRange) {
        // Range selection highlighting
        const fromDate = this.value ? new Date(this.value) : null;
        const toDate = this.rangeToValue ? new Date(this.rangeToValue) : null;

        if (fromDate && dt.toDateString() === fromDate.toDateString()) {
          btn.classList.add('range-start');
        }
        if (toDate && dt.toDateString() === toDate.toDateString()) {
          btn.classList.add('range-end');
        }

        // Highlight dates in between (if both dates exist)
        if (fromDate && toDate && dt > fromDate && dt < toDate) {
          btn.classList.add('in-range');
        }
      } else {
        // Single selection highlighting
        if (selected && dt.toDateString() === selected.toDateString())
          btn.classList.add('selected');
      }

      btn.addEventListener('click', () => {
        if (this.isRange) {
          // Apply date to the currently focused field
          const newDateISO =
            this.mode === 'date'
              ? new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).toISOString()
              : (() => {
                  const cur = new Date();
                  cur.setFullYear(dt.getFullYear(), dt.getMonth(), dt.getDate());
                  if (this.mode === 'datetime') {
                    cur.setHours(9, 0, 0, 0); // Default time
                  }
                  return cur.toISOString();
                })();

          // Apply to the focused field
          if (this._currentField === 'to') {
            this.rangeToValue = newDateISO;
            // Validate: if to-date is before from-date, swap them
            if (this.value && new Date(newDateISO) < new Date(this.value)) {
              this.rangeToValue = this.value;
              this.value = newDateISO;
            }
          } else {
            // Selecting "from" date
            const wasEmpty = !this.value && !this.rangeToValue;
            this.value = newDateISO;
            // Validate: if from-date is after to-date, swap them
            if (this.rangeToValue && new Date(newDateISO) > new Date(this.rangeToValue)) {
              this.value = this.rangeToValue;
              this.rangeToValue = newDateISO;
            }
            // Auto-focus "to" field after first "from" selection
            if (wasEmpty) {
              this._currentField = 'to';
              this._rangeState = 'selecting-to';
            }
          }

          this._emitChange();
          this._render();
          this._updateFocusRing();
        } else {
          // Single date mode (original logic)
          if (this.mode === 'date') {
            this.value = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).toISOString();
            this._emitChange();
            this.close();
          } else {
            const cur = this.value ? new Date(this.value) : new Date();
            cur.setFullYear(dt.getFullYear(), dt.getMonth(), dt.getDate());
            this.value = cur.toISOString();
            this._emitChange();
            this._render();
          }
        }
      });

      this._grid.appendChild(btn);
    }
  }

  /* Unified navigation handler */
  _handleNavigation(direction) {
    this._navigationDirection = direction;
    const delta = direction === 'next' ? 1 : -1;

    const operations = {
      year: () => this._view.setFullYear(this._view.getFullYear() + (12 * delta)),
      month: () => this._view.setFullYear(this._view.getFullYear() + delta),
      day: () => this._view.setMonth(this._view.getMonth() + delta)
    };

    operations[this._viewMode]();
    this._render();
  }

  _handlePrevClick() {
    this._handleNavigation('prev');
  }

  _handleNextClick() {
    this._handleNavigation('next');
  }

  _handleMonthYearClick() {
    if (this._viewMode === 'day') {
      this._viewMode = 'month';
    } else if (this._viewMode === 'month') {
      this._viewMode = 'year';
    }
    this._render();
  }

  _handleSwipe() {
    const swipeDistance = this._touchEndX - this._touchStartX;
    const threshold = 50;
    if (Math.abs(swipeDistance) < threshold) return;

    if (swipeDistance > 0) {
      this._handlePrevClick();
    } else {
      this._handleNextClick();
    }
  }

  /* Month picker view */
  _renderMonthPicker() {
    const year = this._view.getFullYear();
    const selected = this.value ? new Date(this.value) : null;
    const today = new Date();

    this._grid.innerHTML = '';
    this._grid.classList.add('month-view');
    this._grid.classList.remove('year-view');

    /* Render 12 months */
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthDate = new Date(year, monthIndex, 1);
      const btn = document.createElement('button');
      btn.className = 'month';
      btn.textContent = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(monthDate);

      if (monthDate.getMonth() === today.getMonth() && monthDate.getFullYear() === today.getFullYear()) {
        btn.classList.add('today');
      }

      if (selected && monthDate.getMonth() === selected.getMonth() && monthDate.getFullYear() === selected.getFullYear()) {
        btn.classList.add('selected');
      }

      btn.addEventListener('click', () => {
        this._view.setMonth(monthIndex);
        this._viewMode = 'day';
        this._render();
      });

      this._grid.appendChild(btn);
    }
  }

  /* Year picker view */
  _renderYearPicker() {
    const currentYear = this._view.getFullYear();
    const selected = this.value ? new Date(this.value) : null;
    const today = new Date();

    this._grid.innerHTML = '';
    this._grid.classList.add('year-view');
    this._grid.classList.remove('month-view');

    /* Show 12-year range (3x4 grid like months) */
    const startYear = currentYear - 5;
    for (let i = 0; i < 12; i++) {
      const year = startYear + i;
      const btn = document.createElement('button');
      btn.className = 'year';
      btn.textContent = String(year);

      if (year === today.getFullYear()) {
        btn.classList.add('today');
      }

      if (selected && year === selected.getFullYear()) {
        btn.classList.add('selected');
      }

      btn.addEventListener('click', () => {
        this._view.setFullYear(year);
        this._viewMode = 'month';
        this._render();
      });

      this._grid.appendChild(btn);
    }
  }

  _renderTime() {
    const showTime = this.mode === 'datetime' || this.mode === 'time';
    this._timeWrap.hidden = !showTime;

    if (!showTime) return;

    /* Remove border-top for time-only mode since there's no calendar above */
    if (this.mode === 'time') {
      this._timeWrap.style.borderTop = 'none';
      this._timeWrap.style.paddingTop = '0';
    } else {
      this._timeWrap.style.borderTop = '';
      this._timeWrap.style.paddingTop = '';
    }

    const is12Hour = this.timeFormat === '12';
    this._ampm.hidden = !is12Hour;

    /* Build hour select options */
    this._hourSelect.innerHTML = '';
    const hourRange = is12Hour ? 12 : 24;
    const hourStart = is12Hour ? 1 : 0;

    for (let h = hourStart; h < (is12Hour ? hourStart + 12 : hourRange); h++) {
      const option = document.createElement('option');
      option.value = h;
      option.textContent = String(h).padStart(2, '0');
      this._hourSelect.appendChild(option);
    }

    /* Build minute select options */
    this._minuteSelect.innerHTML = '';
    const minuteStep = this._step || 15; /* Default 15-minute increments */

    for (let m = 0; m < 60; m += minuteStep) {
      const option = document.createElement('option');
      option.value = m;
      option.textContent = String(m).padStart(2, '0');
      this._minuteSelect.appendChild(option);
    }

    /* Set current values based on the focused field in range mode */
    let valueToUse;
    if (this.isRange && this._currentField === 'to') {
      valueToUse = this.rangeToValue;
    } else {
      valueToUse = this.value;
    }

    if (valueToUse) {
      const date = new Date(valueToUse);

      if (is12Hour) {
        let hours = date.getHours();
        this._ampm.value = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        this._hourSelect.value = hours;
      } else {
        this._hourSelect.value = date.getHours();
      }

      /* Select closest minute based on step */
      const currentMinute = date.getMinutes();
      const closestMinute = Math.round(currentMinute / minuteStep) * minuteStep;
      this._minuteSelect.value = closestMinute >= 60 ? 0 : closestMinute;
    }
  }

  _renderInput() {
    /* Set format options based on mode */
    let opts;
    if (this.mode === 'date') {
      opts = { dateStyle: 'medium' };
    } else if (this.mode === 'time') {
      opts = { timeStyle: 'short' };
    } else {
      opts = { dateStyle: 'medium', timeStyle: 'short' };
    }

    if (this.isRange) {
      // Handle range: first input = from, second input = to
      if (this.value) {
        const fromDate = new Date(this.value);
        this._input.textContent = new Intl.DateTimeFormat(undefined, opts).format(fromDate);
      } else {
        this._input.textContent = '';
        const placeholder = this.mode === 'date' ? 'Start date...' : this.mode === 'time' ? 'Start time...' : 'Start date & time...';
        this._input.setAttribute('data-placeholder', placeholder);
      }

      if (this.rangeToValue) {
        const toDate = new Date(this.rangeToValue);
        this._toInput.textContent = new Intl.DateTimeFormat(undefined, opts).format(toDate);
      } else {
        this._toInput.textContent = '';
        const placeholder = this.mode === 'date' ? 'End date...' : this.mode === 'time' ? 'End time...' : 'End date & time...';
        this._toInput.setAttribute('data-placeholder', placeholder);
      }
    } else {
      // Handle single input
      if (this.value) {
        const date = new Date(this.value);
        this._input.textContent = new Intl.DateTimeFormat(undefined, opts).format(date);
      } else {
        this._input.textContent = '';
        const placeholder = this.mode === 'date' ? 'Select date...' : this.mode === 'time' ? 'Select time...' : 'Select date & time...';
        this._input.setAttribute('data-placeholder', placeholder);
      }
    }
  }

  _renderQuickDates() {
    /* Hide quick dates for time-only mode */
    const shouldShow = this.showQuickDates && this.mode !== 'time';
    this._quickDates.hidden = !shouldShow;

    if (shouldShow) {
      const dates = this.quickDates.split(',').map(s => s.trim());
      const dateMap = {
        yesterday: { days: -1, label: 'Yesterday' },
        today: { days: 0, label: 'Today' },
        tomorrow: { days: 1, label: 'Tomorrow' },
      };

      this._quickDates.innerHTML = '';

      dates.forEach(dateKey => {
        if (dateMap[dateKey]) {
          const btn = document.createElement('button');
          btn.className = 'preset';
          btn.textContent = dateMap[dateKey].label;
          btn.addEventListener('click', () => {
            const date = new Date();
            date.setDate(date.getDate() + dateMap[dateKey].days);

            if (this.mode === 'date') {
              this.value = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
              ).toISOString();
            } else {
              date.setHours(9, 0, 0, 0);
              this.value = date.toISOString();
            }

            /* Reset view to day mode and navigate to selected date */
            this._viewMode = 'day';
            this._view = new Date(date);

            this._emitChange();
            this._render();
            if (this.mode === 'date') this.close();
          });
          this._quickDates.appendChild(btn);
        }
      });
    }
  }

  _syncTime() {
    if (this.mode !== 'datetime' && this.mode !== 'time') return;

    /* Determine which field to update based on range mode and current field */
    let d;
    if (this.isRange && this._currentField === 'to') {
      d = this.rangeToValue ? new Date(this.rangeToValue) : new Date();
    } else {
      d = this.value ? new Date(this.value) : new Date();
    }

    let hours = parseInt(this._hourSelect.value) || 0;
    const minutes = parseInt(this._minuteSelect.value) || 0;

    if (this.timeFormat === '12') {
      const ampm = this._ampm.value;
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    }

    d.setHours(hours, minutes, 0, 0);

    /* Update the appropriate field based on range mode */
    if (this.isRange && this._currentField === 'to') {
      this.rangeToValue = d.toISOString();
    } else {
      this.value = d.toISOString();
    }

    this._emitChange();
    this._renderInput();
  }

  _ensureHidden() {
    if (!this._hidden) {
      this._hidden = document.createElement('input');
      this._hidden.type = 'hidden';
      this.appendChild(this._hidden);
    }
    this._hidden.name = this.name;
    this._hidden.value = this.value;

    // Create second hidden input for range mode
    if (this.isRange && this.rangeTo) {
      if (!this._hiddenTo) {
        this._hiddenTo = document.createElement('input');
        this._hiddenTo.type = 'hidden';
        this.appendChild(this._hiddenTo);
      }
      this._hiddenTo.name = this.rangeTo;
      this._hiddenTo.value = this.rangeToValue;
    }
  }

  _updateFocusRing() {
    // Remove focused class from both inputs
    this._input.classList.remove('focused');
    this._toInput.classList.remove('focused');

    // Add focused class to the current field
    if (this.isRange) {
      if (this._currentField === 'to') {
        this._toInput.classList.add('focused');
      } else {
        this._input.classList.add('focused');  // First input is "from" in range mode
      }
    } else {
      this._input.classList.add('focused');
    }
  }

  _emitChange() {
    if (this._hidden) this._hidden.value = this.value;
    if (this._hiddenTo) this._hiddenTo.value = this.rangeToValue;

    const eventDetail = this.isRange
      ? { value: this.value, toValue: this.rangeToValue, from: this.value, to: this.rangeToValue }
      : { value: this.value };

    this.dispatchEvent(new CustomEvent('change', { detail: eventDetail }));
  }
}

customElements.define('p-datetime', PDatetime);

export { PDatetime as default };
