document.addEventListener('DOMContentLoaded', () => {
  const queryInput = document.getElementById('query-input');
  const askBtn = document.getElementById('ask-btn');
  const responseBox = document.getElementById('response-box');
  const statusDiv = document.getElementById('status');
  const suggestionPills = document.querySelector('.suggestion-pills');

 // Helper function to convert AI Markdown to HTML
function formatAIResponse(text) {
  return text
    // 1. Convert "### Heading" into <h3>Heading</h3>
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    // 2. Convert "**bold**" into <strong>bold</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // 3. Convert "*italics*" into <em>italics</em>
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // 4. Prevent massive gaps by removing invisible newlines right after a heading
    .replace(/<\/h3>\n?/g, '</h3>')
    // 5. Convert all remaining standard newlines into HTML breaks
    .replace(/\n/g, '<br>');
}

  // 1. Handle Suggestion Pill Clicks
  if (suggestionPills) {
    suggestionPills.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        // Strip the emoji (first 2 characters) and put the text in the input box
        const promptText = e.target.textContent.substring(2).trim();
        queryInput.value = promptText + " ";
        queryInput.focus();
      }
    });
  }

  // 2. Allow pressing "Enter" to submit (Shift+Enter for new line)
  queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevents a random new line from being added
      askBtn.click();     // Triggers the send button
    }
  });

  // 3. Main Process: Button Click
  askBtn.addEventListener('click', async () => {
    const query = queryInput.value.trim();
    if (!query) return;

    // Clear input and update UI to loading state
    queryInput.value = "";
    statusDiv.innerText = "Extracting webpage content...";
    responseBox.innerHTML = '<div class="placeholder">✨ Reading page and thinking...</div>';

    try {
      // Get the active tab in Chrome
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        statusDiv.innerText = "";
        responseBox.innerText = "Error: Could not find active tab.";
        return;
      }

      // Inject the text scraper into the webpage
      // Inject the text scraper into the webpage
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }, () => {
        
        // NEW: Check if Chrome blocked the injection (e.g., restricted page, wrong file name)
        if (chrome.runtime.lastError) {
          statusDiv.innerText = "";
          responseBox.innerText = "Chrome Blocked Injection: " + chrome.runtime.lastError.message;
          return;
        }

        // Ask the scraper for the text
        chrome.tabs.sendMessage(tab.id, { action: "extract_text" }, async (response) => {
          
          // NEW: Check if the message failed to send
          if (chrome.runtime.lastError) {
            statusDiv.innerText = "";
            responseBox.innerText = "Message Error: " + chrome.runtime.lastError.message;
            return;
          }

          if (!response || !response.pageText) {
            statusDiv.innerText = "";
            responseBox.innerText = "Error: Scraper ran, but couldn't find any text on this page.";
            return;
          }

          statusDiv.innerText = "Asking AI backend...";
          
          // ... (The rest of your fetch logic stays exactly the same)

          try {
            // Send the text and question to your local Express server
            const apiRes = await fetch('http://localhost:3000/api/ask', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pageText: response.pageText,
                query: query
              })
            });

            const data = await apiRes.json();
            
            // Clear status text
            statusDiv.innerText = ""; 

            // Display the AI's final answer
            if (data.answer) {
              responseBox.innerHTML = formatAIResponse(data.answer);
            } else {
              responseBox.innerText = "Backend Error: " + (data.error || "Unknown error occurred.");
            }
          } catch (err) {
            statusDiv.innerText = "";
            responseBox.innerText = "Network Error: Make sure your Node.js backend (server.js) is currently running in your terminal.";
            console.error(err);
          }
        });
      });
    } catch (err) {
      statusDiv.innerText = "";
      responseBox.innerText = "Critical extension error.";
      console.error(err);
    }
  });
});