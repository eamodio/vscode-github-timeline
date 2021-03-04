import { graphql } from '@octokit/graphql';
import { AuthenticationSession } from 'vscode';

/*
TODO:
Adding pagination
*/
const getPullRequest = async (session: AuthenticationSession, owner: string, repo: string, number: number, startCursor: String = '', limit: number = 6) => {
	const res = await graphql({
		query: `query getPullRequest($name: String!, $owner: String!, $number: Int!, $limit: Int!, $startCursor: String!) {
			repository(name: $name, owner: $owner) {
			  pullRequest(number: $number) {
				timelineItems(last: $limit, before: $startCursor, itemTypes: [PULL_REQUEST_COMMIT, PULL_REQUEST_COMMIT_COMMENT_THREAD, PULL_REQUEST_REVIEW, PULL_REQUEST_REVIEW_THREAD]) {
				  pageInfo {
					startCursor
					endCursor
					hasNextPage
					hasPreviousPage
				  }
				  nodes {
					__typename
					... on PullRequestCommit {
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
					... on PullRequestReview {
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
				}
			  }
			}
		  }`,
		owner: owner,
		name: repo,
		number: number,
		limit: limit,
		startCursor,
		headers: { authorization: `Bearer ${session.accessToken}` },
	}).catch(err => console.log(err));
	return res;
};

const getStartPageInfo = async (session: AuthenticationSession, owner: string, repo: string, number: number, limit: Number) => {
	const res = await graphql({
		query: `query getPullRequest($name: String!, $owner: String!, $number: Int!, $limit: Int!) {
			repository(name: $name, owner: $owner) {
			  pullRequest(number: $number) {
				timelineItems(last: $limit, itemTypes: [PULL_REQUEST_COMMIT, PULL_REQUEST_COMMIT_COMMENT_THREAD, PULL_REQUEST_REVIEW, PULL_REQUEST_REVIEW_THREAD]) {
				  pageInfo {
					startCursor
					endCursor
					hasNextPage
					hasPreviousPage
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
	}).catch(err => console.log(err));
	return res;
};

export default { getPullRequest, getStartPageInfo };