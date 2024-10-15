// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { window, commands, CancellationTokenSource, ExtensionContext, ProgressLocation } from 'vscode';
import { showQuickPick, showInputBox } from './orginput';
import { getDefaultInstance } from './org.service';
import { instanceStatus, InstanceStatus } from './status.service';
import { resolve } from 'path';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "salesforce-status" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = commands.registerCommand('salesforce-status.org-status', async () => {

		const instanceRec = await getDefaultInstance();
		const instance = await showInputBox(instanceRec?.InstanceName);
		if (instance) {
			let status: InstanceStatus;
			// Progress bar
			const progressBar = window.withProgress({
				location: ProgressLocation.Notification,
				title: 'Fetching status',
				cancellable: true
			}, async () => {
				const p = new Promise<void>(resolve => {
					setTimeout(() => {
						resolve();
					}, 10000);
				});
				// Get status
				status = await instanceStatus(instance);
				resolve();
			}).then(() => {
				window.showInformationMessage(`Status: ${status.status}\n\rEnv: ${status.environment}\n\rRelease: ${status.releaseVersion}\n\rRel #: ${status.releaseNumber}\n\rLocation: ${status.location}`, { modal: true });
			});	
		}
	});

	context.subscriptions.push(disposable);
}


// This method is called when your extension is deactivated
export function deactivate() {}
