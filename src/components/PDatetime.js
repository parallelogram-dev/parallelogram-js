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
 * - mode: "date" | "datetime" (default: "date") - Controls whether to show time picker
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

    this.shadowRoot.innerHTML = `
          <style>
            :host{
              display:inline-block;
              position:relative;
              box-sizing: border-box;
            }

            .field{
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              display:flex;
              align-items:center;
              gap:.5rem;
              box-sizing: border-box;
            }

            /* CSS custom properties with theme/parent color inheritance */
            :host {
              --datetime-bg: var(--background-color, var(--color-surface, #fff));
              --datetime-border: var(--border-color, var(--color-border, #e5e7eb));
              --datetime-text: var(--text-color, var(--color-text, currentColor));
              --datetime-muted: var(--text-muted, var(--color-text-secondary, #666));
              --datetime-accent: var(--accent-color, var(--color-primary, #3b82f6));
              --datetime-primary: var(--primary-color, var(--color-emphasis, #111));
              --datetime-surface: var(--surface-color, var(--color-surface-secondary, #f8f9fb));
              --datetime-hover: var(--hover-bg, var(--color-surface-hover, #f8f9fb));
              --datetime-focus: var(--focus-color, var(--color-focus, #3b82f6));
            }

            /* Dark mode adjustments */
            @media (prefers-color-scheme: dark) {
              :host {
                --datetime-bg: var(--background-color, var(--color-surface, #1f2937));
                --datetime-border: var(--border-color, var(--color-border, #374151));
                --datetime-text: var(--text-color, var(--color-text, #f9fafb));
                --datetime-muted: var(--text-muted, var(--color-text-secondary, #9ca3af));
                --datetime-surface: var(--surface-color, var(--color-surface-secondary, #374151));
                --datetime-hover: var(--hover-bg, var(--color-surface-hover, #4b5563));
              }
            }

            /* Default standalone styles */
            :host(:not([theme="inherit"])) .field {
              padding: 0.75rem 1rem;
              border: 1px solid var(--datetime-border);
              border-radius: 6px;
              background: var(--datetime-bg);
              color: var(--datetime-text);
              height: 2.5rem;
              box-sizing: border-box;
            }

            /* When inheriting from parent, fill parent and inherit its styles */
            :host([theme="inherit"]) {
              width: 100%;
              min-height: 100%;
            }

            :host([theme="inherit"]) .field {
              background: inherit;
              color: inherit;
              font-family: inherit;
              font-size: inherit;
              border: inherit;
              border-radius: inherit;
              padding: inherit;
            }

            .panel{
              position:absolute; top:100%; left:0; margin-top:.5rem;
              background: var(--datetime-bg); border:1px solid var(--datetime-border);
              border-radius:var(--p-radius,12px); box-shadow:var(--p-shadow,0 10px 30px rgba(0,0,0,.12));
              padding:.75rem; z-index:1000; min-width:20rem;
              opacity:0; transform:translateY(-8px); transition:all 0.15s ease;
              pointer-events:none;
            }
            .panel.open{opacity:1; transform:translateY(0); pointer-events:all}
            .panel[hidden]{display:none}

            input{
              border: none;
              outline: none;
              background: transparent;
              color: inherit;
              font: inherit;
              flex: 1;
              width: 100%;
              padding: 0;
              min-width: 0;
            }

            /* Default standalone input styles */
            :host(:not([theme="inherit"])) input {
              padding: 0;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              background: #fff;
              color: #1f2937;
              font-size: 1rem;
            }

            :host(:not([theme="inherit"])) input:focus {
              border-color: #3b82f6;
              box-shadow: 0 0 0 3px rgba(59,130,246,.1);
            }

            input::placeholder {
              color: inherit;
              opacity: 0.6;
            }
            .calendar-btn{
              background:none;
              border:none;
              cursor:pointer;
              font-size:1.1rem;
              padding:.25rem;
              border-radius:.5rem;
              color: inherit;
              flex-shrink: 0;
              opacity: 0.7;
              margin-left: auto;
            }

            :host(:not([theme="inherit"])) .calendar-btn {
              color: var(--datetime-muted);
              padding: .5rem;
            }
            .calendar-btn:hover{background: var(--datetime-hover); color: var(--datetime-accent)}
            
            .nav{display:flex; align-items:center; justify-content:space-between; margin:0 0 .75rem}
            .nav button{background:none; border:none; cursor:pointer; padding:.5rem; border-radius:.5rem; color: var(--datetime-muted)}
            .nav button:hover{background: var(--datetime-hover)}
            .month-year{font-weight:600; cursor:pointer; padding:.25rem .5rem; border-radius:.5rem}
            .month-year:hover{background: var(--datetime-hover)}
            
            .grid{
              display:grid; grid-template-columns:repeat(7,1fr);
              gap:.125rem; justify-items:center; margin-bottom:.75rem;
            }
            .wd{font-size:.75rem; opacity:.6; font-weight:600; padding:.5rem 0; text-transform:uppercase}
            .day{
              width:100%; height:2.5rem; border-radius:.5rem; cursor:pointer;
              background:none; border:none; font-size:.875rem; color: inherit;
              transition:all 0.15s ease; display:flex; align-items:center; justify-content:center;
            }
            .day:hover{background: var(--datetime-hover); transform:scale(1.05)}
            .day.today{background: var(--datetime-accent); color: var(--datetime-bg)}
            .day.selected{background: var(--datetime-primary); color: var(--datetime-accent)}
            .day:disabled{opacity:.3; cursor:not-allowed}
            
            .time{
              display:flex; gap:.75rem; align-items:center; padding:.5rem 0;
              margin:.5rem 0;
            }
            .time-group{display:flex; flex-direction:column; align-items:center; gap:.5rem}
            .time-label{font-size:.7rem; text-transform:uppercase; color: var(--datetime-muted); font-weight:600}
            .time-controls{display:flex; align-items:center; gap:.25rem; background: var(--datetime-bg); border:1px solid var(--datetime-border); border-radius:.5rem; padding:.25rem}
            .time-btn{
              width:1.5rem; height:1.5rem; border:none; background: var(--datetime-surface);
              border-radius:.25rem; cursor:pointer; font-size:.8rem; display:flex; align-items:center; justify-content:center;
            }
            .time-btn:hover{background: var(--datetime-accent); color: var(--datetime-bg)}
            .time-input{
              width:3rem; text-align:center; border:none; background:transparent;
              outline:none; font-size:1.1rem; font-weight:600;
              -moz-appearance:textfield;
            }
            .time-input::-webkit-outer-spin-button,.time-input::-webkit-inner-spin-button{-webkit-appearance:none; margin:0}
            
            .ampm{background: var(--datetime-bg); border:1px solid var(--datetime-border); border-radius:.5rem; padding:.5rem; cursor:pointer}
            
            .quick-dates{display:flex; gap:.375rem; margin:.5rem 0; flex-wrap:wrap}
            .preset{
              padding:.375rem .75rem; background:none; border:1px solid var(--datetime-border);
              border-radius:1rem; font-size:.8rem; cursor:pointer; color: var(--datetime-muted);
            }
            .preset:hover{background: var(--datetime-accent); color: var(--datetime-bg); border-color: var(--datetime-accent)}
            
            .actions{display:flex; gap:.5rem; justify-content:flex-end; margin-top:.75rem}
            .btn{
              border:1px solid var(--datetime-border); background: var(--datetime-surface);
              border-radius:.5rem; padding:0.5rem 0.75rem; cursor:pointer; font-size:0.875rem;
              min-height: 2rem; display: inline-flex; align-items: center; justify-content: center;
              color: var(--datetime-text);
            }
            .btn:hover{background: var(--datetime-primary); color: var(--datetime-bg)}
            .btn.primary{background: var(--datetime-accent); color: var(--datetime-bg); border-color: var(--datetime-accent)}

            .range-fields{display:flex; gap:.5rem; align-items:flex-end}
            .range-field{flex:1}
            .range-label{display:block; font-size:.875rem; color: var(--datetime-text); margin-bottom:.5rem; font-weight:500}

            .day.range-start{background: var(--datetime-accent); color: var(--datetime-bg)}
            .day.range-end{background: var(--datetime-accent); color: var(--datetime-bg)}
            .day.in-range{background: var(--datetime-surface); color: var(--datetime-text)}
            .day.range-hover{background:rgba(59,130,246,0.1)}

            .range-info{
              padding:.5rem; background: var(--datetime-surface); border-radius:.5rem;
              margin-bottom:.75rem; font-size:.8rem; color: var(--datetime-muted); text-align:center;
            }
          </style>

          <div class="field">
            <input type="text" readonly class="single-input" />
            <div class="range-fields" hidden>
              <div class="range-field">
                <label class="range-label from-label">From</label>
                <input type="text" readonly class="from-input" />
              </div>
              <div class="range-field">
                <label class="range-label to-label">To</label>
                <input type="text" readonly class="to-input" />
              </div>
            </div>
            <button type="button" class="calendar-btn">📅</button>
          </div>
          
          <div class="panel" hidden>
            <div class="range-info" hidden>Click to select start date, then select end date</div>

            <div class="nav">
              <button class="prev">‹</button>
              <div class="month-year">
                <span class="month"></span> <span class="year"></span>
              </div>
              <button class="next">›</button>
            </div>

            <div class="grid"></div>
            
            <div class="quick-dates" hidden></div>
            
            <div class="time" hidden>
              <div class="time-group">
                <div class="time-label">Hours</div>
                <div class="time-controls">
                  <button class="time-btn" data-field="hh" data-dir="-1">−</button>
                  <input class="time-input hh" type="number" min="0" max="23" value="00" />
                  <button class="time-btn" data-field="hh" data-dir="1">+</button>
                </div>
              </div>
              <div style="font-size:1.5rem; color: var(--datetime-muted)">:</div>
              <div class="time-group">
                <div class="time-label">Minutes</div>
                <div class="time-controls">
                  <button class="time-btn" data-field="mm" data-dir="-1">−</button>
                  <input class="time-input mm" type="number" min="0" max="59" value="00" />
                  <button class="time-btn" data-field="mm" data-dir="1">+</button>
                </div>
              </div>
              <div class="time-group ampm-group" hidden>
                <div class="time-label">Period</div>
                <select class="ampm">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
            
            <div class="actions">
              <button class="btn btn--sm today">Today</button>
              <button class="btn btn--sm clear">Clear</button>
              <button class="btn btn--sm primary apply">Apply</button>
            </div>
          </div>
        `;

    this._input = this.shadowRoot.querySelector('.single-input');
    this._fromInput = this.shadowRoot.querySelector('.from-input');
    this._toInput = this.shadowRoot.querySelector('.to-input');
    this._rangeFields = this.shadowRoot.querySelector('.range-fields');
    this._fromLabel = this.shadowRoot.querySelector('.from-label');
    this._toLabel = this.shadowRoot.querySelector('.to-label');
    this._btn = this.shadowRoot.querySelector('.calendar-btn');
    this._panel = this.shadowRoot.querySelector('.panel');
    this._grid = this.shadowRoot.querySelector('.grid');
    this._month = this.shadowRoot.querySelector('.month');
    this._year = this.shadowRoot.querySelector('.year');
    this._timeWrap = this.shadowRoot.querySelector('.time');
    this._hh = this.shadowRoot.querySelector('.hh');
    this._mm = this.shadowRoot.querySelector('.mm');
    this._ampm = this.shadowRoot.querySelector('.ampm');
    this._ampmGroup = this.shadowRoot.querySelector('.ampm-group');
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
      'theme',
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'theme':
        this._updateTheme(newValue);
        break;
      // ... other attribute cases would go here
    }
  }

  _bindEvents() {
    this._btn.addEventListener('click', () => {
      if (this.isRange) {
        this._currentField = 'from';
        this._rangeState = 'selecting-from';
      }
      this.toggle();
    });
    this._input.addEventListener('click', () => this.open());

    // For range mode, use unified popup approach
    this._fromInput.addEventListener('click', () => {
      if (this.isRange) {
        this._currentField = 'from';
        this._rangeState = 'selecting-from';
        this.open();
      }
    });
    this._toInput.addEventListener('click', () => {
      if (this.isRange) {
        this._currentField = 'to';
        this._rangeState = 'selecting-to';
        this.open();
      }
    });

    this.shadowRoot.querySelector('.prev').addEventListener('click', () => {
      this._view.setMonth(this._view.getMonth() - 1);
      this._render();
    });

    this.shadowRoot.querySelector('.next').addEventListener('click', () => {
      this._view.setMonth(this._view.getMonth() + 1);
      this._render();
    });

    this.shadowRoot.querySelector('.today').addEventListener('click', () => {
      const now = new Date();
      if (this.mode === 'date') {
        this.value = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else {
        now.setSeconds(0, 0);
        this.value = now.toISOString();
      }
      this._emitChange();
      this._render();
      if (this.mode === 'date') this.close();
    });

    this.shadowRoot.querySelector('.clear').addEventListener('click', () => {
      this.value = '';
      this._emitChange();
      this._render();
    });

    this.shadowRoot.querySelector('.apply').addEventListener('click', () => {
      this.close();
    });

    this.shadowRoot.querySelectorAll('.time-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const field = e.target.dataset.field;
        const dir = +e.target.dataset.dir;
        const input = this.shadowRoot.querySelector(`.${field}`);
        const current = +input.value || 0;
        const step = field === 'mm' ? this._step : 1;
        const max = field === 'hh' ? (this.timeFormat === '12' ? 12 : 23) : 59;
        const min = field === 'hh' && this.timeFormat === '12' ? 1 : 0;

        let newVal = current + dir * step;
        if (newVal < min) newVal = max;
        if (newVal > max) newVal = min;

        input.value = String(newVal).padStart(2, '0');
        this._syncTime();
      });
    });

    this._hh.addEventListener('change', () => this._syncTime());
    this._mm.addEventListener('change', () => this._syncTime());
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

  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  static get observedAttributes() {
    return [
      'mode',
      'value',
      'name',
      'time-format',
      'show-quick-dates',
      'quick-dates',
      'range',
      'range-to',
      'from-label',
      'to-label',
      'range-to-value',
    ];
  }

  open() {
    this._panel.hidden = false;
    requestAnimationFrame(() => {
      this._panel.classList.add('open');
    });
  }

  close() {
    this._panel.classList.remove('open');
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
      this._input.style.display = 'none';
      this._rangeFields.style.display = 'flex';
      this._rangeInfo.hidden = false;
      this._fromLabel.textContent = this.fromLabel;
      this._toLabel.textContent = this.toLabel;

      // Update range info text based on current state
      if (!this.value) {
        this._rangeInfo.textContent = `Click to select ${this.fromLabel.toLowerCase()}`;
      } else if (!this.rangeToValue) {
        this._rangeInfo.textContent = `${this.fromLabel} selected. Now select ${this.toLabel.toLowerCase()}`;
      } else {
        this._rangeInfo.textContent = `Range selected. Click dates to modify.`;
      }
    } else {
      this._input.style.display = 'block';
      this._rangeFields.style.display = 'none';
      this._rangeInfo.hidden = true;
    }
  }

  _renderCalendar() {
    const year = this._view.getFullYear();
    const month = this._view.getMonth();
    const today = new Date();
    const selected = this.value ? new Date(this.value) : null;

    this._month.textContent = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(
      this._view
    );
    this._year.textContent = String(year);

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
          // Unified range selection logic
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

          if (!this.value) {
            // First click: set start date
            this.value = newDateISO;
            this._currentField = 'to'; // Next click will be end date
          } else if (!this.rangeToValue) {
            // Second click: set end date
            if (new Date(newDateISO) < new Date(this.value)) {
              // If clicked date is before start, make it the new start
              this.rangeToValue = this.value;
              this.value = newDateISO;
            } else {
              // Normal case: set as end date
              this.rangeToValue = newDateISO;
            }

            if (this.mode === 'date') {
              this.close(); // Close after selecting range
            }
          } else {
            // Range already selected: determine which date to update based on proximity
            const fromDate = new Date(this.value);
            const toDate = new Date(this.rangeToValue);
            const clickedDate = new Date(newDateISO);

            const distanceToFrom = Math.abs(clickedDate - fromDate);
            const distanceToTo = Math.abs(clickedDate - toDate);

            if (distanceToFrom <= distanceToTo) {
              // Closer to start date: update start
              this.value = newDateISO;
              // Clear end if new start is after end
              if (new Date(newDateISO) > toDate) {
                this.rangeToValue = '';
              }
            } else {
              // Closer to end date: update end
              if (new Date(newDateISO) >= fromDate) {
                this.rangeToValue = newDateISO;
              }
            }
          }

          this._emitChange();
          this._render();
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

  _renderTime() {
    const showTime = this.mode === 'datetime';
    this._timeWrap.hidden = !showTime;

    if (showTime) {
      const is12Hour = this.timeFormat === '12';
      this._ampmGroup.hidden = !is12Hour;

      if (this.value) {
        const date = new Date(this.value);
        if (is12Hour) {
          let hours = date.getHours();
          this._ampm.value = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12 || 12;
          this._hh.value = String(hours).padStart(2, '0');
        } else {
          this._hh.value = String(date.getHours()).padStart(2, '0');
        }
        this._mm.value = String(date.getMinutes()).padStart(2, '0');
      }
    }
  }

  _renderInput() {
    const opts =
      this.mode === 'date' ? { dateStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' };

    if (this.isRange) {
      // Handle range inputs
      if (this.value) {
        const fromDate = new Date(this.value);
        this._fromInput.value = new Intl.DateTimeFormat(undefined, opts).format(fromDate);
      } else {
        this._fromInput.value = '';
        this._fromInput.placeholder =
          this.mode === 'date' ? 'Start date...' : 'Start date & time...';
      }

      if (this.rangeToValue) {
        const toDate = new Date(this.rangeToValue);
        this._toInput.value = new Intl.DateTimeFormat(undefined, opts).format(toDate);
      } else {
        this._toInput.value = '';
        this._toInput.placeholder = this.mode === 'date' ? 'End date...' : 'End date & time...';
      }
    } else {
      // Handle single input
      if (this.value) {
        const date = new Date(this.value);
        this._input.value = new Intl.DateTimeFormat(undefined, opts).format(date);
      } else {
        this._input.value = '';
        this._input.placeholder = this.mode === 'date' ? 'Select date...' : 'Select date & time...';
      }
    }
  }

  _renderQuickDates() {
    const shouldShow = this.showQuickDates;
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
    if (this.mode !== 'datetime') return;

    const d = this.value ? new Date(this.value) : new Date();
    let hours = +this._hh.value || 0;
    const minutes = +this._mm.value || 0;

    if (this.timeFormat === '12') {
      const ampm = this._ampm.value;
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    }

    d.setHours(hours, minutes, 0, 0);
    this.value = d.toISOString();
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
