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

  const disposableWebView = commands.registerCommand(
    "salesforce-status.org-status-webview",
    async () => {
      try {

      const res = await getStatus();
      const htmlBody = await createMarkup(res?.status, res?.org);
      console.log("TODD", res);
        StatusPanel.render(context.extensionUri, htmlBody);
      } catch (error) {
        console.error(error);
      };	
    }
  );
      
  const disposable = commands.registerCommand(
    "salesforce-status.org-status",
    async () => {
      // TODO MOVE THIS ALL OUT TO THE getStatus();
      let instanceRec: any;
      let md: string;
      const progressBarInstance = await window.withProgress(
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
          instanceRec = await getDefaultInstance();
          resolve();
        },
      );
      logger.printChannelOutput("\nINSTANCE REC\n= = = = = = = = = =", true);
      logger.printChannelOutput(JSON.stringify(instanceRec));
      const instance = await showInputBox(instanceRec?.InstanceName);
      if (instance) {
        let status: InstanceStatus;
        // Progress bar
        const progressBar = window
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
              status = await instanceStatus(instance as string);
              logger.printChannelOutput("\nSTATUS\n= = = = = = = = = =");
              logger.printChannelOutput(JSON.stringify(status));
              resolve();
            },
          )
          .then( async () => {
            if (instanceRec?.TrialExpirationDate && instanceRec.IsSandbox) {
              status.environment = "Scratch";
            }

            md = await createMD(status, instanceRec);
            const options: MessageOptions = {
              detail: `Status: ${status.status}\n\rEnv: ${status.environment}\n\rRelease: ${status.releaseVersion} (${status.releaseNumber})\n\rLocation: ${status.location}`,
              modal: true,
            };
            return window.showInformationMessage(
              instanceRec?.InstanceName,
              options,
              ...["Show more"],
            );
          })
          .then((clickedItem) => {
            if (clickedItem === "Show more") {
              console.log("show more");
              showMore(md);
            }
          });
      }
    },
  );

  context.subscriptions.push(disposable);
  context.subscriptions.push(disposableWebView);
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
      instanceRec = await getDefaultInstance();
      resolve();
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
          status = await instanceStatus(instance as string);
          logger.printChannelOutput("\nSTATUS\n= = = = = = = = = =");
          logger.printChannelOutput(JSON.stringify(status));
          resolve();
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
