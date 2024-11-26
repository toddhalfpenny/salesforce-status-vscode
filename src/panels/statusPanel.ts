import * as vscode from "vscode";

export class StatusPanel {
  public static currentPanel: StatusPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _flowMap: any;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, orgAndStatus:any) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri, orgAndStatus);
  }

  public dispose() {
    StatusPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  public static render(extensionUri: vscode.Uri, htmlBody: any) {
    if (StatusPanel.currentPanel) {
      StatusPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
    } else {
      // console.log('render');
      const panel = vscode.window.createWebviewPanel("status-render", `Org Status`, vscode.ViewColumn.One, {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out')]
      });

      StatusPanel.currentPanel = new StatusPanel(panel, extensionUri, htmlBody);
    }
  }

  private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, htmlBody:any) {
    return /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob: ${webview.cspSource} https:; script-src 'self' 'unsafe-inline' ${webview.cspSource} vscode-resource:; style-src 'self' 'unsafe-inline' ${webview.cspSource} vscode-resource: https:;" />
        <script
          src="node_modules/@vscode-elements/elements/dist/bundled.js"
          type="module"
        ></script>
        <title>Org Status</title>
        <style>
        h2, summary {
          font-size: 20px;
          border-top: 1px solid lightblue;
          padding-top: 1em;
          margin-top: 10px;
        }
        label {
          display: inline-block;
          font-weight: bold;
          margin-right: 0.5em;
          text-align: right;
          width: 7em;
        }
        th {
          border-bottom: gray;
        }
        td {
          padding: 0.5em 0.2em;
        }
          text-transform: capitalize;
        }
        </style>
      </head>
      <body>
        ${htmlBody}
      </body>
    </html>
    `;
  }

}