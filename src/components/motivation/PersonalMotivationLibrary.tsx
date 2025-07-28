import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Heart, Plus, Search, Edit2, Trash2, Star } from 'lucide-react';
import { motivationService, type PersonalMotivation } from '@/services/motivationService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const PersonalMotivationLibrary: React.FC = () => {
  const { user } = useAuth();
  const [motivations, setMotivations] = useState<PersonalMotivation[]>([]);
  const [filteredMotivations, setFilteredMotivations] = useState<PersonalMotivation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Form state
  const [newMotivation, setNewMotivation] = useState({
    content_type: 'affirmation' as const,
    title: '',
    content: '',
    source: '',
    tags: [] as string[],
    is_favorite: false
  });

  useEffect(() => {
    if (user) {
      loadMotivations();
    }
  }, [user]);

  useEffect(() => {
    filterMotivations();
  }, [motivations, searchTerm, filterType, showFavoritesOnly]);

  const loadMotivations = async () => {
    if (!user) return;

    try {
      const data = await motivationService.getPersonalMotivations(user.id);
      setMotivations(data);
    } catch (error) {
      console.error('Error loading motivations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterMotivations = () => {
    let filtered = motivations;

    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.source?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.content_type === filterType);
    }

    if (showFavoritesOnly) {
      filtered = filtered.filter(item => item.is_favorite);
    }

    setFilteredMotivations(filtered);
  };

  const handleAddMotivation = async () => {
    if (!user || !newMotivation.content.trim()) return;

    const success = await motivationService.addPersonalMotivation(user.id, newMotivation);
    
    if (success) {
      setIsAddDialogOpen(false);
      setNewMotivation({
        content_type: 'affirmation',
        title: '',
        content: '',
        source: '',
        tags: [],
        is_favorite: false
      });
      loadMotivations();
    }
  };

  const handleToggleFavorite = async (id: string, currentFavorite: boolean) => {
    const success = await motivationService.toggleFavorite(id, !currentFavorite);
    if (success) {
      loadMotivations();
    }
  };

  const handleDelete = async (id: string) => {
    const success = await motivationService.deletePersonalMotivation(id);
    if (success) {
      loadMotivations();
    }
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      quote: '💬',
      affirmation: '✨',
      goal: '🎯',
      image: '🖼️'
    };
    return icons[type as keyof typeof icons] || '📝';
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please sign in to access your motivation library</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Personal Motivation Library
          </span>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to Your Motivation Library</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={newMotivation.content_type} onValueChange={(value) => 
                    setNewMotivation(prev => ({ ...prev, content_type: value as any }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="affirmation">Affirmation</SelectItem>
                      <SelectItem value="quote">Quote</SelectItem>
                      <SelectItem value="goal">Goal</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="title">Title (optional)</Label>
                  <Input
                    id="title"
                    value={newMotivation.title}
                    onChange={(e) => setNewMotivation(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Give it a title..."
                  />
                </div>

                <div>
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={newMotivation.content}
                    onChange={(e) => setNewMotivation(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter your motivation, quote, or affirmation..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="source">Source (optional)</Label>
                  <Input
                    id="source"
                    value={newMotivation.source}
                    onChange={(e) => setNewMotivation(prev => ({ ...prev, source: e.target.value }))}
                    placeholder="Author, book, or source..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddMotivation} disabled={!newMotivation.content.trim()}>
                    Add to Library
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your motivations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="affirmation">Affirmations</SelectItem>
                <SelectItem value="quote">Quotes</SelectItem>
                <SelectItem value="goal">Goals</SelectItem>
                <SelectItem value="image">Images</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className="flex items-center gap-1"
          >
            <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
            Favorites Only
          </Button>
        </div>

        {/* Motivations Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMotivations.length === 0 ? (
          <div className="text-center py-8">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {motivations.length === 0 
                ? "Start building your personal motivation library!"
                : "No motivations match your current filters."
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMotivations.map((motivation) => (
              <Card key={motivation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getTypeIcon(motivation.content_type)}</span>
                        <Badge variant="outline">{motivation.content_type}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFavorite(motivation.id, motivation.is_favorite)}
                        >
                          <Star className={`h-4 w-4 ${motivation.is_favorite ? 'fill-current text-yellow-500' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(motivation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Title */}
                    {motivation.title && (
                      <h4 className="font-medium">{motivation.title}</h4>
                    )}

                    {/* Content */}
                    <p className="text-sm leading-relaxed">{motivation.content}</p>

                    {/* Source */}
                    {motivation.source && (
                      <p className="text-xs text-muted-foreground italic">— {motivation.source}</p>
                    )}

                    {/* Tags */}
                    {motivation.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {motivation.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};