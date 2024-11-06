/**
 * logger.ts
 * Utility to log to console/output channel
 */
import { ExtensionContext, OutputChannel, window } from 'vscode';

let outputChannel: OutputChannel;


export const activate = (context: ExtensionContext): void => {
  outputChannel = window.createOutputChannel("SF Org Status");
	outputChannel.clear();
};

/**
 * Prints the given content on the output channela and also sends it to debug console (for dev)
 *
 * @param content The content to be printed.
 * @param reveal Whether the output channel should be revealed.
 */
export const printChannelOutput = (content: string, reveal = false): void => {
  outputChannel.appendLine(content);
  if (reveal) {
      outputChannel.show(true);
  }
  console.log(content);
};