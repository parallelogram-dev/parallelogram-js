import styles from '../styles/framework/components/PDatetime.scss';

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
export default class PDatetime extends HTMLElement {
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
          <style>${styles}</style>

          <div class="field">
            <div class="input" data-datetime-input data-placeholder="Select date..."></div>
            <div class="input" data-datetime-input-to hidden data-placeholder="End date..."></div>
            <button type="button" class="calendar-btn" data-datetime-trigger><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" /><path d="M8 14v4" /><path d="M12 14v4" /><path d="M16 14v4" /></svg></button>
          </div>

          <div class="panel" data-datetime-panel hidden>
            <div class="range-info" data-datetime-range-info hidden>Click to select start date, then select end date</div>

            <div class="nav" data-datetime-nav>
              <button data-datetime-nav-btn="prev"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l14 0" /><path d="M5 12l6 6" /><path d="M5 12l6 -6" /></svg></button>
              <div class="month-year" data-datetime-month-year>
                <span data-slot="month"></span>
                <span data-slot="year"></span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 9l4 -4l4 4" /><path d="M16 15l-4 4l-4 -4" /></svg>
              </div>
              <button data-datetime-nav-btn="next"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l14 0" /><path d="M19 12l-6 6" /><path d="M19 12l-6 -6" /></svg></button>
            </div>

            <div class="grid-container" data-datetime-grid-container>
              <div class="grid" data-datetime-grid></div>
            </div>

            <div class="quick-dates" data-datetime-quick-dates hidden></div>

            <div class="time" data-datetime-time hidden>
              <select class="time-select" data-datetime-hour></select>
              <div class="time-separator">:</div>
              <select class="time-select" data-datetime-minute></select>
              <select class="ampm" data-datetime-ampm hidden>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>

            <div class="actions">
              <button class="btn" data-datetime-action="clear">Clear</button>
              <button class="btn primary" data-datetime-action="apply">Apply</button>
            </div>
          </div>
        `;

    this._input = this.shadowRoot.querySelector('[data-datetime-input]');
    this._toInput = this.shadowRoot.querySelector('[data-datetime-input-to]');
    this._btn = this.shadowRoot.querySelector('[data-datetime-trigger]');
    this._panel = this.shadowRoot.querySelector('[data-datetime-panel]');
    this._nav = this.shadowRoot.querySelector('[data-datetime-nav]');
    this._gridContainer = this.shadowRoot.querySelector('[data-datetime-grid-container]');
    this._grid = this.shadowRoot.querySelector('[data-datetime-grid]');
    this._month = this.shadowRoot.querySelector('[data-slot="month"]');
    this._year = this.shadowRoot.querySelector('[data-slot="year"]');
    this._monthYearBtn = this.shadowRoot.querySelector('[data-datetime-month-year]');
    this._timeWrap = this.shadowRoot.querySelector('[data-datetime-time]');
    this._hourSelect = this.shadowRoot.querySelector('[data-datetime-hour]');
    this._minuteSelect = this.shadowRoot.querySelector('[data-datetime-minute]');
    this._ampm = this.shadowRoot.querySelector('[data-datetime-ampm]');
    this._quickDates = this.shadowRoot.querySelector('[data-datetime-quick-dates]');
    this._rangeInfo = this.shadowRoot.querySelector('[data-datetime-range-info]');
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
      'format',
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

    /* Navigation buttons */
    this.shadowRoot.querySelectorAll('[data-datetime-nav-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        const direction = btn.getAttribute('data-datetime-nav-btn');
        this._handleNavigation(direction);
      });
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

    /* Action buttons */
    this.shadowRoot.querySelectorAll('[data-datetime-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-datetime-action');
        if (action === 'clear') {
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
        } else if (action === 'apply') {
          this.close();
        }
      });
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
  get format() {
    return this.getAttribute('format') || '';
  }
  set format(v) {
    v ? this.setAttribute('format', v) : this.removeAttribute('format');
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
    this._input.classList.remove('is-focused');
    this._toInput.classList.remove('is-focused');
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

  /**
   * Formats an ISO date string according to the format attribute
   * Supports tokens: yyyy, mm, dd, hh, ii, ss, tz, tzz
   * Supports presets: iso, iso-tz, us-date, us-datetime, eu-date, eu-datetime
   * @param {string} isoString - ISO 8601 date string
   * @returns {string} - Formatted date string
   */
  _formatDate(isoString) {
    if (!isoString || !this.format) return isoString;

    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    /* Check for preset formats */
    const presets = {
      'iso': 'yyyy-mm-dd',
      'iso-tz': 'yyyy-mm-ddThh:ii:sstzz',
      'iso-datetime': 'yyyy-mm-dd hh:ii:ss',
      'iso-datetime-tz': 'yyyy-mm-dd hh:ii:ss tz',
      'us-date': 'mm/dd/yyyy',
      'us-datetime': 'mm/dd/yyyy hh:ii:ss',
      'us-datetime-tz': 'mm/dd/yyyy hh:ii:ss tz',
      'eu-date': 'dd/mm/yyyy',
      'eu-datetime': 'dd/mm/yyyy hh:ii:ss',
      'eu-datetime-tz': 'dd/mm/yyyy hh:ii:ss tz',
      'mysql': 'yyyy-mm-dd hh:ii:ss',
    };

    let format = presets[this.format] || this.format;

    /* Extract date/time components */
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    /* Get timezone information */
    const getTimezoneOffset = () => {
      const offset = -date.getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const absOffset = Math.abs(offset);
      const tzHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
      const tzMinutes = String(absOffset % 60).padStart(2, '0');
      return `${sign}${tzHours}:${tzMinutes}`;
    };

    const getTimezoneOffsetISO = () => {
      const offset = -date.getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const absOffset = Math.abs(offset);
      const tzHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
      const tzMinutes = String(absOffset % 60).padStart(2, '0');
      return `${sign}${tzHours}${tzMinutes}`;
    };

    /* Replace tokens */
    return format
      .replace(/yyyy/g, year)
      .replace(/mm/g, month)
      .replace(/dd/g, day)
      .replace(/hh/g, hours)
      .replace(/ii/g, minutes)
      .replace(/ss/g, seconds)
      .replace(/tzz/g, getTimezoneOffsetISO())
      .replace(/tz/g, getTimezoneOffset());
  }

  _ensureHidden() {
    if (!this._hidden) {
      this._hidden = document.createElement('input');
      this._hidden.type = 'hidden';
      this.appendChild(this._hidden);
    }
    this._hidden.name = this.name;
    this._hidden.value = this.format ? this._formatDate(this.value) : this.value;

    /* Create second hidden input for range mode */
    if (this.isRange && this.rangeTo) {
      if (!this._hiddenTo) {
        this._hiddenTo = document.createElement('input');
        this._hiddenTo.type = 'hidden';
        this.appendChild(this._hiddenTo);
      }
      this._hiddenTo.name = this.rangeTo;
      this._hiddenTo.value = this.format ? this._formatDate(this.rangeToValue) : this.rangeToValue;
    }
  }

  _updateFocusRing() {
    // Remove focused class from both inputs
    this._input.classList.remove('is-focused');
    this._toInput.classList.remove('is-focused');

    // Add focused class to the current field
    if (this.isRange) {
      if (this._currentField === 'to') {
        this._toInput.classList.add('is-focused');
      } else {
        this._input.classList.add('is-focused');  // First input is "from" in range mode
      }
    } else {
      this._input.classList.add('is-focused');
    }
  }

  _emitChange() {
    if (this._hidden) {
      this._hidden.value = this.format ? this._formatDate(this.value) : this.value;
    }
    if (this._hiddenTo) {
      this._hiddenTo.value = this.format ? this._formatDate(this.rangeToValue) : this.rangeToValue;
    }

    const eventDetail = this.isRange
      ? { value: this.value, toValue: this.rangeToValue, from: this.value, to: this.rangeToValue }
      : { value: this.value };

    this.dispatchEvent(new CustomEvent('change', { detail: eventDetail }));
  }
}

customElements.define('p-datetime', PDatetime);
