import { graphql } from '@octokit/graphql';
import { AuthenticationSession } from 'vscode';

const getPullRequest = async (session: AuthenticationSession) => {
    const res = await graphql({
		query: `query getPullRequest($name: String!, $owner: String!, $limit: Int!) {
			repository(name: "vscode", owner: "microsoft") {
				pullRequest(number: 116984) {
				  commits(last: 3) {
					nodes {
					  commit {
						id
						author {
						  user {
							login
						  }
						}
						oid
						message
						committedDate
					  }
					}
				  }
				  reviews(last: $limit) {
					nodes {
						id
						author {
						  avatarUrl
						  login
						}
						updatedAt
						comments(last:  $limit) {
						  nodes {
							body
						  }
						}
					  }
				  }
				}
			}
		  }`,
		owner: 'microsoft', // TODO get these values from extension api
		name: 'vscode',
        limit: 3,
		headers: { authorization: `Bearer ${session.accessToken}` },
	  });
      return res;
};

export default { getPullRequest };