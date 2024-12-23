// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { window, workspace, commands, CancellationTokenSource, ExtensionContext, MessageOptions, Position, ProgressLocation, Uri } from 'vscode';
import { showQuickPick, showInputBox } from './orginput';
import { createMD, getDefaultInstance } from './org.service';
import { instanceStatus, InstanceStatus } from './status.service';
import { resolve } from 'path';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "salesforce-status" is now active!');
	const outpuChannel = window.createOutputChannel("SF Org Status");
	outpuChannel.clear();
	outpuChannel.show();

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = commands.registerCommand('salesforce-status.org-status', async () => {

		const instanceRec = await getDefaultInstance();
		outpuChannel.appendLine('\nINSTANCE REC\n= = = = = = = = = =');
		outpuChannel.appendLine(JSON.stringify(instanceRec));
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
				status = await instanceStatus(instance as string);
				outpuChannel.appendLine('\nSTATUS\n= = = = = = = = = =');
				outpuChannel.appendLine(JSON.stringify(status));
				resolve();
			}).then(() => {
				if (instanceRec?.TrialExpirationDate && instanceRec.IsSandbox) {
					status.environment = "Scratch";
				}
				const options: MessageOptions = { detail: `Status: ${status.status}\n\rEnv: ${status.environment}\n\rRelease: ${status.releaseVersion} (${status.releaseNumber})\n\rLocation: ${status.location}`, modal: true };
				return window.showInformationMessage(instanceRec?.InstanceName, options, ...["Show more"]);
			}).then(clickedItem => {
				if (clickedItem === "Show more") {
					console.log("show more");
					showMore(status, instanceRec);
				}
			});
;	}
	});

	context.subscriptions.push(disposable);
}

async function showMore(status: any, instanceRec: any){
	let setting = Uri.parse("untitled:orgstatus.md");
		const md = await createMD(status, instanceRec);
		const doc = await workspace.openTextDocument(setting);
		const e = await window.showTextDocument(doc, 1, false);
		e.edit(async edit => {
			await edit.insert(new Position(0, 0), md);
			commands.executeCommand('markdown.showPreview', setting);
		});
}


// This method is called when your extension is deactivated
export function deactivate() {}
