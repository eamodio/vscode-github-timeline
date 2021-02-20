import { graphql } from '@octokit/graphql';
import { AuthenticationSession } from 'vscode';

const getRecentPullRequests = async (repositoryName: String, owner: String, limit: Number, session: AuthenticationSession) => {
    const res = await graphql({
		query: `query pullRequests($name: String!, $owner: String!) {
			repository(name: $name, owner: $owner) {
			  pullRequests(last: 3) {
				nodes {
				  changedFiles
				  createdAt
				  body
				  author {
					login
				  }
				}
			  }
			}
		  }`,
		owner, // TODO get these values from extension api
		name: repositoryName,
		headers: { authorization: `Bearer ${session.accessToken}` },
	  });
      return res;
};

export default { getRecentPullRequests };