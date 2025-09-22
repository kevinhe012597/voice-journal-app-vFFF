import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

export interface GitHubRepository {
  name: string;
  description: string;
  private: boolean;
  clone_url: string;
  html_url: string;
}

export class GitHubService {
  /**
   * Create a new repository on GitHub
   */
  static async createRepository(name: string, description: string, isPrivate: boolean = false): Promise<GitHubRepository> {
    const octokit = await getUncachableGitHubClient();
    
    try {
      const response = await octokit.rest.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate,
        auto_init: true, // Initialize with README
      });

      return {
        name: response.data.name,
        description: response.data.description || '',
        private: response.data.private,
        clone_url: response.data.clone_url,
        html_url: response.data.html_url,
      };
    } catch (error: any) {
      if (error.status === 422) {
        throw new Error('Repository name already exists or is invalid');
      }
      throw new Error('Failed to create repository: ' + error.message);
    }
  }

  /**
   * Upload files to a GitHub repository
   */
  static async uploadFiles(
    owner: string, 
    repo: string, 
    files: Array<{ path: string; content: string; encoding?: 'utf-8' | 'base64' }>,
    commitMessage: string = 'Initial commit from Replit'
  ): Promise<void> {
    const octokit = await getUncachableGitHubClient();

    try {
      // Get the current commit SHA (from main branch)
      const { data: ref } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: 'heads/main',
      });
      
      const currentCommitSha = ref.object.sha;

      // Get the current commit to get the tree SHA
      const { data: currentCommit } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: currentCommitSha,
      });

      // Create blobs for all files
      const blobs = await Promise.all(
        files.map(async (file) => {
          const { data: blob } = await octokit.rest.git.createBlob({
            owner,
            repo,
            content: file.content,
            encoding: file.encoding || 'utf-8',
          });
          return {
            path: file.path,
            mode: '100644' as const,
            type: 'blob' as const,
            sha: blob.sha,
          };
        })
      );

      // Create a new tree with all the files
      const { data: newTree } = await octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: currentCommit.tree.sha,
        tree: blobs,
      });

      // Create a new commit
      const { data: newCommit } = await octokit.rest.git.createCommit({
        owner,
        repo,
        message: commitMessage,
        tree: newTree.sha,
        parents: [currentCommitSha],
      });

      // Update the reference to point to the new commit
      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: 'heads/main',
        sha: newCommit.sha,
      });

    } catch (error: any) {
      throw new Error('Failed to upload files: ' + error.message);
    }
  }

  /**
   * Get authenticated user information
   */
  static async getAuthenticatedUser(): Promise<{ login: string; name: string; email: string }> {
    const octokit = await getUncachableGitHubClient();
    
    try {
      const { data: user } = await octokit.rest.users.getAuthenticated();
      return {
        login: user.login,
        name: user.name || user.login,
        email: user.email || '',
      };
    } catch (error: any) {
      throw new Error('Failed to get user info: ' + error.message);
    }
  }
}