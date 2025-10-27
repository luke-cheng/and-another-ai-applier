// Handle action click to open side panel
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

function polling() {
  // console.log("polling");
  setTimeout(polling, 1000 * 30);
}

polling();
