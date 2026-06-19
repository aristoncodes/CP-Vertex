/**
 * RangeSlider — Dual-handle range slider for rating selection (800–3500)
 */
export class RangeSlider {
  constructor(containerId, { min = 800, max = 3500, step = 100, initialMin = 800, initialMax = 3500 } = {}) {
    this.container = document.getElementById(containerId);
    this.min = min;
    this.max = max;
    this.step = step;
    this.currentMin = initialMin;
    this.currentMax = initialMax;
    this.onChange = null;
    this.render();
    this.bindEvents();
  }

  render() {
    const ticks = [];
    for (let v = this.min; v <= this.max; v += 400) {
      ticks.push(v);
    }
    if (ticks[ticks.length - 1] !== this.max) ticks.push(this.max);

    this.container.innerHTML = `
      <div class="range-slider-labels">
        <span class="range-value-badge" id="range-min-val">${this.currentMin}</span>
        <span class="range-separator">to</span>
        <span class="range-value-badge" id="range-max-val">${this.currentMax}</span>
      </div>
      <div class="range-track-wrapper">
        <div class="range-track">
          <div class="range-track-fill" id="range-fill"></div>
        </div>
        <input type="range" class="range-input" id="range-input-min"
          min="${this.min}" max="${this.max}" step="${this.step}" value="${this.currentMin}" />
        <input type="range" class="range-input" id="range-input-max"
          min="${this.min}" max="${this.max}" step="${this.step}" value="${this.currentMax}" />
      </div>
      <div class="range-ticks">
        ${ticks.map(v => `<span class="range-tick">${v}</span>`).join('')}
      </div>
    `;

    this.minInput = this.container.querySelector('#range-input-min');
    this.maxInput = this.container.querySelector('#range-input-max');
    this.minLabel = this.container.querySelector('#range-min-val');
    this.maxLabel = this.container.querySelector('#range-max-val');
    this.fill = this.container.querySelector('#range-fill');

    this.updateFill();
  }

  bindEvents() {
    this.minInput.addEventListener('input', () => {
      let val = parseInt(this.minInput.value);
      if (val > this.currentMax) val = this.currentMax;
      this.currentMin = val;
      this.minInput.value = val;
      this.minLabel.textContent = val;
      this.updateFill();
      this.onChange?.({ min: this.currentMin, max: this.currentMax });
    });

    this.maxInput.addEventListener('input', () => {
      let val = parseInt(this.maxInput.value);
      if (val < this.currentMin) val = this.currentMin;
      this.currentMax = val;
      this.maxInput.value = val;
      this.maxLabel.textContent = val;
      this.updateFill();
      this.onChange?.({ min: this.currentMin, max: this.currentMax });
    });
  }

  updateFill() {
    const range = this.max - this.min;
    const left = ((this.currentMin - this.min) / range) * 100;
    const width = ((this.currentMax - this.currentMin) / range) * 100;
    this.fill.style.left = `${left}%`;
    this.fill.style.width = `${width}%`;
  }

  getValues() {
    return { min: this.currentMin, max: this.currentMax };
  }
}
