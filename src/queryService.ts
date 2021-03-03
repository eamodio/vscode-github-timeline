import { graphql } from '@octokit/graphql';
import { AuthenticationSession } from 'vscode';

/*
TODO:
Adding pagination
*/
const getPullRequest = async (session: AuthenticationSession, owner: string, repo: string, number: number, limit: number = 6) => {
    const res = await graphql({
		query: `query getPullRequest($name: String!, $owner: String!, $number: Int!, $limit: Int!) {
			repository(name: $name, owner: $owner) {
				pullRequest(number: $number) {
				  commits(last: $limit) {
					nodes {
					  commit {
						id
						abbreviatedOid
						author {
						  email
						  user {
							login
							name
						  }
						}
						message
						committedDate
						url
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
						comments(last: $limit) {
						  nodes {
							body
						  }
						}
						url
					  }
				  }
				  comments(last: $limit) {
					nodes {
					  body
					  id
					  createdAt
					  author {
						login
					  }
					  url
					}
				  }
				}
			  }
		  }`,
		owner: owner,
		name: repo,
		number: number,
		limit: limit,
		headers: { authorization: `Bearer ${session.accessToken}` },
	  });
      return res;
};

export default { getPullRequest };