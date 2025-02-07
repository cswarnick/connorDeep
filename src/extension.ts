// Import required VS Code API for extension development
import * as vscode from 'vscode';
// Import Ollama for AI model interaction
import ollama from 'ollama';
// Import text helper for stream handling
import { text } from 'stream/consumers';

/**
 * Extension Activation Function
 * This is the main entry point of the extension.
 * It is called when your extension is activated (when the command is first executed).
 * @param context - The context provides access to VS Code extension APIs
 */
export function activate(context: vscode.ExtensionContext) {
    // Register a command that creates our chat interface
    const disposable = vscode.commands.registerCommand('connorDeep-ext.start', () => {
        // Create a new webview panel for our chat interface
        const panel = vscode.window.createWebviewPanel(
            'connorDeep',           // Unique identifier for the panel
            'Deep Seek Chat',       // Title displayed to the user
            vscode.ViewColumn.One,  // Display in the first column
            { enableScripts: true } // Enable JavaScript in the webview
        )

        // Set the HTML content of our webview
        panel.webview.html = getWebviewContent();

        // Set up message handling between webview and extension
        panel.webview.onDidReceiveMessage(async (message) => {
            // Handle incoming chat messages from the webview
            if (message.command === 'chat') {
                const userPrompt = message.text;
                let responseText = '';

                try {
                    // Send the user's message to Ollama and get a streaming response
                    const streamResponse = await ollama.chat({
                        model: 'deepseek-r1:1.5b',  // Specify which AI model to use
                        messages: [{ role: 'user', content: userPrompt }],
                        stream: true,  // Enable streaming for real-time responses
                    })

                    // Process the streaming response and update the UI
                    for await (const part of streamResponse) {
                        responseText += part.message.content
                        // Send each chunk of the response back to the webview
                        panel.webview.postMessage({ command: 'chatResponse', text: responseText });
                    }
                } catch (err: unknown) {  // Explicitly type err as unknown
					console.error("Error:", err);
					// Type guard to check if err is an Error object
					const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
					panel.webview.postMessage({
						command: 'chatResponse',
						text: `Error: ${errorMessage}`
					});
				}
            }
        })
    })

    // Add our command to the extension context
    context.subscriptions.push(disposable);
}

/**
 * Generate the HTML content for the webview
 * This function creates the UI for our chat interface
 * @returns {string} The HTML content as a string
 */
function getWebviewContent(): string {
    return /*html*/`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <style>
            /* Basic styling for the chat interface */
            body { font-family: sans-serif; margin: 1rem; }
            #prompt { width: 100%; box-sizing: border-box; font-size: 1rem; padding: 0.5rem; }
            #response { border: 1px solid #ccc; margin-top: 1rem; padding: 0.5rem; }
        </style>
    </head>
    <body>
        <h2>Deep Seek Chat</h2>
        <!-- Input area for user messages -->
        <textarea id="prompt" rows="3" placeholder="Ask something..."></textarea>
        <button id="askBtn">Ask</button>
        <!-- Area for displaying AI responses -->
        <div id="response"></div>

        <script>
            // Initialize VS Code API access
            const vscode = acquireVsCodeApi();

            // Set up click handler for the Ask button
            document.getElementById('askBtn').addEventListener('click', () => {
                const text = document.getElementById('prompt').value;
                // Send the message to our extension
                vscode.postMessage({ command: 'chat', text });
            });

            // Listen for responses from the extension
            window.addEventListener('message', event => {
                const { command, text } = event.data;
                if (command === 'chatResponse') {
                    // Display the AI's response
                    document.getElementById('response').innerText = text;
                }
            })
        </script>
    </body>
    </html>`;
}

/**
 * Extension Deactivation Function
 * Called when the extension is deactivated
 * Currently empty as no cleanup is needed
 */
export function deactivate() {}