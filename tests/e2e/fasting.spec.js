// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Fasting Timer App', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage before each test for clean state
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test.describe('Core Fasting Flow', () => {
    
    test('should start a fast and show timer running', async ({ page }) => {
      const startButton = page.locator('#actionButton');
      await expect(startButton).toHaveText('Start Fast');
      
      await startButton.click();
      
      await expect(startButton).toHaveText('End Fast');
      await expect(page.locator('#statusBadge')).toContainText('Fasting');
      
      // Verify timer is running (wait a moment and check it's not 00:00:00)
      await page.waitForTimeout(1500);
      const timerText = await page.locator('#timerDisplay').textContent();
      expect(timerText).not.toBe('00:00:00');
    });

    test('should end a fast and return to idle state', async ({ page }) => {
      // Start a fast
      await page.locator('#actionButton').click();
      await expect(page.locator('#actionButton')).toHaveText('End Fast');
      
      // End the fast
      await page.locator('#actionButton').click();
      
      await expect(page.locator('#actionButton')).toHaveText('Start Fast');
      await expect(page.locator('#statusBadge')).toContainText('Not Fasting');
      await expect(page.locator('#timerDisplay')).toHaveText('00:00:00');
    });

    test('should persist fast across page reload', async ({ page }) => {
      // Start a fast
      await page.locator('#actionButton').click();
      await page.waitForTimeout(1000);
      
      // Reload the page
      await page.reload();
      
      // Verify fast is still running
      await expect(page.locator('#actionButton')).toHaveText('End Fast');
      await expect(page.locator('#statusBadge')).toContainText('Fasting');
      
      const timerText = await page.locator('#timerDisplay').textContent();
      expect(timerText).not.toBe('00:00:00');
    });

    test('should show start time when fasting', async ({ page }) => {
      await page.locator('#actionButton').click();
      
      const startTimeDisplay = page.locator('#startTimeDisplay');
      await expect(startTimeDisplay).toBeVisible();
      await expect(startTimeDisplay).toContainText('Started');
    });
  });

  test.describe('Edit Start Time', () => {
    
    test('should open edit modal when clicking start time', async ({ page }) => {
      // Start a fast first
      await page.locator('#actionButton').click();
      
      // Click on start time display
      await page.locator('#startTimeDisplay').click();
      
      // Verify modal is open
      await expect(page.locator('#editStartTimeModal')).toBeVisible();
      await expect(page.locator('#editStartDate')).toBeVisible();
      await expect(page.locator('#editStartTime')).toBeVisible();
    });

    test('should close edit modal on cancel', async ({ page }) => {
      await page.locator('#actionButton').click();
      await page.locator('#startTimeDisplay').click();
      
      await expect(page.locator('#editStartTimeModal')).toBeVisible();
      
      // Click outside modal to close
      await page.locator('#editStartTimeModal').click({ position: { x: 10, y: 10 } });
      
      await expect(page.locator('#editStartTimeModal')).toBeHidden();
    });

    test('should not allow future start time', async ({ page }) => {
      await page.locator('#actionButton').click();
      await page.locator('#startTimeDisplay').click();
      
      // Set date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      await page.locator('#editStartDate').fill(dateStr);
      await page.locator('#saveStartTimeBtn').click();
      
      // Should show error
      await expect(page.locator('#editStartTimeError')).toBeVisible();
      await expect(page.locator('#editStartTimeError')).toContainText('future');
    });
  });

  test.describe('History', () => {
    
    test('should show empty history message initially', async ({ page }) => {
      await page.locator('#historyBtn').click();
      
      await expect(page.locator('#historyModal')).toBeVisible();
      await expect(page.locator('#historyList')).toContainText('No fasting history yet');
    });

    test('should add completed fast to history', async ({ page }) => {
      // Start and end a fast
      await page.locator('#actionButton').click();
      await page.waitForTimeout(1000);
      await page.locator('#actionButton').click();
      
      // Open history
      await page.locator('#historyBtn').click();
      
      // Should show the completed fast
      await expect(page.locator('#historyList')).not.toContainText('No fasting history yet');
      await expect(page.locator('#historyList')).toContainText('Goal:');
    });

    test('should delete fast from history', async ({ page }) => {
      // Start and end a fast
      await page.locator('#actionButton').click();
      await page.waitForTimeout(500);
      await page.locator('#actionButton').click();
      
      // Open history
      await page.locator('#historyBtn').click();
      await expect(page.locator('#historyList')).toContainText('Goal:');
      
      // Delete the fast (click the X button)
      await page.locator('#historyList button').first().click();
      
      // Should show empty message
      await expect(page.locator('#historyList')).toContainText('No fasting history yet');
    });
  });

  test.describe('Settings', () => {
    
    test('should open and close settings modal', async ({ page }) => {
      await page.locator('#settingsBtn').click();
      await expect(page.locator('#settingsModal')).toBeVisible();
      
      await page.locator('#closeModalBtn').click();
      await expect(page.locator('#settingsModal')).toBeHidden();
    });

    test('should change default fasting duration', async ({ page }) => {
      await page.locator('#settingsBtn').click();
      
      // Click on 18h duration
      await page.locator('#duration-18').click();
      
      // Close modal
      await page.locator('#closeModalBtn').click();
      
      // Verify goal display updated
      await expect(page.locator('#statusBadge')).toContainText('18h');
    });

    test('should persist duration setting after reload', async ({ page }) => {
      await page.locator('#settingsBtn').click();
      await page.locator('#duration-20').click();
      await page.locator('#closeModalBtn').click();
      
      await page.reload();
      
      await expect(page.locator('#statusBadge')).toContainText('20h');
    });

    test('should toggle theme', async ({ page }) => {
      await page.locator('#settingsBtn').click();
      
      const html = page.locator('html');
      const initialDark = await html.evaluate(el => el.classList.contains('dark'));
      
      await page.locator('#themeToggleBtn').click();
      
      const afterToggleDark = await html.evaluate(el => el.classList.contains('dark'));
      expect(afterToggleDark).toBe(!initialDark);
    });

    test('should toggle fasting zones visibility', async ({ page }) => {
      // Start a fast to see zones
      await page.locator('#actionButton').click();
      await expect(page.locator('#zoneContainer')).toBeVisible();
      
      // Toggle zones off
      await page.locator('#settingsBtn').click();
      await page.locator('#showZonesBtn').click();
      await page.locator('#closeModalBtn').click();
      
      await expect(page.locator('#zoneContainer')).toBeHidden();
    });
  });

  test.describe('Export/Import', () => {
    
    test('should export data as JSON file', async ({ page }) => {
      // Create some history first
      await page.locator('#actionButton').click();
      await page.waitForTimeout(500);
      await page.locator('#actionButton').click();
      
      // Open settings and click export
      await page.locator('#settingsBtn').click();
      
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#exportDataBtn').click();
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toMatch(/^fasting-data-\d{4}-\d{2}-\d{2}\.json$/);
    });

    test('should show import modal with file info', async ({ page }) => {
      // Create a test file
      const testData = {
        history: [
          { id: 1, startTime: Date.now() - 3600000, endTime: Date.now(), duration: 1, goalHours: 16 }
        ],
        settings: { defaultDuration: 16 }
      };
      
      await page.locator('#settingsBtn').click();
      
      // Set up file chooser
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('label:has(#importFileInput)').click();
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles({
        name: 'test-data.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(testData))
      });
      
      // Should show import confirm modal
      await expect(page.locator('#importConfirmModal')).toBeVisible();
      await expect(page.locator('#importConfirmMessage')).toContainText('1 fast');
    });

    test('should merge imported data with existing', async ({ page }) => {
      // Create existing history
      await page.locator('#actionButton').click();
      await page.waitForTimeout(500);
      await page.locator('#actionButton').click();
      
      // Prepare import data with different timestamp
      const testData = {
        history: [
          { id: 999, startTime: Date.now() - 86400000, endTime: Date.now() - 82800000, duration: 1, goalHours: 16 }
        ],
        settings: {}
      };
      
      await page.locator('#settingsBtn').click();
      
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('label:has(#importFileInput)').click();
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles({
        name: 'test-data.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(testData))
      });
      
      // Click merge
      await page.locator('#importMergeBtn').click();
      
      // Check history has both fasts
      await page.locator('#historyBtn').click();
      const historyItems = page.locator('#historyList > div');
      await expect(historyItems).toHaveCount(2);
    });
  });

  test.describe('Fasting Zones', () => {
    
    test('should display zone badge when fasting', async ({ page }) => {
      await page.locator('#actionButton').click();
      
      await expect(page.locator('#zoneBadge')).toBeVisible();
      await expect(page.locator('#zoneIcon')).toBeVisible();
      await expect(page.locator('#zoneName')).toBeVisible();
    });

    test('should start in Fed zone', async ({ page }) => {
      await page.locator('#actionButton').click();
      
      await expect(page.locator('#zoneName')).toHaveText('Fed');
    });
  });
});
