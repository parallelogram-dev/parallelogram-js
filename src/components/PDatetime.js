import styles from '../styles/framework/components/PDatetime.scss';
import { adoptStyles, setStaticHTML } from '../utils/shadow.js';
import { followFocusSource } from '../utils/focus-source.js';
import { arrowLeft, arrowRight, calendar, iconMarkup, selector } from '../utils/icons.js';
import { text } from '../utils/text.js';

const formats = new Map();

/**
 * A cached Intl.DateTimeFormat in a locale; undefined is the browser's
 */
const dateFormat = (options, locale) => {
  const key = `${locale ?? ''}|${JSON.stringify(options)}`;
  if (!formats.has(key)) {
    formats.set(key, new Intl.DateTimeFormat(locale, options));
  }
  return formats.get(key);
};

/**
 * Create an element with attributes and text set through DOM APIs
 */
const node = (tag, attributes = {}, text) => {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
};

/**
 * The same day of the month `months` away, clamped to the length of the target month
 */
const addMonths = (date, months) => {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
};

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
 * <p-datetime name="meetingTime" mode="datetime" value="2024-01-15T14:30"></p-datetime>
 *
 * Date range picker:
 * <p-datetime name="eventDates" mode="date" range range-to="endDate" from-label="Start Date" to-label="End Date"></p-datetime>
 *
 * @attributes
 * - mode: "date" | "datetime" | "time" (default: "date") - Controls picker type (date, datetime, or time only)
 * - value: string - Current value (or start of the range) in local time, formatted like the matching
 *   native input: `yyyy-mm-dd` in date mode, `yyyy-mm-ddThh:mm` in datetime mode (as
 *   `datetime-local`) and `hh:mm` in time mode, with `:ss` added when the seconds are set. An ISO
 *   instant with `Z` or an offset is also read, as the local date and time it stands for.
 * - name: string - Form field name. The element is form-associated and submits its own value.
 * - time-format: "12" | "24" (default: "24") - Time display format
 * - show-quick-dates: boolean - Shows quick date preset buttons
 * - quick-dates: string - Comma-separated list of presets (yesterday,today,tomorrow)
 * - range: boolean - Enables date range mode with two date inputs
 * - range-to: string - Form field name for the end of the range
 * - from-label: string - Label for start date input (default: "From")
 * - to-label: string - Label for end date input (default: "To")
 * - range-to-value: string - End of the range, in the same format as value
 * - min: yyyy-mm-dd, a local date and time, or an ISO instant - Earliest selectable date; days
 *   before are disabled
 * - max: yyyy-mm-dd, a local date and time, or an ISO instant - Latest selectable date; days after
 *   are disabled
 * - min-from-field: string - Name of another field whose current value supplies the effective min (more restrictive of the two wins)
 * - max-from-field: string - Name of another field whose current value supplies the effective max
 * - format: string - Format of the submitted value: a preset (iso, iso-tz, iso-datetime,
 *   iso-datetime-tz, us-date, us-datetime, eu-date, eu-datetime, mysql) or tokens
 *   (yyyy mm dd hh ii ss tz tzz)
 * - required: boolean - The value (both ends in range mode) must be set for the form to submit
 * - disabled: boolean - Disables the picker; a disabled fieldset does the same
 *
 * @events
 * - change: Fired when the value changes. Bubbles and is composed. detail is
 *   `{ value, complete }`, or `{ value, toValue, from, to, complete }` in range mode, where
 *   `complete` is true once both ends of the range are set.
 * - p-datetime:open: Fired when the panel opens. detail is `{ value }` (plus `toValue` in range mode).
 * - p-datetime:close: Fired when the panel closes. detail is `{ changed, value }` (plus `toValue`),
 *   where `changed` says whether the value differs from when the panel opened.
 *
 * @accessibility
 * The value fields and the calendar button open a dialog. In the day grid, the arrow keys move by day
 * and week, Home and End go to the start and end of the week, Page Up and Page Down change month
 * (with Shift, year), Enter or Space picks the focused day, and Escape closes the dialog and returns
 * focus to the control that opened it. In the month and year views, the arrow keys move between
 * months or years and Home and End go to the start and end of the row. Moving focus outside the
 * component closes the dialog and leaves focus where it went.
 *
 * @cssprop --datetime-accent - focus rings, today, hovered buttons and the tint behind days in a range
 *   (default `var(--color-accent)`)
 * @cssprop --datetime-accent-strong - selected days and primary buttons, which carry text (default
 *   `var(--color-accent-hover)`)
 * @cssprop --datetime-bg, --datetime-text, --datetime-muted - field and panel background, text and
 *   muted text (defaults `var(--surface-dropdown-color-bg)`, `currentColor`, `var(--color-text-muted)`)
 * @cssprop --datetime-border, --datetime-radius, --datetime-shadow - panel border and dividers, corner
 *   radius and panel shadow (colours default to `var(--color-border)` and `var(--color-shadow)`)
 * @cssprop --datetime-control-border - border of the field and the time selects (default
 *   `var(--surface-control-border-color)`)
 * @cssprop --datetime-hover - background of hovered days and buttons (default `var(--color-hover)`)
 * @cssprop --datetime-cell-size - size of each day in the grid
 * @cssprop --datetime-panel-min-width - narrowest the panel gets
 * @cssprop --datetime-animation-duration - length of the panel animation
 *
 * @example
 * // JavaScript usage
 * const picker = document.querySelector('p-datetime');
 * picker.value = '2024-01-15T14:30';
 * picker.addEventListener('change', (e) => {
 *   // Handle the selected datetime value
 *   const selectedValue = e.detail.value;
 * });
 */
export default class PDatetime extends HTMLElement {
  static formAssociated = true;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._internals = this.attachInternals?.() ?? null;
    this._view = new Date();
    this._step = 15;
    this._weekStart = 1;
    this._viewMode = 'day'; /* 'day', 'month', 'year' */
    this._animating = false;
    this._navigationDirection = null; /* 'next' or 'prev' */
    this._touchStartX = 0;
    this._touchEndX = 0;

    /* Mode configuration centralizes mode-specific behavior */
    this._modeConfig = {
      date: {
        showCalendar: true,
        showTime: false,
        showQuickDates: true,
        formatOpts: { dateStyle: 'medium' },
      },
      datetime: {
        showCalendar: true,
        showTime: true,
        showQuickDates: true,
        formatOpts: { dateStyle: 'medium', timeStyle: 'short' },
      },
      time: {
        showCalendar: false,
        showTime: true,
        showQuickDates: false,
        formatOpts: { timeStyle: 'short' },
      },
    };

    setStaticHTML(
      this.shadowRoot,
      `
          <div class="field" part="field">
            <button type="button" class="input" part="input" data-datetime-input aria-haspopup="dialog" aria-expanded="false" data-placeholder="Select date..."></button>
            <button type="button" class="input" part="input" data-datetime-input-to aria-haspopup="dialog" aria-expanded="false" hidden data-placeholder="End date..."></button>
            <button type="button" class="calendar-btn" part="trigger" data-datetime-trigger aria-haspopup="dialog" aria-expanded="false" aria-label="Choose date">${iconMarkup(calendar, { size: 'sm' })}</button>
          </div>

          <div class="panel" part="panel" data-datetime-panel role="dialog" aria-label="Choose date" tabindex="-1" hidden>
            <div class="range-info" data-datetime-range-info aria-live="polite" hidden>Click to select start date, then select end date</div>

            <div class="nav" part="nav" data-datetime-nav>
              <button type="button" data-datetime-nav-btn="prev" aria-label="Previous month">${iconMarkup(arrowLeft, { size: 'sm' })}</button>
              <button type="button" class="month-year" part="month-year" id="month-year" data-datetime-month-year aria-live="polite">
                <span data-slot="month"></span>
                <span data-slot="year"></span>
                ${iconMarkup(selector, { size: 'sm' })}
              </button>
              <button type="button" data-datetime-nav-btn="next" aria-label="Next month">${iconMarkup(arrowRight, { size: 'sm' })}</button>
            </div>

            <div class="grid-container" data-datetime-grid-container>
              <div class="grid" part="grid" data-datetime-grid aria-labelledby="month-year"></div>
            </div>

            <div class="quick-dates" data-datetime-quick-dates hidden></div>

            <div class="time" data-datetime-time hidden>
              <select class="time-select" part="time-select" data-datetime-hour aria-label="Hour"></select>
              <div class="time-separator">:</div>
              <select class="time-select" part="time-select" data-datetime-minute aria-label="Minute"></select>
              <select class="ampm" part="time-select ampm" data-datetime-ampm aria-label="AM or PM" hidden>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>

            <div class="actions">
              <button type="button" class="btn" part="action" data-datetime-action="clear">Clear</button>
              <button type="button" class="btn primary" part="action primary" data-datetime-action="apply">Apply</button>
            </div>
          </div>
        `
    );
    adoptStyles(this.shadowRoot, styles);

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
    this._currentField = 'from';
    this._rangeState = null; /* 'selecting-from', 'selecting-to', or null */
    this._open = false;
    this._openedWith = null;
    this._hideTimer = null;
    this._connection = null;
    this._defaults = null;
    this._formDisabled = false;
    this._activeDate = null;
    this._opener = null;
    this._renderQueued = false;
    this._timeLists = null;
    this._presets = null;
    this._dayLayout = null;

    /* Listeners on the component's own shadow nodes are added once; document listeners are added
       on connect and removed on disconnect */
    this._bindEvents();
  }

  connectedCallback() {
    followFocusSource(this);
    this._connection = new AbortController();
    const { signal } = this._connection;

    /* Checked while capturing, before the panel's own click handlers re-render and detach the
       clicked control, so a click inside the panel is never mistaken for one outside it */
    document.addEventListener(
      'click',
      event => {
        if (this._open && !event.composedPath().includes(this)) {
          this.close();
        }
      },
      { capture: true, signal }
    );

    /* Close when focus moves to something outside the component. A focusout without a new target,
       such as when the window loses focus or a click lands on something unfocusable in the panel,
       leaves the panel open. */
    this.shadowRoot.addEventListener(
      'focusout',
      event => {
        const next = event.relatedTarget;
        if (this._open && next && !this.shadowRoot.contains(next)) {
          this.close();
        }
      },
      { signal }
    );

    this._bindLinkedFieldEvents(signal);
    this._render();
    if (!this._defaults) {
      this._defaults = { value: this.value, toValue: this.rangeToValue };
    }
    this._syncFormState();
  }

  disconnectedCallback() {
    this._connection?.abort();
    this._connection = null;
    this._unbindReposition();
  }

  /**
   * Re-renders the calendar when a field referenced by min-from-field or
   * max-from-field updates. Uses delegated listeners on document so we
   * don't need direct refs to siblings that may not exist at connect time.
   */
  _bindLinkedFieldEvents(signal) {
    if (!this.minFromField && !this.maxFromField) return;

    const listener = event => {
      const name = event.target?.getAttribute?.('name');
      if (event.target !== this && name && [this.minFromField, this.maxFromField].includes(name)) {
        this._render();
      }
    };

    document.addEventListener('change', listener, { capture: true, signal });
    document.addEventListener('input', listener, { capture: true, signal });
  }

  /** The text the picker shows: a site changes it here once, a page changes one with the attribute */
  static defaults = {
    dateNoun: 'date',
    datetimeNoun: 'date and time',
    timeNoun: 'time',
    placeholder: 'Select {what}...',
    fromPlaceholder: 'Start {what}...',
    toPlaceholder: 'End {what}...',
    chooseLabel: 'Choose {what}',
    chooseRangeLabel: 'Choose {what} range',
    valueLabel: '{label}: {value}',
    emptyValue: 'not set',
    fromLabel: 'From',
    toLabel: 'To',
    prevMonthLabel: 'Previous month',
    nextMonthLabel: 'Next month',
    prevYearLabel: 'Previous year',
    nextYearLabel: 'Next year',
    prevYearsLabel: 'Previous years',
    nextYearsLabel: 'Next years',
    hourLabel: 'Hour',
    minuteLabel: 'Minute',
    ampmLabel: 'AM or PM',
    clearLabel: 'Clear',
    applyLabel: 'Apply',
    rangeStartHint: 'Click to select start date',
    rangeEndHint: 'Start date selected. Now select end date',
    rangeDoneHint: 'Range selected. Click dates to modify.',
    yesterdayLabel: 'Yesterday',
    todayLabel: 'Today',
    tomorrowLabel: 'Tomorrow',
    requiredMessage: 'Please choose a {what}.',
    requiredRangeMessage: 'Please choose a start and end {what}.',
    minMessage: 'Please choose a date on or after {date}.',
    maxMessage: 'Please choose a date on or before {date}.',
  };

  static get observedAttributes() {
    return [
      'name',
      'date-noun',
      'datetime-noun',
      'time-noun',
      'placeholder',
      'from-placeholder',
      'to-placeholder',
      'choose-label',
      'choose-range-label',
      'value-label',
      'empty-value',
      'prev-month-label',
      'next-month-label',
      'prev-year-label',
      'next-year-label',
      'prev-years-label',
      'next-years-label',
      'hour-label',
      'minute-label',
      'ampm-label',
      'clear-label',
      'apply-label',
      'range-start-hint',
      'range-end-hint',
      'range-done-hint',
      'yesterday-label',
      'today-label',
      'tomorrow-label',
      'required-message',
      'required-range-message',
      'min-message',
      'max-message',
      'lang',
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
      'format',
      'required',
      'min',
      'max',
      'min-from-field',
      'max-from-field',
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    this._queueRender();
    this._syncFormState();
  }

  /**
   * Render once after a batch of attribute changes, unless a render happens first
   */
  _queueRender() {
    if (this._renderQueued) return;
    this._renderQueued = true;
    queueMicrotask(() => {
      if (this._renderQueued && this.isConnected) {
        this._render();
      }
      this._renderQueued = false;
    });
  }

  _bindEvents() {
    const editStart = () => {
      if (this.range) {
        this._currentField = 'from';
        this._rangeState = 'selecting-from';
      }
      this._updateFocusRing();
    };

    this._btn.addEventListener('click', () => {
      editStart();
      this.toggle();
    });
    this._input.addEventListener('click', () => {
      editStart();
      this.open();
    });
    this._toInput.addEventListener('click', () => {
      this._currentField = 'to';
      this._rangeState = 'selecting-to';
      this._updateFocusRing();
      this.open();
    });

    this.shadowRoot.querySelectorAll('[data-datetime-nav-btn]').forEach(button => {
      button.addEventListener('click', () => this._handleNavigation(button.dataset.datetimeNavBtn));
    });
    this._monthYearBtn.addEventListener('click', () => this._handleMonthYearClick());

    this._grid.addEventListener('click', event => this._onGridClick(event));
    this._grid.addEventListener('keydown', event => this._onGridKeydown(event));
    this.shadowRoot.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this._open) {
        event.preventDefault();
        event.stopPropagation();
        this.close({ returnFocus: true });
      }
    });

    /* Touch/swipe gestures for mobile */
    this._gridContainer.addEventListener(
      'touchstart',
      event => {
        this._touchStartX = event.changedTouches[0].screenX;
      },
      { passive: true }
    );
    this._gridContainer.addEventListener(
      'touchend',
      event => {
        this._touchEndX = event.changedTouches[0].screenX;
        this._handleSwipe();
      },
      { passive: true }
    );

    this.shadowRoot.querySelectorAll('[data-datetime-action]').forEach(button => {
      button.addEventListener('click', () => {
        if (button.dataset.datetimeAction === 'apply') {
          this.close({ returnFocus: true });
          return;
        }

        this.value = '';
        if (this.range) {
          this.rangeToValue = '';
          this._currentField = 'from';
          this._rangeState = 'selecting-from';
        }
        this._emitChange();
        this._render();
      });
    });

    this._hourSelect.addEventListener('change', () => this._syncTime());
    this._minuteSelect.addEventListener('change', () => this._syncTime());
    this._ampm.addEventListener('change', () => this._syncTime());
  }

  /**
   * Pick a day, or drill into a month or year, from a click in the calendar grid
   */
  _onGridClick(event) {
    const button = event.target.closest('button');
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;

    const { date, month, year } = button.dataset;
    if (date) {
      this._selectDate(this._parseValue(date));
    } else if (month !== undefined) {
      this._view = new Date(this._view.getFullYear(), Number(month), 1);
      this._viewMode = 'day';
      this._render();
    } else if (year !== undefined) {
      this._view = new Date(Number(year), this._view.getMonth(), 1);
      this._viewMode = 'month';
      this._render();
    }
  }

  /**
   * Keyboard navigation in the day grid, following the WAI-ARIA date picker dialog pattern
   */
  _onGridKeydown(event) {
    if (this._viewMode !== 'day') {
      this._onPickerKeydown(event);
      return;
    }

    const current = this._parseValue(event.target.dataset?.date);
    if (!current) return;

    const column = (current.getDay() - this._weekStart + 7) % 7;
    const moves = {
      ArrowLeft: () => new Date(current.getFullYear(), current.getMonth(), current.getDate() - 1),
      ArrowRight: () => new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1),
      ArrowUp: () => new Date(current.getFullYear(), current.getMonth(), current.getDate() - 7),
      ArrowDown: () => new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7),
      Home: () => new Date(current.getFullYear(), current.getMonth(), current.getDate() - column),
      End: () =>
        new Date(current.getFullYear(), current.getMonth(), current.getDate() + 6 - column),
      PageUp: () => addMonths(current, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(current, event.shiftKey ? 12 : 1),
    };

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (event.target.getAttribute('aria-disabled') !== 'true') {
        this._selectDate(current);
      }
      return;
    }

    if (!moves[event.key]) return;
    event.preventDefault();
    this._moveActiveDate(moves[event.key]());
  }

  _moveActiveDate(date) {
    this._activeDate = date;
    if (
      date.getFullYear() !== this._view.getFullYear() ||
      date.getMonth() !== this._view.getMonth()
    ) {
      this._view = new Date(date.getFullYear(), date.getMonth(), 1);
    }
    this._renderCalendar();
    this._focusActiveCell();
  }

  /**
   * Arrow keys, Home and End move between the months or years of the month and year views
   */
  _onPickerKeydown(event) {
    const cells = [...this._grid.querySelectorAll('[data-month], [data-year]')];
    const index = cells.indexOf(event.target);
    const rowStart = index - (index % 3);
    const target = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      ArrowUp: index - 3,
      ArrowDown: index + 3,
      Home: rowStart,
      End: rowStart + 2,
    }[event.key];
    if (index === -1 || target === undefined) return;

    event.preventDefault();
    const next = cells[Math.max(0, Math.min(cells.length - 1, target))];
    cells[index].tabIndex = -1;
    next.tabIndex = 0;
    next.focus({ preventScroll: true });
  }

  _focusActiveCell() {
    this._grid.querySelector('[tabindex="0"]')?.focus({ preventScroll: true });
  }

  /**
   * Apply a picked day to the value being edited
   */
  _selectDate(dt) {
    this._activeDate = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());

    if (!this.range && this.mode === 'date') {
      this.value = this._dateString(dt);
      this._emitChange();
      this.close({ returnFocus: true });
      return;
    }

    if (this.range) {
      const picked = this._pickedValue(dt);
      const pickedDate = this._parseValue(picked);
      if (this._currentField === 'to' && this.value && pickedDate >= this._parseValue(this.value)) {
        this.rangeToValue = picked;
      } else {
        /* A start date, or an end date before the start, begins the range here. An end that
           still follows it is kept, and the end is chosen next. */
        this.value = picked;
        if (this.rangeToValue && pickedDate > this._parseValue(this.rangeToValue)) {
          this.rangeToValue = '';
        }
        this._currentField = 'to';
        this._rangeState = 'selecting-to';
      }
    } else {
      const current = this._parseValue(this.value) ?? new Date(new Date().setSeconds(0, 0));
      current.setFullYear(dt.getFullYear(), dt.getMonth(), dt.getDate());
      this.value = this._valueString(current);
    }

    this._emitChange();
    this._render();
    this._updateFocusRing();
  }

  /**
   * The stored value for a picked day: `yyyy-mm-dd` in date mode, otherwise that day at 09:00
   */
  _pickedValue(dt) {
    return this._valueString(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 9));
  }

  get mode() {
    return this.getAttribute('mode') || 'date';
  }
  set mode(v) {
    this.setAttribute('mode', v);
  }
  get value() {
    return this._localValue(this.getAttribute('value'));
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
  get range() {
    return this.hasAttribute('range');
  }
  set range(v) {
    this.toggleAttribute('range', Boolean(v));
  }
  get rangeTo() {
    return this.getAttribute('range-to');
  }
  set rangeTo(v) {
    v ? this.setAttribute('range-to', v) : this.removeAttribute('range-to');
  }
  get fromLabel() {
    return this._text('from-label');
  }
  set fromLabel(v) {
    this.setAttribute('from-label', v);
  }
  get toLabel() {
    return this._text('to-label');
  }
  set toLabel(v) {
    this.setAttribute('to-label', v);
  }
  get rangeToValue() {
    return this._localValue(this.getAttribute('range-to-value'));
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
  get min() {
    return this.getAttribute('min') || '';
  }
  set min(v) {
    v ? this.setAttribute('min', v) : this.removeAttribute('min');
  }
  get max() {
    return this.getAttribute('max') || '';
  }
  set max(v) {
    v ? this.setAttribute('max', v) : this.removeAttribute('max');
  }
  get minFromField() {
    return this.getAttribute('min-from-field') || '';
  }
  set minFromField(v) {
    v ? this.setAttribute('min-from-field', v) : this.removeAttribute('min-from-field');
  }
  get maxFromField() {
    return this.getAttribute('max-from-field') || '';
  }
  set maxFromField(v) {
    v ? this.setAttribute('max-from-field', v) : this.removeAttribute('max-from-field');
  }

  /**
   * Parses a boundary string into a local-midnight Date, from any value `_parseValue` reads. An ISO
   * instant gives the local date it falls on, so `2026-05-19T14:00:00.000Z` is May 20 in UTC+10.
   *
   * @param {string} s
   * @returns {Date|null}
   */
  _parseBoundary(s) {
    const date = this._parseValue(s);
    return date && new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  /**
   * Locates a named form field. Prefers the closest <form> ancestor so
   * sibling pickers in different forms don't cross-pollute.
   */
  _findFieldByName(name) {
    if (!name) return null;
    const root = this.closest('form') || document;
    try {
      return root.querySelector(`[name="${CSS.escape(name)}"]`);
    } catch {
      return null;
    }
  }

  /**
   * Reads the current value off a linked field, such as an input or a sibling <p-datetime>
   */
  _readFieldValue(el) {
    if (!el) return '';
    return ('value' in el ? el.value : el.getAttribute('value')) || '';
  }

  /**
   * Resolves the effective min boundary by taking the more restrictive
   * (later) of the static `min` attribute and any value supplied via
   * `min-from-field`.
   */
  _effectiveMin() {
    const candidates = [this._parseBoundary(this.min)];
    if (this.minFromField) {
      candidates.push(
        this._parseBoundary(this._readFieldValue(this._findFieldByName(this.minFromField)))
      );
    }
    const valid = candidates.filter(d => d !== null);
    if (!valid.length) return null;
    return new Date(Math.max(...valid.map(d => d.getTime())));
  }

  /**
   * Resolves the effective max boundary (the earlier of the two, when both
   * static `max` and `max-from-field` are set).
   */
  _effectiveMax() {
    const candidates = [this._parseBoundary(this.max)];
    if (this.maxFromField) {
      candidates.push(
        this._parseBoundary(this._readFieldValue(this._findFieldByName(this.maxFromField)))
      );
    }
    const valid = candidates.filter(d => d !== null);
    if (!valid.length) return null;
    return new Date(Math.min(...valid.map(d => d.getTime())));
  }

  _isDayOutOfRange(dt, min, max) {
    const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
    if (min && d < min.getTime()) return true;
    if (max && d > max.getTime()) return true;
    return false;
  }

  open() {
    if (this._open || this._formDisabled) return;
    this._open = true;
    this._openedWith = { value: this.value, toValue: this.rangeToValue };
    clearTimeout(this._hideTimer);

    const active = this.shadowRoot.activeElement;
    this._opener = [this._input, this._toInput, this._btn].includes(active) ? active : this._input;

    this._alignViewToValue();
    this._activeDate = null;
    this._render();
    this._setExpanded(true);

    this._panel.hidden = false;
    requestAnimationFrame(() => {
      this._positionPanel();
      this._panel.classList.add('open');
      this._bindReposition();
      if (this._open) {
        this._focusInitial();
      }
    });

    this.dispatchEvent(
      new CustomEvent('p-datetime:open', {
        bubbles: true,
        composed: true,
        detail: this._eventValues(),
      })
    );
  }

  _focusInitial() {
    if (this._modeConfig[this.mode]?.showCalendar === false) {
      this._hourSelect.focus({ preventScroll: true });
    } else {
      this._focusActiveCell();
    }
  }

  _setExpanded(expanded) {
    for (const control of [this._input, this._toInput, this._btn]) {
      control.setAttribute('aria-expanded', String(expanded));
    }
  }

  /**
   * Show the month of the value being edited when the panel opens. Without a value, fall back to a
   * month the min/max boundaries allow.
   */
  _alignViewToValue() {
    const editing =
      this.range && this._currentField === 'to' ? this.rangeToValue || this.value : this.value;
    const date = this._parseBoundary(editing);
    if (!date) {
      this._alignViewToBoundary();
      return;
    }

    this._view = new Date(date.getFullYear(), date.getMonth(), 1);
    this._viewMode = 'day';
  }

  _eventValues() {
    return this.range ? { value: this.value, toValue: this.rangeToValue } : { value: this.value };
  }

  /**
   * Picks an opening view based on min/max boundaries when the field is
   * empty. If a `min-from-field` (or static min) is later than today,
   * land on the month containing min + 1 day — the earliest selectable
   * date. Mirror behaviour for max-from-field running in the other
   * direction. No-op when the field already has a value or no boundary
   * applies.
   */
  _alignViewToBoundary() {
    if (this.value) return;

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const min = this._effectiveMin();
    const max = this._effectiveMax();

    /* Prefer the more restrictive boundary when both are set. */
    let target = null;
    if (min && min.getTime() > todayMidnight.getTime()) {
      target = new Date(min.getFullYear(), min.getMonth(), min.getDate() + 1);
    } else if (max && max.getTime() < todayMidnight.getTime()) {
      target = new Date(max.getFullYear(), max.getMonth(), max.getDate());
    }

    if (target) this._view = target;
  }

  /**
   * Close the panel. Focus returns to the control that opened it when `returnFocus` is set or when
   * focus was inside the panel.
   */
  close({ returnFocus = false } = {}) {
    if (!this._open) return;
    this._open = false;

    const focusWasInside = this._panel.contains(this.shadowRoot.activeElement);
    this._panel.classList.remove('open');
    this._input.classList.remove('is-focused');
    this._toInput.classList.remove('is-focused');
    this._unbindReposition();
    this._setExpanded(false);
    clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => {
      this._panel.hidden = true;
      this._panel.classList.remove('panel--above', 'panel--align-right');
    }, 150);

    if (returnFocus || focusWasInside) {
      (this._opener ?? this._input).focus({ preventScroll: true });
    }

    const opened = this._openedWith ?? {};
    const changed =
      this.value !== opened.value || (this.range && this.rangeToValue !== opened.toValue);
    this.dispatchEvent(
      new CustomEvent('p-datetime:close', {
        bubbles: true,
        composed: true,
        detail: { changed, ...this._eventValues() },
      })
    );
  }

  /**
   * Flips the panel above the host when it doesn't fit below but does fit above, and right-aligns
   * it when the left-anchored panel would overflow the right edge. A panel that fits neither way
   * stays below, where scrolling reaches it, rather than being cut off at the top of the viewport.
   * Re-evaluated on open and on any scroll/resize while the panel is open.
   */
  _positionPanel() {
    /* Reset any prior flip so measurements reflect the default placement */
    this._panel.classList.remove('panel--above', 'panel--align-right');

    const hostRect = this.getBoundingClientRect();
    const panelRect = this._panel.getBoundingClientRect();
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const viewportW = window.innerWidth || document.documentElement.clientWidth;

    const spaceBelow = viewportH - hostRect.bottom;
    const spaceAbove = hostRect.top;

    if (panelRect.height > spaceBelow && panelRect.height <= spaceAbove) {
      this._panel.classList.add('panel--above');
    }

    if (hostRect.left + panelRect.width > viewportW) {
      this._panel.classList.add('panel--align-right');
    }
  }

  /**
   * Listens for scroll (any scrolling ancestor — capture phase) and viewport
   * resize while the panel is open, re-evaluating placement on each.
   * rAF-throttled so a fast scroll only triggers one measurement per frame.
   */
  _bindReposition() {
    if (this._repositionHandler) return;

    let pending = false;
    this._repositionHandler = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        if (!this._panel.hidden) this._positionPanel();
      });
    };

    window.addEventListener('scroll', this._repositionHandler, true);
    window.addEventListener('resize', this._repositionHandler);
  }

  _unbindReposition() {
    if (!this._repositionHandler) return;
    window.removeEventListener('scroll', this._repositionHandler, true);
    window.removeEventListener('resize', this._repositionHandler);
    this._repositionHandler = null;
  }

  toggle() {
    this._open ? this.close() : this.open();
  }

  /**
   * The language for month and weekday names and formatted values: the nearest lang, else the
   * browser's, which Intl reads as undefined
   */
  get _locale() {
    const lang = this.closest('[lang]')?.getAttribute('lang');
    if (!lang) return undefined;
    /* The page decides the language and the visitor keeps their own region's conventions when
       the page names none: <html lang="en"> shows an Australian 15 Jan 2024, not an American
       Jan 15, and only lang="en-US" asks for the latter */
    try {
      const page = new Intl.Locale(lang);
      const own = new Intl.Locale(new Intl.DateTimeFormat().resolvedOptions().locale);
      return !page.region && own.language === page.language ? undefined : lang;
    } catch {
      return lang;
    }
  }

  /**
   * One of the picker's strings, from the attribute or the class default, with {name} filled in
   */
  _text(name, values) {
    return text(this, name, values);
  }

  /** The mode's noun, for the sentences that name what is being chosen */
  _noun() {
    return this._text(`${this._modeConfig[this.mode] ? this.mode : 'date'}-noun`);
  }

  /**
   * The noun standing on its own as a label. Sentence-initial capitals are near enough universal
   * in the scripts that have them, and a no-op in the ones that don't, so this is derived rather
   * than asked for a second time
   */
  _nounLabel() {
    const noun = this._noun();
    return noun.charAt(0).toLocaleUpperCase(this._locale) + noun.slice(1);
  }

  /** The labels and buttons the template stamps in English */
  _renderText() {
    const set = (selector, attribute, name) =>
      this.shadowRoot.querySelector(selector).setAttribute(attribute, this._text(name));
    set('[data-datetime-hour]', 'aria-label', 'hour-label');
    set('[data-datetime-minute]', 'aria-label', 'minute-label');
    set('[data-datetime-ampm]', 'aria-label', 'ampm-label');
    this.shadowRoot.querySelector('[data-datetime-action="clear"]').textContent =
      this._text('clear-label');
    this.shadowRoot.querySelector('[data-datetime-action="apply"]').textContent =
      this._text('apply-label');
  }

  _render() {
    this._renderQueued = false;
    this._renderText();
    this._renderMode();
    this._renderCalendar();
    this._renderTime();
    this._renderInput();
    this._renderQuickDates();
  }

  _renderMode() {
    const what = this._noun();
    this._btn.setAttribute('aria-label', this._text('choose-label', { what }));
    this._panel.setAttribute(
      'aria-label',
      this._text(this.range ? 'choose-range-label' : 'choose-label', { what })
    );

    if (this.range) {
      this._input.hidden = false; /* Show first input (from date) */
      this._toInput.hidden = false; /* Show second input (to date) */
      this._rangeInfo.hidden = false;

      /* Update range info text based on current state */
      if (!this.value) {
        this._rangeInfo.textContent = this._text('range-start-hint');
      } else if (!this.rangeToValue) {
        this._rangeInfo.textContent = this._text('range-end-hint');
      } else {
        this._rangeInfo.textContent = this._text('range-done-hint');
      }
    } else {
      this._input.hidden = false; /* Show first input */
      this._toInput.hidden = true; /* Hide second input */
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

    const [previous, next] = {
      day: ['prev-month-label', 'next-month-label'],
      month: ['prev-year-label', 'next-year-label'],
      year: ['prev-years-label', 'next-years-label'],
    }[this._viewMode];
    this._nav
      .querySelector('[data-datetime-nav-btn="prev"]')
      .setAttribute('aria-label', this._text(previous));
    this._nav
      .querySelector('[data-datetime-nav-btn="next"]')
      .setAttribute('aria-label', this._text(next));

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
      this._month.textContent = dateFormat({ month: 'long' }, this._locale).format(this._view);
      this._year.textContent = String(year);
    }

    /* Handle animation if navigating */
    if (this._navigationDirection && !this._animating) {
      this._animating = true;

      /* Snapshot the direction so cleanup doesn't read a stale value if
         the user flips direction mid-animation (rapid prev → next). */
      const animatingDirection = this._navigationDirection;

      /* Clone current grid as the old grid */
      const oldGrid = this._grid.cloneNode(true);
      oldGrid.classList.add('grid--animating', `grid--${animatingDirection}`);

      /* Add old grid to container */
      this._gridContainer.appendChild(oldGrid);

      /* Prepare new grid with direction and 'in' class BEFORE RAF */
      this._grid.classList.add(`grid--${animatingDirection}`, 'grid--in');

      /* Force a layout flush so the browser commits the translateX(±100%)
         start state. Without this, removing `grid--in` in the next rAF
         can collapse to a no-op transition (start == end), which is what
         we saw when only one of the two grids appeared to animate. */
      void this._grid.offsetWidth;

      /* Trigger animation in next frame */
      requestAnimationFrame(() => {
        /* Add animating and out classes to start transition */
        oldGrid.classList.add('animating', 'grid--out');

        /* Start new grid transition */
        this._grid.classList.add('animating');
        this._grid.classList.remove('grid--in');

        /* Wait for the transition to actually finish before cleaning up.
           Using transitionend (with a generous safety timeout) avoids the
           glitch where the fixed timer fired slightly before the CSS
           transition completed — removing the `animating` class then snaps
           the grid to its rest state via the `:not(grid--in):not(grid--out)`
           rule. Rapid navigation made this race more likely. */
        const finish = () => {
          if (this._cleanupTimer) {
            clearTimeout(this._cleanupTimer);
            this._cleanupTimer = null;
          }
          this._grid.removeEventListener('transitionend', onTransitionEnd);
          oldGrid.remove();
          this._grid.classList.remove(
            'animating',
            `grid--${animatingDirection}`,
            'grid--in',
            'grid--out'
          );
          this._animating = false;
          this._navigationDirection = null;
        };

        const onTransitionEnd = event => {
          if (event.target === this._grid && event.propertyName === 'transform') {
            finish();
          }
        };

        this._grid.addEventListener('transitionend', onTransitionEnd);
        /* Safety net — if transitionend never fires (e.g. reduced motion,
           interrupted transition), force cleanup after the animation
           duration plus a small buffer. */
        this._cleanupTimer = setTimeout(finish, 700);
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

    this._renderDays(year, month);
  }

  /**
   * Render the day grid as rows of gridcells, each holding a named day button with a roving tabindex.
   * The grid is built only when the month shown, the week start or the min and max change; otherwise
   * its day buttons are updated in place.
   */
  _renderDays(year, month) {
    const effMin = this._effectiveMin();
    const effMax = this._effectiveMax();
    const hadFocus = this._grid.contains(this.shadowRoot.activeElement);
    const layout = [year, month, this._weekStart, effMin?.getTime(), effMax?.getTime()].join('|');

    if (layout !== this._dayLayout) {
      this._dayLayout = layout;
      this._buildDays(year, month, effMin, effMax);
    }
    this._updateDays(this._resolveActiveDate(year, month));

    if (hadFocus) {
      this._focusActiveCell();
    }
  }

  /**
   * Build the weekday headers and a gridcell for each day of the month, with the days outside min and
   * max disabled
   */
  _buildDays(year, month, effMin, effMax) {
    this._grid.classList.remove('month-view', 'year-view');
    this._grid.setAttribute('role', 'grid');
    this._grid.replaceChildren();

    const header = node('div', { class: 'row', role: 'row' });
    for (let column = 0; column < 7; column++) {
      /* 7 June 2020 was a Sunday, matching getDay()'s numbering */
      const weekday = new Date(2020, 5, 7 + ((column + this._weekStart) % 7));
      header.append(
        node(
          'div',
          {
            class: 'wd',
            role: 'columnheader',
            'aria-label': dateFormat({ weekday: 'long' }, this._locale).format(weekday),
          },
          dateFormat({ weekday: 'narrow' }, this._locale).format(weekday)
        )
      );
    }
    this._grid.append(header);

    const leading = (new Date(year, month, 1).getDay() - this._weekStart + 7) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let row;

    for (let index = 0; index < leading + daysInMonth; index++) {
      if (index % 7 === 0) {
        row = node('div', { class: 'row', role: 'row' });
        this._grid.append(row);
      }

      const cell = node('div', { class: 'cell', role: 'gridcell' });
      row.append(cell);
      if (index < leading) continue;

      const dt = new Date(year, month, index - leading + 1);
      const button = node(
        'button',
        {
          type: 'button',
          class: 'day',
          part: 'day',
          'data-date': this._dateString(dt),
          'aria-label': dateFormat({ dateStyle: 'full' }, this._locale).format(dt),
        },
        String(dt.getDate())
      );

      if (this._isDayOutOfRange(dt, effMin, effMax)) {
        button.classList.add('disabled');
        button.setAttribute('aria-disabled', 'true');
      }

      cell.append(button);
    }
  }

  /**
   * Mark today, the selected day or range, and the day holding the roving tabindex
   *
   * @param {string} active - The `yyyy-mm-dd` date that takes focus in the grid
   */
  _updateDays(active) {
    const today = this._dateString(new Date());
    const from = this._parseValue(this.value);
    const to = this.range ? this._parseValue(this.rangeToValue) : null;
    const fromDate = from && this._dateString(from);
    const toDate = to && this._dateString(to);

    for (const button of this._grid.querySelectorAll('.day')) {
      const { date } = button.dataset;
      const dt = this._parseValue(date);
      const isFrom = date === fromDate;
      const isTo = date === toDate;

      button.tabIndex = date === active ? 0 : -1;
      button.classList.toggle('today', date === today);
      if (date === today) {
        button.setAttribute('aria-current', 'date');
      } else {
        button.removeAttribute('aria-current');
      }

      button.classList.toggle('selected', !this.range && isFrom);
      button.classList.toggle('range-start', this.range && isFrom);
      button.classList.toggle('range-end', this.range && isTo);
      button.classList.toggle(
        'in-range',
        Boolean(this.range && from && to && dt > from && dt < to)
      );
      button.parentElement.setAttribute('aria-selected', String(isFrom || isTo));
    }
  }

  /**
   * The day that holds keyboard focus in the month shown: the last focused day, the value being
   * edited, today, or the first of the month
   */
  _resolveActiveDate(year, month) {
    const inView = date => date && date.getFullYear() === year && date.getMonth() === month;
    const editing = this._parseValue(
      this.range && this._currentField === 'to' ? this.rangeToValue : this.value
    );
    const day = [this._activeDate, editing, new Date()].find(inView) ?? new Date(year, month, 1);
    this._activeDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    return this._dateString(this._activeDate);
  }

  /* Unified navigation handler */
  _handleNavigation(direction) {
    this._navigationDirection = direction;
    const months =
      { day: 1, month: 12, year: 144 }[this._viewMode] * (direction === 'next' ? 1 : -1);

    this._view = new Date(this._view.getFullYear(), this._view.getMonth() + months, 1);
    if (this._activeDate) {
      this._activeDate = addMonths(this._activeDate, months);
    }
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
    const selected = this._parseValue(this.value);
    const today = new Date();
    const effMin = this._effectiveMin();
    const effMax = this._effectiveMax();

    const buttons = [];

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthDate = new Date(year, monthIndex, 1);
      const monthEnd = new Date(year, monthIndex + 1, 0);
      const button = node(
        'button',
        {
          type: 'button',
          class: 'month',
          'data-month': String(monthIndex),
          'aria-label': dateFormat({ month: 'long', year: 'numeric' }, this._locale).format(
            monthDate
          ),
        },
        dateFormat({ month: 'short' }, this._locale).format(monthDate)
      );

      if (monthIndex === today.getMonth() && year === today.getFullYear()) {
        button.classList.add('today');
      }
      if (selected && monthIndex === selected.getMonth() && year === selected.getFullYear()) {
        button.classList.add('selected');
      }
      if ((effMax && monthDate > effMax) || (effMin && monthEnd < effMin)) {
        button.classList.add('disabled');
        button.setAttribute('aria-disabled', 'true');
      }

      buttons.push(button);
    }

    this._renderPickerCells(buttons, 'month-view');
  }

  /* Year picker view */
  _renderYearPicker() {
    const currentYear = this._view.getFullYear();
    const selected = this._parseValue(this.value);
    const today = new Date();
    const effMin = this._effectiveMin();
    const effMax = this._effectiveMax();
    const minYear = effMin ? effMin.getFullYear() : null;
    const maxYear = effMax ? effMax.getFullYear() : null;

    const buttons = [];

    for (let year = currentYear - 5; year < currentYear + 7; year++) {
      const button = node(
        'button',
        { type: 'button', class: 'year', 'data-year': String(year) },
        String(year)
      );

      if (year === today.getFullYear()) {
        button.classList.add('today');
      }
      if (selected && year === selected.getFullYear()) {
        button.classList.add('selected');
      }
      if ((minYear !== null && year < minYear) || (maxYear !== null && year > maxYear)) {
        button.classList.add('disabled');
        button.setAttribute('aria-disabled', 'true');
      }

      buttons.push(button);
    }

    this._renderPickerCells(buttons, 'year-view');
  }

  /**
   * Lay out month or year buttons in grid rows of three, with a roving tabindex on the selected
   * button, else today's, else the first
   */
  _renderPickerCells(buttons, viewClass) {
    const hadFocus = this._grid.contains(this.shadowRoot.activeElement);
    const has = name => button => button.classList.contains(name);
    const active = buttons.find(has('selected')) ?? buttons.find(has('today')) ?? buttons[0];

    this._grid.classList.remove('month-view', 'year-view');
    this._grid.classList.add(viewClass);
    this._grid.setAttribute('role', 'grid');
    this._grid.replaceChildren();
    this._dayLayout = null;

    buttons.forEach((button, index) => {
      if (index % 3 === 0) {
        this._grid.append(node('div', { class: 'row', role: 'row' }));
      }
      button.tabIndex = button === active ? 0 : -1;
      const cell = node('div', {
        class: 'cell',
        role: 'gridcell',
        'aria-selected': String(has('selected')(button)),
      });
      cell.append(button);
      this._grid.lastElementChild.append(cell);
    });

    if (hadFocus) {
      this._focusActiveCell();
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

    const minuteStep = this._step || 15; /* Default 15-minute increments */

    /* Build the hour and minute options only when the time format or step changes */
    const timeLists = `${is12Hour}:${minuteStep}`;
    if (timeLists !== this._timeLists) {
      this._timeLists = timeLists;

      this._hourSelect.replaceChildren();
      const hourRange = is12Hour ? 12 : 24;
      const hourStart = is12Hour ? 1 : 0;

      for (let h = hourStart; h < (is12Hour ? hourStart + 12 : hourRange); h++) {
        const option = document.createElement('option');
        option.value = h;
        option.textContent = String(h).padStart(2, '0');
        this._hourSelect.appendChild(option);
      }

      this._minuteSelect.replaceChildren();
      for (let m = 0; m < 60; m += minuteStep) {
        const option = document.createElement('option');
        option.value = m;
        option.textContent = String(m).padStart(2, '0');
        this._minuteSelect.appendChild(option);
      }
    }

    /* Set current values based on the focused field in range mode */
    let valueToUse;
    if (this.range && this._currentField === 'to') {
      valueToUse = this.rangeToValue;
    } else {
      valueToUse = this.value;
    }

    const date = this._parseValue(valueToUse);
    if (date) {
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
    } else {
      this._hourSelect.selectedIndex = 0;
      this._minuteSelect.selectedIndex = 0;
    }
  }

  _renderInput() {
    const { formatOpts } = this._modeConfig[this.mode] ?? this._modeConfig.date;
    const what = this._noun();
    const show = (field, value, placeholder, label) => {
      const date = this._parseValue(value);
      const shown = date ? dateFormat(formatOpts, this._locale).format(date) : '';
      field.textContent = shown;
      field.setAttribute('data-placeholder', this._text(placeholder, { what }));
      field.setAttribute(
        'aria-label',
        this._text('value-label', { label, value: shown || this._text('empty-value') })
      );
    };

    if (this.range) {
      show(this._input, this.value, 'from-placeholder', this.fromLabel);
      show(this._toInput, this.rangeToValue, 'to-placeholder', this.toLabel);
    } else {
      show(this._input, this.value, 'placeholder', this._fieldLabel());
    }
  }

  /**
   * The text of the form labels pointing at this element, or a name for the mode
   */
  _fieldLabel() {
    const text = [...(this.labels ?? [])]
      .map(label =>
        label.textContent
          .trim()
          .replace(/[:：]$/, '')
          .trim()
      )
      .filter(Boolean)
      .join(' ');
    return text || this._nounLabel();
  }

  _renderQuickDates() {
    /* Hide quick dates for time-only mode */
    const shouldShow = this.showQuickDates && this.mode !== 'time';
    this._quickDates.hidden = !shouldShow;

    if (!shouldShow) return;

    const effMin = this._effectiveMin();
    const effMax = this._effectiveMax();

    /* Build the presets only when the list, the boundaries or today's date change */
    const presets = [
      this.quickDates,
      effMin?.getTime(),
      effMax?.getTime(),
      this._dateString(new Date()),
      this._text('yesterday-label'),
      this._text('today-label'),
      this._text('tomorrow-label'),
    ].join('|');
    if (presets === this._presets) return;
    this._presets = presets;

    const dates = this.quickDates.split(',').map(s => s.trim());
    const dateMap = {
      yesterday: { days: -1, label: this._text('yesterday-label') },
      today: { days: 0, label: this._text('today-label') },
      tomorrow: { days: 1, label: this._text('tomorrow-label') },
    };

    this._quickDates.replaceChildren();

    dates.forEach(dateKey => {
      if (dateMap[dateKey]) {
        /* Skip presets that fall outside the allowed range */
        const preview = new Date();
        preview.setDate(preview.getDate() + dateMap[dateKey].days);
        if (this._isDayOutOfRange(preview, effMin, effMax)) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'preset';
        btn.textContent = dateMap[dateKey].label;
        btn.addEventListener('click', () => {
          const date = new Date();
          date.setDate(date.getDate() + dateMap[dateKey].days);

          if (this.mode !== 'date') {
            date.setHours(9, 0, 0, 0);
          }
          this.value = this._valueString(date);

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

  _syncTime() {
    if (this.mode !== 'datetime' && this.mode !== 'time') return;

    /* Determine which field to update based on range mode and current field */
    let d;
    if (this.range && this._currentField === 'to') {
      d = this._parseValue(this.rangeToValue) ?? new Date();
    } else {
      d = this._parseValue(this.value) ?? new Date();
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
    if (this.range && this._currentField === 'to') {
      this.rangeToValue = this._valueString(d);
    } else {
      this.value = this._valueString(d);
    }

    this._emitChange();
    this._renderInput();
  }

  /**
   * Formats a stored value according to the format attribute
   * Supports tokens: yyyy, mm, dd, hh, ii, ss, tz, tzz
   * Supports presets: iso, iso-tz, us-date, us-datetime, eu-date, eu-datetime
   * @param {string} value - A value `_parseValue` reads
   * @returns {string} - Formatted date string
   */
  _formatDate(value) {
    if (!value || !this.format) return value;

    const date = this._parseValue(value);
    if (!date) return value;

    /* Check for preset formats */
    const presets = {
      iso: 'yyyy-mm-dd',
      'iso-tz': 'yyyy-mm-ddThh:ii:sstzz',
      'iso-datetime': 'yyyy-mm-dd hh:ii:ss',
      'iso-datetime-tz': 'yyyy-mm-dd hh:ii:ss tz',
      'us-date': 'mm/dd/yyyy',
      'us-datetime': 'mm/dd/yyyy hh:ii:ss',
      'us-datetime-tz': 'mm/dd/yyyy hh:ii:ss tz',
      'eu-date': 'dd/mm/yyyy',
      'eu-datetime': 'dd/mm/yyyy hh:ii:ss',
      'eu-datetime-tz': 'dd/mm/yyyy hh:ii:ss tz',
      mysql: 'yyyy-mm-dd hh:ii:ss',
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

  /**
   * A Date for a stored value. `yyyy-mm-dd` and `yyyy-mm-ddThh:mm` (with optional seconds) are read
   * as local time, and in time mode `hh:mm` or `hh:mm:ss` as that time today. Anything else, such as
   * an ISO instant with `Z` or an offset, goes to Date.
   *
   * @param {string} value
   * @returns {Date|null}
   */
  _parseValue(value) {
    if (!value) return null;
    const time =
      this.mode === 'time' && /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.\d+)?)?$/.exec(value);
    if (time) {
      const today = new Date();
      today.setHours(Number(time[1]), Number(time[2]), Number(time[3] ?? 0), 0);
      return today;
    }
    const local = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/.exec(
      value
    );
    const date = local
      ? new Date(local[1], local[2] - 1, local[3], local[4] ?? 0, local[5] ?? 0, local[6] ?? 0)
      : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  /**
   * The local calendar date of a Date, as `yyyy-mm-dd`
   */
  _dateString(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }

  /**
   * The local value string for a Date, as the matching native input writes it: `yyyy-mm-dd` in date
   * mode, `hh:mm` in time mode and `yyyy-mm-ddThh:mm` in datetime mode, with `:ss` when the seconds
   * are set
   */
  _valueString(date) {
    if (this.mode === 'date') return this._dateString(date);
    const seconds = date.getSeconds() ? [date.getSeconds()] : [];
    const time = [date.getHours(), date.getMinutes(), ...seconds]
      .map(part => String(part).padStart(2, '0'))
      .join(':');
    return this.mode === 'time' ? time : `${this._dateString(date)}T${time}`;
  }

  /**
   * A stored value in the local format of the mode, or as given when it cannot be read
   */
  _localValue(value) {
    const date = this._parseValue(value);
    return date ? this._valueString(date) : value || '';
  }

  /**
   * The submitted value for a stored value, formatted when `format` is set
   */
  _formValueFor(value) {
    return this.format ? this._formatDate(value) : value;
  }

  /**
   * Report the current value and its validity to the owning form
   */
  _syncFormState() {
    if (!this._internals) return;

    const state = JSON.stringify({ value: this.value, toValue: this.rangeToValue });
    if (this.range && this.rangeTo) {
      const data = new FormData();
      if (this.name) data.append(this.name, this._formValueFor(this.value));
      data.append(this.rangeTo, this._formValueFor(this.rangeToValue));
      this._internals.setFormValue(data, state);
    } else {
      this._internals.setFormValue(this._formValueFor(this.value), state);
    }

    const problem = this._validityProblem();
    if (problem) {
      this._internals.setValidity(problem.flags, problem.message, this._btn);
    } else {
      this._internals.setValidity({});
    }
  }

  _validityProblem() {
    const what = this._noun();
    if (this.required && (!this.value || (this.range && !this.rangeToValue))) {
      return {
        flags: { valueMissing: true },
        message: this._text(this.range ? 'required-range-message' : 'required-message', { what }),
      };
    }
    if (this.mode === 'time') return null;

    const min = this._effectiveMin();
    const max = this._effectiveMax();
    const dates = [this.value, this.range ? this.rangeToValue : '']
      .map(value => this._parseValue(value))
      .filter(Boolean);
    const describe = date => dateFormat({ dateStyle: 'medium' }, this._locale).format(date);

    if (min && dates.some(date => this._isDayOutOfRange(date, min, null))) {
      return {
        flags: { rangeUnderflow: true },
        message: this._text('min-message', { date: describe(min) }),
      };
    }
    if (max && dates.some(date => this._isDayOutOfRange(date, null, max))) {
      return {
        flags: { rangeOverflow: true },
        message: this._text('max-message', { date: describe(max) }),
      };
    }
    return null;
  }

  formResetCallback() {
    const { value = '', toValue = '' } = this._defaults ?? {};
    this.value = value;
    this.rangeToValue = toValue;
    this._currentField = 'from';
    this._rangeState = null;
  }

  formDisabledCallback(disabled) {
    this._formDisabled = disabled;
    for (const control of [this._input, this._toInput, this._btn]) {
      control.disabled = disabled;
    }
    if (disabled) this.close();
  }

  formStateRestoreCallback(state) {
    try {
      const { value = '', toValue = '' } = JSON.parse(state);
      this.value = value;
      this.rangeToValue = toValue;
    } catch {
      this.value = typeof state === 'string' ? state : '';
    }
  }

  get form() {
    return this._internals?.form ?? null;
  }

  get labels() {
    return this._internals?.labels ?? [];
  }

  get validity() {
    return this._internals?.validity;
  }

  get validationMessage() {
    return this._internals?.validationMessage ?? '';
  }

  get willValidate() {
    return this._internals?.willValidate ?? false;
  }

  checkValidity() {
    return this._internals?.checkValidity() ?? true;
  }

  reportValidity() {
    return this._internals?.reportValidity() ?? true;
  }

  get required() {
    return this.hasAttribute('required');
  }

  set required(v) {
    this.toggleAttribute('required', Boolean(v));
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  set disabled(v) {
    this.toggleAttribute('disabled', Boolean(v));
  }

  _updateFocusRing() {
    /* Remove focused class from both inputs */
    this._input.classList.remove('is-focused');
    this._toInput.classList.remove('is-focused');

    /* Add focused class to the current field */
    if (this.range) {
      if (this._currentField === 'to') {
        this._toInput.classList.add('is-focused');
      } else {
        this._input.classList.add('is-focused'); /* First input is "from" in range mode */
      }
    } else {
      this._input.classList.add('is-focused');
    }
  }

  _emitChange() {
    this._syncFormState();

    const eventDetail = this.range
      ? {
          value: this.value,
          toValue: this.rangeToValue,
          from: this.value,
          to: this.rangeToValue,
          complete: Boolean(this.value && this.rangeToValue),
        }
      : { value: this.value, complete: Boolean(this.value) };

    this.dispatchEvent(
      new CustomEvent('change', { detail: eventDetail, bubbles: true, composed: true })
    );
  }
}

if (!customElements.get('p-datetime')) {
  customElements.define('p-datetime', PDatetime);
}
