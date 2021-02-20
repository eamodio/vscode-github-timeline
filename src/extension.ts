import { AuthenticationSession, ExtensionContext } from 'vscode';
import { authentication, window} from 'vscode';
import queryService from './queryService';

export async function activate(context: ExtensionContext) {
	console.log('VSCode Github Timeline has started');
	let session: AuthenticationSession;
	try {
		session = await authentication.getSession('github', ['repo'], { createIfNone: true });
	} catch (ex) {
	    window.showInformationMessage('Could not authenticate your GitHub!');
		return;
	}
	console.log('Created Github Session');
	// TODO finalize which values to query
	const res = await queryService.getRecentPullRequests("vscode","microsoft",3,session);
	console.log('Made test query: ', res);
	// TODO hand over PR data to timeline api
}

export function deactivate() {}
