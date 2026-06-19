/**
 * ResultsTable — Sortable, filterable, paginated results table
 */

const ITEMS_PER_PAGE = 25;

export class ResultsTable {
  constructor(tableContainerId, paginationContainerId, countId) {
    this.tableContainer = document.getElementById(tableContainerId);
    this.paginationContainer = document.getElementById(paginationContainerId);
    this.countEl = document.getElementById(countId);
    this.allProblems = [];
    this.filteredProblems = [];
    this.currentPage = 1;
    this.sortKey = 'rating';
    this.sortDir = 'asc';
  }

  setData(problems) {
    this.allProblems = problems;
    this.filteredProblems = [...problems];
    this.currentPage = 1;
    this.sort();
    this.renderAll();
  }

  filter(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.filteredProblems = [...this.allProblems];
    } else {
      this.filteredProblems = this.allProblems.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    this.currentPage = 1;
    this.sort();
    this.renderAll();
  }

  sort(key, dir) {
    if (key) {
      if (this.sortKey === key) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortKey = key;
        this.sortDir = 'asc';
      }
    }

    this.filteredProblems.sort((a, b) => {
      let va = a[this.sortKey];
      let vb = b[this.sortKey];
      if (typeof va === 'string') {
        va = va.toLowerCase();
        vb = vb.toLowerCase();
      }
      if (va < vb) return this.sortDir === 'asc' ? -1 : 1;
      if (va > vb) return this.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    this.renderAll();
  }

  renderAll() {
    this.renderCount();
    this.renderTable();
    this.renderPagination();
  }

  renderCount() {
    const total = this.filteredProblems.length;
    this.countEl.innerHTML = `Found <strong>${total}</strong> unsolved problem${total !== 1 ? 's' : ''}`;
  }

  renderTable() {
    const start = (this.currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = this.filteredProblems.slice(start, start + ITEMS_PER_PAGE);

    if (pageItems.length === 0) {
      this.tableContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔎</div>
          <div class="empty-state-title">No problems found</div>
          <div class="empty-state-desc">Try adjusting your filters or adding different tags.</div>
        </div>
      `;
      return;
    }

    const sortClass = (key) => {
      if (this.sortKey !== key) return '';
      return this.sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc';
    };

    let html = `
      <div class="data-table-wrapper">
        <table class="data-table" id="results-data-table">
          <thead>
            <tr>
              <th class="${sortClass('code')}" data-sort="code">Code</th>
              <th class="${sortClass('name')}" data-sort="name">Problem Name</th>
              <th class="${sortClass('rating')}" data-sort="rating">Rating</th>
              <th>Tags</th>
              <th style="text-align:center; width: 60px;">Action</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const p of pageItems) {
      const ratingClass = `rating-${p.rating || 0}`;
      const tagsHtml = (p.tags || [])
        .map(t => `<span class="tag-pill">${t}</span>`)
        .join('');
      const cfUrl = `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`;

      html += `
        <tr>
          <td><span class="problem-code">${p.code}</span></td>
          <td><a class="problem-link" href="${cfUrl}" target="_blank" rel="noopener">${p.name}</a></td>
          <td><span class="rating-badge ${ratingClass}">${p.rating ?? '?'}</span></td>
          <td>${tagsHtml}</td>
          <td style="text-align:center; position:relative;">
            <button class="btn-icon copy-btn" data-code="${p.code}" title="Copy problem code" aria-label="Copy ${p.code}">📋</button>
          </td>
        </tr>
      `;
    }

    html += `</tbody></table></div>`;
    this.tableContainer.innerHTML = html;

    // Sort headers
    this.tableContainer.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => this.sort(th.dataset.sort));
    });

    // Copy buttons
    this.tableContainer.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => this.copyCode(btn));
    });
  }

  async copyCode(btn) {
    const code = btn.dataset.code;
    try {
      await navigator.clipboard.writeText(code);
      btn.classList.add('copied');
      btn.textContent = '✓';

      // Tooltip
      const tooltip = document.createElement('span');
      tooltip.className = 'copy-tooltip';
      tooltip.textContent = 'Copied!';
      btn.parentElement.appendChild(tooltip);

      setTimeout(() => {
        btn.classList.remove('copied');
        btn.textContent = '📋';
        tooltip.remove();
      }, 1200);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  renderPagination() {
    const totalPages = Math.ceil(this.filteredProblems.length / ITEMS_PER_PAGE);
    if (totalPages <= 1) {
      this.paginationContainer.innerHTML = '';
      return;
    }

    let html = '';

    // Prev
    html += `<button class="pagination-btn" data-page="prev" ${this.currentPage === 1 ? 'disabled' : ''}>‹ Prev</button>`;

    // Page numbers with ellipsis
    const pages = this.getPageNumbers(this.currentPage, totalPages);
    for (const p of pages) {
      if (p === '...') {
        html += `<span class="pagination-ellipsis">…</span>`;
      } else {
        html += `<button class="pagination-btn ${p === this.currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
      }
    }

    // Next
    html += `<button class="pagination-btn" data-page="next" ${this.currentPage === totalPages ? 'disabled' : ''}>Next ›</button>`;

    this.paginationContainer.innerHTML = html;

    this.paginationContainer.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.page;
        if (val === 'prev') this.goToPage(this.currentPage - 1);
        else if (val === 'next') this.goToPage(this.currentPage + 1);
        else this.goToPage(parseInt(val));
      });
    });
  }

  getPageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...', total);
    } else if (current >= total - 3) {
      pages.push(1, '...');
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }
    return pages;
  }

  goToPage(page) {
    const totalPages = Math.ceil(this.filteredProblems.length / ITEMS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    this.currentPage = page;
    this.renderAll();
    // Scroll to results
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
