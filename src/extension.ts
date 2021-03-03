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
	AuthenticationSession,
	window,
	authentication
} from 'vscode';
// import * as vscode from 'vscode';
 import queryService from './queryService';

 export async function activate(context: ExtensionContext) {
	 console.log("Started");
	context.subscriptions.push(new GithubTimeline());
	
	// console.log('Created Github Session');
	// // TODO finalize which values to query
	// const res = await queryService.getRecentPullRequests("vscode","microsoft",3,session);
	// console.log('Made test query: ', res);
}

export function deactivate() {}

interface githubA{
	type: string,
	commit: {
		oid: string,
		message: string,
		committedDate: string,
		author: {
			name: string
		}
	}
	nodes: {
		author: {
			avatarUrl: string,
			login: string
		}
		updatedAt: string
	}
}

class GithubActivityItem extends TimelineItem {
	readonly username: string;

	constructor(object: githubA ) {
		if(object.type = 'commit') {
		const commit = object.commit;
		const index = commit.oid;
		const label = commit.message;

		super(label, Date.parse(commit.committedDate));

		this.id = `${commit.oid}`;
		this.username = commit.author.name;

		this.description = 'Commit by ' + commit.author.name;
		this.detail = 'detail';
		this.iconPath = new ThemeIcon('eye');
		this.command = {
			command: 'githubTimeline.openItem',
			title: '',
			arguments: [this],
		};
		}
		else if (object.type = 'review') {
			// object = object.review;
			const index = object.id;
			const label = object.message;

			super(label, Date.parse(object.updatedAt));

			this.id = `${object.id}`;
			this.username = object.author.name;

			this.description = 'Commit by ' + object.author.name;
			this.detail = 'detail';
			this.iconPath = new ThemeIcon('eye');
			this.command = {
				command: 'githubTimeline.openItem',
				title: '',
				arguments: [this],
			};
		}
	}
}

class GithubTimeline implements TimelineProvider, Disposable { 
	readonly id = 'github';
	readonly label = 'Github Timeline';

	private _onDidChange = new EventEmitter<TimelineChangeEvent | undefined>();
	readonly onDidChange = this._onDidChange.event;

	private disposable: Disposable;

	private lastUri: Uri | undefined;

	constructor() {
		const handle = setInterval(
			() => this._onDidChange.fire(this.lastUri ? { uri: this.lastUri, reset: false } : undefined),
			30000,
		);
		this.disposable = Disposable.from(
			workspace.registerTimelineProvider('*', this),
			commands.registerCommand('githubTimeline.openItem', (item: GithubActivityItem) => this.open(item)),
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
		let session: AuthenticationSession;
		try {
			session = await authentication.getSession('github', ['repo'], { createIfNone: true });
		} catch (ex) {
			window.showInformationMessage('Could not authenticate your GitHub!');
			return;
		}
		const response: any = await queryService.getPullRequest(session);
		console.log(response.repository.pullRequest.commits.nodes);
		response.repository.pullRequest.commits.nodes.map(res => res.type = 'commit');
		
		const items = response.repository.pullRequest.commits.nodes.map(commit => new GithubActivityItem(commit));

		console.log('final', items[0]);
		return {
			items
		};
	}

	dispose() {
		this.disposable.dispose();
	}

	open(item: GithubActivityItem) {
		return env.openExternal(this.lastUri);
	}
}
