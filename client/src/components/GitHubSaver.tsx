import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Github, Upload, Check, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GitHubUser {
  login: string;
  name: string;
  email: string;
}

interface GitHubRepository {
  name: string;
  description: string;
  private: boolean;
  clone_url: string;
  html_url: string;
}

interface SaveResponse {
  success: boolean;
  repository: GitHubRepository;
  filesUploaded: number;
  user: string;
}

export default function GitHubSaver() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repositoryName, setRepositoryName] = useState('voice-journal-app');
  const [description, setDescription] = useState('AI-powered speech-to-text journaling app built with React, OpenAI, and Web Speech API');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savedRepo, setSavedRepo] = useState<GitHubRepository | null>(null);
  const { toast } = useToast();

  const loadUser = async () => {
    try {
      const response = await fetch('/api/github/user');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        throw new Error('Failed to get GitHub user');
      }
    } catch (error) {
      console.error('Error loading GitHub user:', error);
      toast({
        title: "GitHub connection error",
        description: "Failed to connect to GitHub. Please check your connection.",
        variant: "destructive",
      });
    }
  };

  const saveToGitHub = async () => {
    if (!repositoryName.trim()) {
      toast({
        title: "Repository name required",
        description: "Please enter a name for your repository.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/github/save-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryName: repositoryName.trim(),
          description: description.trim(),
          isPrivate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save to GitHub');
      }

      const result: SaveResponse = await response.json();
      setSavedRepo(result.repository);
      
      toast({
        title: "Successfully saved to GitHub!",
        description: `Repository "${result.repository.name}" created with ${result.filesUploaded} files.`,
      });

    } catch (error: any) {
      console.error('Error saving to GitHub:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save project to GitHub.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openDialog = () => {
    setIsOpen(true);
    if (!user) {
      loadUser();
    }
  };

  if (savedRepo) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                Project saved to GitHub!
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                Repository: {savedRepo.name}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(savedRepo.html_url, '_blank')}
              className="text-green-700 border-green-300 hover:bg-green-100 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-900"
              data-testid="button-view-repository"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on GitHub
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          onClick={openDialog}
          data-testid="button-save-to-github"
          className="flex items-center gap-2"
        >
          <Github className="w-4 h-4" />
          Save to GitHub
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            Save Project to GitHub
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {user && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm">
                <strong>Connected as:</strong> {user.name || user.login}
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="repo-name">Repository Name</Label>
            <Input
              id="repo-name"
              value={repositoryName}
              onChange={(e) => setRepositoryName(e.target.value)}
              placeholder="voice-journal-app"
              data-testid="input-repository-name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="repo-description">Description</Label>
            <Textarea
              id="repo-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="AI-powered speech-to-text journaling app"
              rows={3}
              data-testid="textarea-repository-description"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="private-repo"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              data-testid="switch-private-repository"
            />
            <Label htmlFor="private-repo" className="text-sm">
              Make repository private
            </Label>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              data-testid="button-cancel-save"
            >
              Cancel
            </Button>
            <Button
              onClick={saveToGitHub}
              disabled={isLoading || !repositoryName.trim()}
              data-testid="button-confirm-save"
            >
              {isLoading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Save to GitHub
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}