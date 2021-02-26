import { graphql } from '@octokit/graphql';
import { AuthenticationSession } from 'vscode';

const getRecentPullRequests = async (repositoryName: String, owner: String, limit: Number, session: AuthenticationSession) => {
    const res = await graphql({
		query: `query pullRequests($name: String!, $owner: String!, $limit: Int!) {
			repository(name: $name, owner: $owner) {
				pullRequest(number: 116984) {
				  commits(last: 3) {
					nodes {
					  commit {
						author {
						  name
						}
						message
					  }
					}
				  }
				  reviews(last: 3) {
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
		owner, // TODO get these values from extension api
		name: repositoryName,
        limit,
		headers: { authorization: `Bearer ${session.accessToken}` },
	  });
      return res;
};

export default { getRecentPullRequests };