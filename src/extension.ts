// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import ollama from 'ollama';
import { text } from 'stream/consumers';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const disposable = vscode.commands.registerCommand('connorDeep-ext.start', () => {
		const panel = vscode.window.createWebviewPanel(
		'connorDeep',
		'Deep Seek Chat',
		vscode.ViewColumn.One,
		{ enableScripts: true }
	) 
	panel.webview.html = getWebviewContent();
	/// Listen for messages from the webview
	panel.webview.onDidReceiveMessage(async (message) => {
		/// If we have a chat, then we have a prompt to pass to the model (ollama)
			if (message.command === 'chat') {
				const userPrompt = message.text;
				let responseText = '';

				try {
					const streamResponse = await ollama.chat({
						model: 'deepseek-r1:1.5b',
						messages: [{ role: 'user', content: userPrompt }],
						stream: true,
					})

					for await (const part of streamResponse) {
						responseText += part.message.content
						panel.webview.postMessage({ command: 'chatResponse', text: responseText });
					}
				} catch (err) {
					console.error("Error:", err);
					panel.webview.postMessage({ command: 'chatResponse', text: 'Error: ${err.message}' });
				}
			}
		})
	})
	context.subscriptions.push(disposable);
}

function getWebviewContent(): string {
	return /*html*/`
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<style>
			body { font-family: sans-serif; margin: 1rem; }
			#prompt { width: 100%; box-sizing: border-box; font-size: 1rem; padding: 0.5rem; }
			#response { border: 1px solid #ccc; margin-top: 1rem; padding: 0.5rem; }
		</style> 
		
	</head>
	<body>
		<h2>Deep Seek Chat</h2>
		<textarea id="prompt" rows="3" placeholder="Ask something..."></textarea>
		<button id="askBtn">Ask</button>
		<div id="response"></div>

		<script>
			/// Get access to the vscode API
			const vscode = acquireVsCodeApi();

			/// This allows us to post messages back and forth
			document.getElementById('askBtn').addEventListener('click', () => {
				const text = document.getElementById('prompt').value;
				vscode.postMessage({ command: 'chat', text });
			});

			window.addEventListener('message', event => {
				const { command, text } = event.data;
				if (command === 'chatResponse') {
					document.getElementById('response').innerText = text;
				}
			})
		</script>

	</body>
	</html>`;
}

// This method is called when your extension is deactivated
export function deactivate() {}
