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
						author {
						  name
						}
						oid
						message
						committedDate
					  }
					}
				  }
				  reviews(last: 3) {
					nodes{
            			id
						author {
						  avatarUrl
						  login
						}
						updatedAt
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