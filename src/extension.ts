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

import queryService from './queryService';

enum ActivityType {
	commit,
	review,
	comment
}

export async function activate(context: ExtensionContext) {
	console.log("Started vscode-github-timeline");
	context.subscriptions.push(new GithubTimeline());
}

export function deactivate() { }

class GithubActivityItem extends TimelineItem {
	readonly username: string;

	constructor(object: any) {
		switch (object.activityType) {
			case (ActivityType.commit):
				{
					object = object.commit;
					const index = object.id;
					const label = object.message;

					super(label, Date.parse(object.committedDate));

					this.id = `${object.id}`;
					this.username = object.author.name;

					this.description = ' by ' + object.author.user.login;
					this.detail = 'detail';
					this.iconPath = new ThemeIcon('git-commit');
					this.command = {
						command: 'githubTimeline.openItem',
						title: '',
						arguments: [this],
					};
					break;
				}
			case (ActivityType.review): {
				const index = object.id;
				const label = object.comments.nodes[0].body;

				super(label, Date.parse(object.updatedAt));

				this.id = `${object.id}`;
				this.username = object.author.login;

				this.description = 'Review by ' + object.author.login;
				this.detail = 'detail';
				this.iconPath = new ThemeIcon('comment-discussion');
				this.command = {
					command: 'githubTimeline.openItem',
					title: '',
					arguments: [this],
				};
				break;
			}
			case (ActivityType.comment): {
				const index = object.id;
				const label = object.author.login + ' left a comment';
	
				super(label, Date.parse(object.createdAt));
	
				this.id = `${object.id}`;
				this.username = object.author.login;
	
				// this.description = 'Review by ' + object.author.login;
				this.detail = object.body;
				this.iconPath = new ThemeIcon('comment');
				this.command = {
					command: 'githubTimeline.openItem',
					title: '',
					arguments: [this],
				};
				break;
			}
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

		const commits = response.repository.pullRequest.commits.nodes.map(commit => {
			commit.activityType = ActivityType.commit;
			return new GithubActivityItem(commit);
		});

		// response.repository.pullRequest.reviews.nodes.map(res => res.activityType = 'review');
		// console.log(response.repository.pullRequest.reviews.nodes);
		const reviews = response.repository.pullRequest.reviews.nodes.map(review => {
			review.activityType = ActivityType.review;
			return new GithubActivityItem(review);
		}) as GithubActivityItem[];

		const comments = response.repository.pullRequest.comments.nodes.map(comment => {
			comment.activityType = ActivityType.comment;
			return new GithubActivityItem(comment);
		}) as GithubActivityItem[];

		console.log('review activity items', reviews);
		//console.log('reviews',reviews);
		const items = [...commits, ...reviews, ...comments];
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