import {
	CancellationToken,
	commands,
	Disposable,
	env,
	EventEmitter,
	ExtensionContext,
	ThemeIcon,
	Timeline,
	TimelineChangeEvent,
	TimelineItem,
	TimelineOptions,
	TimelineProvider,
	Uri,
	workspace,
} from 'vscode';
import * as vscode from 'vscode';
 import queryService from './queryService';

export async function activate(context: vscode.ExtensionContext) {
	console.log('VSCode Github Timeline has started');
	context.subscriptions.push(new GithubTimeline());
	// let session: vscode.AuthenticationSession;
	// try {
	// 	session = await vscode.authentication.getSession('github', ['repo'], { createIfNone: true });
	// } catch (ex) {
	//     window.showInformationMessage('Could not authenticate your GitHub!');
	// 	return;
	// }
	// console.log('Created Github Session');
	// // TODO finalize which values to query
	//const res = await queryService.getRecentPullRequests("vscode","microsoft",3,session);
	//console.log('Made test query: ', res);
	// TODO hand over PR data to timeline api
}

export function deactivate() {}

class GithubActivityItem extends vscode.TimelineItem {
	readonly username: string;

	constructor(id: Number) {
		const index = id;
		const label = 'activity label '+id;

		super(label, Date.now());

		this.id = `${id}`;
		this.username = 'foo username';

		this.description = `description`;
		this.detail = 'detail';
		//this.iconPath = new vscode.ThemeIcon('eye');
		this.command = {
			command: 'githubTimeline.openItem',
			title: '',
			arguments: [this],
		};
	}
}

class GithubTimeline implements vscode.TimelineProvider, vscode.Disposable { 
	readonly id = 'github';
	readonly label = 'Github Timeline';

	private _onDidChange = new vscode.EventEmitter<vscode.TimelineChangeEvent | undefined>();
	readonly onDidChange = this._onDidChange.event;

	private disposable: Disposable;

	private lastUri: vscode.Uri | undefined;

	constructor() {
		const handle = setInterval(
			() => this._onDidChange.fire(this.lastUri ? { uri: this.lastUri, reset: false } : undefined),
			30000,
		);
		this.disposable = Disposable.from(
			vscode.workspace.registerTimelineProvider('*', this),
			vscode.commands.registerCommand('githubTimeline.openItem', (item: GithubActivityItem) => this.open(item)),
			{
				dispose: () => clearInterval(handle),
			},
		);
	}

	async provideTimeline(
		uri: Uri,
		options: TimelineOptions,
		_token: CancellationToken,
	): Promise<Timeline | undefined> {
		
		return undefined;
	}

	dispose() {
		this.disposable.dispose();
	}

	open(item: GithubActivityItem) {
		return env.openExternal(this.lastUri);
	}
}
