/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from 'vscode';

/**
 * Shows a pick list using window.showQuickPick().
 */
export async function showQuickPick() {
	let i = 0;
	const result = await window.showQuickPick(['one', 'two', 'three'], {
		placeHolder: 'one, two or three',
		onDidSelectItem: item => window.showInformationMessage(`Focus ${++i}: ${item}`)
	});
	window.showInformationMessage(`Got: ${result}`);
}

/**
 * Shows an input box using window.showInputBox().
 */
export async function showInputBox(defaultInstance: string) {
	const result = await window.showInputBox({
    title: 'Org Instance:',
		prompt: 'The instance for your default org is above, feel free to input another and hit [enter]',
		value: defaultInstance,
		// valueSelection: [2, 4],
		placeHolder: 'For example: SWE98',
		// validateInput: text => {
		// 	window.showInformationMessage(`Validating: ${text}`);
		// 	return text === '123' ? 'Not 123!' : null;
		// }
	});
  return result;
	// window.showInformationMessage(`Got: ${result}`);
}