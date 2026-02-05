// State
let fastStartTime = null;
let goalHours = 16;
let animationFrameId = null;
let lastUpdateTime = 0;
let isFasting = false;
let goalReachedNotified = false;
let currentZoneIndex = 0;
let showZones = true;
let toastTimeout = null;
let toastStartTime = null;
let toastRemainingTime = 0;
let lastAnnouncedMinute = -1; // Track last announced minute for screen readers
let focusedElementBeforeModal = null; // Track focus for modal management
let lastDisplayedTime = ''; // Track last displayed time to avoid unnecessary DOM updates

// Cache DOM elements
const el = {};

function initElements() {
    el.statusBadge = document.getElementById('statusBadge');
    el.timerDisplay = document.getElementById('timerDisplay');
    el.timerAnnouncer = document.getElementById('timerAnnouncer');
    el.progressAnnouncer = document.getElementById('progressAnnouncer');
    el.goalDisplay = document.getElementById('goalDisplay');
    el.progressCircle = document.getElementById('progressCircle');
    el.actionButton = document.getElementById('actionButton');
    el.themeToggleBtn = document.getElementById('themeToggleBtn');
    el.themeToggleStatus = document.getElementById('themeToggleStatus');
    el.sunIcon = document.getElementById('sunIcon');
    el.moonIcon = document.getElementById('moonIcon');
    el.settingsBtn = document.getElementById('settingsBtn');
    el.settingsModal = document.getElementById('settingsModal');
    el.closeModalBtn = document.getElementById('closeModalBtn');
    el.historyBtn = document.getElementById('historyBtn');
    el.historyModal = document.getElementById('historyModal');
    el.closeHistoryBtn = document.getElementById('closeHistoryBtn');
    el.historyList = document.getElementById('historyList');
    el.durationButtons = document.getElementById('durationButtons');
    el.zoneContainer = document.getElementById('zoneContainer');
    el.zoneBadge = document.getElementById('zoneBadge');
    el.zoneIcon = document.getElementById('zoneIcon');
    el.zoneName = document.getElementById('zoneName');
    el.zoneDisclaimer = document.getElementById('zoneDisclaimer');
    el.showZonesBtn = document.getElementById('showZonesBtn');
    el.showZonesToggle = document.getElementById('showZonesToggle');
    el.exportDataBtn = document.getElementById('exportDataBtn');
    el.importFileInput = document.getElementById('importFileInput');
    el.importConfirmModal = document.getElementById('importConfirmModal');
    el.importConfirmMessage = document.getElementById('importConfirmMessage');
    el.importCancelBtn = document.getElementById('importCancelBtn');
    el.importMergeBtn = document.getElementById('importMergeBtn');
    el.importReplaceBtn = document.getElementById('importReplaceBtn');
    el.startTimeDisplay = document.getElementById('startTimeDisplay');
    el.startTimeText = document.getElementById('startTimeText');
    el.editStartTimeModal = document.getElementById('editStartTimeModal');
    el.closeEditStartTimeBtn = document.getElementById('closeEditStartTimeBtn');
    el.editStartDate = document.getElementById('editStartDate');
    el.editStartTime = document.getElementById('editStartTime');
    el.editStartTimeError = document.getElementById('editStartTimeError');
    el.saveStartTimeBtn = document.getElementById('saveStartTimeBtn');
    el.toast = document.getElementById('toast');
    el.toastMessage = document.getElementById('toastMessage');
    el.toastClose = document.getElementById('toastClose');
    el.toastProgress = document.getElementById('toastProgress');

    // Generate duration buttons
    createDurationButtons();
}

function createDurationButtons() {
    // Create buttons without inline onclick handlers
    el.durationButtons.innerHTML = DURATION_OPTIONS.map(hours => `
            <button data-duration="${hours}" id="duration-${hours}" 
                    aria-pressed="false"
                    class="${CLASSES.durationUnselected} min-h-[44px]">
                ${hours} hours
            </button>
        `).join('');
    
    // Use event delegation for duration buttons
    el.durationButtons.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-duration]');
        if (btn) {
            setDefaultDuration(parseInt(btn.dataset.duration, 10));
        }
    });
}

// Constants
const CIRCUMFERENCE = 753.98;
const MS_PER_HOUR = 3600000;
const STORAGE_KEY = 'fastingApp';
const DURATION_OPTIONS = [12, 14, 16, 18, 20, 24];
const MAX_HISTORY = 90;
const TOAST_DURATION = 15000; // 15 seconds

// Fasting zones configuration (AA compliant colors)
// Note: Timings are approximate and vary by individual
const FASTING_ZONES = [
    { name: 'Fed', start: 0, color: '#94a3b8', icon: '🍽️', description: 'Body is digesting food' },
    { name: 'Post-Absorptive', start: 3, color: '#a78bfa', icon: '⏳', description: 'Transitioning from fed state' },
    { name: 'Glycogen Depletion', start: 8, color: '#60a5fa', icon: '💪', description: 'Using stored glucose' },
    { name: 'Fat Burning', start: 14, color: '#fbbf24', icon: '🔥', description: 'Body burning fat for energy' },
    { name: 'Ketosis', start: 20, color: '#34d399', icon: '⚡', description: 'Producing ketones' },
    { name: 'Deep Ketosis', start: 36, color: '#f472b6', icon: '✨', description: 'Enhanced ketone production' },
];

// CSS class constants
const CLASSES = {
    statusFasting: 'inline-block px-4 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium transition-colors duration-300',
    statusIdle: 'inline-block px-4 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-sm font-medium transition-colors duration-300',
    buttonEnd: 'w-full border-2 border-white/40 hover:border-white/60 hover:bg-white/10 text-white font-semibold py-4 rounded-xl transition-colors duration-200 min-h-[44px]',
    buttonComplete: 'w-full border-2 border-emerald-700 bg-emerald-700 hover:bg-emerald-800 hover:border-emerald-800 text-white font-semibold py-4 rounded-xl transition-colors duration-200 shadow-lg min-h-[44px]',
    buttonStart: 'w-full border-2 border-emerald-700 bg-emerald-700 hover:bg-emerald-800 hover:border-emerald-800 text-white font-semibold py-4 rounded-xl transition-colors duration-200 shadow-lg min-h-[44px]',
    durationSelected: 'py-3 px-4 rounded-lg border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 transition-colors text-sm font-medium',
    durationUnselected: 'py-3 px-4 rounded-lg border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors text-sm font-medium'
};

// Focus trap for modals (WCAG 2.4.3)
function trapFocus(modal) {
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    function handleKeyDown(e) {
        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
        if (e.key === 'Escape') {
            closeAllModals();
        }
    }

    modal.addEventListener('keydown', handleKeyDown);
    modal._focusTrapHandler = handleKeyDown;
    
    // Focus first element
    if (firstElement) {
        firstElement.focus();
    }
}

function removeFocusTrap(modal) {
    if (modal._focusTrapHandler) {
        modal.removeEventListener('keydown', modal._focusTrapHandler);
        delete modal._focusTrapHandler;
    }
}

function closeAllModals() {
    closeSettingsModal();
    closeHistoryModal();
    closeEditStartTimeModal();
    cancelImport();
}

// Helper function for backdrop click to close modals (DRY improvement)
function addBackdropClose(modal, closeFn) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeFn();
    });
}

// Toast notification functions
function showToast(message) {
    // Clear any existing toast timeout
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = null;
    }

    // Set the message
    el.toastMessage.textContent = message;

    // Reset toast timing
    toastRemainingTime = TOAST_DURATION;
    toastStartTime = Date.now();

    // Reset progress bar
    el.toastProgress.style.transition = 'none';
    el.toastProgress.style.width = '100%';

    // Show the toast
    el.toast.classList.remove('-translate-y-full', 'opacity-0');
    el.toast.classList.add('translate-y-0', 'opacity-100');

    // Start the progress bar animation after a brief delay
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.toastProgress.style.transition = `width ${toastRemainingTime}ms linear`;
            el.toastProgress.style.width = '0%';
        });
    });

    // Auto-dismiss after duration
    toastTimeout = setTimeout(() => {
        hideToast();
    }, toastRemainingTime);
}

function hideToast() {
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = null;
    }

    el.toast.classList.add('-translate-y-full', 'opacity-0');
    el.toast.classList.remove('translate-y-0', 'opacity-100');
}

// Pause toast timeout on hover/focus for accessibility (WCAG 2.2.6)
// Fixed: Now properly pauses and resumes the progress bar transition
function initToastPauseOnInteraction() {
    const isToastVisible = () => el.toast.classList.contains('opacity-100');
    
    function pauseToast() {
        if (toastTimeout && isToastVisible()) {
            clearTimeout(toastTimeout);
            toastTimeout = null;
            // Calculate remaining time
            toastRemainingTime -= (Date.now() - toastStartTime);
            // Pause the progress bar by getting current width and stopping transition
            const computedWidth = getComputedStyle(el.toastProgress).width;
            el.toastProgress.style.transition = 'none';
            el.toastProgress.style.width = computedWidth;
        }
    }
    
    function resumeToast() {
        if (isToastVisible() && toastRemainingTime > 0) {
            toastStartTime = Date.now();
            // Resume progress bar animation
            requestAnimationFrame(() => {
                el.toastProgress.style.transition = `width ${toastRemainingTime}ms linear`;
                el.toastProgress.style.width = '0%';
            });
            // Set timeout for remaining time
            toastTimeout = setTimeout(() => {
                hideToast();
            }, toastRemainingTime);
        }
    }
    
    el.toast.addEventListener('mouseenter', pauseToast);
    el.toast.addEventListener('mouseleave', resumeToast);
    el.toast.addEventListener('focusin', pauseToast);
    el.toast.addEventListener('focusout', resumeToast);
}

// Theme management
function initTheme() {
    const data = loadData();
    const theme = data?.settings?.theme || 'dark';
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        el.sunIcon.classList.remove('hidden');
        el.moonIcon.classList.add('hidden');
        el.themeToggleBtn.setAttribute('aria-pressed', 'true');
        el.themeToggleStatus.textContent = 'Currently dark mode';
    } else {
        document.documentElement.classList.remove('dark');
        el.sunIcon.classList.add('hidden');
        el.moonIcon.classList.remove('hidden');
        el.themeToggleBtn.setAttribute('aria-pressed', 'false');
        el.themeToggleStatus.textContent = 'Currently light mode';
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    el.sunIcon.classList.toggle('hidden');
    el.moonIcon.classList.toggle('hidden');
    
    // Update ARIA state
    el.themeToggleBtn.setAttribute('aria-pressed', isDark.toString());
    el.themeToggleStatus.textContent = isDark ? 'Currently dark mode' : 'Currently light mode';

    const data = loadData() || { history: [] };
    data.settings = data.settings || {};
    data.settings.theme = isDark ? 'dark' : 'light';
    saveData(data);
}

function getDefaultDuration() {
    const data = loadData();
    return data?.settings?.defaultDuration || 16;
}

function setDefaultDuration(hours) {
    const data = loadData() || { history: [] };
    data.settings = data.settings || {};
    data.settings.defaultDuration = hours;
    saveData(data);

    updateDurationButtons(hours);

    // Update goal display if not currently fasting
    if (!isFasting) {
        goalHours = hours;
        const goalDisplay = el.statusBadge.querySelector('#goalDisplay');
        if (goalDisplay) {
            goalDisplay.textContent = hours + 'h';
        }
    }
}

function updateStatusBadge(isFastingNow, hours) {
    const text = isFastingNow ? 'Fasting' : 'Not Fasting';
    el.statusBadge.innerHTML = `<span id="statusText">${text}</span> · <span id="goalDisplay">${hours}h</span>`;
    el.statusBadge.className = isFastingNow ? CLASSES.statusFasting : CLASSES.statusIdle;
    
    // Show/hide start time display
    if (isFastingNow) {
        el.startTimeDisplay.classList.remove('hidden');
        updateStartTimeDisplay();
    } else {
        el.startTimeDisplay.classList.add('hidden');
    }
}

function updateStartTimeDisplay() {
    if (!fastStartTime) return;
    const startDate = new Date(fastStartTime);
    const timeStr = startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    
    // Check if it's today, yesterday, or another day
    const now = new Date();
    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor((today - startDay) / (24 * 60 * 60 * 1000));
    
    let datePrefix = '';
    if (diffDays === 1) {
        datePrefix = 'Yesterday ';
    } else if (diffDays > 1) {
        datePrefix = startDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ';
    }
    
    el.startTimeText.textContent = `Started ${datePrefix}${timeStr}`;
}

function updateDurationButtons(selectedHours) {
    DURATION_OPTIONS.forEach(hours => {
        const btn = document.getElementById(`duration-${hours}`);
        if (btn) {
            btn.className = (hours === selectedHours ? CLASSES.durationSelected : CLASSES.durationUnselected) + ' min-h-[44px]';
            btn.setAttribute('aria-pressed', (hours === selectedHours).toString());
        }
    });
}

// LocalStorage helpers
function loadData() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Error loading data:', e);
        return null;
    }
}

function saveData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving data:', e);
    }
}

function exportData() {
    const data = loadData();
    if (!data) {
        alert('No data to export.');
        return;
    }

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `fasting-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

let pendingImportData = null;
let pendingNewFastsCount = 0;

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);

            // Validate structure
            if (typeof importedData !== 'object' || importedData === null) {
                throw new Error('Invalid data format');
            }

            // Ensure history is an array if present
            if (importedData.history && !Array.isArray(importedData.history)) {
                throw new Error('Invalid history format');
            }

            // Calculate how many fasts would be new (for merge)
            const existingData = loadData() || { history: [] };
            const existingStartTimes = new Set((existingData.history || []).map(f => f.startTime));
            const importedHistory = importedData.history || [];
            pendingNewFastsCount = importedHistory.filter(f => !existingStartTimes.has(f.startTime)).length;

            // Store data and show confirm modal
            pendingImportData = importedData;
            const totalCount = importedHistory.length;
            
            let message = `Found ${totalCount} fast${totalCount !== 1 ? 's' : ''} in file.`;
            if (pendingNewFastsCount === 0) {
                message += ` All fasts already exist in your data.`;
            } else if (pendingNewFastsCount === totalCount) {
                message += ` All ${pendingNewFastsCount} would be added.`;
            } else {
                message += ` ${pendingNewFastsCount} new fast${pendingNewFastsCount !== 1 ? 's' : ''} would be added.`;
            }
            
            el.importConfirmMessage.textContent = message;
            openModal(el.importConfirmModal);

        } catch (err) {
            showImportError('Failed to import: Invalid file format.');
            console.error('Import error:', err);
        }
    };
    
    reader.onerror = function() {
        showImportError('Failed to read file.');
    };
    
    reader.readAsText(file);

    // Reset input so same file can be selected again
    event.target.value = '';
}

function confirmImport(mode) {
    if (!pendingImportData) return;

    // Stop any existing timer
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    let finalData;
    
    if (mode === 'merge') {
        const existingData = loadData() || { history: [], settings: {} };
        const existingHistory = existingData.history || [];
        const importedHistory = pendingImportData.history || [];
        
        // Create a Set of existing start times for fast lookup
        const existingStartTimes = new Set(existingHistory.map(f => f.startTime));
        
        // Add only fasts that don't already exist
        const newFasts = importedHistory.filter(f => !existingStartTimes.has(f.startTime));
        
        finalData = {
            ...existingData,
            history: [...existingHistory, ...newFasts].sort((a, b) => a.startTime - b.startTime)
        };
        
        // Keep existing currentFast if present, otherwise use imported
        if (!existingData.currentFast && pendingImportData.currentFast) {
            finalData.currentFast = pendingImportData.currentFast;
        }
    } else {
        // Replace mode - use imported data as-is
        finalData = pendingImportData;
    }

    saveData(finalData);

    // Refresh UI
    initTheme();
    initShowZones();
    
    if (finalData.currentFast) {
        fastStartTime = finalData.currentFast.startTime;
        goalHours = finalData.currentFast.goalHours;
        isFasting = true;
        goalReachedNotified = finalData.currentFast.goalReachedNotified || false;
        updateDisplay();
        startTimerLoop();
        updateStatusBadge(true, goalHours);
        el.actionButton.textContent = 'End Fast';
        el.actionButton.className = CLASSES.buttonEnd;
        
        // Check if goal was reached while away
        checkGoalReached();
    } else {
        isFasting = false;
        showIdleState();
    }

    pendingImportData = null;
    closeModal(el.importConfirmModal);
    closeSettingsModal();
}

function cancelImport() {
    pendingImportData = null;
    closeModal(el.importConfirmModal);
}

function showImportError(message) {
    el.importConfirmMessage.textContent = message;
    el.importMergeBtn.classList.add('hidden');
    el.importReplaceBtn.classList.add('hidden');
    el.importCancelBtn.textContent = 'OK';
    openModal(el.importConfirmModal);
}

function resetImportModal() {
    el.importMergeBtn.classList.remove('hidden');
    el.importReplaceBtn.classList.remove('hidden');
    el.importCancelBtn.textContent = 'Cancel';
}

function clearCurrentFast() {
    const data = loadData() || { history: [] };
    data.currentFast = null;
    saveData(data);
}

function saveCurrentFast() {
    const data = loadData() || { history: [] };
    data.currentFast = {
        startTime: fastStartTime,
        goalHours: goalHours,
        goalReachedNotified: goalReachedNotified
    };
    saveData(data);
}

function saveFastToHistory(startTime, endTime, goal) {
    const data = loadData() || { history: [] };
    const duration = (endTime - startTime) / MS_PER_HOUR;

    data.history = data.history || [];
    data.history.push({
        id: Date.now(),
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        goalHours: goal
    });

    // Keep only last 90 fasts
    if (data.history.length > MAX_HISTORY) {
        data.history = data.history.slice(-MAX_HISTORY);
    }

    saveData(data);
}

// Check if goal was reached (used on page load and visibility change)
function checkGoalReached() {
    if (!isFasting || goalReachedNotified) return;

    const now = Date.now();
    const elapsed = now - fastStartTime;
    const goalMs = goalHours * MS_PER_HOUR;

    if (elapsed >= goalMs) {
        goalReachedNotified = true;
        saveCurrentFast();

        // Format the duration for the message
        const totalHours = Math.floor(elapsed / MS_PER_HOUR);
        const minutes = Math.floor((elapsed % MS_PER_HOUR) / 60000);
        let durationText;
        if (totalHours > 0 && minutes > 0) {
            durationText = `${totalHours}h ${minutes}m`;
        } else if (totalHours > 0) {
            durationText = `${totalHours}h`;
        } else {
            durationText = `${minutes}m`;
        }

        showToast(`You completed your ${goalHours}h fast! (${durationText} total)`);

        // Update button to show completion
        el.actionButton.textContent = 'Complete Fast';
        el.actionButton.className = CLASSES.buttonComplete;
    }
}

// Generic modal management with focus trapping
function openModal(modal) {
    focusedElementBeforeModal = document.activeElement;
    modal.classList.remove('hidden');
    trapFocus(modal);
}

function closeModal(modal) {
    modal.classList.add('hidden');
    removeFocusTrap(modal);
    if (focusedElementBeforeModal) {
        focusedElementBeforeModal.focus();
    }
}

// Initialize
function init() {
    initElements();
    initTheme();
    initShowZones();
    initToastPauseOnInteraction();
    registerServiceWorker();

    el.themeToggleBtn.addEventListener('click', toggleTheme);
    el.settingsBtn.addEventListener('click', openSettingsModal);
    el.closeModalBtn.addEventListener('click', closeSettingsModal);
    addBackdropClose(el.settingsModal, closeSettingsModal);
    
    el.historyBtn.addEventListener('click', openHistoryModal);
    el.closeHistoryBtn.addEventListener('click', closeHistoryModal);
    addBackdropClose(el.historyModal, closeHistoryModal);
    
    el.showZonesBtn.addEventListener('click', toggleShowZones);
    el.exportDataBtn.addEventListener('click', exportData);
    el.importFileInput.addEventListener('change', importData);
    el.importMergeBtn.addEventListener('click', () => confirmImport('merge'));
    el.importReplaceBtn.addEventListener('click', () => confirmImport('replace'));
    el.importCancelBtn.addEventListener('click', () => {
        cancelImport();
        resetImportModal();
    });
    el.startTimeDisplay.addEventListener('click', openEditStartTimeModal);
    el.closeEditStartTimeBtn.addEventListener('click', closeEditStartTimeModal);
    addBackdropClose(el.editStartTimeModal, closeEditStartTimeModal);
    
    el.saveStartTimeBtn.addEventListener('click', saveEditedStartTime);
    el.toastClose.addEventListener('click', hideToast);
    
    // Use event delegation for history list delete buttons (security improvement)
    el.historyList.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('[data-delete-fast]');
        if (deleteBtn) {
            deleteFast(parseInt(deleteBtn.dataset.deleteFast, 10));
        }
    });

    // Listen for visibility changes to check goal when user returns
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isFasting) {
            checkGoalReached();
        }
    });

    const data = loadData();

    if (data && data.currentFast) {
        // Restore existing fast
        fastStartTime = data.currentFast.startTime;
        goalHours = data.currentFast.goalHours;
        isFasting = true;
        goalReachedNotified = data.currentFast.goalReachedNotified || false;

        updateDisplay();
        startTimerLoop();

        updateStatusBadge(true, goalHours);
        el.actionButton.textContent = 'End Fast';
        el.actionButton.className = CLASSES.buttonEnd;

        // Check if goal was reached while away
        checkGoalReached();
    } else {
        showIdleState();
    }

    // Always bind the action button click handler
    el.actionButton.addEventListener('click', handleActionClick);
}

function handleActionClick() {
    if (isFasting) {
        endFast();
    } else {
        startFast(Date.now(), goalHours);
    }
}

function initShowZones() {
    const data = loadData();
    showZones = data?.settings?.showZones !== false; // Default to true
    updateShowZonesUI();
    updateZoneVisibility();
}

function toggleShowZones() {
    showZones = !showZones;

    // Save to settings
    const data = loadData() || { history: [] };
    data.settings = data.settings || {};
    data.settings.showZones = showZones;
    saveData(data);

    updateShowZonesUI();
    updateZoneVisibility();
}

function updateShowZonesUI() {
    if (showZones) {
        el.showZonesBtn.classList.remove('bg-slate-200', 'dark:bg-slate-600');
        el.showZonesBtn.classList.add('bg-emerald-500');
        el.showZonesToggle.classList.add('translate-x-5');
        el.showZonesBtn.setAttribute('aria-checked', 'true');
        el.showZonesBtn.querySelector('.sr-only').textContent = 'Fasting zones are currently shown';
    } else {
        el.showZonesBtn.classList.add('bg-slate-200', 'dark:bg-slate-600');
        el.showZonesBtn.classList.remove('bg-emerald-500');
        el.showZonesToggle.classList.remove('translate-x-5');
        el.showZonesBtn.setAttribute('aria-checked', 'false');
        el.showZonesBtn.querySelector('.sr-only').textContent = 'Fasting zones are currently hidden';
    }
}

function updateZoneVisibility() {
    if (showZones) {
        el.zoneContainer.classList.remove('hidden');
        el.zoneDisclaimer.classList.remove('hidden');
        // Update ring to current zone color
        const zone = FASTING_ZONES[currentZoneIndex >= 0 ? currentZoneIndex : 0];
        el.progressCircle.style.stroke = zone.color;
    } else {
        el.zoneContainer.classList.add('hidden');
        el.zoneDisclaimer.classList.add('hidden');
        // Reset ring to default color
        el.progressCircle.style.stroke = '#10b981';
    }
}

// PWA Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
}

function openSettingsModal() {
    const defaultDuration = getDefaultDuration();
    updateDurationButtons(defaultDuration);
    openModal(el.settingsModal);
}

function closeSettingsModal() {
    closeModal(el.settingsModal);
}

function openHistoryModal() {
    loadHistory();
    openModal(el.historyModal);
}

function closeHistoryModal() {
    closeModal(el.historyModal);
}

function openEditStartTimeModal() {
    if (!isFasting || !fastStartTime) return;
    
    // Populate the form with current start time
    const startDate = new Date(fastStartTime);
    
    // Format date as YYYY-MM-DD for input
    const year = startDate.getFullYear();
    const month = String(startDate.getMonth() + 1).padStart(2, '0');
    const day = String(startDate.getDate()).padStart(2, '0');
    el.editStartDate.value = `${year}-${month}-${day}`;
    
    // Format time as HH:MM for input
    const hours = String(startDate.getHours()).padStart(2, '0');
    const minutes = String(startDate.getMinutes()).padStart(2, '0');
    el.editStartTime.value = `${hours}:${minutes}`;
    
    // Hide any previous error
    el.editStartTimeError.classList.add('hidden');
    
    openModal(el.editStartTimeModal);
}

function closeEditStartTimeModal() {
    closeModal(el.editStartTimeModal);
}

// Fixed: Added validation for malformed date/time input
function saveEditedStartTime() {
    const dateValue = el.editStartDate.value;
    const timeValue = el.editStartTime.value;
    
    if (!dateValue || !timeValue) {
        el.editStartTimeError.textContent = 'Please enter both date and time.';
        el.editStartTimeError.classList.remove('hidden');
        return;
    }
    
    // Parse the new start time
    const [year, month, day] = dateValue.split('-').map(Number);
    const [hours, minutes] = timeValue.split(':').map(Number);
    
    // Validate parsed values
    if ([year, month, day, hours, minutes].some(v => isNaN(v))) {
        el.editStartTimeError.textContent = 'Invalid date or time format.';
        el.editStartTimeError.classList.remove('hidden');
        return;
    }
    
    const newStartDate = new Date(year, month - 1, day, hours, minutes);
    
    // Validate the date object
    if (isNaN(newStartDate.getTime())) {
        el.editStartTimeError.textContent = 'Invalid date or time.';
        el.editStartTimeError.classList.remove('hidden');
        return;
    }
    
    const newStartTime = newStartDate.getTime();
    
    // Validate: cannot be in the future
    if (newStartTime > Date.now()) {
        el.editStartTimeError.textContent = 'Start time cannot be in the future.';
        el.editStartTimeError.classList.remove('hidden');
        return;
    }
    
    // Update the start time
    fastStartTime = newStartTime;
    
    // Reset goal notification flag to allow re-checking
    // (user may have changed start time to trigger or un-trigger goal)
    goalReachedNotified = false;
    
    saveCurrentFast();
    updateStartTimeDisplay();
    updateDisplay();
    
    closeEditStartTimeModal();
    
    // Check if goal is now reached with the new start time
    checkGoalReached();
}

function loadHistory() {
    const data = loadData();
    if (!data || !data.history || data.history.length === 0) {
        el.historyList.innerHTML = `
                <div class="text-center text-slate-500 dark:text-slate-400 py-8" role="status">
                    No fasting history yet.
                    <br><span class="text-sm">Complete a fast to see it here!</span>
                </div>
            `;
        return;
    }

    // Sort by start time, newest first
    const sortedHistory = [...data.history].sort((a, b) => b.startTime - a.startTime);

    // Use a temporary container to build the HTML
    // Fixed: Using data attributes instead of inline onclick handlers
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sortedHistory.map(fast => {
        const startDate = new Date(fast.startTime);
        const endDate = new Date(fast.endTime);
        const hours = Math.floor(fast.duration);
        const mins = Math.round((fast.duration - hours) * 60);
        const durationStr = `${hours}h ${mins}m`;
        const reachedGoal = fast.duration >= fast.goalHours;
        const goalIcon = reachedGoal ? '✓' : '✗';
        const goalColorClass = reachedGoal
            ? 'text-emerald-500 dark:text-emerald-400'
            : 'text-slate-400 dark:text-slate-500';

        return `
                <div class="flex items-center justify-between py-4 border-b border-slate-200 dark:border-slate-700 last:border-0" role="listitem">
                    <div>
                        <div class="font-medium text-slate-800 dark:text-slate-100">
                            <span class="${goalColorClass}" aria-label="${reachedGoal ? 'Goal reached' : 'Goal not reached'}">${goalIcon}</span>
                            ${durationStr}
                            <span class="text-sm text-slate-500 dark:text-slate-400">/ ${fast.goalHours}h goal</span>
                        </div>
                        <div class="text-sm text-slate-500 dark:text-slate-400">
                            ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}
                            → ${endDate.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}
                        </div>
                    </div>
                    <button data-delete-fast="${fast.id}" class="p-3 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Delete fast from ${startDate.toLocaleDateString()}">
                        <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            `;
    }).join('');

    el.historyList.innerHTML = '';
    while (tempDiv.firstChild) {
        el.historyList.appendChild(tempDiv.firstChild);
    }
}

function deleteFast(fastId) {
    const data = loadData();
    if (!data || !data.history) return;

    data.history = data.history.filter(fast => fast.id !== fastId);
    saveData(data);
    loadHistory();
}

function startFast(startTime, hours) {
    fastStartTime = startTime;
    goalHours = hours;
    isFasting = true;
    goalReachedNotified = false;
    lastAnnouncedMinute = -1;
    lastDisplayedTime = '';

    saveCurrentFast();
    updateDisplay();
    startTimerLoop();

    updateStatusBadge(true, goalHours);
    el.actionButton.textContent = 'End Fast';
    el.actionButton.className = CLASSES.buttonEnd;
}

function startTimerLoop() {
    lastUpdateTime = 0;
    function tick(timestamp) {
        if (!isFasting) return;
        
        // Only update once per second
        if (timestamp - lastUpdateTime >= 1000) {
            lastUpdateTime = timestamp;
            updateDisplay();
        }
        
        animationFrameId = requestAnimationFrame(tick);
    }
    animationFrameId = requestAnimationFrame(tick);
}

function endFast() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    const endTime = Date.now();
    saveFastToHistory(fastStartTime, endTime, goalHours);
    clearCurrentFast();

    isFasting = false;
    showIdleState();
}

function showIdleState() {
    const defaultDuration = getDefaultDuration();
    goalHours = defaultDuration;

    updateStatusBadge(false, defaultDuration);
    el.timerDisplay.textContent = '00:00:00';
    lastDisplayedTime = '00:00:00';
    el.progressCircle.style.strokeDashoffset = CIRCUMFERENCE;
    el.progressCircle.style.stroke = '#10b981'; // Reset to default emerald

    el.actionButton.textContent = 'Start Fast';
    el.actionButton.className = CLASSES.buttonStart;

    // Reset zone display
    currentZoneIndex = -1; // Force update
    updateZoneDisplay(0);
    
    // Update screen reader announcements
    el.progressAnnouncer.setAttribute('aria-valuenow', '0');
    el.progressAnnouncer.textContent = '0% complete';
    el.timerAnnouncer.textContent = '';
}

function getCurrentZone(elapsedHours) {
    for (let i = FASTING_ZONES.length - 1; i >= 0; i--) {
        if (elapsedHours >= FASTING_ZONES[i].start) {
            return i;
        }
    }
    return 0;
}

function updateZoneDisplay(elapsedHours) {
    const zoneIndex = getCurrentZone(elapsedHours);

    // Only update DOM if zone changed
    if (zoneIndex !== currentZoneIndex || elapsedHours === 0) {
        currentZoneIndex = zoneIndex;
        const zone = FASTING_ZONES[zoneIndex];

        // Update zone badge
        el.zoneBadge.style.backgroundColor = zone.color + '30';
        el.zoneBadge.style.color = zone.color;
        el.zoneIcon.textContent = zone.icon;
        el.zoneName.textContent = zone.name;

        // Update progress ring color (only if zones are shown)
        if (showZones) {
            el.progressCircle.style.stroke = zone.color;
        } else {
            el.progressCircle.style.stroke = '#10b981'; // Default emerald
        }
    }
}

function updateDisplay() {
    if (!isFasting) return;

    const now = Date.now();
    const elapsed = now - fastStartTime;
    const goalMs = goalHours * MS_PER_HOUR;

    // Update timer - use bitwise operations for faster floor
    const totalSeconds = (elapsed / 1000) | 0;
    const hours = (totalSeconds / 3600) | 0;
    const minutes = ((totalSeconds % 3600) / 60) | 0;
    const seconds = totalSeconds % 60;

    // Only update DOM if value changed (using cached variable instead of DOM read)
    const newTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    if (lastDisplayedTime !== newTime) {
        lastDisplayedTime = newTime;
        el.timerDisplay.textContent = newTime;
    }

    // Update progress (only on second boundaries to reduce repaints)
    const progress = Math.min((elapsed / goalMs) * 100, 100);
    const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;
    el.progressCircle.style.strokeDashoffset = offset;

    // Update screen reader progress announcer every minute (not every second)
    const currentMinute = hours * 60 + minutes;
    if (currentMinute !== lastAnnouncedMinute) {
        lastAnnouncedMinute = currentMinute;
        
        // Update progress bar for screen readers
        el.progressAnnouncer.setAttribute('aria-valuenow', Math.round(progress).toString());
        el.progressAnnouncer.textContent = `${Math.round(progress)}% complete`;
        
        // Announce time every 5 minutes to avoid being too verbose
        if (currentMinute % 5 === 0) {
            let announcement = `${hours} hours and ${minutes} minutes elapsed`;
            if (showZones) {
                const zone = FASTING_ZONES[currentZoneIndex];
                announcement += `. Currently in ${zone.name} zone`;
            }
            el.timerAnnouncer.textContent = announcement;
        }
    }

    // Update fasting zone
    const elapsedHours = elapsed / MS_PER_HOUR;
    updateZoneDisplay(elapsedHours);

    // Check if goal reached and show toast
    if (elapsed >= goalMs && !goalReachedNotified) {
        checkGoalReached();
    }
}

// Start on load
document.addEventListener('DOMContentLoaded', init);
