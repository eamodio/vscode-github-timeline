// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { graphql } from '@octokit/graphql';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	console.log('VSCode Github Timeline has started');
	let session;
	try {
		session = await vscode.authentication.getSession('github', ['repo'], { createIfNone: true });
	} catch (ex) {
		vscode.window.showInformationMessage('Could not authenticate your GitHub!');
		return;
	}
	console.log('Created Github Session')
	// TODO finalize which values to query
	const res = await graphql({
		query: `query pullRequests($name: String!, $owner: String!) {
			repository(name: $name, owner: $owner) {
			  pullRequests(last: 3) {
				nodes {
				  changedFiles
				  createdAt
				  body
				  author {
					login
				  }
				}
			  }
			}
		  }`,
		owner: "microsoft", // TODO get these values from extension api
		name: "vscode",
		headers: { authorization: `Bearer ${session.accessToken}` },
	  });
	  console.log('Made test query: ', res);
	  // TODO hand over PR data to timeline api
}

// Called when your extension is deactivated
export function deactivate() {}
