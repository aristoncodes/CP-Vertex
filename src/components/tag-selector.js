/**
 * TagSelector — Search-as-you-type multi-select tag component
 * Populated with all standard Codeforces tags
 */

const CODEFORCES_TAGS = [
  '2-sat', 'binary search', 'bitmasks', 'brute force',
  'chinese remainder theorem', 'combinatorics', 'constructive algorithms',
  'data structures', 'dfs and similar', 'divide and conquer',
  'dp', 'dsu', 'expression parsing', 'fft', 'flows',
  'games', 'geometry', 'graph matchings', 'graphs', 'greedy',
  'hashing', 'implementation', 'interactive',
  'math', 'matrices', 'meet-in-the-middle', 'number theory',
  'probabilities', 'schedules', 'shortest paths',
  'sortings', 'string suffix structures', 'strings',
  'ternary search', 'trees', 'two pointers',
];

export class TagSelector {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.selectedTags = [];
    this.highlightedIndex = -1;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.classList.add('tag-selector');
    this.container.innerHTML = `
      <div class="tag-input-wrapper" id="tag-input-wrapper">
        <input type="text" class="tag-search-input" id="tag-search"
          placeholder="Search tags..." autocomplete="off" />
      </div>
      <div class="tag-dropdown" id="tag-dropdown"></div>
    `;

    this.wrapper = this.container.querySelector('#tag-input-wrapper');
    this.searchInput = this.container.querySelector('#tag-search');
    this.dropdown = this.container.querySelector('#tag-dropdown');
  }

  bindEvents() {
    this.searchInput.addEventListener('input', () => this.onSearchInput());
    this.searchInput.addEventListener('focus', () => this.onSearchInput());

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && this.searchInput.value === '' && this.selectedTags.length > 0) {
        this.removeTag(this.selectedTags[this.selectedTags.length - 1]);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.moveHighlight(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.moveHighlight(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.highlightedIndex >= 0) {
          const items = this.dropdown.querySelectorAll('.tag-dropdown-item');
          if (items[this.highlightedIndex]) {
            this.addTag(items[this.highlightedIndex].dataset.tag);
          }
        }
      } else if (e.key === 'Escape') {
        this.hideDropdown();
      }
    });

    this.wrapper.addEventListener('click', () => this.searchInput.focus());

    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.hideDropdown();
      }
    });
  }

  onSearchInput() {
    const query = this.searchInput.value.toLowerCase().trim();
    const available = CODEFORCES_TAGS.filter(
      t => !this.selectedTags.includes(t) && t.includes(query)
    );

    this.highlightedIndex = -1;

    if (available.length === 0) {
      this.dropdown.innerHTML = `<div class="tag-dropdown-empty">No matching tags</div>`;
    } else {
      this.dropdown.innerHTML = available
        .map(tag => `<div class="tag-dropdown-item" data-tag="${tag}">${this.highlightMatch(tag, query)}</div>`)
        .join('');

      this.dropdown.querySelectorAll('.tag-dropdown-item').forEach(item => {
        item.addEventListener('click', () => this.addTag(item.dataset.tag));
        item.addEventListener('mouseenter', () => {
          this.clearHighlight();
          item.classList.add('highlighted');
        });
      });
    }

    this.showDropdown();
  }

  highlightMatch(tag, query) {
    if (!query) return tag;
    const idx = tag.indexOf(query);
    if (idx === -1) return tag;
    return tag.slice(0, idx) + '<strong style="color:var(--text-accent)">' + tag.slice(idx, idx + query.length) + '</strong>' + tag.slice(idx + query.length);
  }

  moveHighlight(dir) {
    const items = this.dropdown.querySelectorAll('.tag-dropdown-item');
    if (items.length === 0) return;
    this.clearHighlight();
    this.highlightedIndex += dir;
    if (this.highlightedIndex < 0) this.highlightedIndex = items.length - 1;
    if (this.highlightedIndex >= items.length) this.highlightedIndex = 0;
    items[this.highlightedIndex].classList.add('highlighted');
    items[this.highlightedIndex].scrollIntoView({ block: 'nearest' });
  }

  clearHighlight() {
    this.dropdown.querySelectorAll('.highlighted').forEach(el => el.classList.remove('highlighted'));
  }

  addTag(tag) {
    if (this.selectedTags.includes(tag)) return;
    this.selectedTags.push(tag);
    this.renderChips();
    this.searchInput.value = '';
    this.onSearchInput();
    this.searchInput.focus();
  }

  removeTag(tag) {
    this.selectedTags = this.selectedTags.filter(t => t !== tag);
    this.renderChips();
    this.searchInput.focus();
  }

  renderChips() {
    // Remove existing chips
    this.wrapper.querySelectorAll('.tag-chip').forEach(c => c.remove());

    // Insert chips before the input
    this.selectedTags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `${tag}<button class="tag-chip-remove" data-tag="${tag}" aria-label="Remove ${tag}">✕</button>`;
      chip.querySelector('.tag-chip-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeTag(tag);
      });
      this.wrapper.insertBefore(chip, this.searchInput);
    });
  }

  showDropdown() {
    this.dropdown.classList.add('visible');
  }

  hideDropdown() {
    this.dropdown.classList.remove('visible');
  }

  getTags() {
    return [...this.selectedTags];
  }
}
