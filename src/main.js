/**
 * CP Vertex — Gym Problem Finder
 * Main application entry point
 */

import { RangeSlider } from './components/range-slider.js';
import { TagSelector } from './components/tag-selector.js';
import { LoadingIndicator } from './components/loading-indicator.js';
import { ResultsTable } from './components/results-table.js';

// --- Initialize components ---
const ratingSlider = new RangeSlider('rating-slider', {
  min: 800,
  max: 3500,
  step: 100,
  initialMin: 800,
  initialMax: 3500,
});

const tagSelector = new TagSelector('tag-selector');
const loadingIndicator = new LoadingIndicator();
const resultsTable = new ResultsTable('results-table-container', 'pagination-container', 'results-count');

// --- DOM refs ---
const handlesInput = document.getElementById('handles-input');
const searchBtn = document.getElementById('search-btn');
const errorBanner = document.getElementById('error-banner');
const errorText = document.getElementById('error-text');
const errorDismiss = document.getElementById('error-dismiss');
const filtersCard = document.getElementById('filters-card');
const loadingSection = document.getElementById('loading-section');
const resultsSection = document.getElementById('results-section');
const resultsSearchInput = document.getElementById('results-search');
const maxProblemsInput = document.getElementById('max-problems-input');

// --- Error handling ---
function showError(message) {
  errorText.textContent = message;
  errorBanner.classList.add('visible');
}

function hideError() {
  errorBanner.classList.remove('visible');
}

errorDismiss.addEventListener('click', hideError);

// --- Parse handles ---
function parseHandles(raw) {
  return raw
    .split(/[\s,]+/)
    .map(h => h.trim())
    .filter(h => h.length > 0);
}

// --- Results filter ---
resultsSearchInput.addEventListener('input', () => {
  resultsTable.filter(resultsSearchInput.value);
});

// --- Main search flow ---
let currentEventSource = null;

searchBtn.addEventListener('click', async () => {
  hideError();

  // Validate inputs
  const handles = parseHandles(handlesInput.value);
  if (handles.length === 0) {
    showError('Please enter at least one Codeforces handle.');
    return;
  }

  const tags = tagSelector.getTags();
  const { min: minRating, max: maxRating } = ratingSlider.getValues();

  // Disable button
  searchBtn.disabled = true;
  searchBtn.innerHTML = '<span>⏳</span><span>Processing...</span>';

  // Show loading, hide results
  resultsSection.classList.remove('visible');
  loadingIndicator.show();

  // Abort any previous SSE connection
  if (currentEventSource) {
    currentEventSource.close();
    currentEventSource = null;
  }

  try {
    // Build query
    const maxProblems = parseInt(maxProblemsInput.value) || 0;

    const params = new URLSearchParams({
      handles: handles.join(','),
      minRating: minRating.toString(),
      maxRating: maxRating.toString(),
    });
    if (tags.length > 0) {
      params.set('tags', tags.join(','));
    }
    if (maxProblems > 0) {
      params.set('maxProblems', maxProblems.toString());
    }

    // Connect to SSE endpoint
    const url = `/api/find-problems?${params.toString()}`;
    const eventSource = new EventSource(url);
    currentEventSource = eventSource;

    eventSource.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);

      switch (data.stage) {
        case 'validating':
          loadingIndicator.setValidating();
          break;

        case 'fetching':
          loadingIndicator.setFetching(data.current, data.total);
          break;

        case 'filtering':
          loadingIndicator.setFiltering();
          break;

        case 'done':
          loadingIndicator.setDone();
          eventSource.close();
          currentEventSource = null;

          // Short delay for the "Done!" to show
          setTimeout(() => {
            loadingIndicator.hide();
            displayResults(data.data);
          }, 500);
          break;

        case 'error':
          eventSource.close();
          currentEventSource = null;
          loadingIndicator.hide();
          showError(data.message);
          resetButton();
          break;
      }
    });

    eventSource.addEventListener('error', () => {
      eventSource.close();
      currentEventSource = null;
      loadingIndicator.hide();
      showError('Connection lost. The Codeforces API may be temporarily unavailable. Please try again.');
      resetButton();
    });

  } catch (err) {
    loadingIndicator.hide();
    showError(`Unexpected error: ${err.message}`);
    resetButton();
  }
});

function displayResults(problems) {
  resultsTable.setData(problems);
  resultsSection.classList.add('visible');
  resultsSearchInput.value = '';
  resetButton();

  // Smooth scroll to results
  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function resetButton() {
  searchBtn.disabled = false;
  searchBtn.innerHTML = '<span>🔍</span><span>Validate Handles & Search</span>';
}
