/**
 * LoadingIndicator — Multi-stage loading indicator driven by SSE events
 */
export class LoadingIndicator {
  constructor() {
    this.section = document.getElementById('loading-section');
    this.stageText = document.getElementById('loading-stage');
    this.subText = document.getElementById('loading-sub');
    this.progressBar = document.getElementById('loading-progress');
  }

  show() {
    this.section.classList.add('visible');
    this.setStage('Initializing...', 'Please wait while we set things up', 0);
  }

  hide() {
    this.section.classList.remove('visible');
  }

  setStage(main, sub, progressPercent) {
    this.stageText.textContent = main;
    this.subText.textContent = sub;
    this.progressBar.style.width = `${progressPercent}%`;
  }

  setValidating() {
    this.setStage(
      'Validating handles...',
      'Checking if all provided handles exist on Codeforces',
      10
    );
  }

  setFetching(current, total) {
    const pct = 10 + ((current / total) * 70);
    this.setStage(
      `Fetching submission histories (User ${current} of ${total})...`,
      'This may take a moment due to API rate limits',
      pct
    );
  }

  setFiltering() {
    this.setStage(
      'Intersecting data and filtering problem sets...',
      'Almost there! Finding unsolved problems',
      90
    );
  }

  setDone() {
    this.setStage('Done!', 'Results are ready', 100);
  }
}
