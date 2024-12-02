// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  window,
  workspace,
  commands,
  ExtensionContext,
  MessageOptions,
  Position,
  ProgressLocation,
  Uri,
} from "vscode";
import { showInputBox } from "./orginput";
import { createMD, createMarkup, getDefaultInstance } from "./org.service";
import { instanceStatus, InstanceStatus } from "./status.service";
import * as logger from "./logger";
import { resolve } from "path";
import { StatusPanel } from "./panels/statusPanel";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "salesforce-status" is now active!',
  );
  logger.activate(context);

  const disposable= commands.registerCommand(
    "salesforce-status.org-status",
    async () => {
      try {
        const res = await getStatus();
        if (res) {
          const options: MessageOptions = {
            detail: `Status: ${res.status.status}\n\rEnv: ${res.status.environment}\n\rRelease: ${res.status.releaseVersion} (${res.status.releaseNumber})\n\rLocation: ${res.status.location}`,
            modal: true,
          };
          window.showInformationMessage(
            res.status.key ?? '',
            options,
            ...["Show more"],
          ).then( async clickedItem => {
            if (clickedItem === "Show more") {
              const htmlBody = await createMarkup(res.status, res.org);
              StatusPanel.render(context.extensionUri, htmlBody);
            }
          });
        } 
      } catch (error) {
        console.error(error);
      };	
    }
  );
 
  context.subscriptions.push(disposable);
}

async function getStatus() {
  let instanceRec: any;
  let md: string;
  await window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: "Getting default org...",
      cancellable: true,
    },
    async () => {
      const p = new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 10000);
      });
      try {
        instanceRec = await getDefaultInstance();
        resolve();
      } catch (error) {
        logger.printChannelOutput("Failed to get default Org details.");
        logger.printChannelOutput(error as string);
        throw (error);
      }
    },
  );
  logger.printChannelOutput("\nINSTANCE REC\n= = = = = = = = = =", true);
  logger.printChannelOutput(JSON.stringify(instanceRec));
  const instance = await showInputBox(instanceRec?.InstanceName);
  if (instance) {
    let status: InstanceStatus = {};
    // Progress bar
    await window
      .withProgress(
        {
          location: ProgressLocation.Notification,
          title: "Fetching status",
          cancellable: true,
        },
        async () => {
          const p = new Promise<void>((resolve) => {
            setTimeout(() => {
              resolve();
            }, 10000);
          });
          // Get status
          try {
            status = await instanceStatus(instance as string);
            logger.printChannelOutput("\nSTATUS\n= = = = = = = = = =");
            logger.printChannelOutput(JSON.stringify(status));
            resolve();
          } catch (error) {
            logger.printChannelOutput("Failed to get instance status.");
            logger.printChannelOutput(error as string);
            throw (error);
          }
        },
      )
      .then( async () => {
        if (instanceRec?.TrialExpirationDate && instanceRec.IsSandbox) {
          status.environment = "Scratch";
        }
        resolve();
      });
    return({org: instanceRec, status: status});
  }
}

async function showMore(markdown: string) {
  let setting = Uri.parse("untitled:orgstatus.md");
  const doc = await workspace.openTextDocument(setting);
  const e = await window.showTextDocument(doc, 1, false);
    e.edit(async (edit) => {
      await edit.insert(new Position(0, 0), markdown);
      commands.executeCommand("markdown.showPreview", setting);
    });
}

// This method is called when your extension is deactivated
export function deactivate() {}
