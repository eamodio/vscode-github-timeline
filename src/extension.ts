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

export function deactivate() { }

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

	constructor(object: any) {
		if (object.activityType === 'commit') {
			object = object.commit;
			const index = object.id;
			const label = object.message;

			super(label, Date.parse(object.committedDate));

			this.id = `${object.id}`;
			this.username = object.author.name;

			this.description = 'Commit by ' + object.author.user.login;
			this.detail = 'detail';
			this.iconPath = new ThemeIcon('git-commit');
			this.command = {
				command: 'githubTimeline.openItem',
				title: '',
				arguments: [this],
			};
		} else if (object.activityType === 'review') {
			const index = object.id;
			const label = object.comments.nodes[0].body;

			super(label, Date.parse(object.updatedAt));

			this.id = `${object.id}`;
			this.username = object.author.login;

			this.description = 'Review by ' + object.author.login;
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
		//console.log(response.repository.pullRequest.reviews.nodes);

		response.repository.pullRequest.commits.nodes.map(res => res.activityType = 'commit');
		const commits = response.repository.pullRequest.commits.nodes.map(commit => {
			commit.activityType = 'commit';
			return new GithubActivityItem(commit);
		});

		//response.repository.pullRequest.reviews.nodes.map(res => res.activityType = 'review');
		console.log(response.repository.pullRequest.reviews.nodes);
		const reviews = response.repository.pullRequest.reviews.nodes.map(review => {
			review.activityType = 'review';
			return new GithubActivityItem(review);
		});
		console.log('review activity items', reviews);
		//console.log('reviews',reviews);
		const items = [...commits, ...reviews];
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
