function extractPageText() {
  // Safety check: Make sure the page actually has a body
  if (!document.body) {
    return "Error: No readable text found on this page.";
  }
  
  // Chrome natively ignores scripts/styles when using innerText!
  const rawText = document.body.innerText;
  
  // Clean up giant spaces and limit to 100,000 characters
  return rawText.replace(/\s+/g, ' ').trim().slice(0, 100000);
}

// Listen for the extraction message sent from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract_text") {
    const text = extractPageText();
    sendResponse({ pageText: text });
  }
});