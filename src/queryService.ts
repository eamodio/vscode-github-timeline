import { graphql } from '@octokit/graphql';
import { AuthenticationSession } from 'vscode';

const getPullRequest = async (session: AuthenticationSession) => {
    const res = await graphql({
		query: `query getPullRequest($name: String!, $owner: String!, $limit: Int!) {
			repository(name: $name, owner: $owner) {
				pullRequest(number: 116984) {
				  commits(last: $limit) {
					nodes {
					  commit {
						author {
						  name
						}
						message
						committedDate
					  }
					}
				  }
				  reviews(last: $limit) {
					edges {
					  node {
						author {
						  avatarUrl
						  login
						}
						updatedAt
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