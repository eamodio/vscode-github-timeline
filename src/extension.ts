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

const githubTimelineScheme = 'github-timeline-pr';
const pullRequestRegex = /^(?:(?:https:\/\/)?github.com\/)?([^/]+)\/([^/]+?)(?:\/(?:pull\/([0-9]+)))?(?:\/|$)/i;
const timelinePullRequestRegex = /^(?:(?:github-timeline-pr:\/\/)?github.com\/)?([^/]+)\/([^/]+?)(?:\/(?:pull\/([0-9]+)))?(?:\/|$)/i;

enum ActivityType {
	commit,
	review,
	comment
}

export async function activate(context: ExtensionContext) {
	console.log("Started vscode-github-timeline");
	context.subscriptions.push(new GithubTimeline());

	context.subscriptions.push(commands.registerCommand(`githubTimeline.showPullRequestActivity`, async () => {
		const value = await window.showInputBox({
			placeHolder: 'e.g. https://github.com/microsoft/vscode/pull/123',
			prompt: 'Enter a GitHub pull request url',
			validateInput: (value: string) =>
				pullRequestRegex.test(value) ? undefined : 'Invalid pull request url',
		});

		if (!value) {
			return;
		}

		await commands.executeCommand('files.openTimeline', Uri.parse(value).with({ scheme: githubTimelineScheme }));
	}));
}

export function deactivate() { }

/*
TODO:
Adding force pushes and assignees
*/
class GithubActivityItem extends TimelineItem {
	readonly username: string;
	readonly url: string;

	constructor(object: any) {
		switch (object.__typename) {
			case ('PullRequestCommit'):
				{
					object = object.commit;
					const label = object.message;

					super(label, Date.parse(object.committedDate));

					this.id = `${object.id}`;
					this.username = object.author.name;

					const date = new Date(Date.parse(object.committedDate));

					const formattedDate = date.toLocaleString("en-GB", {
						month: "short",
						day: "numeric",
						year: "numeric",
						hour: "numeric",
						minute: "2-digit",
						hour12: true,
					});

					this.description = ' by ' + object.author.user.login;
					this.detail = object.author.user.name + " (" + object.author.email + ") ---" + object.abbreviatedOid + " \n" + formattedDate + "\n\n" + label;
					this.iconPath = new ThemeIcon('git-commit');
					this.command = {
						command: 'githubTimeline.openItem',
						title: '',
						arguments: [this],
					};
					this.contextValue = 'githubTimeline:commit';
					this.url = object.url;
					break;
				}
			case ('PullRequestReview'): {
				const index = object.id;
				const label = object.author.login + ' left a review';

				super(label, Date.parse(object.updatedAt));

				this.id = `${object.id}`;
				this.username = object.author.login;

				const comments = object.comments.nodes;
				if (comments.length > 0) {
					this.description = comments[0].body;
					this.detail = comments.map(comment => comment.body).join('\n');
				}

				this.iconPath = new ThemeIcon('comment-discussion');
				this.command = {
					command: 'githubTimeline.openItem',
					title: '',
					arguments: [this],
				};
				this.contextValue = 'githubTimeline:review';
				this.url = object.url;
				break;
			}
			case ('Comment'): {
				const label = object.author.login + ' left a comment';

				super(label, Date.parse(object.createdAt));

				this.id = `${object.id}`;
				this.username = object.author.login;

				this.detail = object.body;
				this.iconPath = new ThemeIcon('comment');
				this.command = {
					command: 'githubTimeline.openItem',
					title: '',
					arguments: [this],
				};
				this.contextValue = 'githubTimeline:comment';
				this.url = object.url;
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

	/*
	TODO :
	Streamline the authentication process
	URI integration
	*/
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

		let owner = 'microsoft';
		let repo = 'vscode';
		let number = '116984';
		if (uri.scheme === githubTimelineScheme) {
			const match = timelinePullRequestRegex.exec(uri.toString());
			if (match) {
				[, owner, repo, number] = match;
			}
		}

		const defaultLimit = 10;
		if(options.cursor === '' || options.cursor === undefined) {
			const pageInfo : any = await queryService.getStartPageInfo(session, owner, repo, Number(number), defaultLimit);
			options.cursor = pageInfo.repository.pullRequest.timelineItems.pageInfo.endCursor;
		}
		const response: any = await queryService.getPullRequest(session, owner, repo, Number(number), options.cursor, defaultLimit);
		
		const cursor = response.repository.pullRequest.timelineItems.pageInfo.startCursor;
		console.log(response.repository.pullRequest.timelineItems.pageInfo);

		const items = response.repository.pullRequest.timelineItems.nodes.map(item => {
			return new GithubActivityItem(item);
		}) as GithubActivityItem[];

		// const comments = response.repository.pullRequest.comments.nodes.map(comment => {
		// 	comment.activityType = ActivityType.comment;
		// 	return new GithubActivityItem(comment);
		// }) as GithubActivityItem[];

		//const items = [...commits, ...reviews/*, ...comments*/];
		const hasPreviousPage = response.repository.pullRequest.timelineItems.pageInfo.hasPreviousPage;
		return {
			items,
			paging: hasPreviousPage ? { cursor } : undefined,
		};
	}

	dispose() {
		this.disposable.dispose();
	}

	open(item: GithubActivityItem) {
		return env.openExternal(Uri.parse(item.url));
	}
}