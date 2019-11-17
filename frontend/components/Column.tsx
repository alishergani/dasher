import React from 'react'
import { withApollo, WithApolloClient } from 'react-apollo'
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd'
import theme from '../theme'
import {
  SearchGitHubDocument,
  SearchGitHubQuery,
  GetBoardQuery,
} from '../__generated__/graphql'
import ColumnMenu from './ColumnMenu'
import Issue from './Issue'
import IssueLoader from './IssueLoader'
import SecondaryButton from './SecondaryButton'
import Spinner from './Spinner'
import UserContext from './UserContext'

interface ColumnProps {
  board: NonNullable<GetBoardQuery['board']>
  id: string
  name: string
  query: string
  isDragging: boolean
  dragHandleProps: DraggableProvidedDragHandleProps | null
}

const Column: React.FC<WithApolloClient<ColumnProps>> = ({
  board,
  id,
  name,
  query,
  client,
  isDragging,
  dragHandleProps,
}) => {
  const user = React.useContext(UserContext)
  const [loading, setLoading] = React.useState(true)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [issueCount, setIssueCount] = React.useState(0)
  const [issues, setIssues] = React.useState<
    NonNullable<SearchGitHubQuery['search']['issues']>
  >([])
  const [hasNextPage, setHasNextPage] = React.useState(false)
  const [endCursor, setEndCursor] = React.useState<
    SearchGitHubQuery['search']['pageInfo']['endCursor']
  >(null)

  React.useEffect(() => {
    setLoading(true)
    client
      .query<SearchGitHubQuery>({
        query: SearchGitHubDocument,
        variables: { query: `${board.query} ${query}` },
      })
      .then(({ data }) => {
        setLoading(false)
        if (data.search.issues) {
          setIssueCount(data.search.issueCount)
          setIssues(data.search.issues)
          setHasNextPage(data.search.pageInfo.hasNextPage)
          setEndCursor(data.search.pageInfo.endCursor)
        }
      })
  }, [board.query, query])

  function loadMore() {
    setLoadingMore(true)
    client
      .query<SearchGitHubQuery>({
        query: SearchGitHubDocument,
        variables: { query: `${board.query} ${query}`, endCursor },
      })
      .then(({ data }) => {
        setLoadingMore(false)
        if (data.search.issues) {
          setIssues([...issues, ...data.search.issues])
          setHasNextPage(data.search.pageInfo.hasNextPage)
          setEndCursor(data.search.pageInfo.endCursor)
        }
      })
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        width: 320,
        maxHeight: '100%',
        backgroundColor: theme.colors.white,
        borderRadius: theme.radii[2],
        boxShadow: isDragging ? theme.shadows.large : theme.shadows.small,
        transition: '150ms box-shadow',
        [theme.mediaQueries.medium]: {
          width: 360,
        },
      }}
    >
      <div
        {...dragHandleProps}
        css={{
          flexShrink: 0,
          padding: theme.space[2],
          borderBottom: `1px solid ${theme.colors.gray[2]}`,
        }}
      >
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <h2
            css={{
              margin: `0 ${theme.space[2]}`,
              fontSize: theme.fontSizes[3],
              fontWeight: theme.fontWeights.semibold,
              lineHeight: theme.lineHeights.tight,
            }}
          >
            {name}
          </h2>

          {loading ? (
            <Spinner css={{ color: theme.colors.gray[5] }} />
          ) : (
            <span
              css={{
                padding: `0 6px`,
                fontSize: theme.fontSizes[0],
                fontWeight: theme.fontWeights.semibold,
                color: theme.colors.gray[7],
                backgroundColor: theme.colors.gray[1],
                borderRadius: 999,
              }}
            >
              {issueCount}
            </span>
          )}
          <div css={{ margin: '0 auto' }} />
          {user && user.id === board.owner.id ? (
            <ColumnMenu boardId={board.id} id={id} name={name} query={query} />
          ) : null}
        </div>
        {query ? (
          <div
            css={{
              margin: `${theme.space[1]} ${theme.space[2]}`,
              fontFamily: theme.fonts.monospace,
              fontSize: theme.fontSizes[1],
              color: theme.colors.gray[7],
            }}
          >
            {query}
          </div>
        ) : null}
      </div>
      <div
        css={{
          overflow: 'auto',
          '& > :not(:last-child)': {
            borderBottom: `1px solid ${theme.colors.gray[1]}`,
          },
        }}
      >
        {!loading && issueCount === 0 ? (
          <div
            css={{
              padding: theme.space[6],
              textAlign: 'center',
              color: theme.colors.gray[7],
            }}
          >
            No results
          </div>
        ) : (
          <>
            {/* Show IssueLoader on initial load. */}
            {loading && issues.length === 0 ? (
              <div css={{ padding: theme.space[4] }}>
                <IssueLoader />
              </div>
            ) : null}
            {issues.map(issue => (
              // Using `!` below to remove null from issue's type because
              // there will never (I think) be any null elements in the list.
              // This seems like a mistake in GitHub's GraphQL schema.
              <Issue issue={issue!} />
            ))}
            {hasNextPage ? (
              <div css={{ padding: theme.space[4] }}>
                <SecondaryButton
                  onClick={() => loadMore()}
                  disabled={loadingMore}
                  css={{ width: '100%' }}
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </SecondaryButton>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export default withApollo(Column)
